import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Cache all app assets for offline use
      workbox: {
<<<<<<< HEAD
=======
    	skipWaiting: true,
    	clientsClaim: true,
>>>>>>> master
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            // Cache API responses for offline reading
            urlPattern: /^https?:\/\/.*\/api\/v1\/.*/i,
            handler: 'NetworkFirst', // try network first, fall back to cache
            options: {
              cacheName: 'chamabook-api-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 24 * 60 * 60 }, // 24hrs
              networkTimeoutSeconds: 5,
            },
          },
        ],
      },
      manifest: {
        name: 'ChamaBook',
        short_name: 'ChamaBook',
        description: 'Digital savings management for SACCOs and chamas',
        theme_color: '#1a6b3c',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
  server: {
    proxy: {
      // Proxy API calls to Go backend during development
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
