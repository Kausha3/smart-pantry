import React, { useState, useCallback, useEffect } from 'react';
import {
  ChefHat, List, Trash2, Check, X, Loader2, ScanLine, ArrowRight,
  Upload, AlertTriangle, Clock, TrendingUp, Leaf, FileText, Home,
  UtensilsCrossed, Bell, Search, Plus, Calendar, RefreshCw, Wifi, WifiOff,
  LogOut, User, Settings, Mail, Lock, Eye, EyeOff, BellRing, Download
} from 'lucide-react';
import * as api from './api';
import type { Ingredient, Recipe, Category, User as UserType } from './api';

// ============ MAIN APP COMPONENT ============

export default function SmartPantry() {
  const [user, setUser] = useState<UserType | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(api.isAuthenticated());
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    if (api.isAuthenticated()) {
      api.getCurrentUser()
        .then(setUser)
        .catch(() => {
          api.logout();
          setIsAuthenticated(false);
        })
        .finally(() => setAuthLoading(false));
    } else {
      setAuthLoading(false);
    }
  }, []);

  const handleLogin = (userData: UserType) => {
    setUser(userData);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    api.logout();
    setUser(null);
    setIsAuthenticated(false);
  };

  if (authLoading) {
    return (
      <div className="flex h-screen bg-slate-100 items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading Smart Pantry...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthScreen onLogin={handleLogin} />;
  }

  return <MainApp user={user} onLogout={handleLogout} />;
}

// ============ AUTH SCREEN ============

