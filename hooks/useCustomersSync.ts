
import { useState, useEffect, useCallback } from 'react';
import { Customer } from '../types';
import { getCustomers } from '../utils/storage';
import { AppState } from 'react-native';

// CORRECTED: Simplified event emitter for React Native
class SimpleEventEmitter {
  private listeners: ((data: any) => void)[] = [];

  addListener(callback: (data: any) => void) {
    this.listeners.push(callback);
    console.log('📡 EventEmitter: Listener added, total:', this.listeners.length);
  }

  removeListener(callback: (data: any) => void) {
    this.listeners = this.listeners.filter(listener => listener !== callback);
    console.log('📡 EventEmitter: Listener removed, total:', this.listeners.length);
  }

  emit(data: any) {
    console.log('📡 EventEmitter: Emitting update to', this.listeners.length, 'listeners');
    this.listeners.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        console.error('❌ EventEmitter: Error in listener:', error);
      }
    });
  }
}

// Global event emitters
const customersEmitter = new SimpleEventEmitter();
const dashboardEmitter = new SimpleEventEmitter();

// CORRECTED: Hook for real-time customer synchronization
export const useCustomersSync = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState(true);

  const refreshCustomers = useCallback(async () => {
    try {
      console.log('🔄 useCustomersSync: Refreshing customers data...');
      setIsLoading(true);
      const customersData = await getCustomers();
      console.log('✅ useCustomersSync: Loaded customers count:', customersData.length);
      setCustomers(customersData);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('❌ useCustomersSync: Error refreshing customers:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial load
    refreshCustomers();

    // Listen for real-time updates
    const handleCustomersUpdate = (updatedCustomers: Customer[]) => {
      console.log('📨 useCustomersSync: Received customers update event');
      if (updatedCustomers && Array.isArray(updatedCustomers)) {
        console.log('✅ useCustomersSync: Updating customers from event, count:', updatedCustomers.length);
        setCustomers(updatedCustomers);
        setLastUpdate(new Date());
        setIsLoading(false);
      } else {
        console.log('⚠️ useCustomersSync: Event data invalid, refreshing from storage');
        refreshCustomers();
      }
    };

    customersEmitter.addListener(handleCustomersUpdate);

    // Listen for app state changes
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') {
        console.log('🔄 useCustomersSync: App became active, refreshing customers');
        refreshCustomers();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Cleanup
    return () => {
      customersEmitter.removeListener(handleCustomersUpdate);
      subscription.remove();
      console.log('🧹 useCustomersSync: Event listeners removed');
    };
  }, [refreshCustomers]);

  return {
    customers,
    lastUpdate,
    isLoading,
    refreshCustomers,
  };
};

// CORRECTED: Hook for triggering customer updates
export const useCustomersUpdater = () => {
  const triggerCustomersUpdate = useCallback(async (customersData?: Customer[]) => {
    try {
      console.log('📤 useCustomersUpdater: Triggering customers update event...');
      
      let customers: Customer[];
      if (customersData && Array.isArray(customersData)) {
        customers = customersData;
        console.log('✅ useCustomersUpdater: Using provided customers data, count:', customers.length);
      } else {
        console.log('🔄 useCustomersUpdater: Fetching customers from storage...');
        customers = await getCustomers();
        console.log('✅ useCustomersUpdater: Fetched customers from storage, count:', customers.length);
      }
      
      // Emit the update event
      customersEmitter.emit(customers);
      console.log('🎉 useCustomersUpdater: Customers update event emitted successfully');
      
      return customers;
    } catch (error) {
      console.error('❌ useCustomersUpdater: Error triggering customers update:', error);
      return [];
    }
  }, []);

  return {
    triggerCustomersUpdate,
  };
};

// CORRECTED: Hook for real-time dashboard synchronization
export const useDashboardSync = () => {
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const refreshDashboard = useCallback(() => {
    console.log('🔄 useDashboardSync: Dashboard refresh triggered');
    setLastUpdate(new Date());
  }, []);

  useEffect(() => {
    const handleDashboardUpdate = () => {
      console.log('📨 useDashboardSync: Received dashboard update event');
      refreshDashboard();
    };

    dashboardEmitter.addListener(handleDashboardUpdate);

    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') {
        console.log('🔄 useDashboardSync: App became active, refreshing dashboard');
        refreshDashboard();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      dashboardEmitter.removeListener(handleDashboardUpdate);
      subscription.remove();
      console.log('🧹 useDashboardSync: Event listeners removed');
    };
  }, [refreshDashboard]);

  return {
    lastUpdate,
    refreshDashboard,
  };
};

// CORRECTED: Hook for triggering dashboard updates
export const useDashboardUpdater = () => {
  const triggerDashboardUpdate = useCallback(() => {
    console.log('📤 useDashboardUpdater: Triggering dashboard update event');
    dashboardEmitter.emit({});
  }, []);

  return {
    triggerDashboardUpdate,
  };
};
