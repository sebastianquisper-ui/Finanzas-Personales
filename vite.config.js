import { defineConfig } from 'vite';

// El sitio se publica en GitHub Pages como proyecto:
// https://sebastianquisper-ui.github.io/Finanzas-Personales/
export default defineConfig({
  base: '/Finanzas-Personales/',
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
