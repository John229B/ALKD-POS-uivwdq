
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Product, Customer, Sale, AppSettings, DashboardStats } from '../types';

const STORAGE_KEYS = {
  USERS: 'alkd_pos_users',
  PRODUCTS: 'alkd_pos_products',
  CUSTOMERS: 'alkd_pos_customers',
  SALES: 'alkd_pos_sales',
  SETTINGS: 'alkd_pos_settings',
  CURRENT_USER: 'alkd_pos_current_user',
  RECEIPT_COUNTER: 'alkd_pos_receipt_counter',
};

// Generic storage functions
export const storeData = async (key: string, data: any): Promise<void> => {
  try {
    const jsonValue = JSON.stringify(data);
    await AsyncStorage.setItem(key, jsonValue);
    console.log(`Data stored successfully for key: ${key}`);
  } catch (error) {
    console.error(`Error storing data for key ${key}:`, error);
    throw error;
  }
};

export const getData = async <T>(key: string): Promise<T | null> => {
  try {
    const jsonValue = await AsyncStorage.getItem(key);
    if (jsonValue != null) {
      return JSON.parse(jsonValue) as T;
    }
    return null;
  } catch (error) {
    console.error(`Error getting data for key ${key}:`, error);
    return null;
  }
};

export const removeData = async (key: string): Promise<void> => {
  try {
    await AsyncStorage.removeItem(key);
    console.log(`Data removed successfully for key: ${key}`);
  } catch (error) {
    console.error(`Error removing data for key ${key}:`, error);
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

// Product management
export const storeProducts = async (products: Product[]): Promise<void> => {
  await storeData(STORAGE_KEYS.PRODUCTS, products);
};

export const getProducts = async (): Promise<Product[]> => {
  const products = await getData<Product[]>(STORAGE_KEYS.PRODUCTS);
  return products || [];
};

// Customer management
export const storeCustomers = async (customers: Customer[]): Promise<void> => {
  await storeData(STORAGE_KEYS.CUSTOMERS, customers);
};

export const getCustomers = async (): Promise<Customer[]> => {
  const customers = await getData<Customer[]>(STORAGE_KEYS.CUSTOMERS);
  return customers || [];
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
  };
};

// Receipt counter
export const getNextReceiptNumber = async (): Promise<string> => {
  const counter = await getData<number>(STORAGE_KEYS.RECEIPT_COUNTER) || 1000;
  const nextCounter = counter + 1;
  await storeData(STORAGE_KEYS.RECEIPT_COUNTER, nextCounter);
  return `REC-${nextCounter.toString().padStart(6, '0')}`;
};

// Initialize default data
export const initializeDefaultData = async (): Promise<void> => {
  try {
    console.log('Initializing default data...');
    
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
      console.log('Default admin user created');
    }

    // Initialize default products
    const products = await getProducts();
    if (products.length === 0) {
      const defaultProducts: Product[] = [
        {
          id: 'prod-001',
          name: 'Coca Cola 33cl',
          description: 'Boisson gazeuse',
          price: 500,
          cost: 300,
          barcode: '123456789001',
          category: 'Boissons',
          stock: 50,
          minStock: 10,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'prod-002',
          name: 'Pain de mie',
          description: 'Pain de mie complet',
          price: 800,
          cost: 500,
          barcode: '123456789002',
          category: 'Boulangerie',
          stock: 25,
          minStock: 5,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'prod-003',
          name: 'Lait 1L',
          description: 'Lait frais pasteurisé',
          price: 1200,
          cost: 800,
          barcode: '123456789003',
          category: 'Produits laitiers',
          stock: 30,
          minStock: 8,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      await storeProducts(defaultProducts);
      console.log('Default products created');
    }

    console.log('Default data initialization completed');
  } catch (error) {
    console.error('Error initializing default data:', error);
  }
};
