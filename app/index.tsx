
import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { Redirect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { commonStyles, colors } from '../styles/commonStyles';
import { getCurrentUser, initializeDefaultData } from '../utils/storage';
import { User } from '../types';

export default function IndexScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      console.log('Initializing ALKD-POS app...');
      
      // Initialize default data
      await initializeDefaultData();
      
      // Check if user is logged in
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      
      console.log('App initialization completed');
    } catch (error) {
      console.error('Error initializing app:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
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
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.secondary }}>
            POS
          </Text>
        </View>
        <Text style={[commonStyles.title, { textAlign: 'center' }]}>ALKD-POS</Text>
        <Text style={[commonStyles.textLight, { textAlign: 'center' }]}>
          Chargement...
        </Text>
      </SafeAreaView>
    );
  }

  // Redirect based on authentication status
  if (user) {
    return <Redirect href="/(tabs)/dashboard" />;
  } else {
    return <Redirect href="/(auth)/login" />;
  }
}
