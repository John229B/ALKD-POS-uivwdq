
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { commonStyles, colors, spacing, fontSizes, isSmallScreen } from '../../styles/commonStyles';
import { getSales, getProducts, getCustomers, getSettings } from '../../utils/storage';
import { useAuthState } from '../../hooks/useAuth';
import { syncService } from '../../utils/syncService';
import Icon from '../../components/Icon';
import { Sale, Product, Customer, AppSettings } from '../../types';

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
  const [stats, setStats] = useState<DashboardStats>({
    todayRevenue: 0,
    todaySales: 0,
    weekRevenue: 0,
    monthRevenue: 0,
    totalCustomers: 0,
    lowStockProducts: 0,
    creditAmount: 0,
    generalBalance: 0,
    topProducts: [],
    recentSales: [],
  });
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<{
    pendingCount: number;
    lastSyncTime?: Date;
    isOnline: boolean;
  }>({ pendingCount: 0, isOnline: false });

  const { user } = useAuthState();

  // CORRECTED: Real-time balance calculation function
  const calculateCustomerBalance = useCallback((customerId: string, sales: Sale[]) => {
    const customerSales = sales.filter(sale => sale.customerId === customerId);
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
      setIsLoading(true);
      console.log('Dashboard: Loading data...');
      
      const [sales, products, customers, appSettings] = await Promise.all([
        getSales(),
        getProducts(),
        getCustomers(),
        getSettings(),
      ]);

      setSettings(appSettings);

      // Calculate date ranges
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Filter sales by date
      const todaySales = sales.filter(sale => new Date(sale.createdAt) >= today);
      const weekSales = sales.filter(sale => new Date(sale.createdAt) >= weekAgo);
      const monthSales = sales.filter(sale => new Date(sale.createdAt) >= monthAgo);

      // Calculate revenue (only from paid sales)
      const todayRevenue = todaySales
        .filter(sale => sale.paymentStatus === 'paid')
        .reduce((sum, sale) => sum + sale.total, 0);
      
      const weekRevenue = weekSales
        .filter(sale => sale.paymentStatus === 'paid')
        .reduce((sum, sale) => sum + sale.total, 0);
      
      const monthRevenue = monthSales
        .filter(sale => sale.paymentStatus === 'paid')
        .reduce((sum, sale) => sum + sale.total, 0);

      // Calculate credit amount (unpaid sales)
      const creditAmount = sales
        .filter(sale => sale.paymentStatus === 'credit')
        .reduce((sum, sale) => sum + sale.total, 0);

      // CORRECTED: Calculate general balance using real-time calculation
      let generalBalance = 0;
      customers.forEach(customer => {
        const customerBalance = calculateCustomerBalance(customer.id, sales);
        generalBalance += customerBalance;
      });

      console.log('Dashboard: Calculated general balance:', generalBalance);

      // Find low stock products
      const lowStockProducts = products.filter(product => 
        product.stock <= (product.minStock || 0)
      ).length;

      // Calculate top products
      const productSales = new Map<string, { quantity: number; revenue: number }>();
      
      sales.forEach(sale => {
        sale.items.forEach(item => {
          const existing = productSales.get(item.productId) || { quantity: 0, revenue: 0 };
          productSales.set(item.productId, {
            quantity: existing.quantity + item.quantity,
            revenue: existing.revenue + (item.unitPrice * item.quantity),
          });
        });
      });

      const topProducts = Array.from(productSales.entries())
        .map(([productId, data]) => {
          const product = products.find(p => p.id === productId);
          return {
            name: product?.name || 'Produit inconnu',
            quantity: data.quantity,
            revenue: data.revenue,
          };
        })
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // Get recent sales
      const recentSales = sales
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10);

      setStats({
        todayRevenue,
        todaySales: todaySales.length,
        weekRevenue,
        monthRevenue,
        totalCustomers: customers.length,
        lowStockProducts,
        creditAmount,
        generalBalance,
        topProducts,
        recentSales,
      });

      // Load sync status
      const status = await syncService.getSyncStatus();
      setSyncStatus(status);

      console.log('Dashboard: Data loaded successfully');
    } catch (error) {
      console.error('Dashboard: Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [calculateCustomerBalance]);

  // Use useFocusEffect to reload data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [loadDashboardData])
  );

  useEffect(() => {
    // Start auto sync
    syncService.startAutoSync(15); // Every 15 minutes
    
    return () => {
      syncService.stopAutoSync();
    };
  }, []);

  const formatCurrency = useCallback((amount: number): string => {
    if (!settings) return `${amount.toLocaleString()} F CFA`;
    
    const { currency } = settings;
    const currencySymbols = {
      XOF: 'F CFA',
      USD: '$',
      EUR: '€',
    };
    
    return `${amount.toLocaleString()} ${currencySymbols[currency] || currency}`;
  }, [settings]);

  const handleSyncNow = async () => {
    const result = await syncService.syncNow();
    if (result.success) {
      console.log('Sync completed successfully');
    } else {
      console.log('Sync failed:', result.message);
    }
    
    // Refresh sync status
    const status = await syncService.getSyncStatus();
    setSyncStatus(status);
  };

  const quickActions = useMemo(() => [
    {
      title: 'Nouvelle Vente',
      icon: 'add-circle',
      color: colors.success,
      onPress: () => router.push('/(tabs)/pos'),
    },
    {
      title: 'Ajouter Produit',
      icon: 'cube',
      color: colors.info,
      onPress: () => router.push('/(tabs)/products'),
    },
    {
      title: 'Nouveau Client',
      icon: 'person-add',
      color: colors.primary,
      onPress: () => router.push('/(tabs)/customers'),
    },
    {
      title: 'Rapports',
      icon: 'bar-chart',
      color: colors.warning,
      onPress: () => router.push('/reports'),
    },
  ], []);

  const StatCard = ({ title, value, subtitle, icon, color }: {
    title: string;
    value: string;
    subtitle?: string;
    icon: string;
    color?: string;
  }) => (
    <View style={[
      commonStyles.card, 
      { 
        flex: 1, 
        marginHorizontal: spacing.xs,
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
      }
    ]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
        <View style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: color ? `${color}20` : `${colors.primary}20`,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: spacing.sm,
        }}>
          <Icon name={icon} size={20} color={color || colors.primary} />
        </View>
        <Text style={[commonStyles.textLight, { fontSize: fontSizes.sm, flex: 1 }]}>
          {title}
        </Text>
      </View>
      <Text style={[commonStyles.title, { fontSize: fontSizes.lg, marginBottom: 0, color: colors.text }]}>
        {value}
      </Text>
      {subtitle && (
        <Text style={[commonStyles.textLight, { fontSize: fontSizes.xs }]}>
          {subtitle}
        </Text>
      )}
    </View>
  );

  const QuickActionCard = ({ action }: { action: typeof quickActions[0] }) => (
    <TouchableOpacity
      style={[
        commonStyles.card, 
        { 
          flex: 1, 
          marginHorizontal: spacing.xs,
          alignItems: 'center',
          paddingVertical: spacing.lg,
          backgroundColor: colors.background,
          borderWidth: 1,
          borderColor: colors.border,
        }
      ]}
      onPress={action.onPress}
      activeOpacity={0.7}
    >
      <View style={{
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: `${action.color}20`,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.sm,
      }}>
        <Icon name={action.icon} size={24} color={action.color} />
      </View>
      <Text style={[commonStyles.text, { 
        fontSize: fontSizes.sm, 
        textAlign: 'center',
        fontWeight: '600',
        color: colors.text,
      }]}>
        {action.title}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]}>
      {/* FIXED: Header with better alignment and centering */}
      <View style={[
        commonStyles.header, 
        { 
          backgroundColor: colors.background, 
          borderBottomColor: colors.border,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
          alignItems: 'center',
          justifyContent: 'space-between',
          flexDirection: 'row',
        }
      ]}>
        <View style={{ flex: 1 }}>
          <Text style={[commonStyles.headerTitle, { color: colors.text, fontSize: fontSizes.xl, fontWeight: 'bold' }]}>
            Tableau de bord
          </Text>
          <Text style={[commonStyles.textLight, { fontSize: fontSizes.sm, marginTop: spacing.xs }]}>
            Bonjour, {user?.username}
          </Text>
        </View>
        
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {/* Sync Status */}
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: spacing.sm,
              paddingVertical: spacing.xs,
              borderRadius: 16,
              backgroundColor: syncStatus.isOnline ? colors.success + '20' : colors.error + '20',
              marginRight: spacing.sm,
              borderWidth: 1,
              borderColor: syncStatus.isOnline ? colors.success + '40' : colors.error + '40',
            }}
            onPress={handleSyncNow}
            activeOpacity={0.7}
          >
            <Icon 
              name={syncStatus.isOnline ? 'cloud-done' : 'cloud-offline'} 
              size={16} 
              color={syncStatus.isOnline ? colors.success : colors.error}
            />
            <Text style={{
              fontSize: fontSizes.xs,
              color: syncStatus.isOnline ? colors.success : colors.error,
              marginLeft: spacing.xs,
              fontWeight: '600',
            }}>
              {syncStatus.pendingCount > 0 ? `${syncStatus.pendingCount}` : (syncStatus.isOnline ? 'En ligne' : 'Hors ligne')}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={() => router.push('/settings')}
            style={{
              backgroundColor: colors.backgroundAlt,
              borderRadius: 20,
              padding: spacing.sm,
              borderWidth: 1,
              borderColor: colors.border,
            }}
            activeOpacity={0.7}
          >
            <Icon name="settings" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={[commonStyles.content, { backgroundColor: colors.backgroundAlt }]}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={loadDashboardData} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={{ padding: spacing.lg }}>
          {/* Quick Actions */}
          <Text style={[commonStyles.subtitle, { marginBottom: spacing.md, color: colors.text }]}>
            Actions rapides
          </Text>
          <View style={{ 
            flexDirection: 'row', 
            marginBottom: spacing.xl,
            flexWrap: 'wrap',
          }}>
            {quickActions.map((action, index) => (
              <View key={index} style={{ 
                width: isSmallScreen ? '50%' : '25%',
                marginBottom: spacing.sm,
              }}>
                <QuickActionCard action={action} />
              </View>
            ))}
          </View>

          {/* Revenue Stats */}
          <Text style={[commonStyles.subtitle, { marginBottom: spacing.md, color: colors.text }]}>
            Revenus
          </Text>
          <View style={{ 
            flexDirection: isSmallScreen ? 'column' : 'row', 
            marginBottom: spacing.xl 
          }}>
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
              color={colors.info}
            />
            <StatCard
              title="Ce mois"
              value={formatCurrency(stats.monthRevenue)}
              icon="trending-up"
              color={colors.warning}
            />
          </View>

          {/* Business Stats */}
          <Text style={[commonStyles.subtitle, { marginBottom: spacing.md, color: colors.text }]}>
            Statistiques
          </Text>
          <View style={{ 
            flexDirection: isSmallScreen ? 'column' : 'row', 
            marginBottom: spacing.xl 
          }}>
            <StatCard
              title="Clients"
              value={stats.totalCustomers.toString()}
              icon="people"
              color={colors.primary}
            />
            <StatCard
              title="Stock faible"
              value={stats.lowStockProducts.toString()}
              subtitle="produits"
              icon="warning"
              color={colors.error}
            />
            <StatCard
              title="Crédit total"
              value={formatCurrency(stats.creditAmount)}
              icon="card"
              color={colors.warning}
            />
          </View>

          {/* CORRECTED: Balance générale avec calcul en temps réel */}
          <View style={[
            commonStyles.card, 
            { 
              marginBottom: spacing.xl,
              backgroundColor: colors.background,
              borderWidth: 2,
              borderColor: stats.generalBalance >= 0 ? colors.success + '40' : colors.error + '40',
            }
          ]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
              <View style={{
                backgroundColor: stats.generalBalance >= 0 ? colors.success + '20' : colors.error + '20',
                borderRadius: 20,
                padding: spacing.sm,
                marginRight: spacing.sm,
              }}>
                <Icon 
                  name="wallet" 
                  size={24} 
                  color={stats.generalBalance >= 0 ? colors.success : colors.error} 
                />
              </View>
              <Text style={[commonStyles.subtitle, { marginLeft: spacing.sm, marginBottom: 0, color: colors.text }]}>
                Balance générale
              </Text>
            </View>
            <Text style={[
              commonStyles.title, 
              { 
                fontSize: fontSizes.xl,
                color: stats.generalBalance >= 0 ? colors.success : colors.error,
                marginBottom: spacing.xs,
                fontWeight: 'bold',
              }
            ]}>
              {formatCurrency(Math.abs(stats.generalBalance))}
            </Text>
            <Text style={[commonStyles.textLight, { fontSize: fontSizes.sm }]}>
              {stats.generalBalance > 0 ? 'Solde positif (dettes clients)' : 
               stats.generalBalance < 0 ? 'Solde négatif (avances clients)' : 
               'Solde équilibré'}
            </Text>
            <Text style={[commonStyles.textLight, { fontSize: fontSizes.xs, marginTop: spacing.xs }]}>
              Calculé en temps réel depuis toutes les transactions
            </Text>
          </View>

          {/* Top Products */}
          {stats.topProducts.length > 0 && (
            <View style={[
              commonStyles.card, 
              { 
                marginBottom: spacing.xl,
                backgroundColor: colors.background,
                borderWidth: 1,
                borderColor: colors.border,
              }
            ]}>
              <Text style={[commonStyles.subtitle, { marginBottom: spacing.md, color: colors.text }]}>
                Produits les plus vendus
              </Text>
              {stats.topProducts.map((product, index) => (
                <View key={index} style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: spacing.sm,
                  borderBottomWidth: index < stats.topProducts.length - 1 ? 1 : 0,
                  borderBottomColor: colors.border,
                }}>
                  <View style={{
                    width: 30,
                    height: 30,
                    borderRadius: 15,
                    backgroundColor: colors.primary,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: spacing.md,
                  }}>
                    <Text style={{ color: colors.secondary, fontWeight: 'bold', fontSize: fontSizes.sm }}>
                      {index + 1}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[commonStyles.text, { fontWeight: '600', color: colors.text }]}>
                      {product.name}
                    </Text>
                    <Text style={[commonStyles.textLight, { fontSize: fontSizes.sm }]}>
                      {product.quantity} vendus
                    </Text>
                  </View>
                  <Text style={[commonStyles.text, { fontWeight: '600', color: colors.text }]}>
                    {formatCurrency(product.revenue)}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Sync Status Details */}
          {syncStatus.pendingCount > 0 && (
            <View style={[
              commonStyles.card, 
              { 
                backgroundColor: colors.warning + '10',
                borderLeftWidth: 4,
                borderLeftColor: colors.warning,
                borderWidth: 1,
                borderColor: colors.warning + '30',
              }
            ]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
                <Icon name="sync" size={20} color={colors.warning} />
                <Text style={[commonStyles.subtitle, { marginLeft: spacing.sm, marginBottom: 0, color: colors.text }]}>
                  Synchronisation en attente
                </Text>
              </View>
              <Text style={[commonStyles.textLight, { marginBottom: spacing.sm }]}>
                {syncStatus.pendingCount} élément(s) en attente de synchronisation
              </Text>
              <TouchableOpacity
                style={{
                  backgroundColor: colors.warning,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                  borderRadius: 6,
                  alignSelf: 'flex-start',
                }}
                onPress={handleSyncNow}
                activeOpacity={0.7}
              >
                <Text style={{ color: colors.secondary, fontSize: fontSizes.sm, fontWeight: '600' }}>
                  Synchroniser maintenant
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
