
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { commonStyles, colors, spacing, fontSizes } from '../styles/commonStyles';
import Icon from '../components/Icon';

export default function ReportsScreen() {
  return (
    <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Rapports</Text>
          <Text style={styles.headerSubtitle}>Temporairement indisponible</Text>
        </View>
      </View>

      {/* Disabled Message */}
      <View style={styles.disabledContainer}>
        <View style={styles.iconContainer}>
          <Icon name="construct" size={64} color={colors.warning} />
        </View>
        
        <Text style={styles.disabledTitle}>Page temporairement désactivée</Text>
        
        <Text style={styles.disabledMessage}>
          La page Rapports a été temporairement désactivée pour maintenance et améliorations.
        </Text>
        
        <Text style={styles.disabledSubMessage}>
          Elle sera bientôt disponible avec de nouvelles fonctionnalités avancées d'analyse et de statistiques.
        </Text>

        <View style={styles.featuresContainer}>
          <Text style={styles.featuresTitle}>Fonctionnalités à venir :</Text>
          <View style={styles.featureItem}>
            <Icon name="checkmark-circle" size={20} color={colors.success} />
            <Text style={styles.featureText}>Graphiques interactifs avancés</Text>
          </View>
          <View style={styles.featureItem}>
            <Icon name="checkmark-circle" size={20} color={colors.success} />
            <Text style={styles.featureText}>Analyses prédictives</Text>
          </View>
          <View style={styles.featureItem}>
            <Icon name="checkmark-circle" size={20} color={colors.success} />
            <Text style={styles.featureText}>Export PDF et Excel optimisés</Text>
          </View>
          <View style={styles.featureItem}>
            <Icon name="checkmark-circle" size={20} color={colors.success} />
            <Text style={styles.featureText}>Filtres personnalisés</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.backToMenuButton}
          onPress={() => router.back()}
        >
          <Icon name="arrow-back" size={20} color={colors.surface} />
          <Text style={styles.backToMenuText}>Retour au menu</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = {
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.sm,
    marginRight: spacing.md,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: fontSizes.xl,
    fontWeight: '700' as const,
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: fontSizes.sm,
    color: colors.textLight,
  },
  disabledContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingHorizontal: spacing.xl,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.warning + '20',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginBottom: spacing.xl,
  },
  disabledTitle: {
    fontSize: fontSizes.xxl,
    fontWeight: '700' as const,
    color: colors.text,
    textAlign: 'center' as const,
    marginBottom: spacing.lg,
  },
  disabledMessage: {
    fontSize: fontSizes.lg,
    color: colors.textLight,
    textAlign: 'center' as const,
    lineHeight: 24,
    marginBottom: spacing.md,
  },
  disabledSubMessage: {
    fontSize: fontSizes.md,
    color: colors.textLight,
    textAlign: 'center' as const,
    lineHeight: 20,
    marginBottom: spacing.xl,
  },
  featuresContainer: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    width: '100%',
    marginBottom: spacing.xl,
  },
  featuresTitle: {
    fontSize: fontSizes.lg,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: spacing.md,
    textAlign: 'center' as const,
  },
  featureItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: spacing.sm,
  },
  featureText: {
    fontSize: fontSizes.md,
    color: colors.text,
    marginLeft: spacing.sm,
  },
  backToMenuButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 12,
    gap: spacing.sm,
  },
  backToMenuText: {
    fontSize: fontSizes.md,
    fontWeight: '600' as const,
    color: colors.surface,
  },
};
