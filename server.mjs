/**
 * Local EventEase server — static files + /api/chat
 * Usage: node server.mjs
 * Reads EXPLABS_API_KEY from .env (never expose to the browser).
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 8000;

// Load .env
try {
  const envText = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
  for (const line of envText.split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch {
  console.warn('No .env file found — set EXPLABS_API_KEY in the environment.');
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json',
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

async function handleChat(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  try {
    const raw = await readBody(req);
    const body = raw ? JSON.parse(raw) : {};
    if ((raw || '').length > 120000) {
      res.writeHead(413, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Request too large' }));
      return;
    }
    const { messages, mode, model: reqModel } = body;
    const ALLOWED = new Set(['gpt-4o-mini', 'gpt-4.1-nano', 'gpt-4.1-mini', 'claude-haiku-4.5']);
    if (!Array.isArray(messages)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'messages must be an array' }));
      return;
    }

    const key = process.env.EXPLABS_API_KEY;
    if (!key) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'EXPLABS_API_KEY is not configured' }));
      return;
    }

    let model = (reqModel && ALLOWED.has(reqModel) ? reqModel : null) || process.env.EXPLABS_MODEL || 'gpt-4o-mini';

    const system =
      mode === 'support'
        ? 'You are the EventEase Support Assistant. Guide users step by step through EventEase (accounts stored in browser localStorage, Events/Guests/Tasks/Budget/Venue tabs, PWA install) and troubleshoot problems. Be brief, numbered steps, never ask for passwords.'
        : mode === 'planner'
          ? 'You generate complete event plans. Reply with ONLY valid JSON, no markdown, with keys: name, type, date (YYYY-MM-DD or empty), time (HH:MM or empty), location, guests (number), budget (number in INR), summary, tasks (array of {title, priority: High|Medium|Low, when}), budget_breakdown (array of {item, amount}), schedule (array of {time, activity}), invitation (warm invitation text). Tailor everything to the request and use INR.'
          : 'You are EventEase AI, a concise and helpful event planning assistant. Help with event schedules, checklists, guest management, venue planning and budgets. Be practical and friendly.';

    const upstream = await fetch('https://api.experientiallabs.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: system }, ...messages.slice(-20)],
        temperature: 0.7,
      }),
    });

    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      res.writeHead(upstream.status, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          error: data?.error?.message || 'Experiential Labs request failed',
        })
      );
      return;
    }

    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(
      JSON.stringify({
        reply: data?.choices?.[0]?.message?.content || 'No response returned.',
        model,
      })
    );
  } catch (e) {
    console.error('chat error', e);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Unable to reach AI provider' }));
  }
}

function serveStatic(req, res) {
  let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';
  const filePath = path.normalize(path.join(__dirname, urlPath));
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const url = (req.url || '').split('?')[0];
  if (url === '/api/chat') return handleChat(req, res);
  return serveStatic(req, res);
});

server.listen(PORT, '0.0.0.0', () => {
  const keySet = Boolean(process.env.EXPLABS_API_KEY);
  console.log(`EventEase local server on http://0.0.0.0:${PORT}`);
  console.log(`EXPLABS_API_KEY: ${keySet ? 'configured' : 'MISSING'}`);
  console.log('Open http://127.0.0.1:' + PORT + '/app.html');
});
