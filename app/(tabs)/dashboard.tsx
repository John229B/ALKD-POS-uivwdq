
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { commonStyles, colors, buttonStyles, spacing, fontSizes, isSmallScreen } from '../../styles/commonStyles';
import Icon from '../../components/Icon';
import { useAuthState } from '../../hooks/useAuth';
import { getSales, getProducts, getCustomers, getSettings } from '../../utils/storage';
import { DashboardStats, Sale, Product, Customer, AppSettings } from '../../types';

export default function DashboardScreen() {
  const { user } = useAuthState();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      console.log('Loading dashboard data...');
      const [sales, products, customers, settingsData] = await Promise.all([
        getSales(),
        getProducts(),
        getCustomers(),
        getSettings(),
      ]);

      setSettings(settingsData);

      // Calculate today's stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todaySales = sales.filter(sale => {
        const saleDate = new Date(sale.createdAt);
        saleDate.setHours(0, 0, 0, 0);
        return saleDate.getTime() === today.getTime();
      });

      const todayRevenue = todaySales.reduce((sum, sale) => sum + sale.total, 0);
      const lowStockProducts = products.filter(p => p.stock <= p.minStock && p.isActive).length;
      const creditAmount = customers.reduce((sum, customer) => sum + customer.creditBalance, 0);

      // Calculate top products
      const productSales = new Map<string, { quantity: number; revenue: number; product: Product }>();
      
      sales.forEach(sale => {
        sale.items.forEach(item => {
          const existing = productSales.get(item.productId);
          const product = products.find(p => p.id === item.productId);
          
          if (product) {
            if (existing) {
              existing.quantity += item.quantity;
              existing.revenue += item.subtotal;
            } else {
              productSales.set(item.productId, {
                quantity: item.quantity,
                revenue: item.subtotal,
                product,
              });
            }
          }
        });
      });

      const topProducts = Array.from(productSales.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      const dashboardStats: DashboardStats = {
        todaySales: todaySales.length,
        todayRevenue,
        totalCustomers: customers.length,
        lowStockProducts,
        creditAmount,
        topProducts,
      };

      setStats(dashboardStats);
      console.log('Dashboard data loaded successfully');
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const formatCurrency = (amount: number | undefined | null): string => {
    if (amount === undefined || amount === null || isNaN(amount)) {
      console.log('formatCurrency called with invalid amount:', amount);
      amount = 0;
    }
    
    const currency = settings?.currency || 'XOF';
    const currencySymbols = { XOF: 'FCFA', USD: '$', EUR: '€' };
    return `${amount.toLocaleString()} ${currencySymbols[currency]}`;
  };

  const handleLogout = () => {
    router.replace('/(auth)/login');
  };

  if (!stats) {
    return (
      <SafeAreaView style={commonStyles.container}>
        <View style={[commonStyles.content, commonStyles.center]}>
          <Text style={commonStyles.text}>Chargement...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={commonStyles.container}>
      <ScrollView
        style={commonStyles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ paddingBottom: spacing.xl }}
      >
        {/* Header */}
        <View style={[commonStyles.section, commonStyles.header]}>
          <View style={{ flex: 1 }}>
            <Text style={commonStyles.title}>Tableau de bord</Text>
            <Text style={[commonStyles.textLight, { fontSize: fontSizes.sm }]}>
              Bonjour {user?.username} • {new Date().toLocaleDateString('fr-FR')}
            </Text>
          </View>
          <TouchableOpacity
            style={[buttonStyles.outline, buttonStyles.small, { borderColor: colors.danger }]}
            onPress={handleLogout}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <Icon name="log-out" size={16} color={colors.danger} />
              {!isSmallScreen && <Text style={{ color: colors.danger, fontSize: fontSizes.sm }}>Déconnexion</Text>}
            </View>
          </TouchableOpacity>
        </View>

        {/* Quick Stats */}
        <View style={commonStyles.gridContainer}>
          <View style={[commonStyles.gridItem, commonStyles.card]}>
            <View style={{ alignItems: 'center' }}>
              <Text style={[commonStyles.text, { fontSize: fontSizes.xl, fontWeight: '600', color: colors.primary }]}>
                {stats.todaySales}
              </Text>
              <Text style={[commonStyles.textLight, { fontSize: fontSizes.sm, textAlign: 'center' }]}>
                Ventes aujourd'hui
              </Text>
            </View>
          </View>

          <View style={[commonStyles.gridItem, commonStyles.card]}>
            <View style={{ alignItems: 'center' }}>
              <Text style={[commonStyles.text, { fontSize: fontSizes.lg, fontWeight: '600', color: colors.success }]}>
                {formatCurrency(stats.todayRevenue)}
              </Text>
              <Text style={[commonStyles.textLight, { fontSize: fontSizes.sm, textAlign: 'center' }]}>
                Chiffre d'affaires
              </Text>
            </View>
          </View>

          <View style={[commonStyles.gridItem, commonStyles.card]}>
            <View style={{ alignItems: 'center' }}>
              <Text style={[commonStyles.text, { fontSize: fontSizes.xl, fontWeight: '600', color: colors.info }]}>
                {stats.totalCustomers}
              </Text>
              <Text style={[commonStyles.textLight, { fontSize: fontSizes.sm, textAlign: 'center' }]}>
                Clients
              </Text>
            </View>
          </View>

          {stats.lowStockProducts > 0 && (
            <View style={[commonStyles.gridItem, commonStyles.card]}>
              <View style={{ alignItems: 'center' }}>
                <Text style={[commonStyles.text, { fontSize: fontSizes.xl, fontWeight: '600', color: colors.warning }]}>
                  {stats.lowStockProducts}
                </Text>
                <Text style={[commonStyles.textLight, { fontSize: fontSizes.sm, textAlign: 'center' }]}>
                  Stock bas
                </Text>
              </View>
            </View>
          )}

          {stats.creditAmount > 0 && (
            <View style={[commonStyles.gridItem, commonStyles.card]}>
              <View style={{ alignItems: 'center' }}>
                <Text style={[commonStyles.text, { fontSize: fontSizes.lg, fontWeight: '600', color: colors.danger }]}>
                  {formatCurrency(stats.creditAmount)}
                </Text>
                <Text style={[commonStyles.textLight, { fontSize: fontSizes.sm, textAlign: 'center' }]}>
                  Créances
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View style={commonStyles.section}>
          <Text style={[commonStyles.text, { fontWeight: '600', marginBottom: spacing.sm }]}>
            Actions rapides
          </Text>
          <View style={commonStyles.gridContainer}>
            <TouchableOpacity
              style={[commonStyles.gridItem, commonStyles.card]}
              onPress={() => router.push('/(tabs)/pos')}
            >
              <View style={{ alignItems: 'center' }}>
                <Icon name="card" size={32} color={colors.primary} />
                <Text style={[commonStyles.text, { marginTop: spacing.xs, textAlign: 'center' }]}>
                  Nouvelle vente
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[commonStyles.gridItem, commonStyles.card]}
              onPress={() => router.push('/(tabs)/products')}
            >
              <View style={{ alignItems: 'center' }}>
                <Icon name="cube" size={32} color={colors.info} />
                <Text style={[commonStyles.text, { marginTop: spacing.xs, textAlign: 'center' }]}>
                  Gérer produits
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[commonStyles.gridItem, commonStyles.card]}
              onPress={() => router.push('/(tabs)/customers')}
            >
              <View style={{ alignItems: 'center' }}>
                <Icon name="people" size={32} color={colors.success} />
                <Text style={[commonStyles.text, { marginTop: spacing.xs, textAlign: 'center' }]}>
                  Clients
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[commonStyles.gridItem, commonStyles.card]}
              onPress={() => router.push('/(tabs)/reports')}
            >
              <View style={{ alignItems: 'center' }}>
                <Icon name="bar-chart" size={32} color={colors.warning} />
                <Text style={[commonStyles.text, { marginTop: spacing.xs, textAlign: 'center' }]}>
                  Rapports
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Top Products */}
        {stats.topProducts.length > 0 && (
          <View style={commonStyles.section}>
            <Text style={[commonStyles.text, { fontWeight: '600', marginBottom: spacing.sm }]}>
              Produits les plus vendus
            </Text>
            {stats.topProducts.map((item, index) => (
              <View key={item.product.id} style={[commonStyles.card, commonStyles.cardSmall, { marginBottom: spacing.xs }]}>
                <View style={commonStyles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={[commonStyles.text, { fontWeight: '600', fontSize: fontSizes.sm }]}>
                      #{index + 1} {item.product.name}
                    </Text>
                    <Text style={[commonStyles.textLight, { fontSize: fontSizes.xs }]}>
                      {item.quantity} unités vendues
                    </Text>
                  </View>
                  <Text style={[commonStyles.text, { fontWeight: '600', color: colors.primary }]}>
                    {formatCurrency(item.revenue)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
