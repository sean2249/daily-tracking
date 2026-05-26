import { defineConfig } from 'vitest/config';

// Standalone config so Vitest does NOT load vite.config.js (which pulls in the
// PWA plugin and is irrelevant to unit tests). Tests target pure logic only and
// run in a plain Node environment — no DOM, no network.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.js'],
  },
});
