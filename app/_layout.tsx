
import React, { createContext, useContext } from 'react';
import { Stack, useGlobalSearchParams } from 'expo-router';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform } from 'react-native';
import { useEffect, useState } from 'react';
import { setupErrorLogging } from '../utils/errorLogger';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuthState, AuthContext, AuthContextType } from '../hooks/useAuth';

const STORAGE_KEY = 'emulated_device';

function AuthProvider({ children }: { children: React.ReactNode }) {
  const authState = useAuthState();
  
  // Create a stable context value to prevent infinite re-renders
  const contextValue: AuthContextType = {
    user: authState.user,
    isLoading: authState.isLoading,
    login: authState.login,
    logout: authState.logout,
    isAuthenticated: authState.isAuthenticated,
  };
  
  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export default function RootLayout() {
  const actualInsets = useSafeAreaInsets();
  const { emulate } = useGlobalSearchParams<{ emulate?: string }>();
  const [storedEmulate, setStoredEmulate] = useState<string | null>(null);

  useEffect(() => {
    console.log('RootLayout: Setting up error logging and device emulation');
    
    // Set up global error logging
    setupErrorLogging();

    if (Platform.OS === 'web') {
      // If there's a new emulate parameter, store it
      if (emulate) {
        localStorage.setItem(STORAGE_KEY, emulate);
        setStoredEmulate(emulate);
        console.log('RootLayout: Emulating device:', emulate);
      } else {
        // If no emulate parameter, try to get from localStorage
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          setStoredEmulate(stored);
          console.log('RootLayout: Using stored device emulation:', stored);
        }
      }
    }
  }, [emulate]);

  let insetsToUse = actualInsets;

  if (Platform.OS === 'web') {
    const simulatedInsets = {
      ios: { top: 47, bottom: 20, left: 0, right: 0 },
      android: { top: 40, bottom: 0, left: 0, right: 0 },
    };

    // Use stored emulate value if available, otherwise use the current emulate parameter
    const deviceToEmulate = storedEmulate || emulate;
    insetsToUse = deviceToEmulate ? simulatedInsets[deviceToEmulate as keyof typeof simulatedInsets] || actualInsets : actualInsets;
  }

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AuthProvider>
          <Stack
            screenOptions={{
              headerShown: false,
              animation: 'default',
            }}
          />
        </AuthProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
