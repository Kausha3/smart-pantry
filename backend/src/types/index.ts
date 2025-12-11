// Category types for food items
export type Category = 'Produce' | 'Dairy' | 'Pantry' | 'Meat' | 'Other';

// Ingredient interface matching frontend
export interface Ingredient {
  id: string;
  name: string;
  category: Category;
  quantity: string;
  expiryDate: string;
  confidence: number;
}

// Recipe interface
export interface Recipe {
  id: string;
  title: string;
  matchPercentage: number;
  usedIngredients: string[];
  missingIngredients: string[];
  time: string;
  calories: number;
  image: string;
  instructions?: string[];
  dietary?: string[];
}

// Receipt processing result
export interface ReceiptProcessingResult {
  items: Ingredient[];
  rawText: string;
  confidence: number;
  processingTime: number;
}

// Inventory stats
export interface InventoryStats {
  total: number;
  expiring: number;
  expired: number;
  fresh: number;
  wasteSaved: string;
  co2Reduced: string;
}

// API response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
