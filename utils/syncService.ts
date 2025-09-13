
import { isOnline, getSyncQueue, markAsSynced, clearSyncedItems, addToSyncQueue } from './storage';
import { authService } from './authService';

export class SyncService {
  private syncInProgress = false;
  private syncInterval: NodeJS.Timeout | null = null;

  // Start automatic sync
  startAutoSync(intervalMinutes: number = 15): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(async () => {
      await this.syncPendingData();
    }, intervalMinutes * 60 * 1000);

    console.log(`Auto sync started with ${intervalMinutes} minute interval`);
  }

  // Stop automatic sync
  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('Auto sync stopped');
    }
  }

  // Manual sync trigger
  async syncNow(): Promise<{ success: boolean; message: string }> {
    try {
      const online = await isOnline();
      if (!online) {
        return { success: false, message: 'Pas de connexion Internet' };
      }

      const result = await this.syncPendingData();
      return result;
    } catch (error) {
      console.error('Manual sync error:', error);
      return { success: false, message: 'Erreur lors de la synchronisation' };
    }
  }

  // Sync pending data
  private async syncPendingData(): Promise<{ success: boolean; message: string }> {
    if (this.syncInProgress) {
      console.log('Sync already in progress, skipping...');
      return { success: false, message: 'Synchronisation déjà en cours' };
    }

    try {
      this.syncInProgress = true;
      console.log('Starting sync process...');

      const online = await isOnline();
      if (!online) {
        console.log('Device is offline, skipping sync');
        return { success: false, message: 'Appareil hors ligne' };
      }

      const syncQueue = await getSyncQueue();
      const pendingItems = syncQueue.filter(item => !item.synced);

      if (pendingItems.length === 0) {
        console.log('No pending items to sync');
        return { success: true, message: 'Aucune donnée à synchroniser' };
      }

      console.log(`Syncing ${pendingItems.length} pending items...`);

      let successCount = 0;
      let errorCount = 0;

      // Process each sync item
      for (const item of pendingItems) {
        try {
          await this.processSyncItem(item);
          await markAsSynced(item.id);
          successCount++;
          console.log(`Synced item: ${item.type} (${item.id})`);
        } catch (error) {
          console.error(`Failed to sync item ${item.id}:`, error);
          errorCount++;
        }
      }

      // Clean up synced items
      await clearSyncedItems();

      const message = `Synchronisation terminée: ${successCount} réussies, ${errorCount} échouées`;
      console.log(message);

      return { 
        success: errorCount === 0, 
        message 
      };
    } catch (error) {
      console.error('Sync process error:', error);
      return { success: false, message: 'Erreur lors de la synchronisation' };
    } finally {
      this.syncInProgress = false;
    }
  }

  // Process individual sync item
  private async processSyncItem(item: any): Promise<void> {
    switch (item.type) {
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
      default:
        console.log(`Unknown sync type: ${item.type}`);
    }
  }

  // Sync employee creation
  private async syncEmployeeCreate(data: any): Promise<void> {
    // In a real app, this would make an API call to your backend
    console.log('Syncing employee creation:', data.username);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // For now, we just log the sync - in a real app you'd send to your server
    console.log('Employee creation synced to server:', data.id);
  }

  // Sync employee update
  private async syncEmployeeUpdate(data: any): Promise<void> {
    console.log('Syncing employee update:', data.id);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    console.log('Employee update synced to server:', data.id);
  }

  // Sync employee deletion
  private async syncEmployeeDelete(data: any): Promise<void> {
    console.log('Syncing employee deletion:', data.id);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    console.log('Employee deletion synced to server:', data.id);
  }

  // Sync password change
  private async syncPasswordChange(data: any): Promise<void> {
    console.log('Syncing password change:', data.userId);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    console.log('Password change synced to server:', data.userId);
  }

  // Sync password reset
  private async syncPasswordReset(data: any): Promise<void> {
    console.log('Syncing password reset:', data.employeeId);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    console.log('Password reset synced to server:', data.employeeId);
  }

  // Get sync status
  async getSyncStatus(): Promise<{
    pendingCount: number;
    lastSyncTime?: Date;
    isOnline: boolean;
  }> {
    const syncQueue = await getSyncQueue();
    const pendingItems = syncQueue.filter(item => !item.synced);
    const online = await isOnline();
    
    // Get last sync time from the most recent synced item
    const syncedItems = syncQueue.filter(item => item.synced && item.syncedAt);
    const lastSyncTime = syncedItems.length > 0 
      ? new Date(Math.max(...syncedItems.map(item => new Date(item.syncedAt!).getTime())))
      : undefined;

    return {
      pendingCount: pendingItems.length,
      lastSyncTime,
      isOnline: online,
    };
  }

  // Force sync offline employee data
  async syncOfflineEmployees(): Promise<void> {
    try {
      await authService.syncOfflineData();
      console.log('Offline employees sync completed');
    } catch (error) {
      console.error('Error syncing offline employees:', error);
    }
  }
}

// Export singleton instance
export const syncService = new SyncService();
