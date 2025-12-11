import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Category, Ingredient, Recipe } from '../types/index.js';
import { v4 as uuidv4 } from 'uuid';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Default expiry days by category
const EXPIRY_DEFAULTS: Record<Category, number> = {
  Produce: 7,
  Dairy: 14,
  Meat: 4,
  Pantry: 60,
  Other: 30
};

/**
 * Parse OCR text using Gemini to extract food items
 */
export async function parseReceiptText(ocrText: string): Promise<Ingredient[]> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const prompt = `You are a food item extraction AI. Analyze this grocery receipt OCR text and extract food items.

OCR TEXT:
${ocrText}

INSTRUCTIONS:
1. Identify all food items from the receipt
2. Ignore non-food items (bags, tax, subtotals, store info, etc.)
3. Clean up OCR errors (e.g., "0RGANIC MILK" -> "Organic Milk")
4. Categorize each item into one of: Produce, Dairy, Meat, Pantry, Other
5. Extract or infer quantity from the text

Respond ONLY with a valid JSON array of objects with this structure:
[
  {
    "name": "Clean item name",
    "category": "Category",
    "quantity": "quantity string",
    "confidence": 0.0-1.0
  }
]

If no food items found, return an empty array: []
Do not include any markdown formatting or code blocks in your response.`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response.text();

    // Clean up response - remove markdown code blocks if present
    let cleanedResponse = response.trim();
    if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/```json?\n?/g, '').replace(/```\n?/g, '');
    }

    const parsed = JSON.parse(cleanedResponse);

    // Add IDs and expiry dates
    const today = new Date();
    return parsed.map((item: { name: string; category: Category; quantity: string; confidence: number }) => {
      const category = item.category as Category;
      const expiryDays = EXPIRY_DEFAULTS[category] || 30;
      const expiryDate = new Date(today);
      expiryDate.setDate(expiryDate.getDate() + expiryDays);

      return {
        id: uuidv4(),
        name: item.name,
        category: category,
        quantity: item.quantity || '1',
        expiryDate: expiryDate.toISOString().split('T')[0],
        confidence: item.confidence || 0.85
      };
    });
  } catch (error) {
    console.error('Gemini parsing error:', error);
    throw new Error('Failed to parse receipt with AI');
  }
}

/**
 * Generate recipe suggestions based on available ingredients
 * Supports cookbook mode (no ingredients) and dietary filters
 */
