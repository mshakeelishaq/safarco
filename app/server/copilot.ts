// /api/copilot: a thin, rate-limited proxy to Claude for the trip co-pilot.
// It is off unless ANTHROPIC_API_KEY is set. The browser runs the tools; this
// server owns the model, system prompt and tool list so clients can't change them.
import Anthropic from '@anthropic-ai/sdk';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { TOOL_SCHEMAS, systemPrompt } from '../src/copilot/schema.ts';

const MODEL = 'claude-opus-5-5';
const PER_HOUR = Number(process.env.COPILOT_REQUESTS_PER_HOUR || 60);
const hits = new Map<string, number[]>();

const enabled = () => !!process.env.ANTHROPIC_API_KEY;
let client: Anthropic | null = null;

function limited(ip: string) {
  const now = Date.now(), list = (hits.get(ip) || []).filter(t => now - t < 3600_000);
  list.push(now); hits.set(ip, list);
  return list.length > PER_HOUR;
}

const send = (res: ServerResponse, code: number, body: unknown) => { res.statusCode = code; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(body)); };

async function readJson(req: IncomingMessage, max = 200_000): Promise<any> {
  let size = 0; const chunks: Buffer[] = [];
  for await (const c of req) { size += (c as Buffer).length; if (size > max) throw new Error('Request too large'); chunks.push(c as Buffer); }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

export async function handleCopilot(req: IncomingMessage, res: ServerResponse) {
  if (req.method === 'GET') return send(res, 200, { enabled: enabled() });
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
  if (!enabled()) return send(res, 503, { error: 'Co-pilot is not configured' });
  const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  if (limited(ip)) return send(res, 429, { error: 'Too many co-pilot requests. Try again later.' });

  let body: { messages?: Anthropic.Beta.BetaMessageParam[]; summary?: string };
  try { body = await readJson(req); } catch (e) { return send(res, 400, { error: (e as Error).message }); }
  const messages = body.messages;
  if (!Array.isArray(messages) || !messages.length || messages.length > 14 || messages[0].role !== 'user') return send(res, 400, { error: 'Bad messages' });

  client ??= new Anthropic();
  try {
    const today = new Date().toISOString().slice(0, 10);
    const msg = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      output_config: { effort: 'low' },
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: systemPrompt(today, String(body.summary || '').slice(0, 2000)),
      tools: TOOL_SCHEMAS.map(t => ({ ...t, strict: true })) as Anthropic.Beta.BetaTool[],
      messages
    });
    send(res, 200, { content: msg.content, stop_reason: msg.stop_reason });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return send(res, 429, { error: 'The assistant is busy. Try again in a moment.' });
    if (e instanceof Anthropic.APIError) { console.error('copilot:', e.status, e.message); return send(res, 502, { error: 'The assistant could not answer.' }); }
    console.error('copilot:', e); send(res, 500, { error: 'Co-pilot error' });
  }
}

/** Connect-style middleware for the Vite dev and preview servers. */
export const copilotMiddleware = () => (req: IncomingMessage, res: ServerResponse, next: () => void) => {
  if (req.url?.split('?')[0] === '/api/copilot') { handleCopilot(req, res); return; }
  next();
};
