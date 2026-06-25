import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import svgr from 'vite-plugin-svgr'

export default defineConfig({
  plugins: [
    react(),
    // Enable importing SVGs as React components via `?react`
    svgr({ exportAsDefault: true }),
    VitePWA({
      registerType: 'autoUpdate',
      // IMPORTANT: Removed video/*.mp4 and image/*.jpg from includeAssets
      // Videos and images are now served from GCS CDN, not bundled in app
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'AURA - Dating App',
        short_name: 'AURA',
        description: 'Find your perfect match with AURA dating app',
        theme_color: '#FF7F7F',
        background_color: '#F9F4E2',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        // Exclude videos and large images from service worker cache
        // Only cache essential app assets (JS, CSS, HTML, icons)
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        // Reduced from 10MB to 3MB since we're not caching videos
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024, // 3 MB
        // Explicitly ignore video and image folders
        globIgnores: ['**/video/**', '**/image/**'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          // Cache GitHub CDN videos (raw.githubusercontent.com)
          {
            urlPattern: /^https:\/\/raw\.githubusercontent\.com\/.*\.mp4$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'github-cdn-videos',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              },
              cacheableResponse: {
                statuses: [200]
              }
            }
          },
          // Cache jsDelivr CDN videos (alternative GitHub CDN)
          {
            urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/.*\.mp4$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'jsdelivr-cdn-videos',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              },
              cacheableResponse: {
                statuses: [200]
              }
            }
          },
          // Cache GitHub CDN images
          {
            urlPattern: /^https:\/\/(raw\.githubusercontent\.com|cdn\.jsdelivr\.net)\/.*\.(png|jpg|jpeg|svg|gif|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'github-cdn-images',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              },
              cacheableResponse: {
                statuses: [200]
              }
            }
          },
          {
            urlPattern: /\/api\/.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 5 // 5 minutes
              }
            }
          }
        ]
      }
    })
  ],
  // Add this server configuration
  server: {
    host: '0.0.0.0', // This makes the server accessible from your local network
    // You can also specify a port if you want, otherwise Vite picks one
    // port: 3000,
  },
  build: {
    sourcemap: false, // Disable source maps in production to reduce size
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
        },
      },
    },
  },
})
