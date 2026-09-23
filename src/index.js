import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { env } from './config/env.js';
import { connectDb } from './config/db.js';
import { openapiSpec } from './config/openapi.js';
import authRoutes from './routes/auth.routes.js';
import patientRoutes from './routes/patients.routes.js';
import appointmentRoutes from './routes/appointments.routes.js';
import visitNoteRoutes from './routes/visitNotes.routes.js';
import mediaRoutes from './routes/media.routes.js';
import videoRoutes from './routes/videos.routes.js';
import staffRoutes from './routes/staff.routes.js';
import subscriptionRoutes from './routes/subscription.routes.js';
import ownerRoutes from './routes/owner.routes.js';
import clinicRoutes from './routes/clinic.routes.js';

export const app = express();

app.use(
  cors({
    // Comma-separated list in CLIENT_ORIGIN (e.g. http://localhost:4200,https://your-app.vercel.app)
    origin(origin, cb) {
      if (!origin) return cb(null, true);
      const allowed = (env.clientOrigin || '').split(',').map((s) => s.trim());
      if (allowed.includes('*') || allowed.includes(origin)) return cb(null, true);
      return cb(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

app.get('/api-docs.json', (_req, res) => res.json(openapiSpec));
const SWAGGER_CDN = 'https://unpkg.com/swagger-ui-dist@5';
app.get(/^\/api-docs\/?$/, (_req, res) => {
  res.type('html').send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Clinics Management SaaS API — Swagger</title>
  <link rel="stylesheet" href="${SWAGGER_CDN}/swagger-ui.css" />
  <style>html, body { margin: 0; }</style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="${SWAGGER_CDN}/swagger-ui-bundle.js"></script>
  <script>
    window.onload = function () {
      window.ui = SwaggerUIBundle({
        url: '/api-docs.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [SwaggerUIBundle.presets.apis],
        layout: 'BaseLayout',
        tryItOutEnabled: true,
      });
    };
  </script>
</body>
</html>`);
});

app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/visit-notes', visitNoteRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/clinic', clinicRoutes);
app.use('/api/owner', ownerRoutes);

// Central error handler
app.use((err, _req, res, _next) => {
  if (err?.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ message: 'File too large (max 8 MB)' });
  }
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Invalid JSON body' });
  }
  if (err?.name === 'ValidationError') {
    return res.status(400).json({ message: err.message });
  }
  if (err?.code === 11000) {
    return res.status(409).json({ message: 'Duplicate value already exists' });
  }
  console.error('[error]', err);
  res.status(500).json({ message: 'Internal server error' });
});

async function main() {
  await connectDb();
  app.listen(env.port, () => console.log(`[api] listening on http://localhost:${env.port}`));
}

const isMain =
  typeof process !== 'undefined' && process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isMain) {
  main().catch((e) => {
    console.error('Failed to start server:', e.message);
    process.exit(1);
  });
}