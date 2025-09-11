
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Modal, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { commonStyles, colors, buttonStyles, spacing, fontSizes } from '../styles/commonStyles';
import Icon from '../components/Icon';
import { getSales, getProducts, getCustomers, getSettings } from '../utils/storage';
import { Sale, Product, Customer, AppSettings } from '../types';

const { width: screenWidth } = Dimensions.get('window');
const chartWidth = screenWidth - (spacing.lg * 2);

interface KPIData {
  todayRevenue: number;
  weekRevenue: number;
  monthRevenue: number;
  totalSales: number;
  topProducts: Array<{ name: string; quantity: number; revenue: number }>;
  creditAmount: number;
  netProfit: number;
}

interface ChartData {
  dailySales: Array<{ date: string; amount: number }>;
  categorySales: Array<{ name: string; population: number; color: string; legendFontColor: string; legendFontSize: number }>;
  salesTrend: Array<{ date: string; amount: number }>;
  paymentMethods: Array<{ method: string; amount: number; color: string }>;
}

type FilterPeriod = 'day' | 'week' | 'month' | 'custom';

export default function ReportsScreen() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>('month');
  const [showExportModal, setShowExportModal] = useState(false);

  const loadData = useCallback(async () => {
    try {
      console.log('Loading reports data...');
      setLoading(true);
      
      const [salesData, productsData, customersData, settingsData] = await Promise.all([
        getSales(),
        getProducts(),
        getCustomers(),
        getSettings()
      ]);

      setSales(salesData || []);
      setProducts(productsData || []);
      setCustomers(customersData || []);
      setSettings(settingsData);
      
      console.log('Reports data loaded successfully');
    } catch (error) {
      console.error('Error loading reports data:', error);
      Alert.alert('Erreur', 'Impossible de charger les données des rapports');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredSales = useMemo(() => {
    if (!sales.length) return [];
    
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return sales.filter(sale => {
      const saleDate = new Date(sale.createdAt);
      switch (filterPeriod) {
        case 'day':
          return saleDate >= startOfDay;
        case 'week':
          return saleDate >= startOfWeek;
        case 'month':
          return saleDate >= startOfMonth;
        default:
          return true;
      }
    });
  }, [sales, filterPeriod]);

  const kpiData = useMemo((): KPIData => {
    if (!filteredSales.length) {
      return {
        todayRevenue: 0,
        weekRevenue: 0,
        monthRevenue: 0,
        totalSales: 0,
        topProducts: [],
        creditAmount: 0,
        netProfit: 0
      };
    }

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const todayRevenue = sales
      .filter(sale => new Date(sale.createdAt) >= startOfDay)
      .reduce((sum, sale) => sum + sale.total, 0);

    const weekRevenue = sales
      .filter(sale => new Date(sale.createdAt) >= startOfWeek)
      .reduce((sum, sale) => sum + sale.total, 0);

    const monthRevenue = sales
      .filter(sale => new Date(sale.createdAt) >= startOfMonth)
      .reduce((sum, sale) => sum + sale.total, 0);

    const totalSales = filteredSales.length;

    // Calculate top products
    const productSales = new Map<string, { quantity: number; revenue: number; name: string }>();
    
    filteredSales.forEach(sale => {
      sale.items.forEach(item => {
        const productId = item.productId;
        const product = products.find(p => p.id === productId);
        const productName = product?.name || 'Produit inconnu';
        
        if (productSales.has(productId)) {
          const existing = productSales.get(productId)!;
          existing.quantity += item.quantity;
          existing.revenue += item.subtotal;
        } else {
          productSales.set(productId, {
            quantity: item.quantity,
            revenue: item.subtotal,
            name: productName
          });
        }
      });
    });

    const topProducts = Array.from(productSales.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 3)
      .map(item => ({
        name: item.name,
        quantity: item.quantity,
        revenue: item.revenue
      }));

    // Calculate credit amount
    const creditAmount = customers.reduce((sum, customer) => sum + (customer.creditBalance || 0), 0);

    // Calculate net profit (simplified: revenue - cost)
    const totalCost = filteredSales.reduce((sum, sale) => {
      return sum + sale.items.reduce((itemSum, item) => {
        const product = products.find(p => p.id === item.productId);
        return itemSum + (product?.cost || 0) * item.quantity;
      }, 0);
    }, 0);

    const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
    const netProfit = totalRevenue - totalCost;

    return {
      todayRevenue,
      weekRevenue,
      monthRevenue,
      totalSales,
      topProducts,
      creditAmount,
      netProfit
    };
  }, [filteredSales, products, customers, sales]);

  const chartData = useMemo((): ChartData => {
    if (!filteredSales.length) {
      return {
        dailySales: [],
        categorySales: [],
        salesTrend: [],
        paymentMethods: []
      };
    }

    // Daily sales for bar chart
    const dailySalesMap = new Map<string, number>();
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();

    last7Days.forEach(date => dailySalesMap.set(date, 0));

    filteredSales.forEach(sale => {
      const saleDate = new Date(sale.createdAt).toISOString().split('T')[0];
      if (dailySalesMap.has(saleDate)) {
        dailySalesMap.set(saleDate, dailySalesMap.get(saleDate)! + sale.total);
      }
    });

    const dailySales = Array.from(dailySalesMap.entries()).map(([date, amount]) => ({
      date: new Date(date).toLocaleDateString('fr-FR', { weekday: 'short' }),
      amount
    }));

    // Category sales for pie chart
    const categorySalesMap = new Map<string, number>();
    const categoryColors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'];
    
    filteredSales.forEach(sale => {
      sale.items.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        const categoryId = product?.categoryId || 'unknown';
        categorySalesMap.set(categoryId, (categorySalesMap.get(categoryId) || 0) + item.subtotal);
      });
    });

    const categorySales = Array.from(categorySalesMap.entries()).map(([categoryId, amount], index) => {
      const categoryName = categoryId === 'unknown' ? 'Non catégorisé' : `Catégorie ${index + 1}`;
      return {
        name: categoryName,
        population: amount,
        color: categoryColors[index % categoryColors.length],
        legendFontColor: colors.text,
        legendFontSize: 12
      };
    });

    // Sales trend (same as daily sales for now)
    const salesTrend = dailySales.map(item => ({
      date: item.date,
      amount: item.amount
    }));

    // Payment methods
    const paymentMethodsMap = new Map<string, number>();
    filteredSales.forEach(sale => {
      const method = sale.paymentMethod;
      paymentMethodsMap.set(method, (paymentMethodsMap.get(method) || 0) + sale.total);
    });

    const paymentMethods = Array.from(paymentMethodsMap.entries()).map(([method, amount], index) => {
      const methodName = method === 'cash' ? 'Espèces' : 
                        method === 'mobile_money' ? 'Mobile Money' : 'Crédit';
      return {
        method: methodName,
        amount,
        color: categoryColors[index % categoryColors.length]
      };
    });

    return {
      dailySales,
      categorySales,
      salesTrend,
      paymentMethods
    };
  }, [filteredSales, products]);

  const formatCurrency = useCallback((amount: number): string => {
    const currency = settings?.currency || 'XOF';
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency === 'XOF' ? 'XOF' : currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }, [settings]);

  const handleExport = useCallback((type: 'pdf' | 'csv') => {
    console.log(`Exporting reports as ${type}`);
    Alert.alert(
      'Export',
      `Fonctionnalité d'export ${type.toUpperCase()} en cours de développement`,
      [{ text: 'OK' }]
    );
    setShowExportModal(false);
  }, []);

  const renderKPICard = useCallback((title: string, value: string, icon: string, color: string, subtitle?: string) => (
    <View style={[styles.kpiCard, { borderLeftColor: color }]}>
      <View style={styles.kpiHeader}>
        <View style={[styles.kpiIcon, { backgroundColor: color + '20' }]}>
          <Icon name={icon} size={24} color={color} />
        </View>
        <Text style={styles.kpiTitle}>{title}</Text>
      </View>
      <Text style={styles.kpiValue}>{value}</Text>
      {subtitle && <Text style={styles.kpiSubtitle}>{subtitle}</Text>}
    </View>
  ), []);

  if (loading) {
    return (
      <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Chargement des rapports...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Rapports</Text>
          <Text style={styles.headerSubtitle}>Analyses et statistiques</Text>
        </View>
        <TouchableOpacity onPress={() => setShowExportModal(true)} style={styles.exportButton}>
          <Icon name="download" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Filter Period */}
        <View style={styles.filterContainer}>
          <Text style={styles.filterTitle}>Période</Text>
          <View style={styles.filterButtons}>
            {(['day', 'week', 'month'] as FilterPeriod[]).map((period) => (
              <TouchableOpacity
                key={period}
                style={[
                  styles.filterButton,
                  filterPeriod === period && styles.filterButtonActive
                ]}
                onPress={() => setFilterPeriod(period)}
              >
                <Text style={[
                  styles.filterButtonText,
                  filterPeriod === period && styles.filterButtonTextActive
                ]}>
                  {period === 'day' ? 'Jour' : period === 'week' ? 'Semaine' : 'Mois'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* KPI Cards */}
        <View style={styles.kpiContainer}>
          <Text style={styles.sectionTitle}>Indicateurs clés</Text>
          <View style={styles.kpiGrid}>
            {renderKPICard(
              'CA Aujourd\'hui',
              formatCurrency(kpiData.todayRevenue),
              'trending-up',
              colors.success
            )}
            {renderKPICard(
              'CA Cette semaine',
              formatCurrency(kpiData.weekRevenue),
              'calendar',
              colors.info
            )}
            {renderKPICard(
              'CA Ce mois',
              formatCurrency(kpiData.monthRevenue),
              'stats-chart',
              colors.primary
            )}
            {renderKPICard(
              'Nombre de ventes',
              kpiData.totalSales.toString(),
              'receipt',
              colors.warning,
              `${filterPeriod === 'day' ? 'Aujourd\'hui' : filterPeriod === 'week' ? 'Cette semaine' : 'Ce mois'}`
            )}
            {renderKPICard(
              'Crédits en cours',
              formatCurrency(kpiData.creditAmount),
              'card',
              colors.error
            )}
            {renderKPICard(
              'Bénéfice net',
              formatCurrency(kpiData.netProfit),
              'cash',
              colors.success
            )}
          </View>
        </View>

        {/* Top Products */}
        {kpiData.topProducts.length > 0 && (
          <View style={styles.topProductsContainer}>
            <Text style={styles.sectionTitle}>Top 3 Produits</Text>
            {kpiData.topProducts.map((product, index) => (
              <View key={index} style={styles.topProductItem}>
                <View style={styles.topProductRank}>
                  <Text style={styles.topProductRankText}>{index + 1}</Text>
                </View>
                <View style={styles.topProductInfo}>
                  <Text style={styles.topProductName}>{product.name}</Text>
                  <Text style={styles.topProductStats}>
                    {product.quantity} vendus • {formatCurrency(product.revenue)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Charts */}
        {chartData.dailySales.length > 0 && (
          <View style={styles.chartContainer}>
            <Text style={styles.sectionTitle}>Ventes par jour (7 derniers jours)</Text>
            <BarChart
              data={{
                labels: chartData.dailySales.map(item => item.date),
                datasets: [{
                  data: chartData.dailySales.map(item => item.amount)
                }]
              }}
              width={chartWidth}
              height={220}
              yAxisLabel=""
              yAxisSuffix=""
              chartConfig={{
                backgroundColor: colors.surface,
                backgroundGradientFrom: colors.surface,
                backgroundGradientTo: colors.surface,
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(255, 193, 7, ${opacity})`,
                labelColor: (opacity = 1) => colors.text,
                style: {
                  borderRadius: 16,
                },
                propsForLabels: {
                  fontSize: 12,
                },
              }}
              style={styles.chart}
            />
          </View>
        )}

        {chartData.categorySales.length > 0 && (
          <View style={styles.chartContainer}>
            <Text style={styles.sectionTitle}>Répartition par catégories</Text>
            <PieChart
              data={chartData.categorySales}
              width={chartWidth}
              height={220}
              chartConfig={{
                color: (opacity = 1) => colors.text,
              }}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
              style={styles.chart}
            />
          </View>
        )}

        {chartData.salesTrend.length > 0 && (
          <View style={styles.chartContainer}>
            <Text style={styles.sectionTitle}>Évolution des ventes</Text>
            <LineChart
              data={{
                labels: chartData.salesTrend.map(item => item.date),
                datasets: [{
                  data: chartData.salesTrend.map(item => item.amount)
                }]
              }}
              width={chartWidth}
              height={220}
              yAxisLabel=""
              yAxisSuffix=""
              chartConfig={{
                backgroundColor: colors.surface,
                backgroundGradientFrom: colors.surface,
                backgroundGradientTo: colors.surface,
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(54, 162, 235, ${opacity})`,
                labelColor: (opacity = 1) => colors.text,
                style: {
                  borderRadius: 16,
                },
                propsForLabels: {
                  fontSize: 12,
                },
              }}
              bezier
              style={styles.chart}
            />
          </View>
        )}

        {/* Payment Methods */}
        {chartData.paymentMethods.length > 0 && (
          <View style={styles.paymentMethodsContainer}>
            <Text style={styles.sectionTitle}>Méthodes de paiement</Text>
            {chartData.paymentMethods.map((method, index) => (
              <View key={index} style={styles.paymentMethodItem}>
                <View style={[styles.paymentMethodColor, { backgroundColor: method.color }]} />
                <Text style={styles.paymentMethodName}>{method.method}</Text>
                <Text style={styles.paymentMethodAmount}>{formatCurrency(method.amount)}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Export Modal */}
      <Modal
        visible={showExportModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowExportModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.exportModal}>
            <Text style={styles.exportModalTitle}>Exporter les rapports</Text>
            <TouchableOpacity
              style={styles.exportOption}
              onPress={() => handleExport('pdf')}
            >
              <Icon name="document-text" size={24} color={colors.error} />
              <Text style={styles.exportOptionText}>Exporter en PDF</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.exportOption}
              onPress={() => handleExport('csv')}
            >
              <Icon name="grid" size={24} color={colors.success} />
              <Text style={styles.exportOptionText}>Exporter en CSV</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.exportCancel}
              onPress={() => setShowExportModal(false)}
            >
              <Text style={styles.exportCancelText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = {
  loadingContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  loadingText: {
    fontSize: fontSizes.lg,
    color: colors.textLight,
  },
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
    marginRight: spacing.md,
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
  },
  exportButton: {
    padding: spacing.sm,
  },
  scrollView: {
    flex: 1,
  },
  filterContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterTitle: {
    fontSize: fontSizes.md,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  filterButtons: {
    flexDirection: 'row' as const,
    gap: spacing.sm,
  },
  filterButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterButtonText: {
    fontSize: fontSizes.sm,
    color: colors.text,
  },
  filterButtonTextActive: {
    color: colors.surface,
    fontWeight: '600' as const,
  },
  kpiContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSizes.lg,
    fontWeight: '700' as const,
    color: colors.text,
    marginBottom: spacing.md,
  },
  kpiGrid: {
    gap: spacing.md,
  },
  kpiCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    borderLeftWidth: 4,
    shadowColor: colors.text,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  kpiHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: spacing.sm,
  },
  kpiIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginRight: spacing.sm,
  },
  kpiTitle: {
    fontSize: fontSizes.sm,
    color: colors.textLight,
    fontWeight: '500' as const,
  },
  kpiValue: {
    fontSize: fontSizes.xl,
    fontWeight: '700' as const,
    color: colors.text,
  },
  kpiSubtitle: {
    fontSize: fontSizes.xs,
    color: colors.textLight,
    marginTop: spacing.xs,
  },
  topProductsContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  topProductItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  topProductRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginRight: spacing.md,
  },
  topProductRankText: {
    fontSize: fontSizes.sm,
    fontWeight: '700' as const,
    color: colors.surface,
  },
  topProductInfo: {
    flex: 1,
  },
  topProductName: {
    fontSize: fontSizes.md,
    fontWeight: '600' as const,
    color: colors.text,
  },
  topProductStats: {
    fontSize: fontSizes.sm,
    color: colors.textLight,
  },
  chartContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  chart: {
    borderRadius: 16,
    marginVertical: spacing.sm,
  },
  paymentMethodsContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  paymentMethodItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  paymentMethodColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: spacing.md,
  },
  paymentMethodName: {
    flex: 1,
    fontSize: fontSizes.md,
    color: colors.text,
  },
  paymentMethodAmount: {
    fontSize: fontSizes.md,
    fontWeight: '600' as const,
    color: colors.text,
  },
  bottomSpacing: {
    height: spacing.xl,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  exportModal: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    margin: spacing.lg,
    minWidth: 280,
  },
  exportModalTitle: {
    fontSize: fontSizes.lg,
    fontWeight: '700' as const,
    color: colors.text,
    textAlign: 'center' as const,
    marginBottom: spacing.lg,
  },
  exportOption: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.background,
    marginBottom: spacing.sm,
  },
  exportOptionText: {
    fontSize: fontSizes.md,
    color: colors.text,
    marginLeft: spacing.md,
  },
  exportCancel: {
    padding: spacing.md,
    alignItems: 'center' as const,
    marginTop: spacing.sm,
  },
  exportCancelText: {
    fontSize: fontSizes.md,
    color: colors.textLight,
  },
};
