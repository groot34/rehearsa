import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [
      'packages/shared/src/tests/**/*.test.ts',
      'apps/api/src/modules/**/tests/**/*.test.ts',
      'apps/api/src/routes/tests/**/*.test.ts',
      'scripts/tests/**/*.test.ts',
    ],
    exclude: ['**/node_modules/**', '**/dist/**'],
  },
});
