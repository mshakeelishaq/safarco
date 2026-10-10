// POST /api/log: crash reports from the app. They appear in Vercel → Project → Logs.
// Only the error text, the page and the browser are recorded; never trip or personal details.

export async function POST(request: Request) {
  const text = (await request.text().catch(() => '')).slice(0, 4000);
  let body: { message?: unknown; stack?: unknown; page?: unknown } = {};
  try { body = JSON.parse(text); } catch { /* not JSON */ }
  const clean = (v: unknown, n: number) => String(v ?? '').replace(/[\r\n]+/g, ' ').slice(0, n);
  console.error('[safarco client error]', JSON.stringify({ message: clean(body.message, 300), stack: clean(body.stack, 1500), page: clean(body.page, 100), agent: clean(request.headers.get('user-agent'), 200) }));
  return new Response(null, { status: 204 });
}
