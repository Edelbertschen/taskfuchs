import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serve } from '@hono/node-server';
import { prisma } from './db/client.js';

// Import routes
import authRoutes from './routes/auth.js';
import tasksRoutes from './routes/tasks.js';
import columnsRoutes from './routes/columns.js';
import tagsRoutes from './routes/tags.js';
import notesRoutes from './routes/notes.js';
import pinColumnsRoutes from './routes/pinColumns.js';
import preferencesRoutes from './routes/preferences.js';
import viewStateRoutes from './routes/viewState.js';
import calendarRoutes from './routes/calendar.js';
import syncRoutes from './routes/sync.js';
import adminRoutes from './routes/admin.js';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', cors({
  origin: (origin) => {
    // Allow all origins for proxied requests (origin may be undefined when proxied)
    if (!origin) return '*';
    // Allow localhost, ngrok, and custom domain
    if (origin.includes('localhost')) return origin;
    if (origin.includes('ngrok')) return origin;
    if (origin.includes('taskfuchs')) return origin;
    if (origin.includes('unique-landuse')) return origin;
    return origin; // Allow all origins as fallback
  },
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposeHeaders: ['Content-Length', 'X-Request-Id'],
}));

// Health check
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

// API Routes
app.route('/api/auth', authRoutes);
app.route('/api/tasks', tasksRoutes);
app.route('/api/columns', columnsRoutes);
app.route('/api/tags', tagsRoutes);
app.route('/api/notes', notesRoutes);
app.route('/api/pin-columns', pinColumnsRoutes);
app.route('/api/preferences', preferencesRoutes);
app.route('/api/view-state', viewStateRoutes);
app.route('/api/calendar', calendarRoutes);
app.route('/api/sync', syncRoutes);
app.route('/api/admin', adminRoutes);

// Error handling
app.onError((err, c) => {
  console.error('Server error:', err);
  return c.json({ error: 'Internal server error', message: err.message }, 500);
});

// Not found
app.notFound((c) => {
  return c.json({ error: 'Not found' }, 404);
});

// Start server
const port = parseInt(process.env.PORT || '3001');

console.log(`🦊 TaskFuchs API Server starting...`);

// Test database connection
prisma.$connect()
  .then(() => {
    console.log('✅ Database connected');
    serve({
      fetch: app.fetch,
      port,
      hostname: '0.0.0.0', // Bind to all interfaces
    });
    console.log(`🚀 Server running on http://0.0.0.0:${port}`);
  })
  .catch((err) => {
    console.error('❌ Database connection failed:', err);
    process.exit(1);
  });

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down...');
  await prisma.$disconnect();
  process.exit(0);
});

export default app;

