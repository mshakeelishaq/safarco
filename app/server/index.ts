// Production server: serves the built app from dist/ and the /api/copilot endpoint.
//   npm run build && npm start        (PORT defaults to 8080)
import express from 'express';
import { fileURLToPath } from 'node:url';
import { handleCopilot } from './copilot.ts';

const dist = fileURLToPath(new URL('../dist', import.meta.url));
const app = express();
app.disable('x-powered-by');
app.all('/api/copilot', (req, res) => { handleCopilot(req, res); });
app.use(express.static(dist, { index: 'index.html', setHeaders: (res, path) => {
  if (/\/assets\//.test(path)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  else res.setHeader('Cache-Control', 'no-cache');
} }));
app.get(/^(?!\/api\/).*/, (_req, res) => res.sendFile('index.html', { root: dist }));

const port = Number(process.env.PORT || 8080);
app.listen(port, () => console.log(`SafarCo on http://localhost:${port} · co-pilot ${process.env.ANTHROPIC_API_KEY ? 'Claude' : 'free mode'}`));
