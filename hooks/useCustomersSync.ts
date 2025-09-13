
import { useState, useEffect, useCallback } from 'react';
import { Customer } from '../types';
import { getCustomers } from '../utils/storage';

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

    // Listen for real-time updates
    const handleCustomersUpdate = (event: any) => {
      console.log('useCustomersSync: Received customers update event');
      if (event.detail && Array.isArray(event.detail)) {
        console.log('useCustomersSync: Updating customers from event, count:', event.detail.length);
        setCustomers(event.detail);
        setLastUpdate(new Date());
        setIsLoading(false);
      } else {
        // Fallback: refresh from storage
        console.log('useCustomersSync: Event data invalid, refreshing from storage');
        refreshCustomers();
      }
    };

    // Add event listener for real-time sync
    if (typeof window !== 'undefined') {
      window.addEventListener('customersUpdated', handleCustomersUpdate);
      console.log('useCustomersSync: Event listener added for customersUpdated');
    }

    // Cleanup
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('customersUpdated', handleCustomersUpdate);
        console.log('useCustomersSync: Event listener removed');
      }
    };
  }, [refreshCustomers]);

  return {
    customers,
    lastUpdate,
    isLoading,
    refreshCustomers,
  };
};

// Hook for triggering customer updates across the app
export const useCustomersUpdater = () => {
  const triggerCustomersUpdate = useCallback((customers: Customer[]) => {
    console.log('useCustomersUpdater: Triggering customers update event, count:', customers.length);
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('customersUpdated', { detail: customers }));
    }
  }, []);

  return {
    triggerCustomersUpdate,
  };
};
