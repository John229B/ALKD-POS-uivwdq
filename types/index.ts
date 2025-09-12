
export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'employee';
  createdAt: Date;
  isActive: boolean;
}

export interface Employee {
  id: string;
  name: string;
  phone?: string;
  email: string;
  password: string;
  role: 'admin' | 'manager' | 'cashier' | 'inventory';
  permissions: Permission[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
}

export interface Permission {
  id: string;
  name: string;
  description: string;
  module: 'dashboard' | 'pos' | 'products' | 'customers' | 'reports' | 'settings' | 'employees' | 'printers' | 'tickets';
  actions: ('view' | 'create' | 'edit' | 'delete')[];
}

export interface ActivityLog {
  id: string;
  employeeId: string;
  employee?: Employee;
  action: string;
  module: string;
  details: string;
  metadata?: any;
  timestamp: Date;
  ipAddress?: string;
}

export interface BluetoothPrinter {
  id: string;
  name: string;
  address: string;
  isDefault: boolean;
  isConnected: boolean;
  lastConnected?: Date;
  settings: {
    paperWidth: number;
    fontSize: 'small' | 'medium' | 'large';
    encoding: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Ticket {
  id: string;
  saleId: string;
  sale?: Sale;
  receiptNumber: string;
  companyLogo?: string;
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  items: TicketItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: string;
  amountPaid: number;
  change: number;
  employeeName: string;
  customMessage?: string;
  createdAt: Date;
  printedAt?: Date;
  printerId?: string;
}

export interface TicketItem {
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface SyncData {
  id: string;
  type: 'sale' | 'customer' | 'product' | 'employee_action';
  data: any;
  timestamp: Date;
  synced: boolean;
  syncedAt?: Date;
  deviceId: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  color?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  // Multiple pricing system
  retailPrice: number; // Prix de détail (par défaut)
  wholesalePrice?: number; // Prix de gros
  wholesaleMinQuantity?: number; // Quantité minimum pour prix de gros
  promotionalPrice?: number; // Prix promotionnel
  promotionalValidUntil?: Date; // Date limite du prix promotionnel
  cost: number;
  barcode?: string;
  categoryId: string; // Changed from category string to categoryId
  stock: number;
  minStock: number;
  imageUrl?: string;
  isActive: boolean;
  // New unit of measurement field
  unit: string; // Unit of measurement (Kg, L, Cart, pièce, etc.)
  createdAt: Date;
  updatedAt: Date;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  creditBalance: number;
  totalPurchases: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CartItem {
  product: Product;
  quantity: number; // Now supports fractional quantities
  discount: number;
  unitPrice: number; // The actual price applied (retail, wholesale, or promotional)
  subtotal: number;
}

export interface Sale {
  id: string;
  customerId?: string;
  customer?: Customer;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: 'cash' | 'mobile_money' | 'credit';
  paymentStatus: 'paid' | 'credit' | 'partial';
  amountPaid: number;
  change: number;
  notes?: string;
  cashierId: string;
  cashier?: User;
  createdAt: Date;
  receiptNumber: string;
}

export interface SaleItem {
  id: string;
  productId: string;
  product?: Product;
  quantity: number; // Now supports fractional quantities
  unitPrice: number;
  discount: number;
  subtotal: number;
}

export interface DashboardStats {
  todaySales: number;
  todayRevenue: number;
  totalCustomers: number;
  lowStockProducts: number;
  creditAmount: number;
  topProducts: {
    product: Product;
    quantity: number;
    revenue: number;
  }[];
}

export interface AppSettings {
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  currency: 'XOF' | 'USD' | 'EUR' | 'GBP' | 'JPY' | 'CAD' | 'AUD';
  language: 'fr' | 'en';
  taxRate: number;
  receiptFooter?: string;
  logoUrl?: string;
  customThankYouMessage?: string;
  offlineMode: boolean;
  autoSync: boolean;
  syncInterval: number; // in minutes
}

export interface License {
  id: string;
  type: 'monthly' | 'quarterly' | 'yearly' | 'lifetime';
  startDate: Date;
  endDate?: Date;
  isActive: boolean;
  clientId: string;
}

// Predefined units of measurement
export const UNITS_OF_MEASUREMENT = [
  { id: 'kg', name: 'Kilogramme', symbol: 'Kg', allowsFractions: true },
  { id: 'l', name: 'Litre', symbol: 'L', allowsFractions: true },
  { id: 'cart', name: 'Carton', symbol: 'Cart', allowsFractions: false },
  { id: 'piece', name: 'Unité', symbol: 'pièce', allowsFractions: true },
  { id: 'g', name: 'Gramme', symbol: 'g', allowsFractions: true },
  { id: 'ml', name: 'Millilitre', symbol: 'ml', allowsFractions: true },
  { id: 'pack', name: 'Pack', symbol: 'pack', allowsFractions: false },
  { id: 'box', name: 'Boîte', symbol: 'boîte', allowsFractions: false },
  { id: 'bottle', name: 'Bouteille', symbol: 'bouteille', allowsFractions: false },
  { id: 'can', name: 'Canette', symbol: 'canette', allowsFractions: false },
];

// Default permissions for different roles
export const DEFAULT_PERMISSIONS: { [key: string]: Permission[] } = {
  admin: [
    { id: 'all', name: 'Tous les droits', description: 'Accès complet à toutes les fonctionnalités', module: 'dashboard', actions: ['view', 'create', 'edit', 'delete'] },
  ],
  manager: [
    { id: 'dashboard_view', name: 'Voir tableau de bord', description: 'Accès au tableau de bord', module: 'dashboard', actions: ['view'] },
    { id: 'pos_all', name: 'Point de vente', description: 'Accès complet au POS', module: 'pos', actions: ['view', 'create', 'edit'] },
    { id: 'products_all', name: 'Gestion produits', description: 'Gestion complète des produits', module: 'products', actions: ['view', 'create', 'edit', 'delete'] },
    { id: 'customers_all', name: 'Gestion clients', description: 'Gestion complète des clients', module: 'customers', actions: ['view', 'create', 'edit', 'delete'] },
    { id: 'reports_view', name: 'Voir rapports', description: 'Accès aux rapports', module: 'reports', actions: ['view'] },
    { id: 'tickets_all', name: 'Gestion tickets', description: 'Gestion des tickets', module: 'tickets', actions: ['view', 'create', 'edit'] },
  ],
  cashier: [
    { id: 'pos_basic', name: 'Point de vente', description: 'Utilisation du POS', module: 'pos', actions: ['view', 'create'] },
    { id: 'customers_basic', name: 'Clients de base', description: 'Voir et ajouter des clients', module: 'customers', actions: ['view', 'create'] },
    { id: 'tickets_basic', name: 'Tickets de base', description: 'Créer et imprimer des tickets', module: 'tickets', actions: ['view', 'create'] },
  ],
  inventory: [
    { id: 'products_all', name: 'Gestion produits', description: 'Gestion complète des produits', module: 'products', actions: ['view', 'create', 'edit', 'delete'] },
    { id: 'dashboard_view', name: 'Voir tableau de bord', description: 'Accès au tableau de bord', module: 'dashboard', actions: ['view'] },
  ],
};

// Currency configurations
export const CURRENCIES = {
  XOF: { symbol: 'F CFA', name: 'Franc CFA', decimals: 0 },
  USD: { symbol: '$', name: 'Dollar US', decimals: 2 },
  EUR: { symbol: '€', name: 'Euro', decimals: 2 },
  GBP: { symbol: '£', name: 'Livre Sterling', decimals: 2 },
  JPY: { symbol: '¥', name: 'Yen Japonais', decimals: 0 },
  CAD: { symbol: 'C$', name: 'Dollar Canadien', decimals: 2 },
  AUD: { symbol: 'A$', name: 'Dollar Australien', decimals: 2 },
};

// Language configurations
export const LANGUAGES = {
  fr: { name: 'Français', flag: '🇫🇷' },
  en: { name: 'English', flag: '🇺🇸' },
};
