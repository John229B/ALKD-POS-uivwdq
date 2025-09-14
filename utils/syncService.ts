
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Sale, Product, Customer, SyncData } from '../types';
import { AuthUser } from '../types/auth';
import { getSales, getProducts, getCustomers, storeSales, storeProducts, storeCustomers, isOnline } from './storage';
import { cashierSyncService } from './cashierSyncService';

const STORAGE_KEYS = {
  SYNC_QUEUE: 'alkd_pos_sync_queue',
  LAST_SYNC: 'alkd_pos_last_sync',
  SYNC_STATUS: 'alkd_pos_sync_status',
};

export interface SyncQueueItem {
  id: string;
  type: 'sale' | 'product' | 'customer' | 'employee_create' | 'employee_update' | 'employee_delete' | 'password_change' | 'password_reset' | 'cashier_sale_report';
  data: any;
  timestamp: Date;
  priority: 'low' | 'medium' | 'high';
  attempts: number;
  lastAttempt?: Date;
  error?: string;
  metadata?: any;
}

export interface SyncStatus {
  isOnline: boolean;
  lastSync: Date | null;
  pendingItems: number;
  failedItems: number;
  isRunning: boolean;
}

export class SyncService {
  private syncInterval: NodeJS.Timeout | null = null;
  private isRunning = false;
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log('Initializing Sync Service...');
    
