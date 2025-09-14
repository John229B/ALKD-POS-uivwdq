
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { commonStyles, colors, spacing, fontSizes } from '../../styles/commonStyles';
import { useAuthState } from '../../hooks/useAuth';
import Icon from '../../components/Icon';

interface MenuItem {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  route: string;
  permission?: { module: string; action: string };
  adminOnly?: boolean;
  roles?: string[]; // Specific roles that can access this item
}

export default function MoreScreen() {
  const { user, logout, hasPermission } = useAuthState();

  const menuItems: MenuItem[] = [
    {
      id: 'employees',
      title: 'Employés',
      subtitle: 'Gérer les employés et leurs permissions',
      icon: 'people',
      route: '/employees',
      permission: { module: 'employees', action: 'view' },
    },
    {
      id: 'printers',
      title: 'Imprimantes',
      subtitle: 'Configuration des imprimantes Bluetooth',
      icon: 'print',
      route: '/printers',
      permission: { module: 'printers', action: 'view' },
    },
    {
      id: 'tickets',
      title: 'Tickets',
      subtitle: 'Aperçu et historique des tickets',
      icon: 'receipt',
      route: '/tickets',
      permission: { module: 'tickets', action: 'view' },
    },
    {
      id: 'inventory',
      title: 'Inventaire',
      subtitle: 'Gestion complète du stock et des mouvements',
      icon: 'cube',
      route: '/inventory',
      permission: { module: 'inventory', action: 'view' },
      roles: ['admin', 'manager', 'inventory'], // Only these roles can access inventory
    },
    {
      id: 'reports',
      title: 'Rapports détaillés',
      subtitle: user?.role === 'cashier' ? 'Mes rapports de vente personnels' : 'Analyses et statistiques avancées',
      icon: 'analytics',
      route: '/reports',
      permission: { module: 'reports', action: 'view' },
      roles: ['admin', 'manager', 'cashier'], // Inventory role cannot access reports
    },
    {
      id: 'activity-logs',
      title: 'Journal d\'activité',
      subtitle: 'Historique des actions des utilisateurs',
      icon: 'time',
      route: '/activity-logs',
      adminOnly: true,
    },
    {
      id: 'licenses',
      title: 'Licences',
      subtitle: 'Gestion des licences clients',
      icon: 'key',
      route: '/licenses',
      adminOnly: true,
    },
    {
      id: 'settings',
      title: 'Paramètres',
      subtitle: 'Configuration de l\'application',
      icon: 'settings',
      route: '/settings',
      permission: { module: 'settings', action: 'view' },
    },
  ];

  const handleMenuPress = (item: MenuItem) => {
    // Check admin only access
    if (item.adminOnly && user?.role !== 'admin') {
      Alert.alert('Accès refusé', 'Cette fonctionnalité est réservée aux administrateurs.');
      return;
    }

    // Check role-specific access
    if (item.roles && !item.roles.includes(user?.role || '')) {
      Alert.alert('Accès refusé', 'Vous n\'avez pas les permissions nécessaires pour accéder à cette section.');
      return;
    }

    // Check permissions
    if (item.permission && !hasPermission(item.permission.module, item.permission.action)) {
      Alert.alert('Accès refusé', 'Vous n\'avez pas les permissions nécessaires pour accéder à cette section.');
      return;
    }

    router.push(item.route as any);
  };

  const handleChangePassword = () => {
    router.push('/change-password');
  };

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnexion',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              router.replace('/(auth)/login');
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Erreur', 'Une erreur est survenue lors de la déconnexion');
            }
          },
        },
      ]
    );
  };

  const isMenuItemVisible = (item: MenuItem): boolean => {
    // Check admin only access
    if (item.adminOnly && user?.role !== 'admin') return false;
    
    // Check role-specific access
    if (item.roles && !item.roles.includes(user?.role || '')) return false;
    
    // Check permissions
    if (item.permission && !hasPermission(item.permission.module, item.permission.action)) return false;
    
    return true;
  };

  const getRoleDisplayName = (role: string): string => {
    switch (role) {
      case 'admin': return 'Administrateur';
      case 'manager': return 'Gestionnaire';
      case 'cashier': return 'Caissier';
      case 'inventory': return 'Inventaire';
      default: return 'Employé';
    }
  };

  const getRoleColor = (role: string): string => {
    switch (role) {
      case 'admin': return colors.error;
      case 'manager': return colors.success;
      case 'cashier': return colors.warning;
      case 'inventory': return colors.info;
      default: return colors.primary;
    }
  };

  return (
    <SafeAreaView style={commonStyles.container}>
      <ScrollView style={commonStyles.content}>
        {/* User Profile Section */}
        <View style={[commonStyles.card, { margin: spacing.lg }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{
              width: 60,
              height: 60,
              backgroundColor: getRoleColor(user?.role || ''),
              borderRadius: 30,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: spacing.md,
            }}>
              <Icon name="person" size={30} color={colors.secondary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[commonStyles.subtitle, { marginBottom: 4 }]}>
                {user?.username || 'Utilisateur'}
              </Text>
              <Text style={[commonStyles.textLight, { marginBottom: 4 }]}>
                {user?.email || ''}
              </Text>
              <View style={{
                backgroundColor: getRoleColor(user?.role || ''),
                paddingHorizontal: spacing.sm,
                paddingVertical: 2,
                borderRadius: 12,
                alignSelf: 'flex-start',
              }}>
                <Text style={{ color: colors.secondary, fontSize: fontSizes.xs, fontWeight: '600' }}>
                  {getRoleDisplayName(user?.role || '')}
                </Text>
              </View>
            </View>
          </View>
          
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: spacing.md,
              paddingVertical: spacing.sm,
              backgroundColor: colors.backgroundAlt,
              borderRadius: 8,
            }}
            onPress={handleChangePassword}
          >
            <Icon name="key" size={16} color={colors.text} />
            <Text style={[commonStyles.text, { marginLeft: spacing.xs }]}>
              Changer le mot de passe
            </Text>
          </TouchableOpacity>
        </View>

        {/* Role-specific message */}
        {user?.role === 'inventory' && (
          <View style={[commonStyles.card, { margin: spacing.lg, backgroundColor: colors.info + '20' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Icon name="information-circle" size={20} color={colors.info} />
              <Text style={[commonStyles.text, { marginLeft: spacing.sm, color: colors.info, flex: 1 }]}>
                Accès limité à la gestion de l'inventaire et des produits uniquement.
              </Text>
            </View>
          </View>
        )}

        {user?.role === 'cashier' && (
          <View style={[commonStyles.card, { margin: spacing.lg, backgroundColor: colors.warning + '20' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Icon name="information-circle" size={20} color={colors.warning} />
              <Text style={[commonStyles.text, { marginLeft: spacing.sm, color: colors.warning, flex: 1 }]}>
                Vous avez accès uniquement à vos propres rapports de vente.
              </Text>
            </View>
          </View>
        )}

        {/* Menu Items */}
        <View style={{ paddingHorizontal: spacing.lg }}>
          <Text style={[commonStyles.subtitle, { marginBottom: spacing.md }]}>
            Fonctionnalités disponibles
          </Text>
          
          {menuItems.filter(isMenuItemVisible).map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[commonStyles.card, { marginBottom: spacing.md }]}
              onPress={() => handleMenuPress(item)}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{
                  width: 40,
                  height: 40,
                  backgroundColor: colors.primaryLight,
                  borderRadius: 20,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: spacing.md,
                }}>
                  <Icon name={item.icon} size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[commonStyles.text, { fontWeight: '600', marginBottom: 4 }]}>
                    {item.title}
                  </Text>
                  <Text style={[commonStyles.textLight, { fontSize: fontSizes.sm }]}>
                    {item.subtitle}
                  </Text>
                </View>
                <Icon name="chevron-forward" size={20} color={colors.textLight} />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout Section */}
        <View style={{ padding: spacing.lg }}>
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: spacing.md,
              backgroundColor: colors.error,
              borderRadius: 8,
            }}
            onPress={handleLogout}
          >
            <Icon name="log-out" size={20} color={colors.secondary} />
            <Text style={{ 
              color: colors.secondary, 
              fontSize: fontSizes.md, 
              fontWeight: '600',
              marginLeft: spacing.sm 
            }}>
              Déconnexion
            </Text>
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View style={{ 
          padding: spacing.lg, 
          alignItems: 'center',
          borderTopWidth: 1,
          borderTopColor: colors.border,
          marginTop: spacing.lg,
        }}>
          <Text style={[commonStyles.textLight, { fontSize: fontSizes.sm, textAlign: 'center' }]}>
            ALKD-POS v1.1.0{'\n'}
            Système de Point de Vente
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
