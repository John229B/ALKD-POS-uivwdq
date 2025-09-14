
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Product, Customer, Sale, AppSettings, DashboardStats, Category, Employee, ActivityLog, BluetoothPrinter, Ticket, SyncData, TicketSettings } from '../types';

const STORAGE_KEYS = {
  USERS: 'alkd_pos_users',
  EMPLOYEES: 'alkd_pos_employees',
  PRODUCTS: 'alkd_pos_products',
  CATEGORIES: 'alkd_pos_categories',
  CUSTOMERS: 'alkd_pos_customers',
  SALES: 'alkd_pos_sales',
  SETTINGS: 'alkd_pos_settings',
  CURRENT_USER: 'alkd_pos_current_user',
  CURRENT_EMPLOYEE: 'alkd_pos_current_employee',
  RECEIPT_COUNTER: 'alkd_pos_receipt_counter',
  ACTIVITY_LOGS: 'alkd_pos_activity_logs',
  BLUETOOTH_PRINTERS: 'alkd_pos_bluetooth_printers',
  TICKETS: 'alkd_pos_tickets',
  SYNC_QUEUE: 'alkd_pos_sync_queue',
  OFFLINE_DATA: 'alkd_pos_offline_data',
  TICKET_SETTINGS: 'alkd_pos_ticket_settings',
};

// Generic storage functions with improved error handling
export const storeData = async (key: string, data: any): Promise<void> => {
  try {
    const jsonValue = JSON.stringify(data);
    await AsyncStorage.setItem(key, jsonValue);
    console.log(`✅ Storage: Data stored successfully for key: ${key}`);
  } catch (error) {
    console.error(`❌ Storage: Error storing data for key ${key}:`, error);
    throw error;
  }
};

export const getData = async <T>(key: string): Promise<T | null> => {
  try {
    const jsonValue = await AsyncStorage.getItem(key);
    if (jsonValue != null) {
      const parsedData = JSON.parse(jsonValue) as T;
      console.log(`✅ Storage: Data retrieved successfully for key: ${key}`);
      return parsedData;
    }
    console.log(`ℹ️ Storage: No data found for key: ${key}`);
    return null;
  } catch (error) {
    console.error(`❌ Storage: Error getting data for key ${key}:`, error);
    return null;
  }
};

export const removeData = async (key: string): Promise<void> => {
  try {
    await AsyncStorage.removeItem(key);
    console.log(`✅ Storage: Data removed successfully for key: ${key}`);
  } catch (error) {
    console.error(`❌ Storage: Error removing data for key ${key}:`, error);
    throw error;
  }
};

// User management
export const storeUsers = async (users: User[]): Promise<void> => {
  await storeData(STORAGE_KEYS.USERS, users);
};

export const getUsers = async (): Promise<User[]> => {
  const users = await getData<User[]>(STORAGE_KEYS.USERS);
  return users || [];
};

export const storeCurrentUser = async (user: User): Promise<void> => {
  await storeData(STORAGE_KEYS.CURRENT_USER, user);
};

export const getCurrentUser = async (): Promise<User | null> => {
  return await getData<User>(STORAGE_KEYS.CURRENT_USER);
};

export const clearCurrentUser = async (): Promise<void> => {
  await removeData(STORAGE_KEYS.CURRENT_USER);
};

// Employee management
export const storeEmployees = async (employees: Employee[]): Promise<void> => {
  await storeData(STORAGE_KEYS.EMPLOYEES, employees);
  await logActivity('system', 'employees', 'Employees data updated', { count: employees.length });
};

export const getEmployees = async (): Promise<Employee[]> => {
  const employees = await getData<Employee[]>(STORAGE_KEYS.EMPLOYEES);
  return employees || [];
};

export const storeCurrentEmployee = async (employee: Employee): Promise<void> => {
  await storeData(STORAGE_KEYS.CURRENT_EMPLOYEE, employee);
};

export const getCurrentEmployee = async (): Promise<Employee | null> => {
  return await getData<Employee>(STORAGE_KEYS.CURRENT_EMPLOYEE);
};

