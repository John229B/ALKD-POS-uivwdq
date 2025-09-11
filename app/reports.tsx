
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { commonStyles, colors, buttonStyles, spacing, fontSizes, isSmallScreen } from '../styles/commonStyles';
import Icon from '../components/Icon';
import { getSales, getProducts, getCustomers, getSettings } from '../utils/storage';
import { Sale, Product, Customer, AppSettings } from '../types';

interface ReportData {
  totalRevenue: number;
  totalSales: number;
  averageOrderValue: number;
  topProducts: Array<{ product: Product; quantity: number; revenue: number }>;
  paymentMethods: Array<{ method: string; count: number; amount: number }>;
  dailyRevenue: Array<{ date: string; revenue: number; sales: number }>;
  customerStats: {
    totalCustomers: number;
    newCustomers: number;
    creditAmount: number;
  };
}

export default function ReportsScreen() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month' | 'year'>('today');
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Memoize the loadData function to prevent unnecessary re-renders
  const loadData = useCallback(async () => {
    console.log('Loading reports data...');
    try {
      setIsLoading(true);
      const [salesData, productsData, customersData, settingsData] = await Promise.all([
        getSales(),
        getProducts(),
        getCustomers(),
        getSettings(),
      ]);

      setSales(salesData || []);
      setProducts(productsData || []);
      setCustomers(customersData || []);
      setSettings(settingsData);
      
      console.log('Reports data loaded:', {
        sales: salesData?.length || 0,
        products: productsData?.length || 0,
        customers: customersData?.length || 0,
      });
    } catch (error) {
      console.error('Error loading reports data:', error);
      // Set empty arrays on error to prevent undefined issues
      setSales([]);
      setProducts([]);
      setCustomers([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load data only once on mount
  useEffect(() => {
    loadData();
  }, []); // Empty dependency array - only run once

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  // Memoize date range calculation
  const dateRange = useMemo(() => {
    const now = new Date();
    let startDate: Date;

    switch (selectedPeriod) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }

    return { startDate, endDate: now };
  }, [selectedPeriod]);

  // Memoize report data calculation with proper dependencies
  const reportData = useMemo((): ReportData | null => {
    console.log('Calculating report data for period:', selectedPeriod);
    
    // Return null if still loading or no data
    if (isLoading) {
      console.log('Still loading data...');
      return null;
    }

    if (!sales || !products) {
      console.log('Missing required data - sales:', !!sales, 'products:', !!products);
      return null;
    }

    const { startDate, endDate } = dateRange;
    
    // Filter sales by period
    const filteredSales = sales.filter(sale => {
      if (!sale.date) return false;
      const saleDate = new Date(sale.date);
      return saleDate >= startDate && saleDate <= endDate;
    });

    console.log('Filtered sales:', filteredSales.length);

    // Calculate total revenue
    const totalRevenue = filteredSales.reduce((sum, sale) => sum + (sale.total || 0), 0);
    const totalSales = filteredSales.length;
    const averageOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0;

    // Calculate top products
    const productSales: { [key: string]: { quantity: number; revenue: number } } = {};
    
    filteredSales.forEach(sale => {
      if (sale.items && Array.isArray(sale.items)) {
        sale.items.forEach(item => {
          if (!productSales[item.productId]) {
            productSales[item.productId] = { quantity: 0, revenue: 0 };
          }
          productSales[item.productId].quantity += item.quantity || 0;
          productSales[item.productId].revenue += (item.quantity || 0) * (item.price || 0);
        });
      }
    });

    const topProducts = Object.entries(productSales)
      .map(([productId, stats]) => {
        const product = products.find(p => p.id === productId);
        return product ? { product, ...stats } : null;
      })
      .filter(Boolean)
      .sort((a, b) => b!.revenue - a!.revenue)
      .slice(0, 5) as Array<{ product: Product; quantity: number; revenue: number }>;

    // Calculate payment methods
    const paymentMethodStats: { [key: string]: { count: number; amount: number } } = {};
    
    filteredSales.forEach(sale => {
      const method = sale.paymentMethod || 'cash';
      if (!paymentMethodStats[method]) {
        paymentMethodStats[method] = { count: 0, amount: 0 };
      }
      paymentMethodStats[method].count++;
      paymentMethodStats[method].amount += sale.total || 0;
    });

    const paymentMethods = Object.entries(paymentMethodStats).map(([method, stats]) => ({
      method,
      ...stats,
    }));

    // Calculate daily revenue (last 7 days)
    const dailyRevenue: Array<{ date: string; revenue: number; sales: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const daySales = sales.filter(sale => sale.date && sale.date.startsWith(dateStr));
      const dayRevenue = daySales.reduce((sum, sale) => sum + (sale.total || 0), 0);
      
      dailyRevenue.push({
        date: dateStr,
        revenue: dayRevenue,
        sales: daySales.length,
      });
    }

    // Customer statistics
    const safeCustomers = customers || [];
    const newCustomersThisPeriod = safeCustomers.filter(customer => {
      if (!customer.createdAt) return false;
      const customerDate = new Date(customer.createdAt);
      return customerDate >= startDate && customerDate <= endDate;
    });

    const creditAmount = safeCustomers.reduce((sum, customer) => sum + (customer.creditBalance || 0), 0);

    const customerStats = {
      totalCustomers: safeCustomers.length,
      newCustomers: newCustomersThisPeriod.length,
      creditAmount,
    };

    const data: ReportData = {
      totalRevenue,
      totalSales,
      averageOrderValue,
      topProducts,
      paymentMethods,
      dailyRevenue,
      customerStats,
    };

    console.log('Report data calculated:', data);
    return data;
  }, [sales, products, customers, dateRange, isLoading]); // Fixed dependencies

  // Memoize currency formatting function
  const formatCurrency = useCallback((amount: number | undefined | null): string => {
    if (amount === undefined || amount === null || isNaN(amount)) {
      amount = 0;
    }
    const currency = settings?.currency || 'XOF';
    const currencySymbols = { XOF: 'FCFA', USD: '$', EUR: '€' };
    return `${amount.toLocaleString()} ${currencySymbols[currency]}`;
  }, [settings?.currency]);

  // Memoize label functions
  const getPaymentMethodLabel = useCallback((method: string): string => {
    const labels = {
      cash: 'Espèces',
      mobile: 'Mobile Money',
      credit: 'À crédit',
    };
    return labels[method as keyof typeof labels] || method;
  }, []);

  const getPeriodLabel = useCallback((period: string): string => {
    const labels = {
      today: 'Aujourd\'hui',
      week: 'Cette semaine',
      month: 'Ce mois',
      year: 'Cette année',
    };
    return labels[period as keyof typeof labels] || period;
  }, []);

  // Show loading state
  if (isLoading || !reportData) {
    return (
      <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Icon name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Rapports</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Chargement des données...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Icon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Rapports</Text>
          <Text style={styles.headerSubtitle}>Analyses et statistiques</Text>
        </View>
      </View>

      {/* Period Selector */}
      <View style={styles.periodSelector}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {(['today', 'week', 'month', 'year'] as const).map((period) => (
            <TouchableOpacity
              key={period}
              style={[
                styles.periodButton,
                selectedPeriod === period && styles.periodButtonActive,
              ]}
              onPress={() => setSelectedPeriod(period)}
            >
              <Text
                style={[
                  styles.periodButtonText,
                  selectedPeriod === period && styles.periodButtonTextActive,
                ]}
              >
                {getPeriodLabel(period)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Key Metrics */}
        <View style={styles.metricsContainer}>
          <View style={styles.metricCard}>
            <Icon name="trending-up" size={24} color={colors.success} />
            <Text style={styles.metricValue}>{formatCurrency(reportData.totalRevenue)}</Text>
            <Text style={styles.metricLabel}>Revenus</Text>
          </View>
          <View style={styles.metricCard}>
            <Icon name="receipt" size={24} color={colors.primary} />
            <Text style={styles.metricValue}>{reportData.totalSales}</Text>
            <Text style={styles.metricLabel}>Ventes</Text>
          </View>
          <View style={styles.metricCard}>
            <Icon name="calculator" size={24} color={colors.info} />
            <Text style={styles.metricValue}>{formatCurrency(reportData.averageOrderValue)}</Text>
            <Text style={styles.metricLabel}>Panier moyen</Text>
          </View>
        </View>

        {/* Top Products */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Produits les plus vendus</Text>
          {reportData.topProducts.length > 0 ? (
            reportData.topProducts.map((item, index) => (
              <View key={item.product.id} style={styles.productItem}>
                <View style={styles.productRank}>
                  <Text style={styles.rankNumber}>{index + 1}</Text>
                </View>
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{item.product.name}</Text>
                  <Text style={styles.productStats}>
                    {item.quantity} vendus • {formatCurrency(item.revenue)}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.noDataText}>Aucune donnée disponible</Text>
          )}
        </View>

        {/* Payment Methods */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Méthodes de paiement</Text>
          {reportData.paymentMethods.length > 0 ? (
            reportData.paymentMethods.map((method) => (
              <View key={method.method} style={styles.paymentItem}>
                <Text style={styles.paymentMethod}>{getPaymentMethodLabel(method.method)}</Text>
                <View style={styles.paymentStats}>
                  <Text style={styles.paymentCount}>{method.count} transactions</Text>
                  <Text style={styles.paymentAmount}>{formatCurrency(method.amount)}</Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.noDataText}>Aucune donnée disponible</Text>
          )}
        </View>

        {/* Customer Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Statistiques clients</Text>
          <View style={styles.customerStatsContainer}>
            <View style={styles.customerStat}>
              <Icon name="people" size={20} color={colors.primary} />
              <Text style={styles.customerStatValue}>{reportData.customerStats.totalCustomers}</Text>
              <Text style={styles.customerStatLabel}>Total clients</Text>
            </View>
            <View style={styles.customerStat}>
              <Icon name="person-add" size={20} color={colors.success} />
              <Text style={styles.customerStatValue}>{reportData.customerStats.newCustomers}</Text>
              <Text style={styles.customerStatLabel}>Nouveaux</Text>
            </View>
            <View style={styles.customerStat}>
              <Icon name="card" size={20} color={colors.warning} />
              <Text style={styles.customerStatValue}>{formatCurrency(reportData.customerStats.creditAmount)}</Text>
              <Text style={styles.customerStatLabel}>Crédit total</Text>
            </View>
          </View>
        </View>

        {/* Daily Revenue Chart */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Revenus des 7 derniers jours</Text>
          <View style={styles.chartContainer}>
            {reportData.dailyRevenue.map((day, index) => {
              const maxRevenue = Math.max(...reportData.dailyRevenue.map(d => d.revenue));
              const height = maxRevenue > 0 ? (day.revenue / maxRevenue) * 100 : 0;
              
              return (
                <View key={day.date} style={styles.chartBar}>
                  <View style={styles.barContainer}>
                    <View
                      style={[
                        styles.bar,
                        {
                          height: `${height}%`,
                          backgroundColor: colors.primary,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.barLabel}>
                    {new Date(day.date).toLocaleDateString('fr-FR', { weekday: 'short' })}
                  </Text>
                  <Text style={styles.barValue}>{formatCurrency(day.revenue)}</Text>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = {
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.sm,
    marginRight: spacing.sm,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: fontSizes.xl,
    fontWeight: '700' as const,
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: fontSizes.sm,
    color: colors.textLight,
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  loadingText: {
    fontSize: fontSizes.md,
    color: colors.textLight,
  },
  periodSelector: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  periodButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  periodButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  periodButtonText: {
    fontSize: fontSizes.sm,
    color: colors.text,
    fontWeight: '500' as const,
  },
  periodButtonTextActive: {
    color: colors.surface,
    fontWeight: '600' as const,
  },
  scrollView: {
    flex: 1,
  },
  metricsContainer: {
    flexDirection: 'row' as const,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.md,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metricValue: {
    fontSize: isSmallScreen ? fontSizes.md : fontSizes.lg,
    fontWeight: '700' as const,
    color: colors.text,
    marginTop: spacing.xs,
    textAlign: 'center' as const,
  },
  metricLabel: {
    fontSize: fontSizes.xs,
    color: colors.textLight,
    marginTop: spacing.xs,
    textAlign: 'center' as const,
  },
  section: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSizes.lg,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: spacing.md,
  },
  productItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  productRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginRight: spacing.md,
  },
  rankNumber: {
    fontSize: fontSizes.sm,
    fontWeight: '700' as const,
    color: colors.surface,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: fontSizes.md,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  productStats: {
    fontSize: fontSizes.sm,
    color: colors.textLight,
  },
  paymentItem: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  paymentMethod: {
    fontSize: fontSizes.md,
    fontWeight: '600' as const,
    color: colors.text,
  },
  paymentStats: {
    alignItems: 'flex-end' as const,
  },
  paymentCount: {
    fontSize: fontSizes.sm,
    color: colors.textLight,
  },
  paymentAmount: {
    fontSize: fontSizes.md,
    fontWeight: '600' as const,
    color: colors.text,
  },
  customerStatsContainer: {
    flexDirection: 'row' as const,
    gap: spacing.sm,
  },
  customerStat: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderColor: colors.border,
  },
  customerStatValue: {
    fontSize: fontSizes.md,
    fontWeight: '700' as const,
    color: colors.text,
    marginTop: spacing.xs,
  },
  customerStatLabel: {
    fontSize: fontSizes.xs,
    color: colors.textLight,
    marginTop: spacing.xs,
    textAlign: 'center' as const,
  },
  chartContainer: {
    flexDirection: 'row' as const,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  chartBar: {
    flex: 1,
    alignItems: 'center' as const,
  },
  barContainer: {
    height: 100,
    width: '100%',
    justifyContent: 'flex-end' as const,
    alignItems: 'center' as const,
    marginBottom: spacing.xs,
  },
  bar: {
    width: '80%',
    borderRadius: 4,
    minHeight: 2,
  },
  barLabel: {
    fontSize: fontSizes.xs,
    color: colors.textLight,
    marginBottom: spacing.xs,
  },
  barValue: {
    fontSize: fontSizes.xs,
    color: colors.text,
    fontWeight: '600' as const,
    textAlign: 'center' as const,
  },
  noDataText: {
    fontSize: fontSizes.md,
    color: colors.textLight,
    textAlign: 'center' as const,
    fontStyle: 'italic' as const,
    paddingVertical: spacing.lg,
  },
};
