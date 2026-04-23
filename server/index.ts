import app from './app.js';
import { join } from 'path';
import { existsSync } from 'fs';
import express from 'express';

// ─── Environment validation (local dev / self-hosted only) ───────────────────
// On Vercel, env vars are injected at runtime — validation happens inside each route.

const requiredEnv = ['WORLDPAY_MERCHANT_CODE', 'WORLDPAY_XML_PASSWORD', 'WORLDPAY_ENDPOINT'] as const;
const missingEnv = requiredEnv.filter(key => !process.env[key]);
if (missingEnv.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingEnv.forEach(key => console.error(`  ${key}`));
  console.error('  Copy .env.example to .env and fill in your values.');
  process.exit(1);
}

// ─── Production frontend serving (local/self-hosted only) ────────────────────
// On Vercel, static assets are served by the CDN — this block only applies
// when running the server locally with NODE_ENV=production.

if (process.env.NODE_ENV === 'production') {
  const distPath = join(process.cwd(), 'dist');

  if (existsSync(distPath)) {
    app.use(express.static(distPath));

    // SPA fallback — serve index.html for all non-API routes
    app.get('*', (_req, res) => {
      res.sendFile(join(distPath, 'index.html'));
    });
  } else {
    console.warn('⚠️  dist/ not found. Run `npm run build` before starting in production.');
  }
}

// ─────────────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`✅ API Server running on http://localhost:${PORT}`);
  console.log(`   - Routing validation: GET /api/routing/:routingNumber`);
  console.log(`   - ACH payment:        POST /api/payment/ach`);
  console.log(`   - Health check:       GET /api/health`);
  if (process.env.NODE_ENV === 'production') {
    console.log(`   - Frontend:           serving from dist/`);
  }
});