export async function generateRecipeSuggestions(
  ingredients: Ingredient[],
  dietary?: string
): Promise<Recipe[]> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const hasIngredients = ingredients && ingredients.length > 0;

  // Sort by expiry date to prioritize items expiring soon
  const sortedIngredients = hasIngredients
    ? [...ingredients].sort((a, b) =>
        new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
      )
    : [];

  const ingredientList = sortedIngredients.map(i => `${i.name} (expires: ${i.expiryDate})`).join('\n');

  // Build dietary instruction
  const dietaryInstruction = dietary
    ? `5. All recipes MUST be ${dietary} (no exceptions)`
    : '';

  // Different prompts for cookbook mode vs inventory mode
  const prompt = hasIngredients
    ? `You are a creative chef AI. Generate 6 recipe suggestions that use the available ingredients, prioritizing items that expire soon.

AVAILABLE INGREDIENTS:
${ingredientList}

INSTRUCTIONS:
1. Create recipes that maximize use of expiring ingredients
2. Include realistic missing ingredients needed to complete each recipe
3. Provide accurate calorie estimates and cooking times
4. Make recipes diverse (don't repeat similar dishes)
${dietaryInstruction}

Respond ONLY with a valid JSON array of 6 recipe objects:
[
  {
    "title": "Recipe Name",
    "usedIngredients": ["ingredient1", "ingredient2"],
    "missingIngredients": ["ingredient1", "ingredient2"],
    "time": "25 min",
    "calories": 450,
    "instructions": ["Step 1...", "Step 2..."],
    "dietary": ["vegetarian", "gluten-free"]
  }
]

The "dietary" field should list applicable tags from: vegetarian, vegan, gluten-free, dairy-free
Do not include any markdown formatting or code blocks in your response.`
    : `You are a creative chef AI. Generate 8 diverse recipe suggestions for a cookbook browser.

INSTRUCTIONS:
1. Create a variety of recipes across different cuisines and difficulty levels
2. Include all necessary ingredients for each recipe
3. Provide accurate calorie estimates and cooking times
4. Make recipes diverse (breakfast, lunch, dinner, snacks)
${dietaryInstruction ? dietaryInstruction : '5. Include a mix of dietary options (vegetarian, vegan, meat-based)'}

Respond ONLY with a valid JSON array of 8 recipe objects:
[
  {
    "title": "Recipe Name",
    "usedIngredients": [],
    "missingIngredients": ["ingredient1", "ingredient2", "ingredient3"],
    "time": "25 min",
    "calories": 450,
    "instructions": ["Step 1...", "Step 2..."],
    "dietary": ["vegetarian", "gluten-free"]
  }
]

The "dietary" field should list applicable tags from: vegetarian, vegan, gluten-free, dairy-free
Do not include any markdown formatting or code blocks in your response.`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response.text();

    // Clean up response
    let cleanedResponse = response.trim();
    if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/```json?\n?/g, '').replace(/```\n?/g, '');
    }

    const parsed = JSON.parse(cleanedResponse);

    return parsed.map((recipe: {
      title: string;
      usedIngredients: string[];
      missingIngredients: string[];
      time: string;
      calories: number;
      instructions?: string[];
      dietary?: string[];
    }) => {
      const totalIngredients = recipe.usedIngredients.length + recipe.missingIngredients.length;
      const matchPercentage = hasIngredients
        ? Math.round((recipe.usedIngredients.length / totalIngredients) * 100)
        : 0; // Cookbook mode shows 0% match since user has no inventory

      return {
        id: uuidv4(),
        title: recipe.title,
        usedIngredients: recipe.usedIngredients,
        missingIngredients: recipe.missingIngredients,
        time: recipe.time,
        calories: recipe.calories,
        matchPercentage,
        instructions: recipe.instructions || [],
        dietary: recipe.dietary || [],
        image: getRecipeImage(recipe.title)
      };
    }).sort((a: Recipe, b: Recipe) => b.matchPercentage - a.matchPercentage);
  } catch (error) {
    console.error('Gemini recipe generation error:', error);
    throw new Error('Failed to generate recipes with AI');
  }
}

/**
 * Infer expiry date for a food item using AI
 */
export async function inferExpiryDate(itemName: string, category: Category): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const prompt = `You are a food safety expert. For this grocery item, estimate the typical shelf life when stored properly at home.

ITEM: ${itemName}
CATEGORY: ${category}

Respond with ONLY a single number representing days until expiry (no text, just the number).
Consider typical home storage conditions.`;

  try {
    const result = await model.generateContent(prompt);
    const days = parseInt(result.response.text().trim());

    if (isNaN(days) || days < 1 || days > 365) {
      // Fallback to defaults
      return getFutureDate(EXPIRY_DEFAULTS[category] || 30);
    }

    return getFutureDate(days);
  } catch (error) {
    console.error('Expiry inference error:', error);
    return getFutureDate(EXPIRY_DEFAULTS[category] || 30);
  }
}

// Helper function to get future date
function getFutureDate(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

// Get a placeholder recipe image based on title
function getRecipeImage(title: string): string {
  const keywords = title.toLowerCase();

  if (keywords.includes('pasta') || keywords.includes('spaghetti')) {
    return 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400&h=300&fit=crop';
  }
  if (keywords.includes('chicken')) {
    return 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=400&h=300&fit=crop';
  }
  if (keywords.includes('salad')) {
    return 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop';
  }
  if (keywords.includes('soup')) {
    return 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&h=300&fit=crop';
  }
  if (keywords.includes('egg') || keywords.includes('breakfast')) {
    return 'https://images.unsplash.com/photo-1608039829572-9b59f7e06c9e?w=400&h=300&fit=crop';
  }
  if (keywords.includes('yogurt') || keywords.includes('parfait')) {
    return 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&h=300&fit=crop';
  }

  // Default food image
  return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop';
}
