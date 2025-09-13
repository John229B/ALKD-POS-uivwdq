
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { initializeDefaultData } from '../utils/storage';
import { syncService } from '../utils/syncService';

export default function RootLayout() {
  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('Initializing ALKD-POS application...');
        
        // Initialize default data
        await initializeDefaultData();
        
        // Initialize sync service for offline/online functionality
        await syncService.initializeSyncService();
        
        console.log('ALKD-POS application initialized successfully');
      } catch (error) {
        console.error('Failed to initialize application:', error);
      }
    };

    initializeApp();
  }, []);

  return (
    <>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="change-password" />
        <Stack.Screen name="employees" />
        <Stack.Screen name="printers" />
        <Stack.Screen name="tickets" />
        <Stack.Screen name="activity-logs" />
        <Stack.Screen name="categories" />
        <Stack.Screen name="licenses" />
        <Stack.Screen name="reports" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="customer-details" />
        <Stack.Screen name="send-status" />
        <Stack.Screen name="status-current" />
        <Stack.Screen name="status-reminder" />
        <Stack.Screen name="transaction-amount" />
        <Stack.Screen name="transaction-payment" />
        <Stack.Screen name="transaction-success" />
        <Stack.Screen name="sale-ticket" />
      </Stack>
    </>
  );
}
