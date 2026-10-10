import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { copilotMiddleware } from './server/copilot.ts';

export default defineConfig({
  plugins: [
    react(),
    {
      // Serves /api/copilot during `npm run dev`; production uses server/index.ts.
      name: 'safarco-copilot',
      configureServer(server) { server.middlewares.use(copilotMiddleware()); },
      configurePreviewServer(server) { server.middlewares.use(copilotMiddleware()); }
    }
  ],
  test: { environment: 'node' }
});
