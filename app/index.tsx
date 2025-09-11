
import React from 'react';
import { View, Text } from 'react-native';
import { Redirect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { commonStyles, colors } from '../styles/commonStyles';

export default function IndexScreen() {
  console.log('IndexScreen: Rendering');

  // For now, always redirect to dashboard to test if the infinite loop stops
  return <Redirect href="/(tabs)/dashboard" />;
}
