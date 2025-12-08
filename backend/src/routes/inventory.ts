import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/schema.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import type { Ingredient, InventoryStats, ApiResponse } from '../types/index.js';

const router = Router();

// All inventory routes require authentication
router.use(authenticate);

/**
 * GET /api/inventory - Get all inventory items for the authenticated user
 */
router.get('/', (req: AuthRequest, res: Response) => {
  try {
    const { search, category, sort = 'expiry' } = req.query;

    let query = `
      SELECT id, name, category, quantity, expiry_date as expiryDate, confidence
      FROM ingredients
      WHERE user_id = ?
    `;
    const params: (string | undefined)[] = [req.userId];

    // Search filter
    if (search && typeof search === 'string') {
      query += ` AND name LIKE ?`;
      params.push(`%${search}%`);
    }

    // Category filter
    if (category && category !== 'all' && typeof category === 'string') {
      query += ` AND category = ?`;
      params.push(category);
    }

    // Sorting
    if (sort === 'name') {
      query += ` ORDER BY name ASC`;
    } else if (sort === 'category') {
      query += ` ORDER BY category ASC, expiry_date ASC`;
    } else {
      query += ` ORDER BY expiry_date ASC`;
    }

    const items = db.prepare(query).all(...params) as Ingredient[];

    res.json({ success: true, data: items } as ApiResponse<Ingredient[]>);
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch inventory' });
  }
});

/**
 * GET /api/inventory/search - Search inventory items
 */
router.get('/search', (req: AuthRequest, res: Response) => {
  try {
    const { q } = req.query;

    if (!q || typeof q !== 'string') {
      res.json({ success: true, data: [] });
      return;
    }

    const items = db.prepare(`
      SELECT id, name, category, quantity, expiry_date as expiryDate, confidence
      FROM ingredients
      WHERE user_id = ? AND name LIKE ?
      ORDER BY expiry_date ASC
      LIMIT 20
    `).all(req.userId, `%${q}%`) as Ingredient[];

    res.json({ success: true, data: items });
  } catch (error) {
    console.error('Error searching inventory:', error);
    res.status(500).json({ success: false, error: 'Failed to search inventory' });
  }
});

/**
 * GET /api/inventory/stats - Get inventory statistics
 */
