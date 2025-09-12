
export interface AuthUser {
  id: string;
  username: string;
  email: string;
  password: string; // Encrypted password
  role: 'admin' | 'manager' | 'cashier' | 'inventory';
  permissions: Permission[];
  isActive: boolean;
  isFirstLogin: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string; // ID of the user who created this account
}

export interface Permission {
  id: string;
  name: string;
  description: string;
  module: 'dashboard' | 'pos' | 'products' | 'customers' | 'reports' | 'settings' | 'employees' | 'printers' | 'tickets';
  actions: ('view' | 'create' | 'edit' | 'delete')[];
}

export interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isFirstLaunch: boolean;
  isAuthenticated: boolean;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface CreateAccountData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  companyName: string;
  companyPhone?: string;
  companyAddress?: string;
}

export interface CreateEmployeeData {
  name: string;
  username: string;
  email: string;
  password: string;
  role: 'manager' | 'cashier' | 'inventory';
  permissions: Permission[];
  phone?: string;
}

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
