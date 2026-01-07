import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
const isElectron = process.env.TF_TARGET === 'electron' || process.env.ELECTRON === 'true';

export default defineConfig({
  // Exclude superproductivity folder from scanning
  resolve: {
    alias: {
      '@': '/src'
    }
  },
  plugins: [
    tailwindcss(),
    react({
      // Performance optimizations for React 19
      jsxRuntime: 'automatic'
    }),
    VitePWA({
      // Auto updating SW; manual page reload will activate latest SW immediately
      registerType: 'autoUpdate',
      // Add cache busting for SW updates
      injectRegister: 'auto',
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        // Force SW to update on every build
        cleanupOutdatedCaches: true,
        // IMPORTANT: Exclude HTML to ensure fresh scripts are loaded on each visit
        globPatterns: ['**/*.{js,css,ico,svg,json,woff2}'],
        // Exclude large background images and screenshots from precache
        globIgnores: ['**/screenshots/**', '**/backgrounds/**', '**/node_modules/**', '**/index.html'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
        runtimeCaching: [
          // HTML: Always try network first to get fresh app
          {
            urlPattern: /.*\.html$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'html-cache',
              expiration: {
                maxEntries: 5,
                maxAgeSeconds: 0 // No caching of HTML
              },
              networkTimeoutSeconds: 3
            }
          },
          // JS/CSS: Try network first for updates - aggressive refresh
          {
            urlPattern: /.*\.(js|css)$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'assets-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 5 // 5 minutes - aggressive refresh for bug fixes
              },
              networkTimeoutSeconds: 2,
              // Force revalidation on every request
              fetchOptions: {
                cache: 'no-cache'
              }
            }
          },
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
          },
          // Background images: Cache on demand (too large for precache)
          {
            urlPattern: /\/backgrounds\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'backgrounds-cache',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 Tage
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
  
  // Remove console.logs and debugger statements in production
  esbuild: {
    drop: ['console', 'debugger'],
  },
  
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
          },
        // Optimize chunk names
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    // Faster builds with modern target
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
    // Allow custom domain access via ngrok
    allowedHosts: ['taskfuchs.unique-landuse.de', 'localhost', '.ngrok.io', '.ngrok-free.app'],
    // HMR configuration for external access
    hmr: {
      overlay: false,
      // Use the client's host for HMR WebSocket (needed for ngrok)
      clientPort: 443,
      protocol: 'wss'
    },
    // Better caching
    fs: {
      strict: false,
      // Exclude superproductivity from being served
      deny: ['**/superproductivity/**']
    },
    // Ignore superproductivity in file watcher
    watch: {
      ignored: ['**/superproductivity/**', '**/node_modules/**']
    },
    // Proxy configuration (more specific routes first!)
    proxy: {
      // Proxy for Toggl API to avoid CORS issues (must be before /api)
      '/api/toggl': {
        target: 'https://api.track.toggl.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/toggl/, ''),
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.log('Toggl Proxy error:', err);
          });
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('User-Agent', 'TaskFuchs/1.0');
          });
        }
      },
      // Proxy all /api requests to the backend server
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        ws: true, // Enable WebSocket proxying
        configure: (proxy) => {
          proxy.on('error', (err, req, res) => {
            console.log('API Proxy error:', err.message);
            // Send error response if possible (res can be Socket or ServerResponse)
            if (res && 'writeHead' in res && !res.headersSent) {
              res.writeHead(502, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Backend server not reachable' }));
            }
          });
          proxy.on('proxyReq', (proxyReq, req) => {
            console.log('Proxying:', req.method, req.url);
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
    // Only scan src folder, exclude superproductivity
    entries: ['src/**/*.{ts,tsx}', 'index.html'],
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
