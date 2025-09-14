
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { commonStyles, colors, spacing, fontSizes, isSmallScreen } from '../../styles/commonStyles';
import { getSales, getProducts, getCustomers, getSettings } from '../../utils/storage';
import { useAuthState } from '../../hooks/useAuth';
import { useDashboardSync } from '../../hooks/useCustomersSync';
import { syncService } from '../../utils/syncService';
import Icon from '../../components/Icon';
import { Sale, Product, Customer, AppSettings } from '../../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface DashboardStats {
  todayRevenue: number;
  todaySales: number;
  weekRevenue: number;
  monthRevenue: number;
  totalCustomers: number;
  lowStockProducts: number;
  creditAmount: number;
  // CORRECTED: New fields for daily totals
  totalDailySales: number; // Total des ventes de la journée (Espèces + Crédits + toutes transactions)
  dailyJaiPris: number; // Total des "J'ai pris" de la journée
  dailyJaiDonne: number; // Total des "J'ai donné" de la journée
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
    totalDailySales: 0,
    dailyJaiPris: 0,
    dailyJaiDonne: 0,
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
  const { lastUpdate: dashboardLastUpdate } = useDashboardSync();

  // Get personalized greeting based on user role
  const getGreeting = useCallback(() => {
    if (!user) return 'Bonjour 👋';
    
    // If user has a role other than admin, show role-based greeting
    if (user.role && user.role !== 'admin') {
      const roleLabels = {
        manager: 'Manager',
        cashier: 'Caissier',
        inventory: 'Gestionnaire de stock'
      };
      return `Bonjour, ${roleLabels[user.role] || user.role} 👋`;
    }
    
    // For admin or users without specific roles, show username
    return `Bonjour, ${user.username} 👋`;
  }, [user]);

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

      // CORRECTED: Calculate daily totals according to requirements
      let totalDailySales = 0; // Total des ventes de la journée (Espèces + Crédits + toutes transactions)
      let dailyJaiPris = 0; // Total des "J'ai pris" de la journée
      let dailyJaiDonne = 0; // Total des "J'ai donné" de la journée

      console.log('Dashboard: Processing today\'s sales for daily totals:', {
        todaySalesCount: todaySales.length,
        todaySales: todaySales.map(s => ({
          id: s.id,
          receiptNumber: s.receiptNumber,
          total: s.total,
          notes: s.notes,
          itemsCount: s.items.length,
          createdAt: s.createdAt
        }))
      });

      todaySales.forEach(sale => {
        // Check if this is a manual transaction (J'ai pris/donné)
        if (sale.items.length === 0 && sale.notes) {
          if (sale.notes.includes("J'ai donné")) {
            dailyJaiDonne += sale.total;
            console.log('Dashboard: Found "J\'ai donné" transaction:', {
              saleId: sale.id,
              amount: sale.total,
              notes: sale.notes,
              newDailyJaiDonne: dailyJaiDonne
            });
          } else if (sale.notes.includes("J'ai pris")) {
            dailyJaiPris += sale.total;
            console.log('Dashboard: Found "J\'ai pris" transaction:', {
              saleId: sale.id,
              amount: sale.total,
              notes: sale.notes,
              newDailyJaiPris: dailyJaiPris
            });
          }
        } else {
          // Regular sales transactions - add to total daily sales regardless of payment status
          totalDailySales += sale.total;
          console.log('Dashboard: Found regular sale transaction:', {
            saleId: sale.id,
            amount: sale.total,
            itemsCount: sale.items.length,
            newTotalDailySales: totalDailySales
          });
        }
      });

      console.log('Dashboard: Final calculated daily totals:', {
        totalDailySales,
        dailyJaiPris,
        dailyJaiDonne,
        timestamp: new Date().toISOString()
      });

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
        totalDailySales,
        dailyJaiPris,
        dailyJaiDonne,
        topProducts,
        recentSales,
      });

      // Load sync status
      try {
        const status = await syncService.getSyncStatus();
        setSyncStatus({
          pendingCount: status.pendingItems,
          lastSyncTime: status.lastSync || undefined,
          isOnline: status.isOnline,
        });
      } catch (error) {
        console.error('Dashboard: Error loading sync status:', error);
        setSyncStatus({ pendingCount: 0, isOnline: false });
      }

      console.log('Dashboard: Data loaded successfully');
    } catch (error) {
      console.error('Dashboard: Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Use useFocusEffect to reload data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [loadDashboardData])
  );

  // CORRECTED: Listen for real-time dashboard updates
  useEffect(() => {
    console.log('Dashboard: Real-time update triggered, reloading data...');
    loadDashboardData();
  }, [dashboardLastUpdate, loadDashboardData]);

  // Initialize sync service properly - CORRECTED
  useEffect(() => {
    const initializeSync = async () => {
      try {
        console.log('Dashboard: Sync service initialization starting...');
        await syncService.initializeSyncService();
        console.log('Dashboard: Sync service initialized successfully');
      } catch (error) {
        console.error('Dashboard: Failed to initialize sync service:', error);
      }
    };

    initializeSync();
    
    return () => {
      console.log('Dashboard: Cleaning up sync service...');
      syncService.stopAutoSync().catch(error => {
        console.error('Dashboard: Error stopping sync service:', error);
      });
    };
  }, []);

  // CORRECTED: Daily reset functionality using AsyncStorage
  useEffect(() => {
    const checkDailyReset = async () => {
      try {
        const now = new Date();
        const lastResetDate = await AsyncStorage.getItem('lastDashboardReset');
        const today = now.toDateString();
        
        if (lastResetDate !== today) {
          console.log('Dashboard: Performing daily reset');
          await AsyncStorage.setItem('lastDashboardReset', today);
          // Reload data to reflect the new day
          loadDashboardData();
        }
      } catch (error) {
        console.error('Dashboard: Error checking daily reset:', error);
      }
    };

    // Check on mount
    checkDailyReset();

    // Set up interval to check every hour
    const resetInterval = setInterval(checkDailyReset, 60 * 60 * 1000);

    return () => clearInterval(resetInterval);
  }, [loadDashboardData]);

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
    try {
      console.log('Dashboard: Manual sync triggered');
      const result = await syncService.syncNow();
      if (result.success) {
        console.log('Dashboard: Sync completed successfully');
      } else {
        console.log('Dashboard: Sync failed:', result.message);
      }
      
      // Refresh sync status
      const status = await syncService.getSyncStatus();
      setSyncStatus({
        pendingCount: status.pendingItems,
        lastSyncTime: status.lastSync || undefined,
        isOnline: status.isOnline,
      });
    } catch (error) {
      console.error('Dashboard: Error during manual sync:', error);
    }
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
      {/* Clean header with prominent title and personalized greeting */}
      <View style={{
        backgroundColor: colors.background,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}>
        {/* Main Title */}
        <Text style={{
          fontSize: fontSizes.xxl,
          fontWeight: 'bold',
          color: colors.text,
          textAlign: 'center',
          marginBottom: spacing.sm,
        }}>
          Tableau de Bord
        </Text>
        
        {/* Personalized Greeting */}
        <Text style={{
          fontSize: fontSizes.md,
          color: colors.textLight,
          textAlign: 'center',
          marginBottom: spacing.md,
        }}>
          {getGreeting()}
        </Text>

        {/* Sync Status and Settings Row */}
        <View style={{ 
          flexDirection: 'row', 
          alignItems: 'center', 
          justifyContent: 'space-between',
        }}>
          {/* Sync Status */}
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              borderRadius: 20,
              backgroundColor: syncStatus.isOnline ? colors.success + '20' : colors.error + '20',
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
              fontSize: fontSizes.sm,
              color: syncStatus.isOnline ? colors.success : colors.error,
              marginLeft: spacing.xs,
              fontWeight: '600',
            }}>
              {syncStatus.pendingCount > 0 ? `${syncStatus.pendingCount}` : (syncStatus.isOnline ? 'En ligne' : 'Hors ligne')}
            </Text>
          </TouchableOpacity>
          
          {/* Settings Button */}
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

          {/* CORRECTED: Balance générale selon les nouvelles exigences */}
          <View style={[
            commonStyles.card, 
            { 
              marginBottom: spacing.xl,
              backgroundColor: colors.background,
              borderWidth: 3,
              borderColor: colors.success,
              padding: spacing.lg,
            }
          ]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
              <View style={{
                backgroundColor: colors.error + '20',
                borderRadius: 20,
                padding: spacing.sm,
                marginRight: spacing.sm,
              }}>
                <Icon 
                  name="wallet" 
                  size={24} 
                  color={colors.error} 
                />
              </View>
              <Text style={[commonStyles.subtitle, { marginLeft: spacing.sm, marginBottom: 0, color: colors.text }]}>
                Balance générale
              </Text>
            </View>
            
            {/* CORRECTED: Montant principal - Total des ventes de la journée */}
            <Text style={[
              commonStyles.title, 
              { 
                fontSize: fontSizes.xxl * 1.2,
                color: colors.error,
                marginBottom: spacing.sm,
                fontWeight: 'bold',
                textAlign: 'center',
              }
            ]}>
              {formatCurrency(stats.totalDailySales)}
            </Text>
            
            <Text style={[commonStyles.textLight, { fontSize: fontSizes.md, textAlign: 'center', marginBottom: spacing.lg }]}>
              Totalité des ventes de la journée
            </Text>
            
            {/* CORRECTED: Détails journaliers avec couleurs correctes */}
            <View style={{ 
              flexDirection: 'row', 
              justifyContent: 'space-around',
              paddingTop: spacing.md,
              borderTopWidth: 1,
              borderTopColor: colors.border,
            }}>
              {/* Zone encerclée en vert - J'ai pris */}
              <View style={{ 
                alignItems: 'center', 
                flex: 1,
                backgroundColor: colors.success + '10',
                borderRadius: 15,
                padding: spacing.md,
                marginRight: spacing.sm,
                borderWidth: 2,
                borderColor: colors.success,
              }}>
                <Text style={[commonStyles.textLight, { fontSize: fontSizes.xs, marginBottom: spacing.xs }]}>
                  J'ai pris aujourd'hui
                </Text>
                <Text style={[commonStyles.text, { 
                  fontSize: fontSizes.lg, 
                  fontWeight: 'bold',
                  color: colors.success 
                }]}>
                  {formatCurrency(stats.dailyJaiPris)}
                </Text>
              </View>
              
              {/* Zone encerclée en rouge - J'ai donné */}
              <View style={{ 
                alignItems: 'center', 
                flex: 1,
                backgroundColor: colors.error + '10',
                borderRadius: 15,
                padding: spacing.md,
                marginLeft: spacing.sm,
                borderWidth: 2,
                borderColor: colors.error,
              }}>
                <Text style={[commonStyles.textLight, { fontSize: fontSizes.xs, marginBottom: spacing.xs }]}>
                  J'ai donné aujourd'hui
                </Text>
                <Text style={[commonStyles.text, { 
                  fontSize: fontSizes.lg, 
                  fontWeight: 'bold',
                  color: colors.error 
                }]}>
                  {formatCurrency(stats.dailyJaiDonne)}
                </Text>
              </View>
            </View>
            
            <Text style={[commonStyles.textLight, { fontSize: fontSizes.xs, marginTop: spacing.md, textAlign: 'center' }]}>
              Se réinitialise automatiquement chaque jour à zéro
            </Text>
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
              color={stats.lowStockProducts > 0 ? colors.error : colors.success}
            />
            <StatCard
              title="Crédit total"
              value={formatCurrency(stats.creditAmount)}
              icon="card"
              color={colors.warning}
            />
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
