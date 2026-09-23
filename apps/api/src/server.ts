import { createApp } from './app';
import { config } from './config';
import { connectToDatabase } from './modules/db/connection';

// ---------------------------------------------------------------------------
// Startup guards
// ---------------------------------------------------------------------------

if (!config.jwt.secret || config.jwt.secret.length < 32) {
  if (!config.isDev) {
    console.error(
      '[Rehearsa API] FATAL: JWT_SECRET must be set to at least 32 characters in production. ' +
        'Refusing to start.'
    );
    process.exit(1);
  } else {
    console.warn(
      '[Rehearsa API] WARNING: JWT_SECRET is not configured or is too short. ' +
        'Set JWT_SECRET in your .env file before production use.'
    );
  }
}

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------

const app = createApp();

(async () => {
  try {
    await connectToDatabase(config.mongo.uri);
    console.log(`[Rehearsa API] Connected to MongoDB: ${config.mongo.uri.replace(/\/\/.*@/, '//<credentials>@')}`);
  } catch (err) {
    console.error('[Rehearsa API] Failed to connect to MongoDB:', err);
    process.exit(1);
  }

  app.listen(config.port, () => {
    console.log(`[Rehearsa API] Server running on http://localhost:${config.port}`);
    console.log(`[Rehearsa API] Health: http://localhost:${config.port}/api/health`);
    console.log(`[Rehearsa API] Auth:   http://localhost:${config.port}/auth`);
  });
})();
