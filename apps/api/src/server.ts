import { createApp } from './app';
import { config } from './config';

const app = createApp();

app.listen(config.port, () => {
  console.log(`[Rehearsa API] Server running on http://localhost:${config.port}`);
  console.log(`[Rehearsa API] Health check endpoint: http://localhost:${config.port}/api/health`);
});
