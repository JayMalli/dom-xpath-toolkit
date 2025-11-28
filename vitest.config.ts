import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['test/**/*.{test,spec}.ts'],
    exclude: [
      'playwright/**/*',
      'examples/**/*',
      'node_modules/**/*',
      'dist/**/*',
      'coverage/**/*',
      'test-results/**/*',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      exclude: [
        'examples/**',
        'scripts/**',
        'basic_code.js',
        'lint-staged.config.js',
        '**/*.config.*',
        '**/dist/**',
        '**/node_modules/**',
        '**/test/**',
        '**/.*.cjs',
      ],
      thresholds: {
        lines: 70,
        branches: 65,
        functions: 90,
        statements: 70,
      },
    },
  },
});
