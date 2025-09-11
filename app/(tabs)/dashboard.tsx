
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuthState } from '../../hooks/useAuth';
import Icon from '../../components/Icon';
import { commonStyles, colors, spacing, fontSizes, isSmallScreen } from '../../styles/commonStyles';
import { getSales, getProducts, getCustomers, getSettings } from '../../utils/storage';
import { Sale, Product, Customer, AppSettings } from '../../types';

const { width: screenWidth } = Dimensions.get('window');

interface DashboardStats {
  todayRevenue: number;
  todaySales: number;
  weekRevenue: number;
  monthRevenue: number;
  totalCustomers: number;
  lowStockProducts: number;
  creditAmount: number;
  topProducts: Array<{
    name: string;
    quantity: number;
    revenue: number;
  }>;
  recentSales: Sale[];
}

export default function DashboardScreen() {
  const { user } = useAuthState();
  const [stats, setStats] = useState<DashboardStats>({
    todayRevenue: 0,
    todaySales: 0,
    weekRevenue: 0,
    monthRevenue: 0,
    totalCustomers: 0,
    lowStockProducts: 0,
    creditAmount: 0,
    topProducts: [],
    recentSales: [],
  });
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboardData = useCallback(async () => {
    try {
      console.log('Dashboard: Loading dashboard data...');
      
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

      // Filter sales by date ranges
      const todaySales = sales.filter(sale => {
        const saleDate = new Date(sale.createdAt);
        return saleDate >= today;
      });

      const weekSales = sales.filter(sale => {
        const saleDate = new Date(sale.createdAt);
        return saleDate >= weekAgo;
      });

      const monthSales = sales.filter(sale => {
        const saleDate = new Date(sale.createdAt);
        return saleDate >= monthAgo;
      });

      // Calculate revenue
      const todayRevenue = todaySales.reduce((sum, sale) => sum + sale.total, 0);
      const weekRevenue = weekSales.reduce((sum, sale) => sum + sale.total, 0);
      const monthRevenue = monthSales.reduce((sum, sale) => sum + sale.total, 0);

      // Calculate credit amount
      const creditAmount = customers.reduce((sum, customer) => sum + customer.creditBalance, 0);

      // Find low stock products
      const lowStockProducts = products.filter(product => 
        product.isActive && product.stock <= product.minStock
      ).length;

      // Calculate top products
      const productSales: { [key: string]: { quantity: number; revenue: number; name: string } } = {};
      
      monthSales.forEach(sale => {
        sale.items.forEach(item => {
          if (!productSales[item.productId]) {
            const product = products.find(p => p.id === item.productId);
            productSales[item.productId] = {
              quantity: 0,
              revenue: 0,
              name: product?.name || 'Produit inconnu',
            };
          }
          productSales[item.productId].quantity += item.quantity;
          productSales[item.productId].revenue += item.subtotal;
        });
      });

      const topProducts = Object.values(productSales)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 3);

      // Get recent sales (last 5)
      const recentSales = sales
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);

      setStats({
        todayRevenue,
        todaySales: todaySales.length,
        weekRevenue,
        monthRevenue,
        totalCustomers: customers.length,
        lowStockProducts,
        creditAmount,
        topProducts,
        recentSales,
      });

      console.log('Dashboard: Data loaded successfully');
    } catch (error) {
      console.error('Dashboard: Error loading data:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadDashboardData();
  }, [loadDashboardData]);

  const formatCurrency = useCallback((amount: number) => {
    if (!settings) return `${amount.toLocaleString()}`;
    
    const currencySymbols = {
      XOF: 'FCFA',
      USD: '$',
      EUR: '€',
    };
    
    const symbol = currencySymbols[settings.currency];
    return settings.currency === 'XOF' 
      ? `${amount.toLocaleString()} ${symbol}`
      : `${symbol}${amount.toLocaleString()}`;
  }, [settings]);

  const quickActions = useMemo(() => [
    {
      id: 'new-sale',
      title: 'Nouvelle Vente',
      icon: 'plus-circle',
      color: colors.success,
      route: '/pos',
    },
    {
      id: 'add-product',
      title: 'Ajouter Produit',
      icon: 'package',
      color: colors.info,
      route: '/products',
    },
    {
      id: 'customers',
      title: 'Clients',
      icon: 'users',
      color: colors.warning,
      route: '/customers',
    },
    {
      id: 'reports',
      title: 'Rapports',
      icon: 'bar-chart',
      color: colors.primary,
      route: '/reports',
    },
  ], []);

  const StatCard = ({ title, value, subtitle, icon, color = colors.primary }: {
    title: string;
    value: string;
    subtitle?: string;
    icon: string;
    color?: string;
  }) => (
    <View style={[commonStyles.card, { 
      flex: 1, 
      minWidth: isSmallScreen ? '100%' : '45%',
      marginHorizontal: spacing.xs,
    }]}>
      <View style={[commonStyles.row, { marginBottom: spacing.sm }]}>
        <View style={{
          backgroundColor: `${color}20`,
          padding: spacing.sm,
          borderRadius: 8,
        }}>
          <Icon name={icon} size={24} color={color} />
        </View>
        <View style={{ flex: 1, marginLeft: spacing.md }}>
          <Text style={[commonStyles.textLight, { fontSize: fontSizes.sm }]}>
            {title}
          </Text>
          <Text style={[commonStyles.title, { 
            fontSize: fontSizes.xl, 
            marginBottom: 0,
            color: color,
          }]}>
            {value}
          </Text>
          {subtitle && (
            <Text style={[commonStyles.textLight, { fontSize: fontSizes.xs }]}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>
    </View>
  );

  const QuickActionCard = ({ action }: { action: typeof quickActions[0] }) => (
    <TouchableOpacity
      style={[commonStyles.card, {
        flex: 1,
        minWidth: isSmallScreen ? '45%' : '22%',
        marginHorizontal: spacing.xs,
        alignItems: 'center',
        paddingVertical: spacing.lg,
      }]}
      onPress={() => router.push(action.route as any)}
    >
      <View style={{
        backgroundColor: `${action.color}20`,
        padding: spacing.md,
        borderRadius: 50,
        marginBottom: spacing.sm,
      }}>
        <Icon name={action.icon} size={28} color={action.color} />
      </View>
      <Text style={[commonStyles.text, { 
        textAlign: 'center',
        fontSize: fontSizes.sm,
        fontWeight: '600',
      }]}>
        {action.title}
      </Text>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.backgroundAlt }]}>
        <View style={[commonStyles.center, { flex: 1 }]}>
          <Text style={commonStyles.text}>Chargement...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.backgroundAlt }]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={[commonStyles.section, { backgroundColor: colors.background }]}>
          <View style={commonStyles.row}>
            <View>
              <Text style={[commonStyles.title, { color: colors.text }]}>
                Tableau de Bord
              </Text>
              <Text style={[commonStyles.textLight, { fontSize: fontSizes.sm }]}>
                Bonjour {user?.username || 'Utilisateur'} 👋
              </Text>
            </View>
            <TouchableOpacity
              onPress={onRefresh}
              style={{
                backgroundColor: colors.primary,
                padding: spacing.sm,
                borderRadius: 8,
              }}
            >
              <Icon name="refresh-cw" size={20} color={colors.secondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={[commonStyles.section, { paddingTop: 0 }]}>
          <Text style={[commonStyles.subtitle, { 
            fontSize: fontSizes.lg,
            marginBottom: spacing.md,
          }]}>
            Actions Rapides
          </Text>
          <View style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: spacing.sm,
            justifyContent: 'space-between',
          }}>
            {quickActions.map((action) => (
              <QuickActionCard key={action.id} action={action} />
            ))}
          </View>
        </View>

        {/* Key Metrics */}
        <View style={commonStyles.section}>
          <Text style={[commonStyles.subtitle, { 
            fontSize: fontSizes.lg,
            marginBottom: spacing.md,
          }]}>
            Indicateurs Clés
          </Text>
          
          {/* Revenue Stats */}
          <View style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: spacing.sm,
            marginBottom: spacing.md,
          }}>
            <StatCard
              title="Revenus Aujourd'hui"
              value={formatCurrency(stats.todayRevenue)}
              subtitle={`${stats.todaySales} vente${stats.todaySales > 1 ? 's' : ''}`}
              icon="dollar-sign"
              color={colors.success}
            />
            <StatCard
              title="Revenus du Mois"
              value={formatCurrency(stats.monthRevenue)}
              subtitle="30 derniers jours"
              icon="trending-up"
              color={colors.info}
            />
          </View>

          {/* Other Stats */}
          <View style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: spacing.sm,
          }}>
            <StatCard
              title="Total Clients"
              value={stats.totalCustomers.toString()}
              icon="users"
              color={colors.warning}
            />
            <StatCard
              title="Stock Faible"
              value={stats.lowStockProducts.toString()}
              subtitle="Produits à réapprovisionner"
              icon="alert-triangle"
              color={colors.danger}
            />
          </View>

          {stats.creditAmount > 0 && (
            <View style={{ marginTop: spacing.sm }}>
              <StatCard
                title="Crédits en Cours"
                value={formatCurrency(stats.creditAmount)}
                subtitle="Montant total des dettes"
                icon="credit-card"
                color={colors.danger}
              />
            </View>
          )}
        </View>

        {/* Top Products */}
        {stats.topProducts.length > 0 && (
          <View style={commonStyles.section}>
            <Text style={[commonStyles.subtitle, { 
              fontSize: fontSizes.lg,
              marginBottom: spacing.md,
            }]}>
              Top Produits (30j)
            </Text>
            <View style={commonStyles.card}>
              {stats.topProducts.map((product, index) => (
                <View key={index}>
                  <View style={[commonStyles.row, { paddingVertical: spacing.sm }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[commonStyles.text, { fontWeight: '600' }]}>
                        {product.name}
                      </Text>
                      <Text style={commonStyles.textLight}>
                        {product.quantity} unités vendues
                      </Text>
                    </View>
                    <Text style={[commonStyles.text, { 
                      fontWeight: '700',
                      color: colors.success,
                    }]}>
                      {formatCurrency(product.revenue)}
                    </Text>
                  </View>
                  {index < stats.topProducts.length - 1 && (
                    <View style={commonStyles.divider} />
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Recent Sales */}
        {stats.recentSales.length > 0 && (
          <View style={commonStyles.section}>
            <View style={[commonStyles.row, { marginBottom: spacing.md }]}>
              <Text style={[commonStyles.subtitle, { 
                fontSize: fontSizes.lg,
                marginBottom: 0,
              }]}>
                Ventes Récentes
              </Text>
              <TouchableOpacity
                onPress={() => router.push('/reports')}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.xs,
                }}
              >
                <Text style={[commonStyles.textLight, { fontSize: fontSizes.sm }]}>
                  Voir tout
                </Text>
                <Icon name="chevron-right" size={16} color={colors.textLight} />
              </TouchableOpacity>
            </View>
            
            <View style={commonStyles.card}>
              {stats.recentSales.map((sale, index) => (
                <View key={sale.id}>
                  <View style={[commonStyles.row, { paddingVertical: spacing.sm }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[commonStyles.text, { fontWeight: '600' }]}>
                        {sale.receiptNumber}
                      </Text>
                      <Text style={commonStyles.textLight}>
                        {new Date(sale.createdAt).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[commonStyles.text, { 
                        fontWeight: '700',
                        color: colors.success,
                      }]}>
                        {formatCurrency(sale.total)}
                      </Text>
                      <View style={{
                        backgroundColor: sale.paymentStatus === 'paid' 
                          ? `${colors.success}20` 
                          : `${colors.warning}20`,
                        paddingHorizontal: spacing.xs,
                        paddingVertical: 2,
                        borderRadius: 4,
                        marginTop: 2,
                      }}>
                        <Text style={{
                          fontSize: fontSizes.xs,
                          color: sale.paymentStatus === 'paid' 
                            ? colors.success 
                            : colors.warning,
                          fontWeight: '600',
                        }}>
                          {sale.paymentStatus === 'paid' ? 'Payé' : 'Crédit'}
                        </Text>
                      </View>
                    </View>
                  </View>
                  {index < stats.recentSales.length - 1 && (
                    <View style={commonStyles.divider} />
                  )}
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
