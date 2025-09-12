
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
      id: 'categories',
      title: 'Catégories',
      subtitle: 'Gérer les catégories de produits',
      icon: 'folder',
      route: '/categories',
      permission: { module: 'products', action: 'edit' },
    },
    {
      id: 'reports',
      title: 'Rapports détaillés',
      subtitle: 'Analyses et statistiques avancées',
      icon: 'analytics',
      route: '/reports',
      permission: { module: 'reports', action: 'view' },
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
    // Check permissions
    if (item.adminOnly && user?.role !== 'admin') {
      Alert.alert('Accès refusé', 'Cette fonctionnalité est réservée aux administrateurs.');
      return;
    }

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
    if (item.adminOnly && user?.role !== 'admin') return false;
    if (item.permission && !hasPermission(item.permission.module, item.permission.action)) return false;
    return true;
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
              backgroundColor: colors.primary,
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
                backgroundColor: user?.role === 'admin' ? colors.error : colors.primary,
                paddingHorizontal: spacing.sm,
                paddingVertical: 2,
                borderRadius: 12,
                alignSelf: 'flex-start',
              }}>
                <Text style={{ color: colors.secondary, fontSize: fontSizes.xs, fontWeight: '600' }}>
                  {user?.role === 'admin' ? 'Administrateur' : 
                   user?.role === 'manager' ? 'Gestionnaire' :
                   user?.role === 'cashier' ? 'Caissier' :
                   user?.role === 'inventory' ? 'Inventaire' : 'Employé'}
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

        {/* Menu Items */}
        <View style={{ paddingHorizontal: spacing.lg }}>
          <Text style={[commonStyles.subtitle, { marginBottom: spacing.md }]}>
            Fonctionnalités
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
