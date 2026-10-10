import { defineConfig } from 'vitest/config';
import { loadEnv, type Plugin } from 'vite';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import react from '@vitejs/plugin-react';
import type { IncomingMessage, ServerResponse } from 'node:http';

// Runs the Vercel functions in api/ during `npm run dev` and `npm run preview`,
// so the app works locally the same way it does on Vercel.
function vercelApi(): Plugin {
  let load: (id: string) => Promise<Record<string, unknown>>;
  const handle = async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const url = new URL(req.url || '/', 'http://localhost'), m = /^\/api\/([a-z-]+)$/.exec(url.pathname);
    if (!m) return next();
    try {
      const mod = await load(`/api/${m[1]}.ts`), fn = mod[req.method || 'GET'] as ((r: Request) => Promise<Response>) | undefined;
      if (!fn) { res.statusCode = 405; return res.end(); }
      const out = await fn(new Request(url, { method: req.method }));
      res.statusCode = out.status; out.headers.forEach((v, k) => res.setHeader(k, v)); res.end(Buffer.from(await out.arrayBuffer()));
    } catch (e) { res.statusCode = 404; res.end(String(e)); }
  };
  return {
    name: 'vercel-api',
    configureServer(server) { load = id => server.ssrLoadModule(id); server.middlewares.use(handle); },
    configurePreviewServer(server) { load = id => import(/* @vite-ignore */ pathToFileURL(resolve('.' + id)).href); server.middlewares.use(handle); }
  };
}

export default defineConfig(({ mode }) => {
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''));
  return { plugins: [react(), vercelApi()], test: { environment: 'node' } };
});
