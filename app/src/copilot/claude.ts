// Browser side of the optional Claude co-pilot. The server holds the API key and
// the tool list; tools run here, against the live trip.
import type Anthropic from '@anthropic-ai/sdk';
import { runTool, type ToolCtx } from './tools';

let enabled: Promise<boolean> | null = null;
/** True when the server has an Anthropic API key configured. */
export const claudeEnabled = () => enabled ??= fetch('/api/copilot').then(r => r.ok ? r.json() : { enabled: false }).then(j => !!j.enabled).catch(() => false);

interface Turn { content: Anthropic.Beta.BetaContentBlock[]; stop_reason: string | null }

/** Runs the tool loop through /api/copilot. onCall fires as each tool runs. */
export async function askClaude(text: string, summary: () => string, ctx: ToolCtx, onCall: (fn: string, args: unknown) => void): Promise<{ reply: string; acted: boolean }> {
  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: 'user', content: text }];
  let acted = false;
  for (let i = 0; i < 6; i++) {
    const r = await fetch('/api/copilot', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages, summary: summary() }) });
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'HTTP ' + r.status);
    const turn = await r.json() as Turn;
    if (turn.stop_reason === 'refusal') return { reply: 'I can’t help with that one. Ask me about your route, budget, dates or travellers.', acted };
    const uses = turn.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === 'tool_use');
    const said = turn.content.filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text').map(b => b.text).join('\n').trim();
    if (turn.stop_reason !== 'tool_use' || !uses.length) return { reply: said || 'Done. Your trip is updated.', acted };
    // Append the assistant turn unchanged, then every tool result in one user message.
    messages.push({ role: 'assistant', content: turn.content as Anthropic.Beta.BetaContentBlockParam[] });
    messages.push({ role: 'user', content: uses.map(u => {
      onCall(u.name, u.input); if (u.name !== 'get_trip_summary') acted = true;
      return { type: 'tool_result' as const, tool_use_id: u.id, content: runTool(u.name, (u.input || {}) as Record<string, unknown>, ctx) };
    }) });
  }
  return { reply: 'Done. Your trip is updated.', acted };
}
