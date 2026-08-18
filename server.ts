import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { apiRouter } from './server/routes/apiRouter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Mount API REST router FIRST (Canonical /api/v1 and legacy /api alias)
  app.use('/api/v1', apiRouter);
  app.use('/api', apiRouter);

  // Health check
  app.get('/api/health', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.json({
      status: 'ok',
      service: 'HRMS Enterprise Backend API',
      version: '1.0.0-phase0',
      timestamp: new Date().toISOString(),
    });
  });

  // Explicit JSON 404 Catch-All for all /api/* routes
  // Guarantees no API route ever falls through to Vite HTML SPA fallback
  app.all('/api/*', (req, res) => {
    res.status(404).setHeader('Content-Type', 'application/json').json({
      success: false,
      error: `API endpoint not found: ${req.method} ${req.originalUrl}`,
      code: 'API_ENDPOINT_NOT_FOUND',
      statusCode: 404,
    });
  });

  // Vite middleware for development or static dist in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[HRMS Backend] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[HRMS Backend] Error starting server:', err);
});

