import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from './routes/auth.js';
import inventoryRoutes from './routes/inventory.js';
import receiptsRoutes from './routes/receipts.js';
import recipesRoutes from './routes/recipes.js';
import notificationsRoutes from './routes/notifications.js';

// Initialize database (creates tables if not exist)
import './db/schema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc)
    if (!origin) return callback(null, true);
    // Allow localhost and Railway URLs
    if (origin.includes('localhost') || origin.includes('railway.app')) {
      return callback(null, true);
    }
    // Also allow configured frontend URL
    if (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL) {
      return callback(null, true);
    }
    callback(null, true); // Allow all for now
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint (no auth required)
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    geminiConfigured: !!process.env.GEMINI_API_KEY,
    pushConfigured: !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY)
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/receipts', receiptsRoutes);
app.use('/api/recipes', recipesRoutes);
app.use('/api/notifications', notificationsRoutes);

// Error handling middleware
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║             Smart Pantry Backend Server v2.0                  ║
╠═══════════════════════════════════════════════════════════════╣
║  Status:      Running                                         ║
║  Port:        ${PORT}                                            ║
║  Gemini AI:   ${process.env.GEMINI_API_KEY ? 'Configured ✓' : 'Not configured ✗'}                            ║
║  Push Notif:  ${process.env.VAPID_PUBLIC_KEY ? 'Configured ✓' : 'Not configured ✗'}                            ║
║  Mode:        ${process.env.NODE_ENV || 'development'}                               ║
╚═══════════════════════════════════════════════════════════════╝

API Endpoints:

  Auth:
    POST /api/auth/register     - Create new account
    POST /api/auth/login        - Login and get token
    GET  /api/auth/me           - Get current user
    PUT  /api/auth/me           - Update user profile

  Inventory:
    GET  /api/inventory         - List items (with search/filter)
    GET  /api/inventory/search  - Search items
    GET  /api/inventory/stats   - Dashboard statistics
    GET  /api/inventory/expiring- Items expiring soon
    POST /api/inventory         - Add single item
    POST /api/inventory/bulk    - Add multiple items
    PUT  /api/inventory/:id     - Update item
    DEL  /api/inventory/:id     - Delete item

  Receipts:
    POST /api/receipts/upload   - Process receipt image
    GET  /api/receipts/history  - Receipt history

  Recipes:
    GET  /api/recipes/suggest   - AI recipe suggestions
    POST /api/recipes/suggest   - Recipes for specific items

  Notifications:
    GET  /api/notifications/vapid-public-key  - Get VAPID key
    POST /api/notifications/subscribe         - Subscribe to push
    POST /api/notifications/unsubscribe       - Unsubscribe
    POST /api/notifications/test              - Send test notification
    GET  /api/notifications/preferences       - Get preferences
    PUT  /api/notifications/preferences       - Update preferences
  `);
});

export default app;
