import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [
      'packages/shared/src/tests/**/*.test.ts',
      'apps/api/src/modules/**/tests/**/*.test.ts',
      'apps/api/src/routes/tests/**/*.test.ts',
      'scripts/tests/**/*.test.ts',
      'apps/web/src/tests/**/*.test.ts',
    ],
    exclude: ['**/node_modules/**', '**/dist/**'],
    // Increased from default 5s to accommodate mongodb-memory-server startup
    // and bcrypt operations under parallel test load (Milestone 8/9).
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
