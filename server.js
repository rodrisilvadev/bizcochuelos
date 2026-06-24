import express from 'express';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const STATE_FILE = join(__dirname, 'state.json');

app.use(express.json({ limit: '1mb' }));

// Allow cross-origin for dev (Vite runs on different port)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Serve built app in production
app.use(express.static(join(__dirname, 'dist')));

// GET state
app.get('/api/state', (req, res) => {
  if (!existsSync(STATE_FILE)) {
    return res.json(null);
  }
  try {
    const data = readFileSync(STATE_FILE, 'utf-8');
    res.json(JSON.parse(data));
  } catch {
    res.json(null);
  }
});

// POST state
app.post('/api/state', (req, res) => {
  try {
    writeFileSync(STATE_FILE, JSON.stringify(req.body, null, 2), 'utf-8');
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// SPA fallback
app.get('*', (req, res) => {
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
