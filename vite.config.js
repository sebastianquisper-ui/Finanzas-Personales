import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// El sitio se publica en GitHub Pages como proyecto:
// https://sebastianquisper-ui.github.io/Finanzas-Personales/
const BASE = '/Finanzas-Personales/';

export default defineConfig({
  base: BASE,
  plugins: [
    VitePWA({
      // La versión nueva se instala sola y se usa al volver a abrir la app.
      registerType: 'autoUpdate',
      manifest: {
        name: 'Mis Finanzas',
        short_name: 'Mis Finanzas',
        description: 'Tus cuentas en soles: gastos, ingresos, presupuestos y metas.',
        lang: 'es-PE',
        start_url: BASE,
        scope: BASE,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#F2EFE6',
        theme_color: '#F2EFE6',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Cascarón de la app; los iconos grandes solo los usa el sistema al instalar.
        globPatterns: ['**/*.{js,css,html,webmanifest}', 'icons/icon-192.png', 'icons/apple-touch-icon.png'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com',
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'fuentes-css' },
          },
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.gstatic.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'fuentes',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  build: {
    // El SDK de Firebase (auth + firestore) pesa ~770 kB sin comprimir; es esperado.
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        // Librerías en archivos propios: cambian poco y el navegador las mantiene en caché.
        manualChunks: {
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          graficos: ['chart.js'],
        },
      },
    },
  },
});
