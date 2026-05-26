import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// base is set for GitHub Pages project-site hosting (https://<user>.github.io/daily-tracking/).
export default defineConfig({
  base: '/daily-tracking/',
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      registerType: 'autoUpdate',
      injectRegister: null, // registered manually in main.jsx
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico,woff2}'],
      },
      manifest: {
        name: 'Pixie · Daily',
        short_name: 'Pixie',
        description: 'A pixel-art habit & chore tracker — be consistent, and Pixie thrives.',
        lang: 'en',
        theme_color: '#d96f47',
        background_color: '#f0e2c0',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/daily-tracking/',
        start_url: '/daily-tracking/',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
});
