
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

      // FIXED: Calculate general balance correctly
      let totalCustomerDebts = 0; // Total amount customers owe (positive balances)
      let totalCustomerCredits = 0; // Total amount we owe customers (negative balances)
      let totalOutstandingCredit = 0; // Total credit given to customers

      customers.forEach(customer => {
        const customerSales = sales.filter(sale => sale.customerId === customer.id);
        let customerBalance = 0;
        
        customerSales.forEach(sale => {
          // Check if this is a manual transaction (J'ai pris/donné)
          if (sale.items.length === 0 && sale.notes) {
            if (sale.notes.includes("J'ai donné")) {
              customerBalance += sale.total; // "J'ai donné" increases debt (positive balance)
            } else if (sale.notes.includes("J'ai pris")) {
              customerBalance -= sale.total; // "J'ai pris" reduces debt (negative balance)
            }
          } else {
            // Regular sales transactions
            if (sale.paymentStatus === 'credit') {
              customerBalance += sale.total; // Full amount is debt
            } else if (sale.paymentStatus === 'partial') {
              const unpaidAmount = sale.total - (sale.amountPaid || 0);
              customerBalance += unpaidAmount; // Only unpaid portion is debt
            } else if (sale.paymentStatus === 'paid') {
              // Check for overpayment
              const overpayment = (sale.amountPaid || sale.total) - sale.total;
              if (overpayment > 0) {
                customerBalance -= overpayment; // Overpayment creates credit for customer
              }
            }
          }
        });
        
        if (customerBalance > 0) {
          totalCustomerDebts += customerBalance;
          totalOutstandingCredit += customerBalance;
        } else if (customerBalance < 0) {
          totalCustomerCredits += Math.abs(customerBalance);
        }
      });

      // General balance = total debt - total credit
      // If positive: customers owe us money (we gave more than we received)
      // If negative: we owe customers money (we received more than we gave)
      // If zero: all accounts are balanced
      const generalBalance = totalCustomerDebts - totalCustomerCredits;

      console.log('Dashboard balance calculation:', {
        totalCustomerDebts,
        totalCustomerCredits,
        generalBalance,
        customersCount: customers.length,
        salesCount: sales.length
      });

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
        creditAmount: totalOutstandingCredit,
        generalBalance,
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
      XOF: 'F CFA',
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
      icon: 'cart' as keyof typeof import('@expo/vector-icons').Ionicons.glyphMap,
      color: '#FFD700',
      route: '/pos',
    },
    {
      id: 'add-product',
      title: 'Ajouter Produit',
      icon: 'cube' as keyof typeof import('@expo/vector-icons').Ionicons.glyphMap,
      color: '#4A90E2',
      route: '/products',
    },
    {
      id: 'customers',
      title: 'Clients',
      icon: 'people' as keyof typeof import('@expo/vector-icons').Ionicons.glyphMap,
      color: '#FF8C00',
      route: '/customers',
    },
    {
      id: 'reports',
      title: 'Rapports',
      icon: 'stats-chart' as keyof typeof import('@expo/vector-icons').Ionicons.glyphMap,
      color: '#32CD32',
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
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: `${action.color}30`,
        shadowColor: action.color,
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      }]}
      onPress={() => router.push(action.route as any)}
    >
      <View style={{
        backgroundColor: `${action.color}15`,
        padding: spacing.lg,
        borderRadius: 50,
        marginBottom: spacing.md,
        borderWidth: 2,
        borderColor: `${action.color}30`,
      }}>
        <Icon name={action.icon} size={32} color={action.color} />
      </View>
      <Text style={[commonStyles.text, { 
        textAlign: 'center',
        fontSize: fontSizes.sm,
        fontWeight: '600',
        color: colors.text,
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

        {/* General Balance Section - FIXED */}
        <View style={[commonStyles.section, { backgroundColor: colors.background, marginBottom: spacing.md }]}>
          <Text style={[commonStyles.subtitle, { 
            fontSize: fontSizes.lg,
            marginBottom: spacing.md,
          }]}>
            Balance Générale
          </Text>
          
          <View style={[commonStyles.card, { backgroundColor: colors.backgroundAlt, padding: spacing.lg }]}>
            <View style={{ alignItems: 'center', marginBottom: spacing.md }}>
              <Text style={[commonStyles.text, { 
                color: stats.generalBalance > 0 ? colors.danger : stats.generalBalance < 0 ? colors.success : colors.text, 
                fontSize: fontSizes.xl,
                fontWeight: 'bold',
                marginBottom: spacing.xs
              }]}>
                {stats.generalBalance === 0 ? formatCurrency(0) : formatCurrency(Math.abs(stats.generalBalance))}
              </Text>
              <Text style={[commonStyles.textLight, { fontSize: fontSizes.sm }]}>
                {stats.generalBalance > 0 ? `J'ai donné - Montant total des dettes` : 
                 stats.generalBalance < 0 ? `J'ai pris - Montant total des avances` : 
                 'Équilibré - Tous les comptes sont à zéro'}
              </Text>
            </View>
            
            {stats.creditAmount > 0 && (
              <View style={{ alignItems: 'center' }}>
                <Text style={[commonStyles.textLight, { fontSize: fontSizes.xs }]}>
                  {stats.totalCustomers} client(s) • {formatCurrency(stats.creditAmount)} en crédit
                </Text>
              </View>
            )}
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
                subtitle="Montant total des dettes clients"
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
                          {sale.paymentStatus === 'paid' ? 'Payé' : 
                           sale.paymentStatus === 'partial' ? 'Partiel' : 'Crédit'}
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
