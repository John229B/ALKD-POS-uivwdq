
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  Modal, 
  TextInput, 
  Alert,
  RefreshControl,
  Dimensions,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { commonStyles, colors, spacing, fontSizes, isSmallScreen } from '../styles/commonStyles';
import Icon from '../components/Icon';
import { getSales, getProducts, getCustomers, getSettings } from '../utils/storage';
import { Sale, Product, Customer, AppSettings } from '../types';

const { width: screenWidth } = Dimensions.get('window');
const chartWidth = screenWidth - (spacing.lg * 2);

interface ReportFilters {
  dateRange: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
  paymentMethods: string[];
  creditStatus: string[];
  customerId?: string;
  productId?: string;
  categoryId?: string;
  startDate?: Date;
  endDate?: Date;
}

interface ReportData {
  totalRevenue: number;
  totalSales: number;
  averageOrderValue: number;
  topProducts: {
    product: Product;
    quantity: number;
    revenue: number;
  }[];
  paymentMethodBreakdown: {
    method: string;
    amount: number;
    count: number;
  }[];
  creditAnalysis: {
    totalCredit: number;
    partiallyPaid: number;
    fullyPaid: number;
  };
  dailyTrends: {
    date: string;
    revenue: number;
    sales: number;
  }[];
  categoryPerformance: {
    category: string;
    revenue: number;
    quantity: number;
  }[];
}

