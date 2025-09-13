
import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { Redirect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { commonStyles, colors } from '../styles/commonStyles';
import { useAuthState } from '../hooks/useAuth';
import Icon from '../components/Icon';

export default function IndexScreen() {
  const { user, isLoading, isFirstLaunch, isAuthenticated } = useAuthState();
  const [shouldRedirect, setShouldRedirect] = useState(false);

  useEffect(() => {
    // Add a small delay to prevent immediate redirect and allow auth state to stabilize
    const timer = setTimeout(() => {
      setShouldRedirect(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  console.log('IndexScreen: Auth state:', {
    isLoading,
    isFirstLaunch,
    isAuthenticated,
    hasUser: !!user,
    shouldRedirect,
  });

  // Show loading screen while auth is initializing
  if (isLoading || !shouldRedirect) {
    return (
      <SafeAreaView style={[commonStyles.container, commonStyles.center]}>
        <View style={{
          width: 80,
          height: 80,
          backgroundColor: colors.primary,
          borderRadius: 40,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 20,
        }}>
          <Icon name="storefront" size={40} color={colors.secondary} />
        </View>
        <Text style={[commonStyles.title, { textAlign: 'center' }]}>ALKD-POS</Text>
        <Text style={[commonStyles.textLight, { textAlign: 'center', marginTop: 10 }]}>
          Chargement...
        </Text>
      </SafeAreaView>
    );
  }

  // Redirect based on auth state
  if (isFirstLaunch) {
    console.log('IndexScreen: Redirecting to welcome (first launch)');
    return <Redirect href="/(auth)/welcome" />;
  }

  if (!isAuthenticated) {
    console.log('IndexScreen: Redirecting to welcome (not authenticated)');
    return <Redirect href="/(auth)/welcome" />;
  }

  if (user?.isFirstLogin) {
    console.log('IndexScreen: Redirecting to change-password (first login)');
    return <Redirect href="/change-password" />;
  }

  console.log('IndexScreen: Redirecting to dashboard (authenticated)');
  return <Redirect href="/(tabs)/dashboard" />;
}
