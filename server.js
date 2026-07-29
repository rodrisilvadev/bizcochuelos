import express from 'express';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Backend de desarrollo. Guarda en state.json en vez de en el Gist, pero habla
// EXACTAMENTE el mismo protocolo que api/state.js (compare-and-set con `rev`,
// 409 en conflicto, 502 si el almacenamiento falla). Si dev y producción no
// coinciden en esto, los bugs de concurrencia solo aparecen en producción.

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const STATE_FILE = join(__dirname, 'state.json');

app.use(express.json({ limit: '1mb' }));

// Allow cross-origin for dev (Vite runs on different port)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Serve built app in production
app.use(express.static(join(__dirname, 'dist')));

// Devuelve { ok, state } | { ok: false, error }. Un archivo ilegible es un
// error, no "no hay estado": borrarlo por las dudas sería perder los datos.
const readState = () => {
  if (!existsSync(STATE_FILE)) return { ok: true, state: null };
  try {
    const state = JSON.parse(readFileSync(STATE_FILE, 'utf-8'));
    if (!state || typeof state !== 'object') return { ok: true, state: null };
    if (typeof state.rev !== 'number') state.rev = 0;
    return { ok: true, state };
  } catch (err) {
    return { ok: false, error: `state.json ilegible: ${String(err)}` };
  }
};

const looksLikeAppState = s =>
  !!s &&
  typeof s === 'object' &&
  !Array.isArray(s) &&
  Array.isArray(s.users) &&
  Array.isArray(s.buyerQueue) &&
  typeof s.lastProcessedWednesday === 'string';

app.get('/api/state', (req, res) => {
  const result = readState();
  if (!result.ok) return res.status(502).json({ ok: false, error: result.error });
  res.json(result.state);
});

app.post('/api/state', (req, res) => {
  const body = req.body;
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

  const current = readState();
  if (!current.ok) return res.status(502).json({ ok: false, error: current.error });

  const currentRev = current.state ? current.state.rev : null;
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
    writeFileSync(STATE_FILE, JSON.stringify(toWrite, null, 2), 'utf-8');
    res.json({ ok: true, rev: toWrite.rev });
  } catch (err) {
    res.status(502).json({ ok: false, error: String(err) });
  }
});

// SPA fallback — Express 5 exige comodín con nombre o regex ('*' pelado rompe)
app.get(/.*/, (req, res) => {
  const indexPath = join(__dirname, 'dist', 'index.html');
  if (existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Primero ejecuta "npm run build"');
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Bizcochuelos server corriendo en http://localhost:${PORT}`);
  console.log(`   Estado compartido en: ${STATE_FILE}`);
  console.log(`   Otros en la red pueden acceder por la IP de esta máquina`);
});