export default function ReportsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [activeChart, setActiveChart] = useState<'revenue' | 'sales' | 'products' | 'payments'>('revenue');
  
  const [filters, setFilters] = useState<ReportFilters>({
    dateRange: 'month',
    paymentMethods: ['cash', 'mobile_money', 'credit'],
    creditStatus: ['paid', 'credit', 'partial'],
  });

  const loadData = useCallback(async () => {
    try {
      console.log('Loading reports data...');
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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredSales = useMemo(() => {
    if (!sales.length) return [];

    let filtered = sales.filter(sale => {
      // Filter by payment methods
      if (!filters.paymentMethods.includes(sale.paymentMethod)) return false;
      
      // Filter by credit status
      if (!filters.creditStatus.includes(sale.paymentStatus)) return false;
      
      // Filter by customer
      if (filters.customerId && sale.customerId !== filters.customerId) return false;
      
      // Filter by product
      if (filters.productId) {
        const hasProduct = sale.items.some(item => item.productId === filters.productId);
        if (!hasProduct) return false;
      }
      
      return true;
    });

    // Filter by date range
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (filters.dateRange) {
      case 'today':
        filtered = filtered.filter(sale => 
          new Date(sale.createdAt) >= startOfToday
        );
        break;
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(sale => 
          new Date(sale.createdAt) >= weekAgo
        );
        break;
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(sale => 
          new Date(sale.createdAt) >= monthAgo
        );
        break;
      case 'quarter':
        const quarterAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(sale => 
          new Date(sale.createdAt) >= quarterAgo
        );
        break;
      case 'year':
        const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(sale => 
          new Date(sale.createdAt) >= yearAgo
        );
        break;
    }

    return filtered;
  }, [sales, filters]);

  const reportData = useMemo((): ReportData => {
    if (!filteredSales.length) {
      return {
        totalRevenue: 0,
        totalSales: 0,
        averageOrderValue: 0,
        topProducts: [],
        paymentMethodBreakdown: [],
        creditAnalysis: { totalCredit: 0, partiallyPaid: 0, fullyPaid: 0 },
        dailyTrends: [],
        categoryPerformance: []
      };
    }

    const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
    const totalSales = filteredSales.length;
    const averageOrderValue = totalRevenue / totalSales;

    // Top products analysis
    const productStats = new Map();
    filteredSales.forEach(sale => {
      sale.items.forEach(item => {
        const existing = productStats.get(item.productId) || { quantity: 0, revenue: 0 };
        productStats.set(item.productId, {
          quantity: existing.quantity + item.quantity,
          revenue: existing.revenue + item.subtotal
        });
      });
    });

    const topProducts = Array.from(productStats.entries())
      .map(([productId, stats]) => ({
        product: products.find(p => p.id === productId)!,
        quantity: stats.quantity,
        revenue: stats.revenue
      }))
      .filter(item => item.product)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Payment method breakdown
    const paymentStats = new Map();
    filteredSales.forEach(sale => {
      const existing = paymentStats.get(sale.paymentMethod) || { amount: 0, count: 0 };
      paymentStats.set(sale.paymentMethod, {
        amount: existing.amount + sale.total,
        count: existing.count + 1
      });
    });

    const paymentMethodBreakdown = Array.from(paymentStats.entries()).map(([method, stats]) => ({
      method,
      amount: stats.amount,
      count: stats.count
    }));

    // Credit analysis
    const creditSales = filteredSales.filter(sale => sale.paymentStatus === 'credit');
    const partialSales = filteredSales.filter(sale => sale.paymentStatus === 'partial');
    const paidSales = filteredSales.filter(sale => sale.paymentStatus === 'paid');

    const creditAnalysis = {
      totalCredit: creditSales.reduce((sum, sale) => sum + sale.total, 0),
      partiallyPaid: partialSales.reduce((sum, sale) => sum + (sale.total - sale.amountPaid), 0),
      fullyPaid: paidSales.reduce((sum, sale) => sum + sale.total, 0)
    };

    // Daily trends (last 7 days)
    const dailyTrends = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const daySales = filteredSales.filter(sale => 
        sale.createdAt.toString().startsWith(dateStr)
      );
      
      dailyTrends.push({
        date: dateStr,
        revenue: daySales.reduce((sum, sale) => sum + sale.total, 0),
        sales: daySales.length
      });
    }

    // Category performance
    const categoryStats = new Map();
    filteredSales.forEach(sale => {
      sale.items.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        if (product) {
          const existing = categoryStats.get(product.categoryId) || { revenue: 0, quantity: 0 };
          categoryStats.set(product.categoryId, {
            revenue: existing.revenue + item.subtotal,
            quantity: existing.quantity + item.quantity
          });
        }
      });
    });

    const categoryPerformance = Array.from(categoryStats.entries()).map(([categoryId, stats]) => ({
      category: categoryId,
      revenue: stats.revenue,
      quantity: stats.quantity
    }));

    return {
      totalRevenue,
      totalSales,
      averageOrderValue,
      topProducts,
      paymentMethodBreakdown,
      creditAnalysis,
      dailyTrends,
      categoryPerformance
    };
  }, [filteredSales, products]);

  const formatCurrency = useCallback((amount: number) => {
    const currency = settings?.currency || 'XOF';
    const currencySymbols = { XOF: 'FCFA', USD: '$', EUR: '€' };
    return `${amount.toLocaleString()} ${currencySymbols[currency]}`;
  }, [settings]);

  const getPaymentMethodLabel = (method: string) => {
    const labels = {
      cash: 'Espèces',
      mobile_money: 'Mobile Money',
      credit: 'Crédit'
    };
    return labels[method] || method;
  };

  const exportToPDF = useCallback(async () => {
    try {
      console.log('Exporting report to PDF...');
      
      const reportContent = `
RAPPORT DE VENTES - ${settings?.companyName || 'ALKD-POS'}
Période: ${filters.dateRange}
Date de génération: ${new Date().toLocaleDateString('fr-FR')}

=== RÉSUMÉ EXÉCUTIF ===
Chiffre d'affaires total: ${formatCurrency(reportData.totalRevenue)}
Nombre de ventes: ${reportData.totalSales}
Panier moyen: ${formatCurrency(reportData.averageOrderValue)}

=== TOP PRODUITS ===
${reportData.topProducts.slice(0, 5).map((item, index) => 
  `${index + 1}. ${item.product.name} - ${item.quantity} unités - ${formatCurrency(item.revenue)}`
).join('\n')}

=== MOYENS DE PAIEMENT ===
${reportData.paymentMethodBreakdown.map(item => 
  `${getPaymentMethodLabel(item.method)}: ${formatCurrency(item.amount)} (${item.count} transactions)`
).join('\n')}

=== ANALYSE CRÉDIT ===
Crédit total: ${formatCurrency(reportData.creditAnalysis.totalCredit)}
Partiellement payé: ${formatCurrency(reportData.creditAnalysis.partiallyPaid)}
Entièrement payé: ${formatCurrency(reportData.creditAnalysis.fullyPaid)}
      `;

      const fileName = `rapport_${new Date().toISOString().split('T')[0]}.txt`;
      
      // Use fallback pattern: documentDirectory if available, otherwise cacheDirectory
      const dir = FileSystem.documentDirectory || FileSystem.cacheDirectory;
      const fileUri = `${dir}${fileName}`;
      
      console.log('Saving report to:', fileUri);
      await FileSystem.writeAsStringAsync(fileUri, reportContent);
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      } else {
        Alert.alert('Succès', `Rapport exporté vers: ${fileUri}`);
      }
      
      console.log('Report exported successfully');
    } catch (error) {
      console.error('Error exporting report:', error);
      Alert.alert('Erreur', 'Impossible d\'exporter le rapport');
    }
  }, [reportData, settings, filters, formatCurrency]);

  const chartConfig = {
    backgroundColor: colors.surface,
    backgroundGradientFrom: colors.surface,
    backgroundGradientTo: colors.surface,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(255, 193, 7, ${opacity})`,
    labelColor: (opacity = 1) => colors.text,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: "6",
      strokeWidth: "2",
      stroke: colors.primary
    }
  };

  const renderKPICard = ({ title, value, subtitle, icon, color = colors.primary }) => (
    <View style={[styles.kpiCard, { borderLeftColor: color }]}>
      <View style={styles.kpiHeader}>
        <Icon name={icon} size={24} color={color} />
        <Text style={styles.kpiTitle}>{title}</Text>
      </View>
      <Text style={styles.kpiValue}>{value}</Text>
      {subtitle && <Text style={styles.kpiSubtitle}>{subtitle}</Text>}
    </View>
  );

  const renderChart = () => {
    if (reportData.dailyTrends.length === 0) {
      return (
        <View style={styles.noDataContainer}>
          <Icon name="bar-chart" size={48} color={colors.textLight} />
          <Text style={styles.noDataText}>Aucune donnée disponible</Text>
        </View>
      );
    }

    switch (activeChart) {
      case 'revenue':
        return (
          <LineChart
            data={{
              labels: reportData.dailyTrends.map(item => 
                new Date(item.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
              ),
              datasets: [{
                data: reportData.dailyTrends.map(item => item.revenue),
                color: (opacity = 1) => colors.primary,
                strokeWidth: 3
              }]
            }}
            width={chartWidth}
            height={220}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
          />
        );
      
      case 'sales':
        return (
          <BarChart
            data={{
              labels: reportData.dailyTrends.map(item => 
                new Date(item.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
              ),
              datasets: [{
                data: reportData.dailyTrends.map(item => item.sales)
              }]
            }}
            width={chartWidth}
            height={220}
            chartConfig={chartConfig}
            style={styles.chart}
          />
        );
      
      case 'payments':
        if (reportData.paymentMethodBreakdown.length === 0) {
          return (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>Aucune donnée de paiement</Text>
            </View>
          );
        }
        
        const pieData = reportData.paymentMethodBreakdown.map((item, index) => ({
          name: getPaymentMethodLabel(item.method),
          amount: item.amount,
          color: [colors.primary, colors.success, colors.warning, colors.info][index % 4],
          legendFontColor: colors.text,
          legendFontSize: 12
        }));

        return (
          <PieChart
            data={pieData}
            width={chartWidth}
            height={220}
            chartConfig={chartConfig}
            accessor="amount"
            backgroundColor="transparent"
            paddingLeft="15"
            style={styles.chart}
          />
        );
      
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <Icon name="analytics" size={48} color={colors.primary} />
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
        <TouchableOpacity onPress={() => setShowFilters(true)} style={styles.filterButton}>
          <Icon name="filter" size={24} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={exportToPDF} style={styles.exportButton}>
          <Icon name="download" size={24} color={colors.success} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* KPI Cards */}
        <View style={styles.kpiContainer}>
          {renderKPICard({
            title: 'Chiffre d\'affaires',
            value: formatCurrency(reportData.totalRevenue),
            subtitle: `${reportData.totalSales} ventes`,
            icon: 'trending-up',
            color: colors.success
          })}
          
          {renderKPICard({
            title: 'Panier moyen',
            value: formatCurrency(reportData.averageOrderValue),
            subtitle: 'Par transaction',
            icon: 'calculator',
            color: colors.info
          })}
          
          {renderKPICard({
            title: 'Crédit en cours',
            value: formatCurrency(reportData.creditAnalysis.totalCredit),
            subtitle: 'À recouvrer',
            icon: 'card',
            color: colors.warning
          })}
        </View>

        {/* Chart Section */}
        <View style={styles.chartSection}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>Tendances</Text>
            <View style={styles.chartTabs}>
              {[
                { key: 'revenue', label: 'CA', icon: 'trending-up' },
                { key: 'sales', label: 'Ventes', icon: 'bar-chart' },
                { key: 'payments', label: 'Paiements', icon: 'card' }
              ].map(tab => (
                <TouchableOpacity
                  key={tab.key}
                  style={[styles.chartTab, activeChart === tab.key && styles.activeChartTab]}
                  onPress={() => setActiveChart(tab.key as any)}
                >
                  <Icon 
                    name={tab.icon} 
                    size={16} 
                    color={activeChart === tab.key ? colors.surface : colors.textLight} 
                  />
                  <Text style={[
                    styles.chartTabText,
                    activeChart === tab.key && styles.activeChartTabText
                  ]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          <View style={styles.chartContainer}>
            {renderChart()}
          </View>
        </View>

        {/* Top Products */}
        {reportData.topProducts.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top Produits</Text>
            {reportData.topProducts.slice(0, 5).map((item, index) => (
              <View key={item.product.id} style={styles.productItem}>
                <View style={styles.productRank}>
                  <Text style={styles.productRankText}>{index + 1}</Text>
                </View>
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{item.product.name}</Text>
                  <Text style={styles.productStats}>
                    {item.quantity} unités • {formatCurrency(item.revenue)}
                  </Text>
                </View>
                <View style={styles.productProgress}>
                  <View 
                    style={[
                      styles.productProgressBar,
                      { 
                        width: `${(item.revenue / reportData.topProducts[0].revenue) * 100}%`,
                        backgroundColor: colors.primary 
                      }
                    ]} 
                  />
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Payment Methods */}
        {reportData.paymentMethodBreakdown.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Moyens de paiement</Text>
            {reportData.paymentMethodBreakdown.map(item => (
              <View key={item.method} style={styles.paymentItem}>
                <View style={styles.paymentInfo}>
                  <Text style={styles.paymentMethod}>{getPaymentMethodLabel(item.method)}</Text>
                  <Text style={styles.paymentAmount}>{formatCurrency(item.amount)}</Text>
                </View>
                <Text style={styles.paymentCount}>{item.count} transactions</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Filters Modal */}
      <Modal
        visible={showFilters}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFilters(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filtres</Text>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <Icon name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            {/* Date Range */}
            <View style={styles.filterSection}>
              <Text style={styles.filterTitle}>Période</Text>
              <View style={styles.filterOptions}>
                {[
                  { key: 'today', label: 'Aujourd\'hui' },
                  { key: 'week', label: 'Cette semaine' },
                  { key: 'month', label: 'Ce mois' },
                  { key: 'quarter', label: 'Ce trimestre' },
                  { key: 'year', label: 'Cette année' }
                ].map(option => (
                  <TouchableOpacity
                    key={option.key}
                    style={[
                      styles.filterOption,
                      filters.dateRange === option.key && styles.activeFilterOption
                    ]}
                    onPress={() => setFilters(prev => ({ ...prev, dateRange: option.key as any }))}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      filters.dateRange === option.key && styles.activeFilterOptionText
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Payment Methods */}
            <View style={styles.filterSection}>
              <Text style={styles.filterTitle}>Moyens de paiement</Text>
              <View style={styles.filterOptions}>
                {[
                  { key: 'cash', label: 'Espèces' },
                  { key: 'mobile_money', label: 'Mobile Money' },
                  { key: 'credit', label: 'Crédit' }
                ].map(option => (
                  <TouchableOpacity
                    key={option.key}
                    style={[
                      styles.filterOption,
                      filters.paymentMethods.includes(option.key) && styles.activeFilterOption
                    ]}
                    onPress={() => {
                      setFilters(prev => ({
                        ...prev,
                        paymentMethods: prev.paymentMethods.includes(option.key)
                          ? prev.paymentMethods.filter(m => m !== option.key)
                          : [...prev.paymentMethods, option.key]
                      }));
                    }}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      filters.paymentMethods.includes(option.key) && styles.activeFilterOptionText
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Credit Status */}
            <View style={styles.filterSection}>
              <Text style={styles.filterTitle}>Statut crédit</Text>
              <View style={styles.filterOptions}>
                {[
                  { key: 'paid', label: 'Payé' },
                  { key: 'credit', label: 'À crédit' },
                  { key: 'partial', label: 'Partiellement payé' }
                ].map(option => (
                  <TouchableOpacity
                    key={option.key}
                    style={[
                      styles.filterOption,
                      filters.creditStatus.includes(option.key) && styles.activeFilterOption
                    ]}
                    onPress={() => {
                      setFilters(prev => ({
                        ...prev,
                        creditStatus: prev.creditStatus.includes(option.key)
                          ? prev.creditStatus.filter(s => s !== option.key)
                          : [...prev.creditStatus, option.key]
                      }));
                    }}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      filters.creditStatus.includes(option.key) && styles.activeFilterOptionText
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.applyFiltersButton}
              onPress={() => setShowFilters(false)}
            >
              <Text style={styles.applyFiltersText}>Appliquer les filtres</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
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
  filterButton: {
    padding: spacing.sm,
    marginRight: spacing.sm,
  },
  exportButton: {
    padding: spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    gap: spacing.md,
  },
  loadingText: {
    fontSize: fontSizes.lg,
    color: colors.textLight,
  },
  scrollView: {
    flex: 1,
  },
  kpiContainer: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  kpiCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    borderLeftWidth: 4,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  kpiHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  kpiTitle: {
    fontSize: fontSizes.md,
    fontWeight: '600' as const,
    color: colors.textLight,
  },
  kpiValue: {
    fontSize: fontSizes.xxl,
    fontWeight: '700' as const,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  kpiSubtitle: {
    fontSize: fontSizes.sm,
    color: colors.textLight,
  },
  chartSection: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderRadius: 16,
    padding: spacing.lg,
  },
  chartHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: spacing.lg,
  },
  chartTitle: {
    fontSize: fontSizes.lg,
    fontWeight: '600' as const,
    color: colors.text,
  },
  chartTabs: {
    flexDirection: 'row' as const,
    gap: spacing.xs,
  },
  chartTab: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
    gap: spacing.xs,
  },
  activeChartTab: {
    backgroundColor: colors.primary,
  },
  chartTabText: {
    fontSize: fontSizes.sm,
    color: colors.textLight,
  },
  activeChartTabText: {
    color: colors.surface,
    fontWeight: '600' as const,
  },
  chartContainer: {
    alignItems: 'center' as const,
  },
  chart: {
    borderRadius: 16,
  },
  noDataContainer: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },
  noDataText: {
    fontSize: fontSizes.md,
    color: colors.textLight,
  },
  section: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderRadius: 16,
    padding: spacing.lg,
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
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  productRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  productRankText: {
    fontSize: fontSizes.sm,
    fontWeight: '600' as const,
    color: colors.primary,
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
  productProgress: {
    width: 60,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden' as const,
  },
  productProgressBar: {
    height: '100%',
    borderRadius: 2,
  },
  paymentItem: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentMethod: {
    fontSize: fontSizes.md,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  paymentAmount: {
    fontSize: fontSizes.lg,
    fontWeight: '700' as const,
    color: colors.primary,
  },
  paymentCount: {
    fontSize: fontSizes.sm,
    color: colors.textLight,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: fontSizes.xl,
    fontWeight: '700' as const,
    color: colors.text,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  filterSection: {
    marginVertical: spacing.lg,
  },
  filterTitle: {
    fontSize: fontSizes.lg,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: spacing.md,
  },
  filterOptions: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: spacing.sm,
  },
  filterOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  activeFilterOption: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterOptionText: {
    fontSize: fontSizes.sm,
    color: colors.text,
  },
  activeFilterOptionText: {
    color: colors.surface,
    fontWeight: '600' as const,
  },
  modalFooter: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  applyFiltersButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: 'center' as const,
  },
  applyFiltersText: {
    fontSize: fontSizes.md,
    fontWeight: '600' as const,
    color: colors.surface,
  },
};
