
import * as Network from 'expo-network';
import { 
  getSyncQueue, 
  markAsSynced, 
  clearSyncedItems, 
  addToSyncQueue, 
  logActivity,
  isOnline 
} from './storage';
import { SyncData } from '../types';

class SyncService {
  private syncInterval: NodeJS.Timeout | null = null;
  private isCurrentlySyncing = false;

  async startAutoSync(intervalMinutes: number = 15) {
    console.log('Starting auto sync with interval:', intervalMinutes, 'minutes');
    
    // Clear existing interval
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    // Set up new interval
    this.syncInterval = setInterval(async () => {
      await this.performSync();
    }, intervalMinutes * 60 * 1000);

    // Perform initial sync
    await this.performSync();
  }

  stopAutoSync() {
    console.log('Stopping auto sync');
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  async performSync(): Promise<boolean> {
    if (this.isCurrentlySyncing) {
      console.log('Sync already in progress, skipping');
      return false;
    }

    try {
      this.isCurrentlySyncing = true;
      console.log('Starting sync process');

      // Check network connectivity
      const networkState = await Network.getNetworkStateAsync();
      if (!networkState.isConnected || !networkState.isInternetReachable) {
        console.log('No internet connection, skipping sync');
        return false;
      }

      // Get pending sync items
      const syncQueue = await getSyncQueue();
      const pendingItems = syncQueue.filter(item => !item.synced);

      if (pendingItems.length === 0) {
        console.log('No pending items to sync');
        return true;
      }

      console.log(`Syncing ${pendingItems.length} pending items`);

      // In a real implementation, you would send these to your backend
      // For now, we'll simulate the sync process
      for (const item of pendingItems) {
        try {
          await this.syncItem(item);
          await markAsSynced(item.id);
          console.log('Synced item:', item.type, item.id);
        } catch (error) {
          console.error('Failed to sync item:', item.id, error);
          // Continue with other items even if one fails
        }
      }

      // Clean up synced items periodically
      await clearSyncedItems();

      await logActivity('system', 'sync', 'Sync completed', { 
        itemsProcessed: pendingItems.length 
      });

      console.log('Sync process completed successfully');
      return true;

    } catch (error) {
      console.error('Sync process failed:', error);
      await logActivity('system', 'sync', 'Sync failed', { error: error.message });
      return false;
    } finally {
      this.isCurrentlySyncing = false;
    }
  }

  private async syncItem(item: SyncData): Promise<void> {
    // In a real implementation, this would make API calls to your backend
    // For now, we'll simulate the process
    
    console.log('Syncing item:', item.type, item.data);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    switch (item.type) {
      case 'sale':
        // Sync sale data to backend
        console.log('Syncing sale:', item.data.receiptNumber);
        break;
      
      case 'customer':
        // Sync customer data to backend
        console.log('Syncing customer:', item.data.name);
        break;
      
      case 'product':
        // Sync product data to backend
        console.log('Syncing product:', item.data.name);
        break;
      
      case 'employee_action':
        // Sync employee action to backend
        console.log('Syncing employee action:', item.data.action);
        break;
      
      default:
        console.warn('Unknown sync item type:', item.type);
    }
  }

  async addSaleToSync(saleData: any) {
    await addToSyncQueue({
      type: 'sale',
      data: saleData,
      deviceId: await this.getDeviceId(),
    });
  }

  async addCustomerToSync(customerData: any) {
    await addToSyncQueue({
      type: 'customer',
      data: customerData,
      deviceId: await this.getDeviceId(),
    });
  }

  async addProductToSync(productData: any) {
    await addToSyncQueue({
      type: 'product',
      data: productData,
      deviceId: await this.getDeviceId(),
    });
  }

  async addEmployeeActionToSync(actionData: any) {
    await addToSyncQueue({
      type: 'employee_action',
      data: actionData,
      deviceId: await this.getDeviceId(),
    });
  }

  private async getDeviceId(): Promise<string> {
    // In a real implementation, you would get a unique device identifier
    // For now, we'll use a simple timestamp-based ID
    return `device-${Date.now()}`;
  }

  async getNetworkStatus() {
    try {
      const networkState = await Network.getNetworkStateAsync();
      return {
        isConnected: networkState.isConnected,
        isInternetReachable: networkState.isInternetReachable,
        type: networkState.type,
      };
    } catch (error) {
      console.error('Error getting network status:', error);
      return {
        isConnected: false,
        isInternetReachable: false,
        type: 'unknown',
      };
    }
  }

  async getPendingSyncCount(): Promise<number> {
    try {
      const syncQueue = await getSyncQueue();
      return syncQueue.filter(item => !item.synced).length;
    } catch (error) {
      console.error('Error getting pending sync count:', error);
      return 0;
    }
  }

  isSyncing(): boolean {
    return this.isCurrentlySyncing;
  }
}

// Export singleton instance
export const syncService = new SyncService();

// Auto-start sync service
export const initializeSyncService = async () => {
  try {
    console.log('Initializing sync service');
    await syncService.startAutoSync(15); // 15 minutes interval
  } catch (error) {
    console.error('Failed to initialize sync service:', error);
  }
};