router.get('/stats', (req: AuthRequest, res: Response) => {
  try {
    const today = new Date();
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    const allItems = db.prepare(`
      SELECT expiry_date FROM ingredients WHERE user_id = ?
    `).all(req.userId) as { expiry_date: string }[];

    let expired = 0;
    let expiring = 0;
    let fresh = 0;

    allItems.forEach(item => {
      const expiryDate = new Date(item.expiry_date);
      if (expiryDate < today) {
        expired++;
      } else if (expiryDate <= threeDaysFromNow) {
        expiring++;
      } else {
        fresh++;
      }
    });

    const total = allItems.length;

    // Get usage stats from this month
    const currentMonth = today.toISOString().slice(0, 7);
    const usageStats = db.prepare(`
      SELECT estimated_savings, co2_saved FROM usage_stats
      WHERE user_id = ? AND month = ?
    `).get(req.userId, currentMonth) as { estimated_savings: number; co2_saved: number } | undefined;

    // Calculate estimated waste saved (based on items not expired)
    const wasteSaved = usageStats?.estimated_savings
      ? `$${usageStats.estimated_savings.toFixed(0)}`
      : `$${Math.round((total - expired) * 3.5)}`;

    const co2Reduced = usageStats?.co2_saved
      ? `${usageStats.co2_saved.toFixed(1)}kg`
      : `${Math.round((total - expired) * 0.8)}kg`;

    const stats: InventoryStats = {
      total,
      expiring,
      expired,
      fresh,
      wasteSaved,
      co2Reduced
    };

    res.json({ success: true, data: stats } as ApiResponse<InventoryStats>);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
});

/**
 * POST /api/inventory - Add a single item
 */
router.post('/', (req: AuthRequest, res: Response) => {
  try {
    const { name, category, quantity, expiryDate, confidence = 1.0 } = req.body;

    if (!name || !category || !quantity || !expiryDate) {
      res.status(400).json({ success: false, error: 'Missing required fields' });
      return;
    }

    // Validate category
    const validCategories = ['Produce', 'Dairy', 'Pantry', 'Meat', 'Other'];
    if (!validCategories.includes(category)) {
      res.status(400).json({ success: false, error: 'Invalid category' });
      return;
    }

    const id = uuidv4();
    db.prepare(`
      INSERT INTO ingredients (id, user_id, name, category, quantity, expiry_date, confidence)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.userId, name, category, quantity, expiryDate, confidence);

    const newItem: Ingredient = { id, name, category, quantity, expiryDate, confidence };
    res.status(201).json({ success: true, data: newItem } as ApiResponse<Ingredient>);
  } catch (error) {
    console.error('Error adding item:', error);
    res.status(500).json({ success: false, error: 'Failed to add item' });
  }
});

/**
 * POST /api/inventory/bulk - Add multiple items (for receipt processing)
 */
router.post('/bulk', (req: AuthRequest, res: Response) => {
  try {
    const { items } = req.body as { items: Ingredient[] };

    if (!items || !Array.isArray(items)) {
      res.status(400).json({ success: false, error: 'Items array required' });
      return;
    }

    const stmt = db.prepare(`
      INSERT INTO ingredients (id, user_id, name, category, quantity, expiry_date, confidence)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((items: Ingredient[]) => {
      for (const item of items) {
        const id = item.id || uuidv4();
        stmt.run(id, req.userId, item.name, item.category, item.quantity, item.expiryDate, item.confidence);
      }
    });

    insertMany(items);

    res.status(201).json({ success: true, data: { added: items.length } });
  } catch (error) {
    console.error('Error adding items:', error);
    res.status(500).json({ success: false, error: 'Failed to add items' });
  }
});

/**
 * PUT /api/inventory/:id - Update an item
 */
router.put('/:id', (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, category, quantity, expiryDate, confidence } = req.body;

    // Verify ownership
    const existing = db.prepare(`
      SELECT * FROM ingredients WHERE id = ? AND user_id = ?
    `).get(id, req.userId);

    if (!existing) {
      res.status(404).json({ success: false, error: 'Item not found' });
      return;
    }

    db.prepare(`
      UPDATE ingredients
      SET name = COALESCE(?, name),
          category = COALESCE(?, category),
          quantity = COALESCE(?, quantity),
          expiry_date = COALESCE(?, expiry_date),
          confidence = COALESCE(?, confidence),
          updated_at = datetime('now')
      WHERE id = ? AND user_id = ?
    `).run(name, category, quantity, expiryDate, confidence, id, req.userId);

    const updated = db.prepare(`
      SELECT id, name, category, quantity, expiry_date as expiryDate, confidence
      FROM ingredients WHERE id = ?
    `).get(id) as Ingredient;

    res.json({ success: true, data: updated } as ApiResponse<Ingredient>);
  } catch (error) {
    console.error('Error updating item:', error);
    res.status(500).json({ success: false, error: 'Failed to update item' });
  }
});

/**
 * DELETE /api/inventory/:id - Delete an item
 */
router.delete('/:id', (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Verify ownership
    const existing = db.prepare(`
      SELECT * FROM ingredients WHERE id = ? AND user_id = ?
    `).get(id, req.userId);

    if (!existing) {
      res.status(404).json({ success: false, error: 'Item not found' });
      return;
    }

    db.prepare('DELETE FROM ingredients WHERE id = ? AND user_id = ?').run(id, req.userId);

    res.json({ success: true, data: { deleted: id } });
  } catch (error) {
    console.error('Error deleting item:', error);
    res.status(500).json({ success: false, error: 'Failed to delete item' });
  }
});

/**
 * GET /api/inventory/expiring - Get items expiring soon (for notifications)
 */
router.get('/expiring', (req: AuthRequest, res: Response) => {
  try {
    const { days = 3 } = req.query;
    const daysNum = parseInt(days as string) || 3;

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysNum);

    const items = db.prepare(`
      SELECT id, name, category, quantity, expiry_date as expiryDate, confidence
      FROM ingredients
      WHERE user_id = ? AND expiry_date <= ? AND expiry_date >= date('now')
      ORDER BY expiry_date ASC
    `).all(req.userId, futureDate.toISOString().split('T')[0]) as Ingredient[];

    res.json({ success: true, data: items });
  } catch (error) {
    console.error('Error fetching expiring items:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch expiring items' });
  }
});

export default router;
