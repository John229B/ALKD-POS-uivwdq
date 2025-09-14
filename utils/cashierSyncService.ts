
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Sale, AuthUser } from '../types';
import { getSales, addToSyncQueue, isOnline } from './storage';
import { authService } from './authService';

const STORAGE_KEYS = {
  CASHIER_SYNC_QUEUE: 'alkd_pos_cashier_sync_queue',
  LAST_SYNC_TIME: 'alkd_pos_last_cashier_sync',
  PENDING_CASHIER_REPORTS: 'alkd_pos_pending_cashier_reports',
};

export interface CashierSaleReport {
  id: string;
  cashierId: string;
  cashierUsername: string;
  sale: Sale;
  timestamp: Date;
  synced: boolean;
  syncAttempts: number;
}

export class CashierSyncService {
  private syncInterval: NodeJS.Timeout | null = null;
  private isInitialized = false;

  // Initialize the sync service
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log('Initializing Cashier Sync Service...');
    
    try {
      // Start periodic sync every 30 seconds
      this.startPeriodicSync();
      
      // Sync immediately if online
      const online = await isOnline();
      if (online) {
        await this.syncPendingReports();
      }
      
      this.isInitialized = true;
      console.log('Cashier Sync Service initialized successfully');
    } catch (error) {
      console.error('Error initializing Cashier Sync Service:', error);
    }
  }

  // Start periodic sync
  private startPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(async () => {
      try {
        const online = await isOnline();
        if (online) {
          await this.syncPendingReports();
        }
      } catch (error) {
        console.error('Periodic sync error:', error);
      }
    }, 30000); // Sync every 30 seconds
  }

  // Stop sync service
  stop(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    this.isInitialized = false;
    console.log('Cashier Sync Service stopped');
  }

  // Add cashier sale to sync queue
  async addCashierSale(sale: Sale, cashier: AuthUser): Promise<void> {
    try {
      if (cashier.role !== 'cashier') {
        return; // Only sync cashier sales
      }

      const report: CashierSaleReport = {
        id: `cashier-report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        cashierId: cashier.id,
        cashierUsername: cashier.username,
        sale,
        timestamp: new Date(),
        synced: false,
        syncAttempts: 0,
      };

      // Add to pending reports
      const pendingReports = await this.getPendingReports();
      pendingReports.push(report);
      await this.storePendingReports(pendingReports);

      console.log('Cashier sale added to sync queue:', {
        saleId: sale.id,
        cashier: cashier.username,
        amount: sale.total,
      });

      // Try immediate sync if online
      const online = await isOnline();
      if (online) {
        await this.syncPendingReports();
      }
    } catch (error) {
      console.error('Error adding cashier sale to sync queue:', error);
    }
  }

  // Get pending reports
  private async getPendingReports(): Promise<CashierSaleReport[]> {
    try {
      const reportsJson = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_CASHIER_REPORTS);
      if (reportsJson) {
        const reports = JSON.parse(reportsJson);
        return reports.map((report: any) => ({
          ...report,
          timestamp: new Date(report.timestamp),
          sale: {
            ...report.sale,
            date: new Date(report.sale.date),
          },
        }));
      }
      return [];
    } catch (error) {
      console.error('Error getting pending reports:', error);
      return [];
    }
  }

  // Store pending reports
  private async storePendingReports(reports: CashierSaleReport[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.PENDING_CASHIER_REPORTS, JSON.stringify(reports));
    } catch (error) {
      console.error('Error storing pending reports:', error);
    }
  }

  // Sync pending reports to admin
  async syncPendingReports(): Promise<void> {
    try {
      const online = await isOnline();
      if (!online) {
        console.log('Offline - skipping cashier reports sync');
        return;
      }

      const pendingReports = await this.getPendingReports();
      const unsynced = pendingReports.filter(report => !report.synced && report.syncAttempts < 5);

      if (unsynced.length === 0) {
        return;
      }

      console.log(`Syncing ${unsynced.length} cashier reports...`);

      const syncedReports: string[] = [];
      const failedReports: string[] = [];

      for (const report of unsynced) {
        try {
          // Add to main sync queue for server synchronization
          await addToSyncQueue({
            type: 'cashier_sale_report',
            data: {
              reportId: report.id,
              cashierId: report.cashierId,
              cashierUsername: report.cashierUsername,
              sale: report.sale,
              timestamp: report.timestamp,
            },
            priority: 'high',
            metadata: {
              cashierSync: true,
              realTimeSync: true,
            },
          });

          // Mark as synced
          report.synced = true;
          report.syncAttempts += 1;
          syncedReports.push(report.id);

          console.log('Cashier report synced:', {
            reportId: report.id,
            cashier: report.cashierUsername,
            saleId: report.sale.id,
          });
        } catch (error) {
          console.error('Error syncing cashier report:', error);
          report.syncAttempts += 1;
          failedReports.push(report.id);
        }
      }

      // Update pending reports
      await this.storePendingReports(pendingReports);

      // Update last sync time
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC_TIME, new Date().toISOString());

      console.log('Cashier sync completed:', {
        synced: syncedReports.length,
        failed: failedReports.length,
        total: unsynced.length,
      });
    } catch (error) {
      console.error('Error syncing cashier reports:', error);
    }
  }

  // Get cashier's own sales for reports
  async getCashierSales(cashierId: string): Promise<Sale[]> {
    try {
      const allSales = await getSales();
      return allSales.filter(sale => sale.employeeId === cashierId);
    } catch (error) {
      console.error('Error getting cashier sales:', error);
      return [];
    }
  }

  // Get sync status
  async getSyncStatus(): Promise<{
    lastSyncTime: Date | null;
    pendingCount: number;
    failedCount: number;
  }> {
    try {
      const [lastSyncTimeStr, pendingReports] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC_TIME),
        this.getPendingReports(),
      ]);

      const lastSyncTime = lastSyncTimeStr ? new Date(lastSyncTimeStr) : null;
      const pendingCount = pendingReports.filter(r => !r.synced).length;
      const failedCount = pendingReports.filter(r => !r.synced && r.syncAttempts >= 5).length;

      return {
        lastSyncTime,
        pendingCount,
        failedCount,
      };
    } catch (error) {
      console.error('Error getting sync status:', error);
      return {
        lastSyncTime: null,
        pendingCount: 0,
        failedCount: 0,
      };
    }
  }

  // Force sync now
  async forceSyncNow(): Promise<boolean> {
    try {
      console.log('Force syncing cashier reports...');
      await this.syncPendingReports();
      return true;
    } catch (error) {
      console.error('Error force syncing:', error);
      return false;
    }
  }

  // Clear old synced reports (cleanup)
  async cleanupOldReports(daysOld: number = 30): Promise<void> {
    try {
      const pendingReports = await this.getPendingReports();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const filteredReports = pendingReports.filter(report => {
        // Keep unsynced reports and recent synced reports
        return !report.synced || report.timestamp > cutoffDate;
      });

      await this.storePendingReports(filteredReports);
      
      const removedCount = pendingReports.length - filteredReports.length;
      if (removedCount > 0) {
        console.log(`Cleaned up ${removedCount} old cashier reports`);
      }
    } catch (error) {
      console.error('Error cleaning up old reports:', error);
    }
  }
}

// Export singleton instance
export const cashierSyncService = new CashierSyncService();
