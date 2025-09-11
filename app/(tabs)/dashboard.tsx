
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { commonStyles, colors, buttonStyles } from '../../styles/commonStyles';
import { useAuthState } from '../../hooks/useAuth';
import { getSales, getProducts, getCustomers, getSettings } from '../../utils/storage';
import { DashboardStats, Sale, Product, Customer, AppSettings } from '../../types';
import Icon from '../../components/Icon';

export default function DashboardScreen() {
  const { user, logout } = useAuthState();
  const [stats, setStats] = useState<DashboardStats>({
    todaySales: 0,
    todayRevenue: 0,
    totalCustomers: 0,
    lowStockProducts: 0,
    creditAmount: 0,
    topProducts: [],
  });
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      console.log('Loading dashboard data...');
      
      const [sales, products, customers, appSettings] = await Promise.all([
        getSales(),
        getProducts(),
        getCustomers(),
        getSettings(),
      ]);

      setSettings(appSettings);

      // Calculate today's stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todaySales = sales.filter(sale => {
        const saleDate = new Date(sale.createdAt);
        saleDate.setHours(0, 0, 0, 0);
        return saleDate.getTime() === today.getTime();
      });

      const todayRevenue = todaySales.reduce((sum, sale) => sum + sale.total, 0);
      const creditAmount = customers.reduce((sum, customer) => sum + customer.creditBalance, 0);
      const lowStockProducts = products.filter(product => product.stock <= product.minStock).length;

      // Calculate top products
      const productSales = new Map<string, { quantity: number; revenue: number }>();
      sales.forEach(sale => {
        sale.items.forEach(item => {
          const existing = productSales.get(item.productId) || { quantity: 0, revenue: 0 };
          productSales.set(item.productId, {
            quantity: existing.quantity + item.quantity,
            revenue: existing.revenue + item.subtotal,
          });
        });
      });

      const topProducts = Array.from(productSales.entries())
        .map(([productId, data]) => ({
          product: products.find(p => p.id === productId)!,
          quantity: data.quantity,
          revenue: data.revenue,
        }))
        .filter(item => item.product)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      setStats({
        todaySales: todaySales.length,
        todayRevenue,
        totalCustomers: customers.length,
        lowStockProducts,
        creditAmount,
        topProducts,
      });

      console.log('Dashboard data loaded successfully');
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadDashboardData();
    setIsRefreshing(false);
  };

  const formatCurrency = (amount: number | undefined | null): string => {
    // Handle undefined, null, or invalid numbers
    if (amount === undefined || amount === null || isNaN(amount)) {
      console.log('formatCurrency called with invalid amount:', amount);
      amount = 0;
    }
    
    const currency = settings?.currency || 'XOF';
    const currencySymbols = { XOF: 'FCFA', USD: '$', EUR: '€' };
    return `${amount.toLocaleString()} ${currencySymbols[currency]}`;
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <SafeAreaView style={commonStyles.container}>
      <ScrollView
        style={commonStyles.content}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={[commonStyles.section, commonStyles.row]}>
          <View>
            <Text style={commonStyles.title}>ALKD-POS</Text>
            <Text style={commonStyles.textLight}>
              Bonjour, {user?.username}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity onPress={() => router.push('/settings')}>
              <Icon name="settings" size={24} color={colors.textLight} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleLogout}>
              <Icon name="log-out" size={24} color={colors.textLight} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={commonStyles.section}>
          <Text style={[commonStyles.subtitle, { marginBottom: 16 }]}>
            Actions rapides
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            <TouchableOpacity
              style={[buttonStyles.primary, { flex: 1, minWidth: 150 }]}
              onPress={() => router.push('/(tabs)/pos')}
            >
              <Icon name="calculator" size={20} color={colors.secondary} style={{ marginBottom: 4 }} />
              <Text style={{ color: colors.secondary, fontSize: 14, fontWeight: '600' }}>
                Nouvelle vente
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[buttonStyles.outline, { flex: 1, minWidth: 150 }]}
              onPress={() => router.push('/(tabs)/products')}
            >
              <Icon name="add" size={20} color={colors.primary} style={{ marginBottom: 4 }} />
              <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '600' }}>
                Ajouter produit
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Statistics Cards */}
        <View style={commonStyles.section}>
          <Text style={[commonStyles.subtitle, { marginBottom: 16 }]}>
            Statistiques du jour
          </Text>
          
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            <View style={[commonStyles.card, { flex: 1, minWidth: 150 }]}>
              <View style={[commonStyles.row, { marginBottom: 8 }]}>
                <Icon name="trending-up" size={20} color={colors.success} />
                <Text style={[commonStyles.textLight, { fontSize: 12 }]}>VENTES</Text>
              </View>
              <Text style={[commonStyles.title, { fontSize: 24, color: colors.success }]}>
                {stats.todaySales}
              </Text>
            </View>

            <View style={[commonStyles.card, { flex: 1, minWidth: 150 }]}>
              <View style={[commonStyles.row, { marginBottom: 8 }]}>
                <Icon name="cash" size={20} color={colors.primary} />
                <Text style={[commonStyles.textLight, { fontSize: 12 }]}>REVENUS</Text>
              </View>
              <Text style={[commonStyles.title, { fontSize: 18, color: colors.primary }]}>
                {formatCurrency(stats.todayRevenue)}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12 }}>
            <View style={[commonStyles.card, { flex: 1, minWidth: 150 }]}>
              <View style={[commonStyles.row, { marginBottom: 8 }]}>
                <Icon name="people" size={20} color={colors.info} />
                <Text style={[commonStyles.textLight, { fontSize: 12 }]}>CLIENTS</Text>
              </View>
              <Text style={[commonStyles.title, { fontSize: 24, color: colors.info }]}>
                {stats.totalCustomers}
              </Text>
            </View>

            <View style={[commonStyles.card, { flex: 1, minWidth: 150 }]}>
              <View style={[commonStyles.row, { marginBottom: 8 }]}>
                <Icon name="warning" size={20} color={colors.danger} />
                <Text style={[commonStyles.textLight, { fontSize: 12 }]}>STOCK BAS</Text>
              </View>
              <Text style={[commonStyles.title, { fontSize: 24, color: colors.danger }]}>
                {stats.lowStockProducts}
              </Text>
            </View>
          </View>

          {stats.creditAmount > 0 && (
            <View style={[commonStyles.card, { marginTop: 12 }]}>
              <View style={[commonStyles.row, { marginBottom: 8 }]}>
                <Icon name="card" size={20} color={colors.warning} />
                <Text style={[commonStyles.textLight, { fontSize: 12 }]}>CRÉDIT TOTAL</Text>
              </View>
              <Text style={[commonStyles.title, { fontSize: 20, color: colors.warning }]}>
                {formatCurrency(stats.creditAmount)}
              </Text>
            </View>
          )}
        </View>

        {/* Top Products */}
        {stats.topProducts.length > 0 && (
          <View style={commonStyles.section}>
            <Text style={[commonStyles.subtitle, { marginBottom: 16 }]}>
              Produits les plus vendus
            </Text>
            {stats.topProducts.map((item, index) => (
              <View key={item.product.id} style={[commonStyles.card, { marginBottom: 8 }]}>
                <View style={commonStyles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={[commonStyles.text, { fontWeight: '600' }]}>
                      {item.product.name}
                    </Text>
                    <Text style={commonStyles.textLight}>
                      {item.quantity} unités vendues
                    </Text>
                  </View>
                  <Text style={[commonStyles.text, { fontWeight: '600', color: colors.success }]}>
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
