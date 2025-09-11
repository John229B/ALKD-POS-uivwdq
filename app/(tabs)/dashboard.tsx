
import React from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { commonStyles, colors } from '../../styles/commonStyles';

export default function DashboardScreen() {
  console.log('Dashboard: Rendering minimal version');

  return (
    <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ fontSize: 24, color: colors.text, textAlign: 'center', marginBottom: 10 }}>
          ALKD-POS Dashboard
        </Text>
        <Text style={{ fontSize: 16, color: colors.textLight, textAlign: 'center' }}>
          Minimal version for testing
        </Text>
      </View>
    </SafeAreaView>
  );
}
