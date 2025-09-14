
import { useState, useEffect, useCallback } from 'react';
import { Customer, Sale } from '../types';
import { getCustomers, getSales } from '../utils/storage';
import { AppState } from 'react-native';

// Simple event emitter for React Native
class CustomersEventEmitter {
  private listeners: ((customers: Customer[]) => void)[] = [];

  addListener(callback: (customers: Customer[]) => void) {
    this.listeners.push(callback);
    console.log('CustomersEventEmitter: Listener added, total:', this.listeners.length);
  }

  removeListener(callback: (customers: Customer[]) => void) {
    this.listeners = this.listeners.filter(listener => listener !== callback);
    console.log('CustomersEventEmitter: Listener removed, total:', this.listeners.length);
  }

  emit(customers: Customer[]) {
    console.log('CustomersEventEmitter: Emitting update to', this.listeners.length, 'listeners');
    this.listeners.forEach(listener => {
      try {
        listener(customers);
      } catch (error) {
        console.error('CustomersEventEmitter: Error in listener:', error);
      }
    });
  }
}

// Global event emitter instance
const customersEmitter = new CustomersEventEmitter();

// Dashboard event emitter for real-time dashboard updates
class DashboardEventEmitter {
  private listeners: (() => void)[] = [];

  addListener(callback: () => void) {
    this.listeners.push(callback);
    console.log('DashboardEventEmitter: Listener added, total:', this.listeners.length);
  }

  removeListener(callback: () => void) {
    this.listeners = this.listeners.filter(listener => listener !== callback);
    console.log('DashboardEventEmitter: Listener removed, total:', this.listeners.length);
  }

  emit() {
    console.log('DashboardEventEmitter: Emitting dashboard update to', this.listeners.length, 'listeners');
    this.listeners.forEach(listener => {
      try {
        listener();
      } catch (error) {
        console.error('DashboardEventEmitter: Error in listener:', error);
      }
    });
  }
}

// Global dashboard event emitter instance
const dashboardEmitter = new DashboardEventEmitter();

// Hook for real-time customer synchronization
export const useCustomersSync = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState(true);

  const refreshCustomers = useCallback(async () => {
    try {
      console.log('useCustomersSync: Refreshing customers data...');
      setIsLoading(true);
      const customersData = await getCustomers();
      console.log('useCustomersSync: Loaded customers count:', customersData.length);
      setCustomers(customersData);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('useCustomersSync: Error refreshing customers:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial load
    refreshCustomers();

    // Listen for real-time updates using React Native compatible event system
    const handleCustomersUpdate = (updatedCustomers: Customer[]) => {
      console.log('useCustomersSync: Received customers update event');
      if (updatedCustomers && Array.isArray(updatedCustomers)) {
        console.log('useCustomersSync: Updating customers from event, count:', updatedCustomers.length);
        setCustomers(updatedCustomers);
        setLastUpdate(new Date());
        setIsLoading(false);
      } else {
        // Fallback: refresh from storage
        console.log('useCustomersSync: Event data invalid, refreshing from storage');
        refreshCustomers();
      }
    };

    // Add event listener for real-time sync
    customersEmitter.addListener(handleCustomersUpdate);
    console.log('useCustomersSync: Event listener added for customersUpdated');

    // Listen for app state changes to refresh data when app becomes active
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') {
        console.log('useCustomersSync: App became active, refreshing customers');
        refreshCustomers();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Cleanup
    return () => {
      customersEmitter.removeListener(handleCustomersUpdate);
      subscription.remove();
      console.log('useCustomersSync: Event listeners removed');
    };
  }, [refreshCustomers]);

  return {
    customers,
    lastUpdate,
    isLoading,
    refreshCustomers,
  };
};

// Hook for triggering customer updates across the app - CORRECTED
export const useCustomersUpdater = () => {
  const triggerCustomersUpdate = useCallback(async (customersData?: Customer[]) => {
    try {
      console.log('useCustomersUpdater: Triggering customers update event...');
      
      // If customers data is provided, use it; otherwise fetch from storage
      let customers: Customer[];
      if (customersData && Array.isArray(customersData)) {
        customers = customersData;
        console.log('useCustomersUpdater: Using provided customers data, count:', customers.length);
      } else {
        console.log('useCustomersUpdater: Fetching customers from storage...');
        customers = await getCustomers();
        console.log('useCustomersUpdater: Fetched customers from storage, count:', customers.length);
      }
      
      // Emit the update event
      customersEmitter.emit(customers);
      console.log('useCustomersUpdater: Customers update event emitted successfully');
      
      // Return the customers data for immediate use
      return customers;
    } catch (error) {
      console.error('useCustomersUpdater: Error triggering customers update:', error);
      return [];
    }
  }, []);

  return {
    triggerCustomersUpdate,
  };
};

// Hook for real-time dashboard synchronization
export const useDashboardSync = () => {
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const refreshDashboard = useCallback(() => {
    console.log('useDashboardSync: Dashboard refresh triggered');
    setLastUpdate(new Date());
  }, []);

  useEffect(() => {
    // Listen for dashboard update events
    const handleDashboardUpdate = () => {
      console.log('useDashboardSync: Received dashboard update event');
      refreshDashboard();
    };

    // Add event listener for real-time sync
    dashboardEmitter.addListener(handleDashboardUpdate);
    console.log('useDashboardSync: Event listener added for dashboard updates');

    // Listen for app state changes to refresh data when app becomes active
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') {
        console.log('useDashboardSync: App became active, refreshing dashboard');
        refreshDashboard();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Cleanup
    return () => {
      dashboardEmitter.removeListener(handleDashboardUpdate);
      subscription.remove();
      console.log('useDashboardSync: Event listeners removed');
    };
  }, [refreshDashboard]);

  return {
    lastUpdate,
    refreshDashboard,
  };
};

// Hook for triggering dashboard updates across the app - CORRECTED
export const useDashboardUpdater = () => {
  const triggerDashboardUpdate = useCallback(() => {
    console.log('useDashboardUpdater: Triggering dashboard update event');
    dashboardEmitter.emit();
  }, []);

  return {
    triggerDashboardUpdate,
  };
};
