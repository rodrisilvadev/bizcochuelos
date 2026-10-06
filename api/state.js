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

// El Gist es público, así que su contenido se puede leer sin credencial por el
// CDN de GitHub. Es la red de contención para cuando el token no sirve: con el
// token vencido, la app se quedaba sin leer NI escribir, cada teléfono mostraba
// su última copia local como si estuviera al día, y la cola de turnos quedó
// congelada una semana sin que nadie viera un error (ocurrió el 2026-09-29).
// Leyendo igual, la rotación de los miércoles se calcula en el cliente y la
// pantalla sigue mostrando a quien le toca de verdad; lo único que se pierde
// mientras el token esté roto es guardar.
const GIST_RAW_URL = `https://gist.githubusercontent.com/rodrisilvadev/${GIST_ID}/raw/${STATE_FILE}`;

const ghHeaders = token => ({
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
  'User-Agent': 'bizcochuelos-app',
  Accept: 'application/vnd.github+json',
});

const parseState = (text, origen) => {
  try {
    const state = JSON.parse(text);
    if (!state || typeof state !== 'object') return { ok: true, state: null };
    // Estados guardados antes de que existiera el versionado arrancan en 0.
    if (typeof state.rev !== 'number') state.rev = 0;
    return { ok: true, state };
  } catch (err) {
    return { ok: false, error: `Estado guardado ilegible (${origen}): ${String(err)}` };
  }
};

// Lectura sin credencial contra el CDN del Gist público. Solo se usa como
// respaldo: el contenido del CDN puede ir unos segundos atrás del real, y eso
// es aceptable cuando la alternativa es no leer nada.
const readPublicState = async () => {
  let r;
  try {
    r = await fetch(`${GIST_RAW_URL}?t=${Date.now()}`, {
      headers: { 'User-Agent': 'bizcochuelos-app' },
      cache: 'no-store',
    });
  } catch (err) {
    return { ok: false, error: `No se pudo contactar al Gist público: ${String(err)}` };
  }
  if (!r.ok) {
    return { ok: false, error: `El Gist público respondió ${r.status}` };
  }
  const text = await r.text().catch(() => '');
  if (!text) return { ok: true, state: null };
  return parseState(text, 'Gist público');
};

// Lee el estado actual del Gist.
// Devuelve { ok: true, state } (state es null si el Gist todavía no tiene
// nada guardado) o { ok: false, error } si GitHub no respondió bien.
//
// IMPORTANTE: un fallo de GitHub NO se puede reportar como "no hay estado".
// Antes esta función devolvía null en los dos casos, y el cliente entendía
// "la nube está vacía" ante cualquier hipo de red o token vencido — que es
// justo la situación en la que no hay que dejar escribir nada.
//
// `degraded: true` significa "esto lo pudimos leer, pero por la puerta de
// atrás": el token no sirve y por lo tanto NO se puede escribir. Quien llama
// tiene que distinguirlo de una lectura sana, porque intentar un guardado
// contra una `rev` leída así es escribir a ciegas.
const readState = async token => {
  let r;
  try {
    r = await fetch(`${GIST_API_URL}?t=${Date.now()}`, {
      headers: ghHeaders(token),
      cache: 'no-store',
    });
  } catch (err) {
    const fallback = await readPublicState();
    if (fallback.ok) return { ...fallback, degraded: true };
    return { ok: false, error: `No se pudo contactar a GitHub: ${String(err)}` };
  }

  if (!r.ok) {
    const text = await r.text().catch(() => '');
    const motivo = `GitHub respondió ${r.status}: ${text.slice(0, 300)}`;
    const fallback = await readPublicState();
    if (fallback.ok) return { ...fallback, degraded: true, error: motivo };
    return { ok: false, error: motivo };
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

  return parseState(file.content, 'Gist');
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
    // Se leyó, pero por el Gist público: el token no sirve y no se va a poder
    // guardar nada. Va en una cabecera y no dentro del estado, porque el
    // cuerpo de esta respuesta ES el AppState y meterle campos de transporte
    // lo contaminaría (el cliente lo normaliza y lo vuelve a subir tal cual).
    if (result.degraded) {
      res.setHeader('X-Bizcochuelos-Degraded', 'read-only');
      console.error('[bizcochuelos] modo solo-lectura:', result.error || 'token inválido');
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
    // Lo leído vino del Gist público porque el token falló. El compare-and-set
    // necesita la `rev` autoritativa, y el PATCH va a fallar igual: se corta
    // acá con un motivo que se entienda, en vez de un 502 genérico de GitHub.
    if (current.degraded) {
      res.setHeader('X-Bizcochuelos-Degraded', 'read-only');
      return res.status(503).json({
        ok: false,
        readOnly: true,
        error: 'El servidor no puede guardar: hay que renovar GIST_TOKEN en Vercel.',
      });
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
