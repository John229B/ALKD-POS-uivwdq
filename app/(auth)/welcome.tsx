
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { commonStyles, colors, buttonStyles, spacing, fontSizes } from '../../styles/commonStyles';
import Icon from '../../components/Icon';

export default function WelcomeScreen() {
  const handleCreateAccount = () => {
    router.push('/(auth)/setup-admin');
  };

  const handleSignIn = () => {
    router.push('/(auth)/employee-login');
  };

  const handleAdminSignIn = () => {
    router.push('/(auth)/login');
  };

  return (
    <SafeAreaView style={commonStyles.container}>
      <View style={[commonStyles.content, { justifyContent: 'center', paddingHorizontal: spacing.lg }]}>
        <View style={[commonStyles.center, { marginBottom: spacing.xl }]}>
          <View style={{
            width: 100,
            height: 100,
            backgroundColor: colors.primary,
            borderRadius: 50,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: spacing.xl,
          }}>
            <Icon name="storefront" size={50} color={colors.secondary} />
          </View>
          <Text style={[commonStyles.title, { textAlign: 'center', fontSize: fontSizes.xl }]}>
            Bienvenue sur ALKD-POS
          </Text>
          <Text style={[commonStyles.textLight, { textAlign: 'center', marginTop: spacing.md }]}>
            Système de Point de Vente professionnel
          </Text>
        </View>

        <View style={commonStyles.card}>
          <Text style={[commonStyles.subtitle, { textAlign: 'center', marginBottom: spacing.lg }]}>
            Commencer
          </Text>

          <TouchableOpacity
            style={[buttonStyles.primary, { marginBottom: spacing.md }]}
            onPress={handleCreateAccount}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="business" size={20} color={colors.secondary} style={{ marginRight: spacing.sm }} />
              <Text style={{ color: colors.secondary, fontSize: fontSizes.md, fontWeight: '600' }}>
                Créer un compte entreprise
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[buttonStyles.secondary, { marginBottom: spacing.md }]}
            onPress={handleSignIn}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="person" size={20} color={colors.text} style={{ marginRight: spacing.sm }} />
              <Text style={{ color: colors.text, fontSize: fontSizes.md, fontWeight: '600' }}>
                Se connecter (Employé)
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[buttonStyles.outline, { marginBottom: spacing.lg }]}
            onPress={handleAdminSignIn}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="shield-checkmark" size={20} color={colors.primary} style={{ marginRight: spacing.sm }} />
              <Text style={{ color: colors.primary, fontSize: fontSizes.md, fontWeight: '600' }}>
                Se connecter (Admin)
              </Text>
            </View>
          </TouchableOpacity>

          <View style={{
            padding: spacing.md,
            backgroundColor: colors.backgroundAlt,
            borderRadius: 8,
          }}>
            <Text style={[commonStyles.textLight, { fontSize: fontSizes.sm, textAlign: 'center' }]}>
              💡 Première utilisation ? Créez un compte entreprise pour commencer.
              {'\n'}
              Déjà employé ? Utilisez vos identifiants fournis par l'administrateur.
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
