// Vercel Serverless Function — proxy del estado compartido vía GitHub Gist.
//
// El token vive SOLO en el servidor (process.env.GIST_TOKEN) y nunca llega al
// navegador. El cliente habla contra /api/state (GET para leer, POST para
// guardar) sin conocer ninguna credencial.
//
// Configurar en Vercel → Settings → Environment Variables:
//   GIST_TOKEN = <token de GitHub con permiso SOLO de gist>
// (sin prefijo VITE_, para que no se incruste en el bundle).
//
// ── Control de concurrencia (compare-and-set) ──────────────────────────────
//
// El estado es UN documento que se pisa entero en cada guardado. Sin control
// de versión, dos personas editando con minutos de diferencia se pisaban:
// cada una leía, modificaba su parte y subía el documento completo, así que
// la última en guardar borraba el cambio de la otra. Ese era el "cambio los
// bizcochos y no se ve reflejado en los demás".
//
// Ahora el estado lleva un contador `rev`. El cliente manda con qué `rev`
// creía estar trabajando; el servidor solo escribe si esa `rev` sigue siendo
// la actual, y si no devuelve 409 con el estado fresco para que el cliente
// reaplique su cambio encima y reintente.
//
// La lectura y la escritura contra el Gist no son atómicas entre sí (la API de
// Gists no tiene escritura condicional), así que la ventana de carrera no es
// cero: es el round-trip del servidor a GitHub (~200 ms) en lugar de todo el
// tiempo que la persona pasa con el formulario abierto.

const GIST_ID = '551e62ee777a3ad6acc9e88504bb29b1';
const GIST_API_URL = `https://api.github.com/gists/${GIST_ID}`;
const STATE_FILE = 'state.json';

const ghHeaders = token => ({
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
  'User-Agent': 'bizcochuelos-app',
  Accept: 'application/vnd.github+json',
});

// Lee el estado actual del Gist.
// Devuelve { ok: true, state } (state es null si el Gist todavía no tiene
// nada guardado) o { ok: false, error } si GitHub no respondió bien.
//
// IMPORTANTE: un fallo de GitHub NO se puede reportar como "no hay estado".
// Antes esta función devolvía null en los dos casos, y el cliente entendía
// "la nube está vacía" ante cualquier hipo de red o token vencido — que es
// justo la situación en la que no hay que dejar escribir nada.
const readState = async token => {
  let r;
  try {
    r = await fetch(`${GIST_API_URL}?t=${Date.now()}`, {
      headers: ghHeaders(token),
      cache: 'no-store',
    });
  } catch (err) {
    return { ok: false, error: `No se pudo contactar a GitHub: ${String(err)}` };
  }

  if (!r.ok) {
    const text = await r.text().catch(() => '');
    return { ok: false, error: `GitHub respondió ${r.status}: ${text.slice(0, 300)}` };
  }

  let gist;
  try {
    gist = await r.json();
  } catch (err) {
    return { ok: false, error: `Respuesta ilegible de GitHub: ${String(err)}` };
  }

  const file = gist.files && gist.files[STATE_FILE];
  // `truncated` significa que GitHub no mandó el contenido completo inline.
  // Tomarlo igual guardaría un JSON cortado por la mitad.
  if (file && file.truncated) {
    return { ok: false, error: 'GitHub devolvió el estado truncado' };
  }
  if (!file || !file.content) return { ok: true, state: null };

  try {
    const state = JSON.parse(file.content);
    if (!state || typeof state !== 'object') return { ok: true, state: null };
    // Estados guardados antes de que existiera el versionado arrancan en 0.
    if (typeof state.rev !== 'number') state.rev = 0;
    return { ok: true, state };
  } catch (err) {
    return { ok: false, error: `Estado guardado ilegible: ${String(err)}` };
  }
};

// Rechaza cualquier cosa que no tenga la forma mínima de un AppState. Es la
// última barrera contra escribir basura en el documento compartido.
const looksLikeAppState = s =>
  !!s &&
  typeof s === 'object' &&
  !Array.isArray(s) &&
  Array.isArray(s.users) &&
  Array.isArray(s.buyerQueue) &&
  typeof s.lastProcessedWednesday === 'string';

export default async function handler(req, res) {
  const token = process.env.GIST_TOKEN;
  res.setHeader('Cache-Control', 'no-store');

  // ── Leer estado ──────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const result = await readState(token);
    if (!result.ok) {
      // 502 y no "200 null": el cliente TIENE que poder distinguir "todavía no
      // hay nada" de "el backend está caído", porque en el segundo caso no
      // puede dar por bueno su estado local ni escribir encima.
      return res.status(502).json({ ok: false, error: result.error });
    }
    return res.status(200).json(result.state);
  }

  // ── Guardar estado ───────────────────────────────────────────────────────
  if (req.method === 'POST') {
    if (!token) {
      return res.status(500).json({ ok: false, error: 'GIST_TOKEN no configurado en el servidor' });
    }

    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { body = null; }
    }

    // El cliente nuevo manda { expectedRev, state }. Un cliente viejo (pestaña
    // que quedó abierta con el bundle anterior) manda el AppState pelado y sin
    // versión: se rechaza a propósito. Ese cliente es exactamente el que puede
    // pisar el documento con datos viejos, así que se le pide recargar.
    if (!body || typeof body !== 'object' || !('state' in body)) {
      return res.status(426).json({
        ok: false,
        outdatedClient: true,
        error: 'Versión vieja de la app: recargá la página para seguir guardando.',
      });
    }

    const { state, expectedRev } = body;
    if (!looksLikeAppState(state)) {
      return res.status(400).json({ ok: false, error: 'El estado enviado no tiene la forma esperada' });
    }
    if (expectedRev !== null && typeof expectedRev !== 'number') {
      return res.status(400).json({ ok: false, error: 'expectedRev inválido' });
    }

    const current = await readState(token);
    if (!current.ok) {
      // No sabemos contra qué estamos escribiendo: no escribimos.
      return res.status(502).json({ ok: false, error: current.error });
    }

    const currentRev = current.state ? current.state.rev : null;

    // expectedRev === null significa "creo que el documento está vacío". Solo
    // vale si de verdad lo está. Esto es lo que impide que un dispositivo que
    // arranca sin datos (navegador nuevo, incógnito, storage borrado) suba su
    // estado semilla encima del estado real del grupo.
    if (currentRev !== expectedRev) {
      return res.status(409).json({
        ok: false,
        conflict: true,
        error: 'El estado cambió mientras editabas',
        state: current.state,
      });
    }

    const toWrite = { ...state, rev: (currentRev ?? 0) + 1 };

    try {
      const r = await fetch(GIST_API_URL, {
        method: 'PATCH',
        headers: { ...ghHeaders(token), 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: { [STATE_FILE]: { content: JSON.stringify(toWrite) } } }),
      });
      if (!r.ok) {
        const text = await r.text().catch(() => '');
        return res.status(502).json({ ok: false, error: text.slice(0, 300) });
      }
      return res.status(200).json({ ok: true, rev: toWrite.rev });
    } catch (err) {
      return res.status(502).json({ ok: false, error: String(err) });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ ok: false, error: 'Método no permitido' });
}
