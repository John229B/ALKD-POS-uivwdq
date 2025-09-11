
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
}

const menuItems: MenuItem[] = [
  {
    id: 'customers',
    title: 'Clients',
    description: 'Gestion de la clientèle',
    icon: 'people',
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

export default function MoreScreen() {
  const handleMenuPress = (item: MenuItem) => {
    console.log('Menu item pressed:', item.title, 'Route:', item.route);
    try {
      router.push(item.route as any);
    } catch (error) {
      console.error('Navigation error:', error);
      // Fallback pour les routes qui n'existent pas encore
      if (item.id === 'licenses') {
        router.push('/licenses');
      } else if (item.id === 'reports') {
        router.push('/reports');
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

        {/* Section pour les fonctionnalités futures */}
        <View style={styles.futureSection}>
          <Text style={styles.futureSectionTitle}>Fonctionnalités à venir</Text>
          <View style={styles.futureItem}>
            <Icon name="cloud-upload" size={24} color={colors.textLight} />
            <Text style={styles.futureItemText}>Synchronisation cloud</Text>
          </View>
          <View style={styles.futureItem}>
            <Icon name="analytics" size={24} color={colors.textLight} />
            <Text style={styles.futureItemText}>Analyses prédictives</Text>
          </View>
          <View style={styles.futureItem}>
            <Icon name="notifications" size={24} color={colors.textLight} />
            <Text style={styles.futureItemText}>Notifications push</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>ALKD-POS v1.1.0</Text>
          <Text style={styles.footerSubtext}>Système de point de vente professionnel</Text>
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
  futureSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    marginTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  futureSectionTitle: {
    fontSize: fontSizes.lg,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: spacing.md,
  },
  futureItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  futureItemText: {
    fontSize: fontSizes.md,
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
  },
};
