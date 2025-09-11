
// This file has been moved to /app/reports.tsx
// The reports functionality is now accessible through the "Plus" menu
import React from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect } from 'expo-router';

export default function ReportsScreen() {
  // Redirect to the new reports page
  return <Redirect href="/reports" />;
}