    try {
      // Initialize cashier sync service
      await cashierSyncService.initialize();
      
      // Start periodic sync
      this.startPeriodicSync();
      
      // Initial sync if online
      const online = await isOnline();
      if (online) {
        await this.syncNow();
      }
      
      this.isInitialized = true;
      console.log('Sync Service initialized successfully');
    } catch (error) {
      console.error('Error initializing Sync Service:', error);
    }
  }

  private startPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    // Sync every 2 minutes
    this.syncInterval = setInterval(async () => {
      try {
        const online = await isOnline();
        if (online && !this.isRunning) {
          await this.syncNow();
        }
      } catch (error) {
        console.error('Periodic sync error:', error);
      }
    }, 120000);
  }

  async stop(): Promise<void> {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    
    // Stop cashier sync service
    cashierSyncService.stop();
    
    this.isRunning = false;
    this.isInitialized = false;
    console.log('Sync Service stopped');
  }

  async addToQueue(item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'attempts'>): Promise<void> {
    try {
      const queue = await this.getQueue();
      const newItem: SyncQueueItem = {
        ...item,
        id: `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        attempts: 0,
      };

      queue.push(newItem);
      await this.storeQueue(queue);
      
      console.log('Item added to sync queue:', newItem.type, newItem.id);

      // Try immediate sync if online
      const online = await isOnline();
      if (online && !this.isRunning) {
        setTimeout(() => this.syncNow(), 1000); // Delay to avoid conflicts
      }
    } catch (error) {
      console.error('Error adding item to sync queue:', error);
    }
  }

  private async getQueue(): Promise<SyncQueueItem[]> {
    try {
      const queueJson = await AsyncStorage.getItem(STORAGE_KEYS.SYNC_QUEUE);
      if (queueJson) {
        const queue = JSON.parse(queueJson);
        return queue.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp),
          lastAttempt: item.lastAttempt ? new Date(item.lastAttempt) : undefined,
        }));
      }
      return [];
    } catch (error) {
      console.error('Error getting sync queue:', error);
      return [];
    }
  }

  private async storeQueue(queue: SyncQueueItem[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(queue));
    } catch (error) {
      console.error('Error storing sync queue:', error);
    }
  }

  async syncNow(): Promise<boolean> {
    if (this.isRunning) {
      console.log('Sync already running, skipping...');
      return false;
    }

    try {
      this.isRunning = true;
      console.log('Starting sync process...');

      const online = await isOnline();
      if (!online) {
        console.log('Offline - skipping sync');
        return false;
      }

      const queue = await this.getQueue();
      const pendingItems = queue.filter(item => item.attempts < 5);

      if (pendingItems.length === 0) {
        console.log('No pending items to sync');
        return true;
      }

      console.log(`Syncing ${pendingItems.length} items...`);

      // Sort by priority and timestamp
      const sortedItems = pendingItems.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return a.timestamp.getTime() - b.timestamp.getTime();
      });

      let syncedCount = 0;
      let failedCount = 0;

      for (const item of sortedItems) {
        try {
          await this.syncItem(item);
          
          // Mark as synced (remove from queue)
          const updatedQueue = queue.filter(q => q.id !== item.id);
          await this.storeQueue(updatedQueue);
          
          syncedCount++;
          console.log(`Synced item: ${item.type} (${item.id})`);
        } catch (error) {
          console.error(`Failed to sync item ${item.id}:`, error);
          
          // Update attempts and error
          item.attempts += 1;
          item.lastAttempt = new Date();
          item.error = error instanceof Error ? error.message : 'Unknown error';
          
          failedCount++;
        }
      }

      // Update queue with failed items
      await this.storeQueue(queue);

      // Update last sync time
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());

      console.log(`Sync completed: ${syncedCount} synced, ${failedCount} failed`);
      return failedCount === 0;
    } catch (error) {
      console.error('Sync process error:', error);
      return false;
    } finally {
      this.isRunning = false;
    }
  }

  private async syncItem(item: SyncQueueItem): Promise<void> {
    switch (item.type) {
      case 'sale':
        await this.syncSale(item.data);
        break;
      case 'product':
        await this.syncProduct(item.data);
        break;
      case 'customer':
        await this.syncCustomer(item.data);
        break;
      case 'employee_create':
        await this.syncEmployeeCreate(item.data);
        break;
      case 'employee_update':
        await this.syncEmployeeUpdate(item.data);
        break;
      case 'employee_delete':
        await this.syncEmployeeDelete(item.data);
        break;
      case 'password_change':
        await this.syncPasswordChange(item.data);
        break;
      case 'password_reset':
        await this.syncPasswordReset(item.data);
        break;
      case 'cashier_sale_report':
        await this.syncCashierSaleReport(item.data);
        break;
      default:
        console.warn('Unknown sync item type:', item.type);
    }
  }

  private async syncSale(sale: Sale): Promise<void> {
    // Simulate API call
    console.log('Syncing sale to server:', sale.id);
    // In a real implementation, this would make an HTTP request to your backend
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  private async syncProduct(product: Product): Promise<void> {
    console.log('Syncing product to server:', product.id);
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  private async syncCustomer(customer: Customer): Promise<void> {
    console.log('Syncing customer to server:', customer.id);
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  private async syncEmployeeCreate(employee: AuthUser): Promise<void> {
    console.log('Syncing employee creation to server:', employee.id);
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  private async syncEmployeeUpdate(data: { id: string; updates: Partial<AuthUser> }): Promise<void> {
    console.log('Syncing employee update to server:', data.id);
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  private async syncEmployeeDelete(data: { id: string }): Promise<void> {
    console.log('Syncing employee deletion to server:', data.id);
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  private async syncPasswordChange(data: { userId: string; hashedPassword: string }): Promise<void> {
    console.log('Syncing password change to server:', data.userId);
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  private async syncPasswordReset(data: { employeeId: string; hashedPassword: string }): Promise<void> {
    console.log('Syncing password reset to server:', data.employeeId);
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  private async syncCashierSaleReport(data: any): Promise<void> {
    console.log('Syncing cashier sale report to admin dashboard:', data.reportId);
    // This would sync the cashier's sale report to the admin's dashboard in real-time
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  async getStatus(): Promise<SyncStatus> {
    try {
      const [online, lastSyncStr, queue] = await Promise.all([
        isOnline(),
        AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC),
        this.getQueue(),
      ]);

      const lastSync = lastSyncStr ? new Date(lastSyncStr) : null;
      const pendingItems = queue.filter(item => item.attempts < 5).length;
      const failedItems = queue.filter(item => item.attempts >= 5).length;

      return {
        isOnline: online,
        lastSync,
        pendingItems,
        failedItems,
        isRunning: this.isRunning,
      };
    } catch (error) {
      console.error('Error getting sync status:', error);
      return {
        isOnline: false,
        lastSync: null,
        pendingItems: 0,
        failedItems: 0,
        isRunning: false,
      };
    }
  }

  async clearFailedItems(): Promise<void> {
    try {
      const queue = await this.getQueue();
      const filteredQueue = queue.filter(item => item.attempts < 5);
      await this.storeQueue(filteredQueue);
      console.log('Failed sync items cleared');
    } catch (error) {
      console.error('Error clearing failed items:', error);
    }
  }

  async retryFailedItems(): Promise<void> {
    try {
      const queue = await this.getQueue();
      const failedItems = queue.filter(item => item.attempts >= 5);
      
      // Reset attempts for failed items
      failedItems.forEach(item => {
        item.attempts = 0;
        item.error = undefined;
        item.lastAttempt = undefined;
      });
      
      await this.storeQueue(queue);
      console.log(`Reset ${failedItems.length} failed items for retry`);
      
      // Try sync now
      if (!this.isRunning) {
        await this.syncNow();
      }
    } catch (error) {
      console.error('Error retrying failed items:', error);
    }
  }
}

// Initialize sync service function
export const initializeSyncService = async (): Promise<void> => {
  try {
    await syncService.initialize();
  } catch (error) {
    console.error('Error initializing sync service:', error);
  }
};

// Export singleton instance
export const syncService = new SyncService();
