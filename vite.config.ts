import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
const isElectron = process.env.TF_TARGET === 'electron' || process.env.ELECTRON === 'true';

export default defineConfig({
  plugins: [
    react({
      // Performance optimizations for React
      jsxRuntime: 'automatic'
    }),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,woff2}'],
        globIgnores: ['**/screenshots/**', '**/node_modules/**'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 Jahr
              }
            }
          },
          {
            urlPattern: /\/screenshots\/.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'screenshots-cache',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 1 Woche
              }
            }
          }
        ]
      },
      manifest: {
        name: 'TaskFuchs - Aufgaben & Projekte',
        short_name: 'TaskFuchs',
        description: 'Professionelle Aufgabenverwaltung und Projektplanung für iOS, Android und Desktop',
        theme_color: '#3b82f6',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/android/mipmap-hdpi/ic_launcher.png',
            sizes: '72x72',
            type: 'image/png'
          },
          {
            src: '/android/mipmap-mdpi/ic_launcher.png',
            sizes: '48x48',
            type: 'image/png'
          },
          {
            src: '/android/mipmap-xhdpi/ic_launcher.png',
            sizes: '96x96',
            type: 'image/png'
          },
          {
            src: '/android/mipmap-xxhdpi/ic_launcher.png',
            sizes: '144x144',
            type: 'image/png'
          },
          {
            src: '/android/mipmap-xxxhdpi/ic_launcher.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/foxicon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/foxicon-1024.png',
            sizes: '1024x1024',
            type: 'image/png',
            purpose: 'any'
          }
        ]
      }
    })
  ],
  // Use relative base for Electron builds so assets resolve via file:// protocol
  base: isElectron ? './' : '/',
  
  // Performance optimizations
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // Better chunk splitting for faster loading
    rollupOptions: {
      output: {
                  manualChunks: {
            // Core React libraries
            vendor: ['react', 'react-dom'],
            // UI utilities
            ui: ['lucide-react'],
            // Date/time utilities  
            utils: ['date-fns'],
            // Internationalization (if used)
            // i18n: ['react-i18next', 'i18next']
          },
        // Optimize chunk names
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    // Faster builds
    target: 'esnext',
    minify: 'esbuild',
    // Reduce bundle size
    reportCompressedSize: false,
    chunkSizeWarningLimit: 1000,
    // Faster sourcemaps
    sourcemap: false
  },
  
  // Development server optimizations
  server: {
    port: 5173,
    host: true,
    // Faster HMR
    hmr: {
      overlay: false
    },
    // Better caching
    fs: {
      strict: false
    },
    // Proxy for Toggl API to avoid CORS issues
    proxy: {
      '/api/toggl': {
        target: 'https://api.track.toggl.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/toggl/, ''),
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.log('Proxy error:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            proxyReq.setHeader('User-Agent', 'TaskFuchs/1.0');
          });
        }
      }
    }
  },
  
  // Dependency optimization
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'lucide-react',
      'date-fns'
    ],
    // Faster dependency scanning
    force: false
  },
  
  // Better caching
  cacheDir: 'node_modules/.vite',
  
  // Faster CSS processing
  css: {
    devSourcemap: false
  }
})
