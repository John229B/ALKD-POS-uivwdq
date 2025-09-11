
import React from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { commonStyles, colors } from '../../styles/commonStyles';

export default function ReportsScreen() {
  return (
    <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ fontSize: 18, color: colors.text, textAlign: 'center' }}>
          La page Rapports a été temporairement désactivée.
        </Text>
        <Text style={{ fontSize: 14, color: colors.textLight, textAlign: 'center', marginTop: 10 }}>
          Elle sera réimplémentée avec une meilleure structure prochainement.
        </Text>
      </View>
    </SafeAreaView>
  );
}
