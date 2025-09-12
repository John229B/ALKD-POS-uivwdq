
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { commonStyles, colors, buttonStyles, spacing, fontSizes } from '../../styles/commonStyles';
import Icon from '../../components/Icon';

interface MenuItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  route: string;
  color?: string;
  badge?: string;
}

const menuItems: MenuItem[] = [
  {
    id: 'employees',
    title: 'Gestion des employés',
    description: 'Employés, rôles et permissions',
    icon: 'people',
    route: '/employees',
    color: colors.primary,
    badge: 'Nouveau',
  },
  {
    id: 'printers',
    title: 'Imprimantes Bluetooth',
    description: 'Configuration des imprimantes thermiques',
    icon: 'print',
    route: '/printers',
    color: colors.info,
    badge: 'Nouveau',
  },
  {
    id: 'tickets',
    title: 'Gestion des tickets',
    description: 'Historique et réimpression des tickets',
    icon: 'receipt',
    route: '/tickets',
    color: colors.success,
    badge: 'Nouveau',
  },
  {
    id: 'customers',
    title: 'Clients',
    description: 'Gestion de la clientèle',
    icon: 'people-outline',
    route: '/(tabs)/customers',
    color: colors.info,
  },
  {
    id: 'categories',
    title: 'Inventaire',
    description: 'Catégories et stock',
    icon: 'library',
    route: '/categories',
    color: colors.warning,
  },
  {
    id: 'reports',
    title: 'Rapports',
    description: 'Analyses et statistiques avancées',
    icon: 'bar-chart',
    route: '/reports',
    color: colors.success,
  },
  {
    id: 'settings',
    title: 'Paramètres',
    description: 'Configuration de l\'application',
    icon: 'settings',
    route: '/settings',
    color: colors.textLight,
    badge: 'Mis à jour',
  },
  {
    id: 'licenses',
    title: 'Licences',
    description: 'Gestion des licences clients',
    icon: 'key-outline',
    route: '/licenses',
    color: colors.primary,
  },
];

const newFeatures = [
  {
    id: 'multi-employee',
    title: 'Gestion multi-employés',
    description: 'Système complet de gestion des employés avec rôles et permissions personnalisés',
    icon: 'people-circle',
    color: colors.primary,
  },
  {
    id: 'bluetooth-printing',
    title: 'Impression Bluetooth',
    description: 'Support des imprimantes thermiques Bluetooth pour l\'impression de tickets',
    icon: 'bluetooth',
    color: colors.info,
  },
  {
    id: 'offline-sync',
    title: 'Mode hors ligne',
    description: 'Fonctionnement complet sans Internet avec synchronisation automatique',
    icon: 'cloud-offline',
    color: colors.warning,
  },
  {
    id: 'activity-logging',
    title: 'Journalisation',
    description: 'Traçabilité complète de toutes les actions des employés',
    icon: 'analytics',
    color: colors.success,
  },
];

