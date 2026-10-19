const ALLOWED = new Set(['gpt-4o-mini', 'gpt-4.1-nano', 'gpt-4.1-mini', 'claude-haiku-4.5']);
const MAX_MESSAGES = 24;
const MAX_CONTENT = 4000;
const MAX_BODY = 120000;

// Simple in-memory rate limit (per isolate)
const hits = new Map();
function rateLimit(ip) {
  const now = Date.now();
  const windowMs = 60_000;
  const max = 30;
  let arr = hits.get(ip) || [];
  arr = arr.filter((t) => now - t < windowMs);
  if (arr.length >= max) return false;
  arr.push(now);
  hits.set(ip, arr);
  return true;
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const secret = process.env.EXPLABS_CHAT_SECRET;
  if (secret) {
    const hdr = req.headers['x-eventease-key'] || req.headers['X-EventEase-Key'];
    if (hdr !== secret) return res.status(401).json({ error: 'Unauthorized' });
  }

  const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'anon').toString().split(',')[0].trim();
  if (!rateLimit(ip)) return res.status(429).json({ error: 'Too many requests. Please wait a minute.' });

  try {
    const body = req.body || {};
    const rawLen = JSON.stringify(body).length;
    if (rawLen > MAX_BODY) return res.status(413).json({ error: 'Request too large' });

    const { messages, mode, model: reqModel } = body;
    if (!Array.isArray(messages)) return res.status(400).json({ error: 'messages must be an array' });
    if (messages.length > MAX_MESSAGES) return res.status(400).json({ error: 'Too many messages' });

    const cleaned = [];
    for (const m of messages.slice(-MAX_MESSAGES)) {
      if (!m || typeof m !== 'object') continue;
      const role = m.role === 'assistant' || m.role === 'system' ? m.role : 'user';
      const content = String(m.content || '').slice(0, MAX_CONTENT);
      if (!content) continue;
      cleaned.push({ role, content });
    }
    if (!cleaned.length) return res.status(400).json({ error: 'No valid messages' });

    const key = process.env.EXPLABS_API_KEY;
    if (!key) return res.status(500).json({ error: 'EXPLABS_API_KEY is not configured' });

    const model =
      (reqModel && ALLOWED.has(reqModel) ? reqModel : null) ||
      process.env.EXPLABS_MODEL ||
      'gpt-4o-mini';

    const system =
      mode === 'support'
        ? 'You are the EventEase Support Assistant. Guide users step by step through EventEase (accounts in browser localStorage; Events, Guests, Tasks, Budget, Venue; PWA install). Be brief, numbered steps, never ask for passwords.'
        : mode === 'planner'
          ? 'You generate complete event plans. Reply with ONLY valid JSON, no markdown, with keys: name, type, date (YYYY-MM-DD or empty), time (HH:MM or empty), location, guests (number), budget (number in INR), summary, tasks (array of {title, priority: High|Medium|Low, when}), budget_breakdown (array of {item, amount}), schedule (array of {time, activity}), invitation (warm invitation text). Use INR.'
          : 'You are EventEase AI, a concise event planning assistant. Use any live portfolio data the user provides. Help with schedules, checklists, guests, venues and budgets. Be practical and friendly. Do not invent events the user does not have.';

    const upstream = await fetch('https://api.experientiallabs.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: system }, ...cleaned],
        temperature: 0.7,
        max_tokens: 1200,
      }),
    });

    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      return res.status(upstream.status).json({
        error: data?.error?.message || 'Experiential Labs request failed',
      });
    }
    return res.status(200).json({
      reply: data?.choices?.[0]?.message?.content || 'No response returned.',
      model,
    });
  } catch (e) {
    return res.status(500).json({ error: 'Unable to reach AI provider' });
  }
}