export const clearCurrentEmployee = async (): Promise<void> => {
  await removeData(STORAGE_KEYS.CURRENT_EMPLOYEE);
};

export const deleteEmployee = async (employeeId: string): Promise<void> => {
  try {
    console.log('🗑️ Storage: Deleting employee:', employeeId);
    const employees = await getEmployees();
    const updatedEmployees = employees.filter(e => e.id !== employeeId);
    await storeEmployees(updatedEmployees);
    await logActivity('admin', 'employees', 'Employee deleted', { employeeId });
    console.log('✅ Storage: Employee deleted successfully');
  } catch (error) {
    console.error('❌ Storage: Error deleting employee:', error);
    throw error;
  }
};

// Activity logging
export const logActivity = async (employeeId: string, module: string, action: string, details?: any): Promise<void> => {
  try {
    const logs = await getActivityLogs();
    const newLog: ActivityLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      employeeId,
      action,
      module,
      details: typeof details === 'string' ? details : JSON.stringify(details || {}),
      metadata: details,
      timestamp: new Date(),
    };
    
    logs.unshift(newLog);
    
    // Keep only last 1000 logs to prevent storage bloat
    if (logs.length > 1000) {
      logs.splice(1000);
    }
    
    await storeData(STORAGE_KEYS.ACTIVITY_LOGS, logs);
    console.log('📝 Storage: Activity logged:', action, 'by', employeeId);
  } catch (error) {
    console.error('❌ Storage: Error logging activity:', error);
    // Don't throw error to prevent breaking main functionality
  }
};

export const getActivityLogs = async (): Promise<ActivityLog[]> => {
  const logs = await getData<ActivityLog[]>(STORAGE_KEYS.ACTIVITY_LOGS);
  return logs || [];
};

// Bluetooth printer management
export const storeBluetoothPrinters = async (printers: BluetoothPrinter[]): Promise<void> => {
  await storeData(STORAGE_KEYS.BLUETOOTH_PRINTERS, printers);
  await logActivity('system', 'printers', 'Printers data updated', { count: printers.length });
};

export const getBluetoothPrinters = async (): Promise<BluetoothPrinter[]> => {
  const printers = await getData<BluetoothPrinter[]>(STORAGE_KEYS.BLUETOOTH_PRINTERS);
  return printers || [];
};

export const deleteBluetoothPrinter = async (printerId: string): Promise<void> => {
  try {
    console.log('🗑️ Storage: Deleting printer:', printerId);
    const printers = await getBluetoothPrinters();
    const updatedPrinters = printers.filter(p => p.id !== printerId);
    await storeBluetoothPrinters(updatedPrinters);
    await logActivity('admin', 'printers', 'Printer deleted', { printerId });
    console.log('✅ Storage: Printer deleted successfully');
  } catch (error) {
    console.error('❌ Storage: Error deleting printer:', error);
    throw error;
  }
};

export const setDefaultPrinter = async (printerId: string): Promise<void> => {
  try {
    const printers = await getBluetoothPrinters();
    const updatedPrinters = printers.map(p => ({
      ...p,
      isDefault: p.id === printerId
    }));
    await storeBluetoothPrinters(updatedPrinters);
    await logActivity('admin', 'printers', 'Default printer set', { printerId });
  } catch (error) {
    console.error('❌ Storage: Error setting default printer:', error);
    throw error;
  }
};

// Ticket settings management
export const getTicketSettings = async (): Promise<TicketSettings> => {
  const settings = await getData<TicketSettings>(STORAGE_KEYS.TICKET_SETTINGS);
  return settings || {
    showLogo: true,
    showCompanyName: true,
    showAddress: true,
    showPhone: true,
    showEmail: false,
    showThankYouMessage: true,
    showReceiptNumber: true,
    showDateTime: true,
    showEmployeeName: true,
    showTax: true,
  };
};

export const storeTicketSettings = async (settings: TicketSettings): Promise<void> => {
  await storeData(STORAGE_KEYS.TICKET_SETTINGS, settings);
  await logActivity('admin', 'settings', 'Ticket settings updated', settings);
};