export default function MoreScreen() {
  const handleMenuPress = (item: MenuItem) => {
    console.log('Menu item pressed:', item.title, 'Route:', item.route);
    try {
      router.push(item.route as any);
    } catch (error) {
      console.error('Navigation error:', error);
      // Fallback navigation with proper error handling
      try {
        if (item.id === 'employees') {
          router.push('/employees');
        } else if (item.id === 'printers') {
          router.push('/printers');
        } else if (item.id === 'tickets') {
          router.push('/tickets');
        } else if (item.id === 'licenses') {
          router.push('/licenses');
        } else if (item.id === 'reports') {
          router.push('/reports');
        } else if (item.id === 'categories') {
          router.push('/categories');
        } else if (item.id === 'settings') {
          router.push('/settings');
        } else if (item.id === 'customers') {
          router.push('/(tabs)/customers');
        } else {
          console.warn('No fallback route available for:', item.id);
        }
      } catch (fallbackError) {
        console.error('Fallback navigation also failed:', fallbackError);
      }
    }
  };

  return (
    <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Plus d'options</Text>
        <Text style={styles.headerSubtitle}>Accédez à toutes les fonctionnalités</Text>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* New Features Highlight */}
        <View style={styles.newFeaturesSection}>
          <Text style={styles.newFeaturesTitle}>✨ Nouvelles fonctionnalités</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.newFeaturesScroll}>
            {newFeatures.map((feature) => (
              <View key={feature.id} style={[styles.newFeatureCard, { borderColor: feature.color }]}>
                <View style={[styles.newFeatureIcon, { backgroundColor: feature.color + '20' }]}>
                  <Icon name={feature.icon} size={24} color={feature.color} />
                </View>
                <Text style={styles.newFeatureTitle}>{feature.title}</Text>
                <Text style={styles.newFeatureDescription}>{feature.description}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Main Menu */}
        <View style={styles.menuGrid}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.menuItem}
              onPress={() => handleMenuPress(item)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconContainer, { backgroundColor: item.color + '20' }]}>
                <Icon 
                  name={item.icon} 
                  size={32} 
                  color={item.color || colors.primary} 
                />
                {item.badge && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.badge}</Text>
                  </View>
                )}
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuDescription}>{item.description}</Text>
              </View>
              <Icon 
                name="chevron-forward" 
                size={20} 
                color={colors.textLight} 
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* System Status */}
        <View style={styles.systemStatus}>
          <Text style={styles.systemStatusTitle}>État du système</Text>
          
          <View style={styles.statusItem}>
            <View style={styles.statusLeft}>
              <View style={[styles.statusDot, { backgroundColor: colors.success }]} />
              <Text style={styles.statusText}>Mode hors ligne</Text>
            </View>
            <Text style={styles.statusValue}>Activé</Text>
          </View>

          <View style={styles.statusItem}>
            <View style={styles.statusLeft}>
              <View style={[styles.statusDot, { backgroundColor: colors.info }]} />
              <Text style={styles.statusText}>Synchronisation</Text>
            </View>
            <Text style={styles.statusValue}>Automatique</Text>
          </View>

          <View style={styles.statusItem}>
            <View style={styles.statusLeft}>
              <View style={[styles.statusDot, { backgroundColor: colors.warning }]} />
              <Text style={styles.statusText}>Données en attente</Text>
            </View>
            <Text style={styles.statusValue}>0</Text>
          </View>
        </View>

        {/* App Info */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>ALKD-POS v1.1.0</Text>
          <Text style={styles.footerSubtext}>Système de point de vente professionnel</Text>
          <Text style={styles.footerFeatures}>
            ✓ Gestion multi-employés • ✓ Mode hors ligne • ✓ Impression Bluetooth
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = {
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: fontSizes.xxl,
    fontWeight: '700' as const,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontSize: fontSizes.md,
    color: colors.textLight,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  newFeaturesSection: {
    paddingVertical: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  newFeaturesTitle: {
    fontSize: fontSizes.lg,
    fontWeight: '600' as const,
    color: colors.text,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  newFeaturesScroll: {
    paddingLeft: spacing.lg,
  },
  newFeatureCard: {
    width: 200,
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: spacing.md,
    marginRight: spacing.md,
    borderWidth: 2,
    borderStyle: 'dashed' as const,
  },
  newFeatureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginBottom: spacing.sm,
  },
  newFeatureTitle: {
    fontSize: fontSizes.md,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  newFeatureDescription: {
    fontSize: fontSizes.sm,
    color: colors.textLight,
    lineHeight: 16,
  },
  menuGrid: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  menuItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.text,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 16,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginRight: spacing.md,
    position: 'relative' as const,
  },
  badge: {
    position: 'absolute' as const,
    top: -4,
    right: -4,
    backgroundColor: colors.error,
    borderRadius: 8,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: fontSizes.xs,
    fontWeight: '600' as const,
    color: colors.background,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: fontSizes.lg,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  menuDescription: {
    fontSize: fontSizes.sm,
    color: colors.textLight,
    lineHeight: 18,
  },
  systemStatus: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    marginTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  systemStatusTitle: {
    fontSize: fontSizes.lg,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: spacing.md,
  },
  statusItem: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingVertical: spacing.sm,
  },
  statusLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.sm,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: fontSizes.md,
    color: colors.text,
  },
  statusValue: {
    fontSize: fontSizes.md,
    fontWeight: '600' as const,
    color: colors.textLight,
  },
  footer: {
    alignItems: 'center' as const,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    marginTop: spacing.xl,
  },
  footerText: {
    fontSize: fontSizes.sm,
    fontWeight: '600' as const,
    color: colors.textLight,
    marginBottom: spacing.xs,
  },
  footerSubtext: {
    fontSize: fontSizes.xs,
    color: colors.textLight,
    textAlign: 'center' as const,
    marginBottom: spacing.sm,
  },
  footerFeatures: {
    fontSize: fontSizes.xs,
    color: colors.success,
    textAlign: 'center' as const,
    fontWeight: '500' as const,
  },
};
