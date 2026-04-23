/**
 * Vercel Serverless Entry Point
 *
 * Vercel picks up this file automatically and runs it as a Node.js
 * serverless function. All /api/* requests are rewritten here (see
 * vercel.json) and Express handles the routing internally.
 */
import app from '../server/app.js';

export default app;