// Ticket management
export const storeTickets = async (tickets: Ticket[]): Promise<void> => {
  await storeData(STORAGE_KEYS.TICKETS, tickets);
};

export const getTickets = async (): Promise<Ticket[]> => {
  const tickets = await getData<Ticket[]>(STORAGE_KEYS.TICKETS);
  return tickets || [];
};

export const addTicket = async (ticket: Ticket): Promise<void> => {
  try {
    const tickets = await getTickets();
    tickets.unshift(ticket);
    
    // Keep only last 500 tickets to prevent storage bloat
    if (tickets.length > 500) {
      tickets.splice(500);
    }
    
    await storeTickets(tickets);
    await logActivity(ticket.employeeName, 'tickets', 'Ticket created', { ticketId: ticket.id, receiptNumber: ticket.receiptNumber });
  } catch (error) {
    console.error('❌ Storage: Error adding ticket:', error);
    throw error;
  }
};

// Sync and offline management
export const addToSyncQueue = async (data: Omit<SyncData, 'id' | 'timestamp' | 'synced'>): Promise<void> => {
  try {
    const queue = await getSyncQueue();
    const syncItem: SyncData = {
      ...data,
      id: `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      synced: false,
    };
    
    queue.push(syncItem);
    await storeData(STORAGE_KEYS.SYNC_QUEUE, queue);
    console.log('📤 Storage: Added to sync queue:', syncItem.type);
  } catch (error) {
    console.error('❌ Storage: Error adding to sync queue:', error);
  }
};

export const getSyncQueue = async (): Promise<SyncData[]> => {
  const queue = await getData<SyncData[]>(STORAGE_KEYS.SYNC_QUEUE);
  return queue || [];
};

export const markAsSynced = async (syncId: string): Promise<void> => {
  try {
    const queue = await getSyncQueue();
    const updatedQueue = queue.map(item => 
      item.id === syncId 
        ? { ...item, synced: true, syncedAt: new Date() }
        : item
    );
    await storeData(STORAGE_KEYS.SYNC_QUEUE, updatedQueue);
  } catch (error) {
    console.error('❌ Storage: Error marking as synced:', error);
  }
};

export const clearSyncedItems = async (): Promise<void> => {
  try {
    const queue = await getSyncQueue();
    const unsyncedItems = queue.filter(item => !item.synced);
    await storeData(STORAGE_KEYS.SYNC_QUEUE, unsyncedItems);
  } catch (error) {
    console.error('❌ Storage: Error clearing synced items:', error);
  }
};

// Category management
export const storeCategories = async (categories: Category[]): Promise<void> => {
  await storeData(STORAGE_KEYS.CATEGORIES, categories);
};

export const getCategories = async (): Promise<Category[]> => {
  const categories = await getData<Category[]>(STORAGE_KEYS.CATEGORIES);
  return categories || [];
};

// Product management
export const storeProducts = async (products: Product[]): Promise<void> => {
  await storeData(STORAGE_KEYS.PRODUCTS, products);
};

export const getProducts = async (): Promise<Product[]> => {
  const products = await getData<Product[]>(STORAGE_KEYS.PRODUCTS);
  return products || [];
};

export const deleteProduct = async (productId: string): Promise<void> => {
  try {
    console.log('🗑️ Storage: Deleting product permanently:', productId);
    const products = await getProducts();
    const updatedProducts = products.filter(p => p.id !== productId);
    await storeProducts(updatedProducts);
    await logActivity('admin', 'products', 'Product deleted', { productId });
    console.log('✅ Storage: Product deleted successfully');
  } catch (error) {
    console.error('❌ Storage: Error deleting product:', error);
    throw error;
  }
};

// CORRECTED: Customer management with simplified and robust logic
export const storeCustomers = async (customers: Customer[]): Promise<void> => {
  await storeData(STORAGE_KEYS.CUSTOMERS, customers);
  console.log('✅ Storage: Customers stored successfully:', customers.length);
};

export const getCustomers = async (): Promise<Customer[]> => {
  const customers = await getData<Customer[]>(STORAGE_KEYS.CUSTOMERS);
  return customers || [];
};

export const deleteCustomer = async (customerId: string): Promise<void> => {
  try {
    console.log('🗑️ Storage: Deleting customer permanently:', customerId);
    
    const [customers, sales] = await Promise.all([
      getCustomers(),
      getSales(),
    ]);
    
    // Remove customer from customers list
    const updatedCustomers = customers.filter(c => c.id !== customerId);
    
    // Remove all sales associated with this customer
    const updatedSales = sales.filter(sale => sale.customerId !== customerId);
    
    // Save updated data
    await Promise.all([
      storeCustomers(updatedCustomers),
      storeSales(updatedSales),
    ]);
    
    await logActivity('admin', 'customers', 'Customer deleted', { customerId });
    console.log('✅ Storage: Customer and associated sales deleted successfully');
  } catch (error) {
    console.error('❌ Storage: Error deleting customer:', error);
    throw error;
  }
};

// Sales management
export const storeSales = async (sales: Sale[]): Promise<void> => {
  await storeData(STORAGE_KEYS.SALES, sales);
};

export const getSales = async (): Promise<Sale[]> => {
  const sales = await getData<Sale[]>(STORAGE_KEYS.SALES);
  return sales || [];
};

// Settings management
export const storeSettings = async (settings: AppSettings): Promise<void> => {
  await storeData(STORAGE_KEYS.SETTINGS, settings);
  await logActivity('admin', 'settings', 'Settings updated', settings);
};

export const getSettings = async (): Promise<AppSettings> => {
  const settings = await getData<AppSettings>(STORAGE_KEYS.SETTINGS);
  return settings || {
    companyName: 'ALKD-POS',
    companyAddress: '',
    companyPhone: '',
    companyEmail: '',
    currency: 'XOF',
    language: 'fr',
    taxRate: 0,
    receiptFooter: 'Merci pour votre achat!',
    customThankYouMessage: 'Merci pour votre confiance !',
    offlineMode: true,
    autoSync: true,
    syncInterval: 15,
    ticketSettings: {
      showLogo: true,
      showCompanyName: true,
      showAddress: true,
      showPhone: true,
      showEmail: false,
      showThankYouMessage: true,
      showReceiptNumber: true,
      showDateTime: true,
      showEmployeeName: true,
      showTax: true,
    },
  };
};

// Receipt counter
export const getNextReceiptNumber = async (): Promise<string> => {
  const counter = await getData<number>(STORAGE_KEYS.RECEIPT_COUNTER) || 1000;
  const nextCounter = counter + 1;
  await storeData(STORAGE_KEYS.RECEIPT_COUNTER, nextCounter);
  return `REC-${nextCounter.toString().padStart(6, '0')}`;
};

// CORRECTED: Simplified pricing logic utility
export const getApplicablePrice = (product: Product, quantity: number = 1): { price: number; type: 'retail' | 'wholesale' | 'promotional' } => {
  if (!product) {
    console.log('⚠️ Storage: getApplicablePrice called with undefined product');
    return { price: 0, type: 'retail' };
  }

  if (quantity === undefined || quantity === null || isNaN(quantity) || quantity <= 0) {
    console.log('⚠️ Storage: getApplicablePrice called with invalid quantity:', quantity);
    quantity = 1;
  }

  const now = new Date();
  
  // Check promotional price first (if valid and not expired)
  if (product.promotionalPrice && 
      product.promotionalPrice > 0 && 
      product.promotionalValidUntil && 
      new Date(product.promotionalValidUntil) > now) {
    return { price: product.promotionalPrice, type: 'promotional' };
  }
  
  // Check wholesale price (if quantity meets minimum requirement)
  if (product.wholesalePrice && 
      product.wholesalePrice > 0 && 
      product.wholesaleMinQuantity && 
      quantity >= product.wholesaleMinQuantity) {
    return { price: product.wholesalePrice, type: 'wholesale' };
  }
  
  // Default to retail price
  const retailPrice = product.retailPrice || 0;
  return { price: retailPrice, type: 'retail' };
};

// Utility function to format quantity with unit
export const formatQuantityWithUnit = (quantity: number, unit: string): string => {
  if (quantity % 1 === 0) {
    return `${quantity} ${unit}`;
  } else {
    return `${parseFloat(quantity.toFixed(3))} ${unit}`;
  }
};

// Network status check
export const isOnline = async (): Promise<boolean> => {
  try {
    const response = await fetch('https://www.google.com/favicon.ico', {
      method: 'HEAD',
      mode: 'no-cors',
    });
    return true;
  } catch {
    return false;
  }
};

// CORRECTED: Initialize default data with better error handling
export const initializeDefaultData = async (): Promise<void> => {
  try {
    console.log('🚀 Storage: Initializing default data...');
    
    // Check if users exist, if not create default admin
    const users = await getUsers();
    
    if (users.length === 0) {
      const defaultAdmin: User = {
        id: 'admin-001',
        username: 'admin',
        email: 'admin@alkd-pos.com',
        role: 'admin',
        createdAt: new Date(),
        isActive: true,
      };
      await storeUsers([defaultAdmin]);
      console.log('✅ Storage: Default admin user created');
    }

    // Initialize default categories
    const categories = await getCategories();
    
    if (categories.length === 0) {
      const defaultCategories: Category[] = [
        {
          id: 'cat-001',
          name: 'Boissons',
          description: 'Boissons gazeuses, jus, eau',
          color: '#3498db',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'cat-002',
          name: 'Boulangerie',
          description: 'Pain, viennoiseries, pâtisseries',
          color: '#e67e22',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'cat-003',
          name: 'Produits laitiers',
          description: 'Lait, yaourts, fromages',
          color: '#2ecc71',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'cat-004',
          name: 'Électronique',
          description: 'Téléphones, accessoires, gadgets',
          color: '#9b59b6',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      await storeCategories(defaultCategories);
      console.log('✅ Storage: Default categories created');
    }

    // Initialize default products
    const products = await getProducts();
    
    if (products.length === 0) {
      const defaultProducts: Product[] = [
        {
          id: 'prod-001',
          name: 'Coca Cola 33cl',
          description: 'Boisson gazeuse',
          retailPrice: 500,
          wholesalePrice: 450,
          wholesaleMinQuantity: 12,
          promotionalPrice: 400,
          promotionalValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          cost: 300,
          barcode: '123456789001',
          categoryId: 'cat-001',
          stock: 50,
          minStock: 10,
          unit: 'bouteille',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'prod-002',
          name: 'Pain de mie',
          description: 'Pain de mie complet',
          retailPrice: 800,
          wholesalePrice: 750,
          wholesaleMinQuantity: 6,
          cost: 500,
          barcode: '123456789002',
          categoryId: 'cat-002',
          stock: 25,
          minStock: 5,
          unit: 'pièce',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'prod-003',
          name: 'Lait frais',
          description: 'Lait frais pasteurisé',
          retailPrice: 1200,
          wholesalePrice: 1100,
          wholesaleMinQuantity: 10,
          cost: 800,
          barcode: '123456789003',
          categoryId: 'cat-003',
          stock: 30,
          minStock: 8,
          unit: 'L',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'prod-004',
          name: 'Smartphone Samsung A54',
          description: 'Téléphone Android dernière génération',
          retailPrice: 250000,
          wholesalePrice: 230000,
          wholesaleMinQuantity: 3,
          cost: 200000,
          barcode: '123456789004',
          categoryId: 'cat-004',
          stock: 15,
          minStock: 3,
          unit: 'pièce',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'prod-005',
          name: 'Riz jasmin',
          description: 'Riz jasmin de qualité premium',
          retailPrice: 1000,
          wholesalePrice: 900,
          wholesaleMinQuantity: 5,
          cost: 700,
          barcode: '123456789005',
          categoryId: 'cat-003',
          stock: 100,
          minStock: 20,
          unit: 'Kg',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      await storeProducts(defaultProducts);
      console.log('✅ Storage: Default products created');
    }

    console.log('🎉 Storage: Default data initialization completed successfully');
  } catch (error) {
    console.error('❌ Storage: Error initializing default data:', error);
    // Don't re-throw the error to prevent app crashes
  }
};
