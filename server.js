require('dotenv').config();
const http = require('http');
const path = require('path');
const express = require('express');
const WebSocket = require('ws');

const API_KEY = process.env.GNANI_API_KEY;
if (!API_KEY) {
  console.error('[Katha] Missing GNANI_API_KEY. Add it to your .env file.');
  process.exit(1);
}

const PORT = process.env.PORT || 3000;
const STT_URL = 'wss://api.vachana.ai/stt/v3/stream';
const TTS_URL = 'https://api.vachana.ai/api/v1/tts/inference';
const ALLOWED_RATES = ['8000', '16000', '44100', '48000'];
const TTS_LANGS = ['hi-IN', 'en-IN', 'pa-IN', 'gu-IN', 'mr-IN', 'bn-IN', 'ta-IN', 'te-IN', 'kn-IN', 'ml-IN'];

const app = express();
app.set('trust proxy', 1); // behind Render's proxy, so req.ip is the visitor's address
app.use(express.json({ limit: '100kb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', (req, res) => res.json({ ok: true, app: 'Katha' }));

// ---------- Basic abuse limits (protects your Gnani credits on a public link) ----------
const ttsHits = new Map();                 // ip -> recent request timestamps
const TTS_LIMIT = 40;                      // spoken replies per IP ...
const TTS_WINDOW_MS = 10 * 60 * 1000;      // ... per 10 minutes
function ttsLimited(ip) {
  const now = Date.now();
  const recent = (ttsHits.get(ip) || []).filter((t) => now - t < TTS_WINDOW_MS);
  if (recent.length >= TTS_LIMIT) { ttsHits.set(ip, recent); return true; }
  recent.push(now);
  ttsHits.set(ip, recent);
  return false;
}
setInterval(() => {
  const now = Date.now();
  for (const [ip, arr] of ttsHits) {
    const keep = arr.filter((t) => now - t < TTS_WINDOW_MS);
    if (keep.length) ttsHits.set(ip, keep); else ttsHits.delete(ip);
  }
}, 60 * 1000).unref();

const MAX_CONNS = 20;                      // live caption sessions at once, whole server
const MAX_CONNS_PER_IP = 4;                // and per visitor
let totalConns = 0;
const connsByIp = new Map();

// ---------- Text to speech ----------
const AUDIO_CONFIG = {
  sample_rate: 48000,
  num_channels: 1,
  sample_width: 2,
  encoding: 'linear_pcm',
  container: 'wav',
};

function callTTS(payload) {
  return fetch(TTS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key-ID': API_KEY },
    body: JSON.stringify(payload),
  });
}

async function handleTTS(req, res) {
  if (ttsLimited(req.ip)) {
    return res.status(429).json({ error: 'Too many spoken replies. Please wait a few minutes.' });
  }
  const text = String((req.body && req.body.text) || req.query.text || '')
    .trim()
    .slice(0, 500);
  if (!text) return res.status(400).json({ error: 'No text provided' });

  const wanted = String((req.body && req.body.language) || req.query.language || 'auto');
  const language = TTS_LANGS.includes(wanted) ? wanted : 'auto';
  const hasDevanagari = /[\u0900-\u097F]/.test(text);

  // Try the requested language first, then auto-detect, then the older model.
  const attempts = [{ model: 'timbre-v3.0', voice: 'Shivani', language }];
  if (language !== 'auto') attempts.push({ model: 'timbre-v3.0', voice: 'Shivani', language: 'auto' });
  attempts.push({
    model: 'timbre-v2.5',
    voice: hasDevanagari ? 'Nalini' : 'Kaveri',
    language: hasDevanagari ? 'hi-IN' : 'en-IN',
  });

  try {
    let r;
    let lastDetail = '';
    for (const a of attempts) {
      r = await callTTS({
        text,
        voice: a.voice,
        model: a.model,
        language: a.language,
        speed: 1.0,
        audio_config: AUDIO_CONFIG,
      });
      if (r.ok) break;
      lastDetail = await r.text();
      console.error(`TTS failed (${a.model}, ${a.language}):`, r.status, lastDetail);
    }
    if (!r.ok) return res.status(502).json({ error: 'Text to speech failed', detail: lastDetail });

    const audio = Buffer.from(await r.arrayBuffer());
    res.set('Content-Type', 'audio/wav');
    res.send(audio);
  } catch (err) {
    console.error('TTS error:', err);
    res.status(500).json({ error: 'Text to speech failed' });
  }
}

app.post('/api/tts', handleTTS);
app.get('/api/tts', handleTTS);

// ---------- Speech to text (WebSocket proxy) ----------
const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: '/ws/stt' });

function sendJSON(ws, obj) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
}

wss.on('connection', (client, req) => {
  const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  if (totalConns >= MAX_CONNS || (connsByIp.get(ip) || 0) >= MAX_CONNS_PER_IP) {
    sendJSON(client, { type: 'error', message: 'The service is busy right now. Please try again in a minute.' });
    client.close();
    return;
  }
  totalConns++;
  connsByIp.set(ip, (connsByIp.get(ip) || 0) + 1);
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    totalConns--;
    const n = (connsByIp.get(ip) || 1) - 1;
    if (n > 0) connsByIp.set(ip, n); else connsByIp.delete(ip);
  };
  client.on('close', release);

  const params = new URL(req.url, 'http://localhost').searchParams;
  const lang = params.get('lang') || 'indic-auto';
  const rate = ALLOWED_RATES.includes(params.get('rate')) ? params.get('rate') : '16000';
  const silence = Math.min(2000, Math.max(100, parseInt(params.get('silence'), 10) || 400));
  const vad = Math.min(0.95, Math.max(0.1, parseFloat(params.get('vad')) || 0.5));

  const upstream = new WebSocket(STT_URL, {
    headers: {
      'x-api-key-id': API_KEY,
      'x-model': 'prisma-v3.0',
      lang_code: lang,
      'x-sample-rate': rate,
      'x-format': 'transcribe',
      'x-vad-threshold': String(vad),
      'x-min-silence-ms': String(silence),
    },
  });

  // Gnani -> browser
  upstream.on('message', (data) => {
    if (client.readyState === WebSocket.OPEN) client.send(data.toString());
  });

  // browser -> Gnani (audio frames)
  client.on('message', (data, isBinary) => {
    if (upstream.readyState === WebSocket.OPEN) upstream.send(data, { binary: isBinary });
  });

  upstream.on('unexpected-response', (_req, res) => {
    sendJSON(client, {
      type: 'error',
      message: `Gnani rejected the connection (HTTP ${res.statusCode}). Check the API key.`,
    });
    upstream.terminate();
    client.close();
  });
  upstream.on('error', (err) => {
    console.error('Upstream error:', err.message);
    sendJSON(client, { type: 'error', message: 'Could not reach the speech service.' });
  });
  upstream.on('close', () => client.close());
  client.on('close', () => upstream.close());
  client.on('error', () => upstream.close());
});

server.listen(PORT, () => console.log(`Katha running at http://localhost:${PORT}`));
