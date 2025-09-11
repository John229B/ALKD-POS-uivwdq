
export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'employee';
  createdAt: Date;
  isActive: boolean;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  cost: number;
  barcode?: string;
  category: string;
  stock: number;
  minStock: number;
  imageUrl?: string;
  isActive: boolean;
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
  quantity: number;
  discount: number;
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
  quantity: number;
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
  topProducts: Array<{
    product: Product;
    quantity: number;
    revenue: number;
  }>;
}

export interface AppSettings {
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  currency: 'XOF' | 'USD' | 'EUR';
  language: 'fr' | 'en';
  taxRate: number;
  receiptFooter?: string;
  logoUrl?: string;
}

export interface License {
  id: string;
  type: 'monthly' | 'quarterly' | 'yearly' | 'lifetime';
  startDate: Date;
  endDate?: Date;
  isActive: boolean;
  clientId: string;
}