function AuthScreen({ onLogin }: { onLogin: (user: UserType) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (mode === 'login') {
        const result = await api.login(email, password);
        onLogin(result.user);
      } else {
        const result = await api.register(email, password, name);
        onLogin(result.user);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ChefHat size={40} className="text-emerald-600" />
          </div>
          <h1 className="text-3xl font-bold text-slate-800">SmartPantry</h1>
          <p className="text-slate-500 mt-2">AI-Powered Food Waste Reduction</p>
        </div>

        {/* Auth Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-xl font-bold text-slate-800 mb-6">
            {mode === 'login' ? 'Welcome Back' : 'Create Account'}
          </h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg p-3 mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    required
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'register' ? 'Min 6 characters' : 'Your password'}
                  required
                  minLength={mode === 'register' ? 6 : undefined}
                  className="w-full pl-10 pr-12 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 text-white py-3 rounded-lg font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  {mode === 'login' ? 'Signing in...' : 'Creating account...'}
                </>
              ) : (
                mode === 'login' ? 'Sign In' : 'Create Account'
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-500">
            {mode === 'login' ? (
              <>
                Don't have an account?{' '}
                <button
                  onClick={() => { setMode('register'); setError(''); }}
                  className="text-emerald-600 font-medium hover:underline"
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  onClick={() => { setMode('login'); setError(''); }}
                  className="text-emerald-600 font-medium hover:underline"
                >
                  Sign in
                </button>
              </>
            )}
          </div>
        </div>

        {/* PWA Install Hint */}
        <p className="text-center text-xs text-slate-400 mt-6">
          Install this app on your device for the best experience
        </p>
      </div>
    </div>
  );
}

// ============ MAIN APP ============

function MainApp({ user, onLogout }: { user: UserType | null; onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'pantry' | 'scan' | 'recipes' | 'settings'>('dashboard');
  const [inventory, setInventory] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [geminiConfigured, setGeminiConfigured] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setBackendStatus('checking');

    try {
      const health = await api.checkHealth();
      setBackendStatus('connected');
      setGeminiConfigured(health.geminiConfigured);

      const items = await api.getInventory();
      setInventory(items);
    } catch (error) {
      console.error('Backend connection error:', error);
      setBackendStatus('disconnected');
    } finally {
      setLoading(false);
    }
  };

  const deleteItem = async (id: string) => {
    try {
      await api.deleteInventoryItem(id);
      setInventory(prev => prev.filter(item => item.id !== id));
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  const addItems = async (items: Ingredient[]) => {
    try {
      await api.addInventoryItems(items);
      setInventory(prev => [...prev, ...items]);
    } catch (error) {
      console.error('Error adding items:', error);
      setInventory(prev => [...prev, ...items]);
    }
  };

  const addSingleItem = async (item: Omit<Ingredient, 'id'>) => {
    try {
      const newItem = await api.addInventoryItem(item);
      setInventory(prev => [...prev, newItem]);
      setShowAddModal(false);
    } catch (error) {
      console.error('Error adding item:', error);
    }
  };

  // Filter inventory by search
  const filteredInventory = searchQuery
    ? inventory.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : inventory;

  const expiringCount = inventory.filter(i => {
    const days = Math.ceil((new Date(i.expiryDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
    return days <= 3 && days >= 0;
  }).length;

  const expiredCount = inventory.filter(i => {
    const days = Math.ceil((new Date(i.expiryDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
    return days < 0;
  }).length;

  if (loading) {
    return (
      <div className="flex h-screen bg-slate-100 items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading your pantry...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-100 font-sans text-slate-900">
      {/* SIDEBAR */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shadow-sm">
        <div className="p-6 border-b border-slate-100">
          <h1 className="text-xl font-bold flex items-center gap-3 text-emerald-600">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <ChefHat size={24} />
            </div>
            SmartPantry
          </h1>
          <p className="text-xs text-slate-400 mt-1 ml-13">AI-Powered Waste Reduction</p>
        </div>

        <nav className="flex-1 p-4">
          <ul className="space-y-1">
            <NavItem icon={<Home size={20} />} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
            <NavItem icon={<List size={20} />} label="Inventory" active={activeTab === 'pantry'} onClick={() => setActiveTab('pantry')} badge={inventory.length} />
            <NavItem icon={<Upload size={20} />} label="Scan Receipt" active={activeTab === 'scan'} onClick={() => setActiveTab('scan')} />
            <NavItem icon={<UtensilsCrossed size={20} />} label="Recipes" active={activeTab === 'recipes'} onClick={() => setActiveTab('recipes')} />
            <NavItem icon={<Settings size={20} />} label="Settings" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
          </ul>

          <div className="mt-8 pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-3 px-3">Quick Stats</p>
            <div className="space-y-2">
              <StatBadge icon={<AlertTriangle size={14} />} label="Expiring Soon" value={expiringCount} color="orange" />
              <StatBadge icon={<Clock size={14} />} label="Expired" value={expiredCount} color="red" />
              <StatBadge icon={<Leaf size={14} />} label="Fresh Items" value={inventory.length - expiringCount - expiredCount} color="green" />
            </div>
          </div>
        </nav>

        {/* User & Backend Status */}
        <div className="p-4 border-t border-slate-100 space-y-3">
          {/* User Info */}
          {user && (
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                <User size={16} className="text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700 truncate">{user.name}</p>
                <p className="text-xs text-slate-400 truncate">{user.email}</p>
              </div>
              <button
                onClick={onLogout}
                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded"
                title="Sign out"
              >
                <LogOut size={16} />
              </button>
            </div>
          )}

          {/* Backend Status */}
          <div className={`rounded-lg p-3 ${backendStatus === 'connected' ? 'bg-emerald-50' : 'bg-yellow-50'}`}>
            <div className="flex items-center gap-2">
              {backendStatus === 'connected' ? (
                <>
                  <Wifi size={14} className="text-emerald-500" />
                  <span className="text-xs text-emerald-600">Connected</span>
                </>
              ) : (
                <>
                  <WifiOff size={14} className="text-yellow-500" />
                  <span className="text-xs text-yellow-600">Offline</span>
                </>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-800">
              {activeTab === 'dashboard' && 'Dashboard'}
              {activeTab === 'pantry' && 'Inventory Management'}
              {activeTab === 'scan' && 'Scan Receipt'}
              {activeTab === 'recipes' && 'Recipe Suggestions'}
              {activeTab === 'settings' && 'Settings'}
            </h2>
            <p className="text-sm text-slate-400">
              {activeTab === 'dashboard' && 'Overview of your pantry status'}
              {activeTab === 'pantry' && 'Manage your food inventory'}
              {activeTab === 'scan' && 'Upload a receipt to add items'}
              {activeTab === 'recipes' && 'AI-powered recipes based on your ingredients'}
              {activeTab === 'settings' && 'Manage your preferences'}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search items..."
                className="pl-10 pr-4 py-2 bg-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 w-64"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Add Item Button */}
            <button
              onClick={() => setShowAddModal(true)}
              className="p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
              title="Add item manually"
            >
              <Plus size={20} />
            </button>

            {/* Notifications */}
            <button className="p-2 hover:bg-slate-100 rounded-lg relative">
              <Bell size={20} className="text-slate-600" />
              {expiringCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center">
                  {expiringCount}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8">
          {activeTab === 'dashboard' && <DashboardView inventory={filteredInventory} onNavigate={setActiveTab} />}
          {activeTab === 'pantry' && <PantryView inventory={filteredInventory} onDelete={deleteItem} onOpenAddModal={() => setShowAddModal(true)} />}
          {activeTab === 'scan' && (
            <ScannerView
              backendConnected={backendStatus === 'connected'}
              onScanComplete={(items) => { addItems(items); setActiveTab('pantry'); }}
            />
          )}
          {activeTab === 'recipes' && <RecipeView inventory={filteredInventory} backendConnected={backendStatus === 'connected'} />}
          {activeTab === 'settings' && <SettingsView user={user} backendConnected={backendStatus === 'connected'} />}
        </div>
      </main>

      {/* Add Item Modal */}
      {showAddModal && (
        <AddItemModal
          onClose={() => setShowAddModal(false)}
          onAdd={addSingleItem}
        />
      )}
    </div>
  );
}

// ============ COMPONENTS ============

function NavItem({ icon, label, active, onClick, badge }: {
  icon: React.ReactNode; label: string; active: boolean; onClick: () => void; badge?: number;
}) {
  return (
    <li>
      <button
        onClick={onClick}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
          active ? 'bg-emerald-50 text-emerald-700 font-medium' : 'text-slate-600 hover:bg-slate-50'
        }`}
      >
        {icon}
        <span className="flex-1 text-left">{label}</span>
        {badge !== undefined && (
          <span className={`text-xs px-2 py-0.5 rounded-full ${active ? 'bg-emerald-200 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
            {badge}
          </span>
        )}
      </button>
    </li>
  );
}

function StatBadge({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    orange: 'bg-orange-50 text-orange-600 border-orange-100',
    red: 'bg-red-50 text-red-600 border-red-100',
    green: 'bg-green-50 text-green-600 border-green-100',
  };
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${colors[color]}`}>
      {icon}
      <span className="text-xs flex-1">{label}</span>
      <span className="font-bold text-sm">{value}</span>
    </div>
  );
}

function getCategoryEmoji(category: Category | string): string {
  const emojis: Record<string, string> = {
    Produce: '\u{1F966}',
    Dairy: '\u{1F95B}',
    Meat: '\u{1F969}',
    Pantry: '\u{1F96B}',
    Other: '\u{1F4E6}',
  };
  return emojis[category] || '\u{1F4E6}';
}

// ============ ADD ITEM MODAL ============

function AddItemModal({ onClose, onAdd }: {
  onClose: () => void;
  onAdd: (item: Omit<Ingredient, 'id'>) => void;
}) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<Category>('Other');
  const [quantity, setQuantity] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [loading, setLoading] = useState(false);

  const categories: Category[] = ['Produce', 'Dairy', 'Meat', 'Pantry', 'Other'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await onAdd({ name, category, quantity, expiryDate, confidence: 1.0 });
    setLoading(false);
  };

  // Set default expiry date to 7 days from now
  useEffect(() => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    setExpiryDate(date.toISOString().split('T')[0]);
  }, []);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-800">Add Item</h3>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
              <X size={20} className="text-slate-400" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Item Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Organic Milk"
              required
              className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
            <div className="grid grid-cols-5 gap-2">
              {categories.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`p-3 rounded-lg border text-center transition-all ${
                    category === cat
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-slate-200 hover:border-emerald-300'
                  }`}
                >
                  <span className="text-2xl block">{getCategoryEmoji(cat)}</span>
                  <span className="text-xs text-slate-600">{cat}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Quantity</label>
              <input
                type="text"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="e.g., 1 gallon"
                required
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Expiry Date</label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                required
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border border-slate-200 rounded-lg font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name || !quantity}
              className="flex-1 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
              Add Item
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============ SETTINGS VIEW ============

function SettingsView({ user, backendConnected }: { user: UserType | null; backendConnected: boolean }) {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);

  useEffect(() => {
    setPushSupported('Notification' in window && 'serviceWorker' in navigator);
    if ('Notification' in window) {
      setNotificationsEnabled(Notification.permission === 'granted');
    }
  }, []);

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) return;

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      setNotificationsEnabled(true);

      // Subscribe to push notifications
      try {
        const registration = await navigator.serviceWorker.ready;
        const publicKey = await api.getVapidPublicKey();

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey)
        });

        await api.subscribeToPush(subscription);
      } catch (error) {
        console.error('Push subscription failed:', error);
      }
    }
  };

  const testNotification = async () => {
    try {
      await api.sendTestNotification();
    } catch (error) {
      // Fallback to local notification
      if (Notification.permission === 'granted') {
        new Notification('Smart Pantry', {
          body: 'Notifications are working!',
          icon: '/icons/icon-192x192.png'
        });
      }
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Profile */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <User size={20} />
          Profile
        </h3>
        {user && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-500 mb-1">Name</label>
              <p className="font-medium text-slate-800">{user.name}</p>
            </div>
            <div>
              <label className="block text-sm text-slate-500 mb-1">Email</label>
              <p className="font-medium text-slate-800">{user.email}</p>
            </div>
          </div>
        )}
      </div>

      {/* Notifications */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <BellRing size={20} />
          Notifications
        </h3>

        {pushSupported ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-800">Push Notifications</p>
                <p className="text-sm text-slate-500">Get alerts when items are expiring</p>
              </div>
              {notificationsEnabled ? (
                <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">
                  Enabled
                </span>
              ) : (
                <button
                  onClick={requestNotificationPermission}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
                >
                  Enable
                </button>
              )}
            </div>

            {notificationsEnabled && (
              <button
                onClick={testNotification}
                className="w-full py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50"
              >
                Send Test Notification
              </button>
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-500">Push notifications are not supported in this browser.</p>
        )}
      </div>

      {/* PWA Install */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Download size={20} />
          Install App
        </h3>
        <p className="text-sm text-slate-500 mb-4">
          Install Smart Pantry on your device for quick access and offline support.
        </p>
        <p className="text-sm text-slate-400">
          On mobile: Tap the share button and select "Add to Home Screen"
          <br />
          On desktop: Look for the install icon in your browser's address bar
        </p>
      </div>

      {/* Backend Status */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          {backendConnected ? <Wifi size={20} /> : <WifiOff size={20} />}
          Connection Status
        </h3>
        <div className={`p-4 rounded-lg ${backendConnected ? 'bg-emerald-50' : 'bg-yellow-50'}`}>
          <p className={`font-medium ${backendConnected ? 'text-emerald-700' : 'text-yellow-700'}`}>
            {backendConnected ? 'Connected to backend' : 'Offline mode'}
          </p>
          <p className={`text-sm ${backendConnected ? 'text-emerald-600' : 'text-yellow-600'}`}>
            {backendConnected
              ? 'All features are available'
              : 'Some features may be limited'}
          </p>
        </div>
      </div>
    </div>
  );
}

// Helper function for VAPID key conversion
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer;
}

// ============ DASHBOARD VIEW ============

function DashboardView({ inventory, onNavigate }: { inventory: Ingredient[]; onNavigate: (tab: 'dashboard' | 'pantry' | 'scan' | 'recipes' | 'settings') => void }) {
  const getExpiryStatus = (dateStr: string) => {
    const days = Math.ceil((new Date(dateStr).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
    if (days < 0) return { status: 'expired', days };
    if (days <= 3) return { status: 'expiring', days };
    return { status: 'fresh', days };
  };

  const expiringSoon = inventory.filter(i => getExpiryStatus(i.expiryDate).status === 'expiring');
  const categoryCount = inventory.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const wasteSaved = `$${Math.round(inventory.length * 3.5)}`;
  const co2Reduced = `${Math.round(inventory.length * 0.8)}kg`;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-6">
        <StatCard icon={<List />} label="Total Items" value={inventory.length} color="emerald" />
        <StatCard icon={<AlertTriangle />} label="Expiring Soon" value={expiringSoon.length} color="orange" />
        <StatCard icon={<TrendingUp />} label="Waste Saved" value={wasteSaved} color="blue" subtext="Estimated" />
        <StatCard icon={<Leaf />} label="CO2 Reduced" value={co2Reduced} color="green" subtext="Estimated" />
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <AlertTriangle className="text-orange-500" size={20} />
              Expiring Soon
            </h3>
            <button onClick={() => onNavigate('recipes')} className="text-sm text-emerald-600 hover:underline">
              Find recipes
            </button>
          </div>

          {expiringSoon.length === 0 ? (
            <p className="text-slate-400 text-sm py-8 text-center">No items expiring soon!</p>
          ) : (
            <div className="space-y-3">
              {expiringSoon.slice(0, 4).map(item => {
                const { days } = getExpiryStatus(item.expiryDate);
                return (
                  <div key={item.id} className="flex items-center gap-4 p-3 bg-orange-50 rounded-lg border border-orange-100">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center text-lg">
                      {getCategoryEmoji(item.category)}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-slate-800">{item.name}</p>
                      <p className="text-xs text-slate-500">{item.category} - {item.quantity}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-orange-600">{days} days</p>
                      <p className="text-xs text-slate-400">until expiry</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-bold text-slate-800 mb-4">By Category</h3>
          <div className="space-y-3">
            {Object.entries(categoryCount).map(([cat, count]) => (
              <div key={cat} className="flex items-center gap-3">
                <span className="text-xl">{getCategoryEmoji(cat as Category)}</span>
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600">{cat}</span>
                    <span className="font-medium">{count}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${(count / inventory.length) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <button
          onClick={() => onNavigate('scan')}
          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl p-6 flex items-center gap-4 transition-all group"
        >
          <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
            <Upload size={28} />
          </div>
          <div className="text-left">
            <p className="font-bold text-lg">Scan Receipt</p>
            <p className="text-emerald-100 text-sm">Upload a receipt to add items</p>
          </div>
        </button>
        <button
          onClick={() => onNavigate('recipes')}
          className="bg-white border-2 border-slate-200 hover:border-emerald-500 text-slate-800 rounded-xl p-6 flex items-center gap-4 transition-all group"
        >
          <div className="w-14 h-14 bg-emerald-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
            <UtensilsCrossed size={28} className="text-emerald-600" />
          </div>
          <div className="text-left">
            <p className="font-bold text-lg">Find Recipes</p>
            <p className="text-slate-500 text-sm">AI suggestions based on inventory</p>
          </div>
        </button>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color, subtext }: {
  icon: React.ReactNode; label: string; value: string | number; color: string; subtext?: string;
}) {
  const colors: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-600',
    orange: 'bg-orange-50 text-orange-600',
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
  };
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className={`w-10 h-10 rounded-lg ${colors[color]} flex items-center justify-center mb-3`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
      <p className="text-sm text-slate-500">{label}</p>
      {subtext && <p className="text-xs text-slate-400 mt-1">{subtext}</p>}
    </div>
  );
}

// ============ PANTRY VIEW ============

function PantryView({ inventory, onDelete, onOpenAddModal }: {
  inventory: Ingredient[];
  onDelete: (id: string) => void;
  onOpenAddModal: () => void;
}) {
  const [filter, setFilter] = useState<string>('all');

  const sorted = [...inventory]
    .filter(i => filter === 'all' || i.category === filter)
    .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

  const getExpiryStatus = (dateStr: string) => {
    const days = Math.ceil((new Date(dateStr).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
    if (days < 0) return { color: 'bg-red-100 text-red-700 border-red-200', label: 'EXPIRED', days };
    if (days <= 3) return { color: 'bg-orange-100 text-orange-700 border-orange-200', label: `${days}d left`, days };
    return { color: 'bg-green-100 text-green-700 border-green-200', label: `${days} days`, days };
  };

  const categories = ['all', ...new Set(inventory.map(i => i.category))];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === cat
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-emerald-500'
              }`}
            >
              {cat === 'all' ? 'All Items' : cat}
            </button>
          ))}
        </div>
        <button
          onClick={onOpenAddModal}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
        >
          <Plus size={18} />
          Add Item
        </button>
      </div>

      {sorted.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <List size={32} className="text-slate-400" />
          </div>
          <p className="text-slate-500">No items in inventory</p>
          <p className="text-sm text-slate-400 mt-1">Add items manually or scan a receipt</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {sorted.map(item => {
            const status = getExpiryStatus(item.expiryDate);
            return (
              <div key={item.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow group">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-2xl">
                    {getCategoryEmoji(item.category)}
                  </div>
                  <button
                    onClick={() => onDelete(item.id)}
                    className="p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <h4 className="font-semibold text-slate-800 mb-1">{item.name}</h4>
                <p className="text-sm text-slate-500 mb-3">{item.quantity}</p>
                <div className="flex items-center justify-between">
                  <span className={`text-xs px-2 py-1 rounded-md font-medium border ${status.color}`}>
                    {status.label}
                  </span>
                  <span className="text-xs text-slate-400">{item.category}</span>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">AI Confidence</span>
                    <span className="font-medium text-slate-600">{Math.round(item.confidence * 100)}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${item.confidence * 100}%` }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============ SCANNER VIEW ============

function ScannerView({ backendConnected, onScanComplete }: {
  backendConnected: boolean;
  onScanComplete: (items: Ingredient[]) => void;
}) {
  const [step, setStep] = useState<'upload' | 'processing' | 'review' | 'error'>('upload');
  const [progress, setProgress] = useState(0);
  const [parsedItems, setParsedItems] = useState<Ingredient[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState('');
  const [processingLog, setProcessingLog] = useState<string[]>([]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  }, [backendConnected]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = async (file: File) => {
    setStep('processing');
    setProgress(0);
    setProcessingLog([]);
    setError('');

    const addLog = (msg: string) => setProcessingLog(prev => [...prev, msg]);

    if (backendConnected) {
      try {
        addLog(`> Uploading ${file.name}...`);
        setProgress(15);

        addLog('> Running OCR...');
        setProgress(30);

        addLog('> Sending to Gemini API...');
        setProgress(50);

        const result = await api.processReceipt(file);

        addLog(`> Parsed ${result.items.length} items`);
        setProgress(85);

        addLog(`> Done in ${result.processingTime}ms`);
        setProgress(100);

        setTimeout(() => {
          setParsedItems(result.items);
          setStep('review');
        }, 500);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to process receipt');
        setStep('error');
      }
    } else {
      // Simulated processing
      const intervals = [
        { p: 15, msg: `> Uploading ${file.name}...` },
        { p: 30, msg: '> Running OCR...' },
        { p: 50, msg: '> Processing with AI (simulated)...' },
        { p: 85, msg: '> Parsing response...' },
        { p: 100, msg: '> Done!' }
      ];

      let i = 0;
      const interval = setInterval(() => {
        if (i >= intervals.length) {
          clearInterval(interval);
          finishSimulated();
        } else {
          setProgress(intervals[i].p);
          addLog(intervals[i].msg);
          i++;
        }
      }, 500);
    }
  };

  const finishSimulated = () => {
    const getFutureDate = (days: number) => {
      const d = new Date();
      d.setDate(d.getDate() + days);
      return d.toISOString().split('T')[0];
    };

    setParsedItems([
      { id: Date.now() + '1', name: 'Organic Milk', category: 'Dairy', quantity: '1 gallon', expiryDate: getFutureDate(14), confidence: 0.95 },
      { id: Date.now() + '2', name: 'Avocados', category: 'Produce', quantity: '3 count', expiryDate: getFutureDate(5), confidence: 0.88 },
      { id: Date.now() + '3', name: 'Ground Beef', category: 'Meat', quantity: '1 lb', expiryDate: getFutureDate(4), confidence: 0.92 },
    ]);
    setStep('review');
  };

  if (step === 'error') {
    return (
      <div className="max-w-xl mx-auto text-center py-16">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertTriangle size={40} className="text-red-500" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Processing Failed</h2>
        <p className="text-red-500 mb-6">{error}</p>
        <button onClick={() => setStep('upload')} className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700">
          Try Again
        </button>
      </div>
    );
  }

  if (step === 'upload') {
    return (
      <div className="max-w-3xl mx-auto">
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-2xl p-16 text-center transition-all ${
            dragActive ? 'border-emerald-500 bg-emerald-50' : 'border-slate-300 hover:border-emerald-400 bg-white'
          }`}
        >
          <div className="w-20 h-20 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Upload size={40} className="text-emerald-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">Upload Receipt Image</h3>
          <p className="text-slate-500 mb-6">Drag and drop your receipt here, or click to browse</p>
          <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" id="file-upload" />
          <label htmlFor="file-upload" className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 cursor-pointer transition-colors">
            <FileText size={20} />
            Choose File
          </label>
          <p className="text-xs text-slate-400 mt-4">Supports: JPG, PNG, HEIC - Max 10MB</p>
        </div>

        <div className="mt-8 bg-slate-900 rounded-xl p-6 text-white">
          <h4 className="font-bold mb-4 flex items-center gap-2">
            <ScanLine size={18} className="text-emerald-400" />
            How the AI Pipeline Works
          </h4>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="bg-slate-800 rounded-lg p-4">
              <div className="text-emerald-400 font-mono text-xs mb-2">STEP 1</div>
              <p className="font-medium mb-1">OCR Processing</p>
              <p className="text-slate-400 text-xs">Tesseract extracts text</p>
            </div>
            <div className="bg-slate-800 rounded-lg p-4">
              <div className="text-emerald-400 font-mono text-xs mb-2">STEP 2</div>
              <p className="font-medium mb-1">Gemini Parsing</p>
              <p className="text-slate-400 text-xs">AI structures the data</p>
            </div>
            <div className="bg-slate-800 rounded-lg p-4">
              <div className="text-emerald-400 font-mono text-xs mb-2">STEP 3</div>
              <p className="font-medium mb-1">Expiry Inference</p>
              <p className="text-slate-400 text-xs">Estimates expiry dates</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'processing') {
    return (
      <div className="max-w-xl mx-auto text-center py-16">
        <div className="relative w-32 h-32 mx-auto mb-8">
          <Loader2 className="w-full h-full text-emerald-500 animate-spin" />
          <ScanLine className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-emerald-600" size={40} />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Processing Receipt</h2>
        <p className="text-slate-500 mb-6">AI is extracting items...</p>

        <div className="w-full bg-slate-200 rounded-full h-3 mb-4 overflow-hidden">
          <div className="bg-emerald-500 h-full transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
        </div>
        <p className="text-sm text-slate-600 font-medium">{progress}% Complete</p>

        <div className="mt-10 bg-slate-900 rounded-xl p-6 text-left">
          <div className="text-xs text-emerald-400 font-mono mb-3 border-b border-slate-700 pb-2 flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            LIVE LOG
          </div>
          <div className="font-mono text-xs text-slate-300 space-y-1.5 max-h-40 overflow-y-auto">
            {processingLog.map((log, i) => (
              <p key={i} className={log.includes('Done') ? 'text-emerald-400' : ''}>{log}</p>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-emerald-50">
          <h3 className="font-bold text-lg flex items-center gap-2 text-emerald-800">
            <Check className="text-emerald-600" size={24} />
            Review Extracted Items
          </h3>
          <p className="text-sm text-emerald-700">Confirm before adding to inventory</p>
        </div>

        <div className="p-6 space-y-3">
          {parsedItems.map(item => (
            <div key={item.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-2xl border border-slate-200">
                {getCategoryEmoji(item.category)}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-800">{item.name}</p>
                <div className="flex items-center gap-3 text-sm text-slate-500">
                  <span>{item.quantity}</span>
                  <span>-</span>
                  <span>{item.category}</span>
                  <span>-</span>
                  <span className="flex items-center gap-1">
                    <Calendar size={12} />
                    {item.expiryDate}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400">Confidence</p>
                <p className="font-bold text-emerald-600">{Math.round(item.confidence * 100)}%</p>
              </div>
              <button onClick={() => setParsedItems(prev => prev.filter(i => i.id !== item.id))} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                <X size={18} />
              </button>
            </div>
          ))}
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100">
          <button onClick={() => onScanComplete(parsedItems)} className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold hover:bg-emerald-700 flex items-center justify-center gap-2">
            <Plus size={20} />
            Add {parsedItems.length} Items to Inventory
          </button>
        </div>
      </div>
    </div>
  );
}

// ============ RECIPE VIEW ============

function RecipeView({ inventory, backendConnected }: { inventory: Ingredient[]; backendConnected: boolean }) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (backendConnected && inventory.length > 0) {
      fetchRecipes();
    } else {
      setRecipes(getFallbackRecipes(inventory));
    }
  }, [backendConnected, inventory]);

  const fetchRecipes = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await api.getRecipeSuggestions(inventory);
      setRecipes(result);
    } catch (err) {
      setError('Failed to fetch AI recipes.');
      setRecipes(getFallbackRecipes(inventory));
    } finally {
      setLoading(false);
    }
  };

  const getFallbackRecipes = (inv: Ingredient[]): Recipe[] => {
    const allRecipes: Recipe[] = [
      { id: 'r1', title: 'Creamy Chicken Spinach Pasta', time: '25 min', calories: 450, usedIngredients: ['Chicken Breast', 'Spinach', 'Parmesan'], missingIngredients: ['Pasta', 'Heavy Cream'], matchPercentage: 0, image: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400&h=300&fit=crop' },
      { id: 'r2', title: 'Classic Eggs Benedict', time: '30 min', calories: 520, usedIngredients: ['Eggs'], missingIngredients: ['English Muffin', 'Ham'], matchPercentage: 0, image: 'https://images.unsplash.com/photo-1608039829572-9b59f7e06c9e?w=400&h=300&fit=crop' },
      { id: 'r3', title: 'Greek Yogurt Parfait', time: '5 min', calories: 280, usedIngredients: ['Greek Yogurt'], missingIngredients: ['Granola', 'Berries'], matchPercentage: 0, image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&h=300&fit=crop' },
      { id: 'r4', title: 'Tomato Basil Soup', time: '40 min', calories: 210, usedIngredients: ['Tomato Sauce'], missingIngredients: ['Basil', 'Cream'], matchPercentage: 0, image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&h=300&fit=crop' },
    ];

    return allRecipes.map(recipe => {
      const available = recipe.usedIngredients.filter(req =>
        inv.some(item => item.name.toLowerCase().includes(req.toLowerCase().split(' ')[0]))
      );
      const percentage = Math.round((available.length / (available.length + recipe.missingIngredients.length)) * 100);
      return { ...recipe, matchPercentage: percentage };
    }).sort((a, b) => b.matchPercentage - a.matchPercentage);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Generating recipes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-lg text-slate-800">Recommended Recipes</h3>
          <p className="text-sm text-slate-500">{backendConnected ? 'AI-generated' : 'Based on your inventory'}</p>
        </div>
        <div className="flex items-center gap-2">
          {backendConnected && (
            <button onClick={fetchRecipes} className="flex items-center gap-2 px-3 py-1.5 text-sm text-emerald-600 hover:bg-emerald-50 rounded-lg">
              <RefreshCw size={14} />
              Refresh
            </button>
          )}
          <span className="text-xs font-semibold text-emerald-600 bg-emerald-100 px-3 py-1.5 rounded-full">
            Prioritizing expiring items
          </span>
        </div>
      </div>

      {error && <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-700">{error}</div>}

      <div className="grid grid-cols-2 gap-6">
        {recipes.map(recipe => (
          <div key={recipe.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden group hover:shadow-lg transition-shadow cursor-pointer">
            <div className="relative h-48 overflow-hidden">
              <img src={recipe.image} alt={recipe.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              <div className="absolute top-3 left-3">
                <span className={`text-xs font-bold px-2 py-1 rounded ${recipe.matchPercentage >= 50 ? 'bg-emerald-500 text-white' : 'bg-yellow-500 text-white'}`}>
                  {recipe.matchPercentage}% Match
                </span>
              </div>
              <div className="absolute top-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded">{recipe.time}</div>
            </div>

            <div className="p-5">
              <h4 className="font-bold text-slate-800 text-lg mb-3 group-hover:text-emerald-600 transition-colors">{recipe.title}</h4>
              <div className="flex flex-wrap gap-2 mb-4">
                {recipe.usedIngredients.slice(0, 3).map(ing => (
                  <span key={ing} className="text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">{'\u2713'} {ing}</span>
                ))}
                {recipe.missingIngredients.slice(0, 2).map(ing => (
                  <span key={ing} className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-500">+ {ing}</span>
                ))}
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <span className="text-sm text-slate-500">{recipe.calories} kcal</span>
                <span className="text-sm font-medium text-emerald-600 flex items-center gap-1 group-hover:gap-2 transition-all">
                  View Recipe <ArrowRight size={14} />
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
