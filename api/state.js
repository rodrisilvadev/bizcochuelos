// Vercel Serverless Function — proxy del estado compartido vía GitHub Gist.
//
// El token vive SOLO en el servidor (process.env.GIST_TOKEN) y nunca llega al
// navegador. El cliente habla contra /api/state (GET para leer, POST para
// guardar) sin conocer ninguna credencial.
//
// Configurar en Vercel → Settings → Environment Variables:
//   GIST_TOKEN = <token de GitHub con permiso SOLO de gist>
// (sin prefijo VITE_, para que no se incruste en el bundle).

const GIST_ID = '551e62ee777a3ad6acc9e88504bb29b1';
const GIST_API_URL = `https://api.github.com/gists/${GIST_ID}`;

export default async function handler(req, res) {
  const token = process.env.GIST_TOKEN;

  // ── Leer estado ──────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const r = await fetch(GIST_API_URL, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'User-Agent': 'bizcochuelos-app',
          Accept: 'application/vnd.github+json',
        },
      });
      if (!r.ok) return res.status(200).json(null);
      const gist = await r.json();
      const content = gist.files && gist.files['state.json'] && gist.files['state.json'].content;
      if (!content) return res.status(200).json(null);
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json(JSON.parse(content));
    } catch {
      return res.status(200).json(null);
    }
  }

  // ── Guardar estado ───────────────────────────────────────────────────────
  if (req.method === 'POST') {
    if (!token) {
      return res.status(500).json({ ok: false, error: 'GIST_TOKEN no configurado en el servidor' });
    }
    try {
      // Vercel ya parsea el body JSON; lo re-serializamos para guardarlo tal cual.
      const state = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      const r = await fetch(GIST_API_URL, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'User-Agent': 'bizcochuelos-app',
          Accept: 'application/vnd.github+json',
        },
        body: JSON.stringify({ files: { 'state.json': { content: state } } }),
      });
      if (!r.ok) {
        const text = await r.text();
        return res.status(502).json({ ok: false, error: text });
      }
      return res.status(200).json({ ok: true });
    } catch (err) {
      return res.status(500).json({ ok: false, error: String(err) });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ ok: false, error: 'Método no permitido' });
}
