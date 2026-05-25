import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base is set for GitHub Pages project-site hosting (https://<user>.github.io/daily-tracking/).
export default defineConfig({
  base: '/daily-tracking/',
  plugins: [react()],
});
