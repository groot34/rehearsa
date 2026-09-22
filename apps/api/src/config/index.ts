import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev: (process.env.NODE_ENV || 'development') === 'development',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  crawl: {
    maxPages: parseInt(process.env.CRAWL_MAX_PAGES_PER_SITE || '5', 10),
    timeoutMs: parseInt(process.env.CRAWL_TIMEOUT_MS || '10000', 10),
    maxBodySizeBytes: parseInt(process.env.CRAWL_MAX_BODY_SIZE_BYTES || '2097152', 10),
    allowLoopbackInDev: process.env.ALLOW_LOOPBACK_IN_DEV === 'true',
  },
};
