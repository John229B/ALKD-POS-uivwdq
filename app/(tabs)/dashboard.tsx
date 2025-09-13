
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { commonStyles, colors, spacing, fontSizes, isSmallScreen } from '../../styles/commonStyles';
import { getSales, getProducts, getCustomers, getSettings } from '../../utils/storage';
import { useAuthState } from '../../hooks/useAuth';
import { Sale, Product, Customer, AppSettings } from '../../types';
import Icon from '../../components/Icon';

interface DashboardStats {
  todayRevenue: number;
  todaySales: number;
  weekRevenue: number;
  monthRevenue: number;
  totalCustomers: number;
  lowStockProducts: number;
  creditAmount: number;
  generalBalance: number;
  topProducts: {
    name: string;
    quantity: number;
    revenue: number;
  }[];
  recentSales: Sale[];
}

export default function DashboardScreen() {
  const { user } = useAuthState();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // CORRECTED: Real-time balance calculation for individual customers
  const getCustomerBalance = useCallback((customer: Customer, sales: Sale[]) => {
    const customerSales = sales.filter(sale => sale.customerId === customer.id);
    let balance = 0;
    
    customerSales.forEach(sale => {
      // Check if this is a manual transaction (J'ai pris/donné)
      if (sale.items.length === 0 && sale.notes) {
        if (sale.notes.includes("J'ai donné")) {
          balance += sale.total; // "J'ai donné" increases debt (positive balance)
        } else if (sale.notes.includes("J'ai pris")) {
          balance -= sale.total; // "J'ai pris" reduces debt (negative balance)
        }
      } else {
        // Regular sales transactions
        if (sale.paymentStatus === 'credit') {
          balance += sale.total; // Credit sale adds to debt
        } else if (sale.paymentStatus === 'partial') {
          const unpaidAmount = sale.total - (sale.amountPaid || 0);
          balance += unpaidAmount; // Only unpaid portion adds to debt
        } else if (sale.paymentStatus === 'paid') {
          // Check for overpayment
          const overpayment = (sale.amountPaid || sale.total) - sale.total;
          if (overpayment > 0) {
            balance -= overpayment; // Overpayment creates credit for customer
          }
          // Fully paid sales with exact payment don't affect balance
        }
      }
    });
    
    return balance;
  }, []);

  const loadDashboardData = useCallback(async () => {
    try {
      console.log('Dashboard: Loading data...');
      const [salesData, productsData, customersData, settingsData] = await Promise.all([
        getSales(),
        getProducts(),
        getCustomers(),
        getSettings(),
      ]);

      setSettings(settingsData);

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Filter sales by date ranges
      const todaySales = salesData.filter(sale => {
        const saleDate = new Date(sale.createdAt);
        return saleDate >= today;
      });

      const weekSales = salesData.filter(sale => {
        const saleDate = new Date(sale.createdAt);
        return saleDate >= weekAgo;
      });

      const monthSales = salesData.filter(sale => {
        const saleDate = new Date(sale.createdAt);
        return saleDate >= monthAgo;
      });

      // Calculate revenue (only from actual sales, not manual transactions)
      const todayRevenue = todaySales
        .filter(sale => sale.items.length > 0) // Only actual sales
        .reduce((sum, sale) => sum + sale.total, 0);

      const weekRevenue = weekSales
        .filter(sale => sale.items.length > 0) // Only actual sales
        .reduce((sum, sale) => sum + sale.total, 0);

      const monthRevenue = monthSales
        .filter(sale => sale.items.length > 0) // Only actual sales
        .reduce((sum, sale) => sum + sale.total, 0);

      // Calculate credit amount (total unpaid amounts)
      const creditAmount = salesData
        .filter(sale => sale.items.length > 0) // Only actual sales
        .reduce((sum, sale) => {
          if (sale.paymentStatus === 'credit') {
            return sum + sale.total;
          } else if (sale.paymentStatus === 'partial') {
            return sum + (sale.total - (sale.amountPaid || 0));
          }
          return sum;
        }, 0);

      // CORRECTED: Calculate general balance using the same logic as customers screen
      let totalDebt = 0; // Total amount customers owe us (positive balances)
      let totalCredit = 0; // Total amount we owe customers (negative balances)

      customersData.forEach(customer => {
        const customerBalance = getCustomerBalance(customer, salesData);
        if (customerBalance > 0) {
          totalDebt += customerBalance; // Customer owes us money
        } else if (customerBalance < 0) {
          totalCredit += Math.abs(customerBalance); // We owe customer money
        }
      });

      const generalBalance = totalDebt - totalCredit;

      console.log('Dashboard general balance calculation:', { 
        totalDebt, 
        totalCredit, 
        generalBalance,
        customersCount: customersData.length, 
        salesCount: salesData.length 
      });

      // Calculate low stock products
      const lowStockProducts = productsData.filter(product => 
        product.isActive && product.stock <= (product.minStock || 0)
      ).length;

      // Calculate top products (from actual sales only)
      const productSales = new Map<string, { name: string; quantity: number; revenue: number }>();
      
      salesData
        .filter(sale => sale.items.length > 0) // Only actual sales
        .forEach(sale => {
          sale.items.forEach(item => {
            const existing = productSales.get(item.productId) || { 
              name: item.product.name, 
              quantity: 0, 
              revenue: 0 
            };
            existing.quantity += item.quantity;
            existing.revenue += item.subtotal;
            productSales.set(item.productId, existing);
          });
        });

      const topProducts = Array.from(productSales.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // Get recent sales (actual sales only)
      const recentSales = salesData
        .filter(sale => sale.items.length > 0) // Only actual sales
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10);

      const dashboardStats: DashboardStats = {
        todayRevenue,
        todaySales: todaySales.filter(sale => sale.items.length > 0).length,
        weekRevenue,
        monthRevenue,
        totalCustomers: customersData.length,
        lowStockProducts,
        creditAmount,
        generalBalance,
        topProducts,
        recentSales,
      };

      setStats(dashboardStats);
      console.log('Dashboard: Data loaded successfully');
    } catch (error) {
      console.error('Dashboard: Error loading data:', error);
    }
  }, [getCustomerBalance]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  }, [loadDashboardData]);

  const formatCurrency = useCallback((amount: number): string => {
    const currency = settings?.currency || 'XOF';
    const currencySymbols = { XOF: 'F CFA', USD: '$', EUR: '€' };
    return `${amount.toLocaleString()} ${currencySymbols[currency]}`;
  }, [settings?.currency]);

  const StatCard = ({ title, value, subtitle, icon, color }: {
    title: string;
    value: string;
    subtitle?: string;
    icon: string;
    color?: string;
  }) => (
    <View style={[commonStyles.card, { flex: 1, marginHorizontal: spacing.xs }]}>
      <View style={[commonStyles.row, { marginBottom: spacing.sm }]}>
        <View style={{ flex: 1 }}>
          <Text style={[commonStyles.textLight, { fontSize: fontSizes.sm }]}>{title}</Text>
        </View>
        <Icon name={icon} size={20} color={color || colors.primary} />
      </View>
      <Text style={[commonStyles.text, { 
        fontSize: fontSizes.lg, 
        fontWeight: 'bold',
        color: color || colors.text,
        marginBottom: spacing.xs
      }]}>
        {value}
      </Text>
      {subtitle && (
        <Text style={[commonStyles.textLight, { fontSize: fontSizes.xs }]}>
          {subtitle}
        </Text>
      )}
    </View>
  );

  const quickActions = [
    {
      title: 'Nouvelle vente',
      subtitle: 'Point de vente',
      icon: 'card',
      color: colors.primary,
      route: '/(tabs)/pos',
    },
    {
      title: 'Ajouter produit',
      subtitle: 'Gestion stock',
      icon: 'add-circle',
      color: colors.success,
      route: '/(tabs)/products',
    },
    {
      title: 'Clients',
      subtitle: 'Gestion clients',
      icon: 'people',
      color: colors.warning,
      route: '/(tabs)/customers',
    },
    {
      title: 'Rapports',
      subtitle: 'Analyses',
      icon: 'bar-chart',
      color: colors.danger,
      route: '/reports',
    },
  ];

  const QuickActionCard = ({ action }: { action: typeof quickActions[0] }) => (
    <TouchableOpacity
      style={[commonStyles.card, { flex: 1, marginHorizontal: spacing.xs }]}
      onPress={() => router.push(action.route as any)}
    >
      <View style={{ alignItems: 'center' }}>
        <View style={{
          backgroundColor: action.color + '20',
          borderRadius: 25,
          padding: spacing.md,
          marginBottom: spacing.sm,
        }}>
          <Icon name={action.icon} size={24} color={action.color} />
        </View>
        <Text style={[commonStyles.text, { 
          fontWeight: '600', 
          textAlign: 'center',
          marginBottom: spacing.xs
        }]}>
          {action.title}
        </Text>
        <Text style={[commonStyles.textLight, { 
          fontSize: fontSizes.sm, 
          textAlign: 'center' 
        }]}>
          {action.subtitle}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (!stats) {
    return (
      <SafeAreaView style={commonStyles.container}>
        <View style={[commonStyles.content, { justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={commonStyles.text}>Chargement du tableau de bord...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={commonStyles.container}>
      <ScrollView 
        style={commonStyles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={{ paddingBottom: spacing.xl }}
      >
        {/* Header */}
        <View style={[commonStyles.section, commonStyles.header]}>
          <View style={{ flex: 1 }}>
            <Text style={commonStyles.title}>Tableau de bord</Text>
            <Text style={[commonStyles.textLight, { fontSize: fontSizes.sm }]}>
              Bonjour {user?.username || 'Utilisateur'} 👋
            </Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/settings')}>
            <Icon name="settings" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Revenue Stats */}
        <View style={commonStyles.section}>
          <Text style={[commonStyles.subtitle, { marginBottom: spacing.md }]}>
            💰 Revenus
          </Text>
          <View style={{ flexDirection: isSmallScreen ? 'column' : 'row', gap: spacing.sm }}>
            <StatCard
              title="Aujourd'hui"
              value={formatCurrency(stats.todayRevenue)}
              subtitle={`${stats.todaySales} vente(s)`}
              icon="today"
              color={colors.success}
            />
            <StatCard
              title="Cette semaine"
              value={formatCurrency(stats.weekRevenue)}
              icon="calendar"
              color={colors.primary}
            />
            <StatCard
              title="Ce mois"
              value={formatCurrency(stats.monthRevenue)}
              icon="calendar-outline"
              color={colors.warning}
            />
          </View>
        </View>

        {/* Business Stats */}
        <View style={commonStyles.section}>
          <Text style={[commonStyles.subtitle, { marginBottom: spacing.md }]}>
            📊 Statistiques
          </Text>
          <View style={{ flexDirection: isSmallScreen ? 'column' : 'row', gap: spacing.sm }}>
            <StatCard
              title="Clients"
              value={stats.totalCustomers.toString()}
              subtitle="Total enregistrés"
              icon="people"
              color={colors.primary}
            />
            <StatCard
              title="Stock bas"
              value={stats.lowStockProducts.toString()}
              subtitle="Produits à réapprovisionner"
              icon="warning"
              color={stats.lowStockProducts > 0 ? colors.danger : colors.success}
            />
            <StatCard
              title="Balance générale"
              value={stats.generalBalance === 0 ? formatCurrency(0) : formatCurrency(Math.abs(stats.generalBalance))}
              subtitle={stats.generalBalance > 0 ? "J'ai donné (dettes)" : 
                       stats.generalBalance < 0 ? "J'ai pris (avances)" : 
                       "Équilibré"}
              icon="wallet"
              color={stats.generalBalance > 0 ? colors.danger : 
                     stats.generalBalance < 0 ? colors.success : 
                     colors.text}
            />
          </View>
        </View>

        {/* Quick Actions */}
        <View style={commonStyles.section}>
          <Text style={[commonStyles.subtitle, { marginBottom: spacing.md }]}>
            ⚡ Actions rapides
          </Text>
          <View style={{ 
            flexDirection: 'row', 
            flexWrap: 'wrap',
            gap: spacing.sm
          }}>
            {quickActions.map((action, index) => (
              <View key={index} style={{ 
                width: isSmallScreen ? '48%' : '23%',
                minWidth: 150
              }}>
                <QuickActionCard action={action} />
              </View>
            ))}
          </View>
        </View>

        {/* Top Products */}
        {stats.topProducts.length > 0 && (
          <View style={commonStyles.section}>
            <Text style={[commonStyles.subtitle, { marginBottom: spacing.md }]}>
              🏆 Produits populaires
            </Text>
            {stats.topProducts.map((product, index) => (
              <View key={index} style={[commonStyles.card, { marginBottom: spacing.sm }]}>
                <View style={[commonStyles.row, { alignItems: 'center' }]}>
                  <View style={{
                    backgroundColor: colors.primary + '20',
                    borderRadius: 15,
                    padding: spacing.sm,
                    marginRight: spacing.md,
                    minWidth: 30,
                    alignItems: 'center',
                  }}>
                    <Text style={[commonStyles.text, { 
                      color: colors.primary, 
                      fontWeight: 'bold',
                      fontSize: fontSizes.sm
                    }]}>
                      {index + 1}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[commonStyles.text, { fontWeight: '600', marginBottom: spacing.xs }]}>
                      {product.name}
                    </Text>
                    <Text style={[commonStyles.textLight, { fontSize: fontSizes.sm }]}>
                      {product.quantity} vendus
                    </Text>
                  </View>
                  <Text style={[commonStyles.text, { 
                    color: colors.success, 
                    fontWeight: 'bold' 
                  }]}>
                    {formatCurrency(product.revenue)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Recent Sales */}
        {stats.recentSales.length > 0 && (
          <View style={commonStyles.section}>
            <View style={[commonStyles.row, { marginBottom: spacing.md }]}>
              <Text style={commonStyles.subtitle}>
                🕒 Ventes récentes
              </Text>
              <TouchableOpacity onPress={() => router.push('/reports')}>
                <Text style={[commonStyles.text, { color: colors.primary, fontSize: fontSizes.sm }]}>
                  Voir tout
                </Text>
              </TouchableOpacity>
            </View>
            {stats.recentSales.slice(0, 5).map((sale) => (
              <TouchableOpacity
                key={sale.id}
                style={[commonStyles.card, { marginBottom: spacing.sm }]}
                onPress={() => router.push(`/sale-ticket?saleId=${sale.id}`)}
              >
                <View style={[commonStyles.row, { alignItems: 'center' }]}>
                  <View style={{
                    backgroundColor: colors.backgroundLight,
                    borderRadius: 20,
                    padding: spacing.sm,
                    marginRight: spacing.md,
                  }}>
                    <Icon name="receipt" size={16} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[commonStyles.text, { fontWeight: '600', marginBottom: spacing.xs }]}>
                      {sale.receiptNumber}
                    </Text>
                    <Text style={[commonStyles.textLight, { fontSize: fontSizes.sm }]}>
                      {sale.customer?.name || 'Client anonyme'} • {sale.items.length} article(s)
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[commonStyles.text, { 
                      color: colors.success, 
                      fontWeight: 'bold',
                      marginBottom: spacing.xs
                    }]}>
                      {formatCurrency(sale.total)}
                    </Text>
                    <Text style={[commonStyles.textLight, { fontSize: fontSizes.xs }]}>
                      {sale.paymentStatus === 'paid' ? '✅ Payé' : 
                       sale.paymentStatus === 'partial' ? '⏳ Partiel' : 
                       '💳 Crédit'}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
