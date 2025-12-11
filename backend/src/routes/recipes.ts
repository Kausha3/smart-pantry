import { Router, Response } from 'express';
import { generateRecipeSuggestions } from '../services/gemini.js';
import db from '../db/schema.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import type { Ingredient, Recipe, ApiResponse } from '../types/index.js';

const router = Router();

// All recipe routes require authentication
router.use(authenticate);

/**
 * POST /api/recipes/suggest - Get AI-generated recipe suggestions
 * Supports both cookbook mode (no ingredients) and inventory-based suggestions
 */
router.post('/suggest', async (req: AuthRequest, res: Response) => {
  try {
    let { ingredients, dietary } = req.body;

    // If no ingredients provided, try to fetch from user's inventory
    if (!ingredients || ingredients.length === 0) {
      ingredients = db.prepare(`
        SELECT id, name, category, quantity, expiry_date as expiryDate, confidence
        FROM ingredients
        WHERE user_id = ?
        ORDER BY expiry_date ASC
      `).all(req.userId) as Ingredient[];
    }

    // Generate recipes - now supports cookbook mode (empty inventory)
    console.log('Generating recipes for', ingredients?.length || 0, 'ingredients', dietary ? `with ${dietary} filter` : '');
    const recipes = await generateRecipeSuggestions(ingredients || [], dietary);

    res.json({ success: true, data: recipes } as ApiResponse<Recipe[]>);
  } catch (error) {
    console.error('Recipe generation error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate recipes'
    });
  }
});

/**
 * GET /api/recipes/suggest - Get recipes based on current inventory
 */
router.get('/suggest', async (req: AuthRequest, res: Response) => {
  try {
    const ingredients = db.prepare(`
      SELECT id, name, category, quantity, expiry_date as expiryDate, confidence
      FROM ingredients
      WHERE user_id = ?
      ORDER BY expiry_date ASC
    `).all(req.userId) as Ingredient[];

    if (ingredients.length === 0) {
      res.status(400).json({
        success: false,
        error: 'No ingredients in inventory. Add items first.'
      });
      return;
    }

    console.log('Generating recipes for', ingredients.length, 'ingredients');
    const recipes = await generateRecipeSuggestions(ingredients);

    res.json({ success: true, data: recipes } as ApiResponse<Recipe[]>);
  } catch (error) {
    console.error('Recipe generation error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate recipes'
    });
  }
});

export default router;
