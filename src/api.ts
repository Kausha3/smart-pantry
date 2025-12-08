// API configuration and service for Smart Pantry

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export type Category = 'Produce' | 'Dairy' | 'Pantry' | 'Meat' | 'Other';

export interface Ingredient {
  id: string;
  name: string;
  category: Category;
  quantity: string;
  expiryDate: string;
  confidence: number;
}

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
}

export interface InventoryStats {
  total: number;
  expiring: number;
  expired: number;
  fresh: number;
  wasteSaved: string;
  co2Reduced: string;
}

export interface ReceiptProcessingResult {
  items: Ingredient[];
  rawText: string;
  confidence: number;
  processingTime: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface NotificationPreferences {
  expiryDaysBefore: number;
  dailySummary: boolean;
  notifyTime: string;
  enabled: boolean;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

class ApiError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = 'ApiError';
  }
}

// Token management
let authToken: string | null = localStorage.getItem('auth_token');

export function setAuthToken(token: string | null) {
  authToken = token;
  if (token) {
    localStorage.setItem('auth_token', token);
  } else {
    localStorage.removeItem('auth_token');
  }
}

export function getAuthToken(): string | null {
  return authToken;
}

export function isAuthenticated(): boolean {
  return !!authToken;
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });

  const data: ApiResponse<T> = await response.json();

  if (!response.ok || !data.success) {
    if (response.status === 401) {
      // Token expired or invalid
      setAuthToken(null);
    }
    throw new ApiError(
      data.error || 'An error occurred',
      response.status
    );
  }

  return data.data as T;
}

// Health check
export async function checkHealth(): Promise<{
  status: string;
  geminiConfigured: boolean;
  pushConfigured: boolean;
}> {
  const url = `${API_BASE_URL}/health`;
  const response = await fetch(url);
  return response.json();
}

// ============ AUTH API ============

export async function register(email: string, password: string, name: string): Promise<AuthResponse> {
  const result = await apiRequest<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, name }),
  });
  setAuthToken(result.token);
  return result;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const result = await apiRequest<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setAuthToken(result.token);
  return result;
}

export async function logout(): Promise<void> {
  setAuthToken(null);
}

export async function getCurrentUser(): Promise<User> {
  return apiRequest('/auth/me');
}

export async function updateProfile(data: { name?: string; currentPassword?: string; newPassword?: string }): Promise<User> {
  return apiRequest('/auth/me', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// ============ INVENTORY API ============

export async function getInventory(params?: {
  search?: string;
  category?: string;
  sort?: string;
}): Promise<Ingredient[]> {
  const queryParams = new URLSearchParams();
  if (params?.search) queryParams.set('search', params.search);
  if (params?.category) queryParams.set('category', params.category);
  if (params?.sort) queryParams.set('sort', params.sort);

  const query = queryParams.toString();
  return apiRequest(`/inventory${query ? `?${query}` : ''}`);
}

export async function searchInventory(query: string): Promise<Ingredient[]> {
  return apiRequest(`/inventory/search?q=${encodeURIComponent(query)}`);
}

export async function getInventoryStats(): Promise<InventoryStats> {
  return apiRequest('/inventory/stats');
}

export async function getExpiringItems(days?: number): Promise<Ingredient[]> {
  return apiRequest(`/inventory/expiring${days ? `?days=${days}` : ''}`);
}

export async function addInventoryItem(item: Omit<Ingredient, 'id'>): Promise<Ingredient> {
  return apiRequest('/inventory', {
    method: 'POST',
    body: JSON.stringify(item),
  });
}

export async function addInventoryItems(items: Ingredient[]): Promise<{ added: number }> {
  return apiRequest('/inventory/bulk', {
    method: 'POST',
    body: JSON.stringify({ items }),
  });
}

export async function updateInventoryItem(
  id: string,
  updates: Partial<Ingredient>
): Promise<Ingredient> {
  return apiRequest(`/inventory/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function deleteInventoryItem(id: string): Promise<{ deleted: string }> {
  return apiRequest(`/inventory/${id}`, {
    method: 'DELETE',
  });
}

// ============ RECEIPT API ============

export async function processReceipt(file: File): Promise<ReceiptProcessingResult> {
  const formData = new FormData();
  formData.append('receipt', file);

  const response = await fetch(`${API_BASE_URL}/receipts/upload`, {
    method: 'POST',
    headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
    body: formData,
  });

  const data: ApiResponse<ReceiptProcessingResult> = await response.json();

  if (!response.ok || !data.success) {
    throw new ApiError(data.error || 'Failed to process receipt', response.status);
  }

  return data.data as ReceiptProcessingResult;
}

// ============ RECIPE API ============

export async function getRecipeSuggestions(ingredients?: Ingredient[]): Promise<Recipe[]> {
  if (ingredients && ingredients.length > 0) {
    return apiRequest('/recipes/suggest', {
      method: 'POST',
      body: JSON.stringify({ ingredients }),
    });
  }
  return apiRequest('/recipes/suggest');
}

// ============ NOTIFICATIONS API ============

export async function getVapidPublicKey(): Promise<string> {
  const result = await apiRequest<{ publicKey: string }>('/notifications/vapid-public-key');
  return result.publicKey;
}

export async function subscribeToPush(subscription: PushSubscription): Promise<void> {
  await apiRequest('/notifications/subscribe', {
    method: 'POST',
    body: JSON.stringify({ subscription: subscription.toJSON() }),
  });
}

export async function unsubscribeFromPush(endpoint: string): Promise<void> {
  await apiRequest('/notifications/unsubscribe', {
    method: 'POST',
    body: JSON.stringify({ endpoint }),
  });
}

export async function sendTestNotification(): Promise<void> {
  await apiRequest('/notifications/test', { method: 'POST' });
}

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  return apiRequest('/notifications/preferences');
}

export async function updateNotificationPreferences(
  prefs: Partial<NotificationPreferences>
): Promise<NotificationPreferences> {
  return apiRequest('/notifications/preferences', {
    method: 'PUT',
    body: JSON.stringify(prefs),
  });
}

export type { ApiError };
