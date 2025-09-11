
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { commonStyles, colors, buttonStyles, spacing, fontSizes, isSmallScreen } from '../styles/commonStyles';
import { getSales, getProducts, getCustomers, getSettings } from '../utils/storage';
import Icon from '../components/Icon';
import { Sale, Product, Customer, AppSettings } from '../types';

export default function ReportsScreen() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month' | 'year'>('today');
  const [reportData, setReportData] = useState({
    totalRevenue: 0,
    totalSales: 0,
    averageSale: 0,
    topProducts: [] as { name: string; quantity: number; revenue: number }[],
    paymentMethods: {} as Record<string, number>,
    creditSales: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (sales.length > 0 && products.length > 0) {
      calculateReportData();
    }
  }, [sales, products, selectedPeriod]);

  const loadData = async () => {
    try {
      const [salesData, productsData, customersData, settingsData] = await Promise.all([
        getSales(),
        getProducts(),
        getCustomers(),
        getSettings(),
      ]);
      setSales(salesData);
      setProducts(productsData);
      setCustomers(customersData);
      setSettings(settingsData);
    } catch (error) {
      console.log('Error loading data:', error);
    }
  };

  const getDateRange = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (selectedPeriod) {
      case 'today':
        return { start: today, end: new Date(today.getTime() + 24 * 60 * 60 * 1000) };
      case 'week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        return { start: weekStart, end: new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000) };
      case 'month':
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1);
        return { start: monthStart, end: monthEnd };
      case 'year':
        const yearStart = new Date(today.getFullYear(), 0, 1);
        const yearEnd = new Date(today.getFullYear() + 1, 0, 1);
        return { start: yearStart, end: yearEnd };
      default:
        return { start: today, end: new Date(today.getTime() + 24 * 60 * 60 * 1000) };
    }
  };

  const calculateReportData = () => {
    const { start, end } = getDateRange();
    const filteredSales = sales.filter(sale => {
      const saleDate = new Date(sale.date);
      return saleDate >= start && saleDate < end;
    });

    const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
    const totalSales = filteredSales.length;
    const averageSale = totalSales > 0 ? totalRevenue / totalSales : 0;

    // Calcul des produits les plus vendus
    const productSales: Record<string, { quantity: number; revenue: number }> = {};
    filteredSales.forEach(sale => {
      sale.items.forEach(item => {
        if (!productSales[item.productId]) {
          productSales[item.productId] = { quantity: 0, revenue: 0 };
        }
        productSales[item.productId].quantity += item.quantity;
        productSales[item.productId].revenue += item.total;
      });
    });

    const topProducts = Object.entries(productSales)
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

    // Calcul des méthodes de paiement
    const paymentMethods: Record<string, number> = {};
    filteredSales.forEach(sale => {
      paymentMethods[sale.paymentMethod] = (paymentMethods[sale.paymentMethod] || 0) + sale.total;
    });

    // Calcul des ventes à crédit
    const creditSales = filteredSales
      .filter(sale => sale.paymentMethod === 'credit')
      .reduce((sum, sale) => sum + sale.total, 0);

    setReportData({
      totalRevenue,
      totalSales,
      averageSale,
      topProducts,
      paymentMethods,
      creditSales,
    });
  };

  const formatCurrency = (amount: number | undefined | null): string => {
    if (amount === undefined || amount === null || isNaN(amount)) {
      amount = 0;
    }
    const currency = settings?.currency || 'XOF';
    const currencySymbols = { XOF: 'FCFA', USD: '$', EUR: '€' };
    return `${amount.toLocaleString()} ${currencySymbols[currency]}`;
  };

  const getPaymentMethodLabel = (method: string): string => {
    const labels = {
      cash: 'Espèces',
      mobile: 'Mobile Money',
      credit: 'À crédit',
    };
    return labels[method] || method;
  };

  const periodLabels = {
    today: "Aujourd'hui",
    week: 'Cette semaine',
    month: 'Ce mois',
    year: 'Cette année',
  };

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
        <Text style={styles.headerTitle}>Rapports</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Period Selector */}
        <View style={styles.periodSelector}>
          {(Object.keys(periodLabels) as Array<keyof typeof periodLabels>).map((period) => (
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
                {periodLabels[period]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Icon name="trending-up" size={24} color={colors.success} />
            <Text style={styles.summaryValue}>{formatCurrency(reportData.totalRevenue)}</Text>
            <Text style={styles.summaryLabel}>Chiffre d'affaires</Text>
          </View>

          <View style={styles.summaryCard}>
            <Icon name="shopping-bag" size={24} color={colors.info} />
            <Text style={styles.summaryValue}>{reportData.totalSales}</Text>
            <Text style={styles.summaryLabel}>Ventes</Text>
          </View>

          <View style={styles.summaryCard}>
            <Icon name="calculator" size={24} color={colors.warning} />
            <Text style={styles.summaryValue}>{formatCurrency(reportData.averageSale)}</Text>
            <Text style={styles.summaryLabel}>Panier moyen</Text>
          </View>

          <View style={styles.summaryCard}>
            <Icon name="credit-card" size={24} color={colors.error} />
            <Text style={styles.summaryValue}>{formatCurrency(reportData.creditSales)}</Text>
            <Text style={styles.summaryLabel}>Ventes à crédit</Text>
          </View>
        </View>

        {/* Top Products */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Produits les plus vendus</Text>
          {reportData.topProducts.length > 0 ? (
            reportData.topProducts.map((product, index) => (
              <View key={index} style={styles.productItem}>
                <View style={styles.productRank}>
                  <Text style={styles.productRankText}>{index + 1}</Text>
                </View>
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{product.name}</Text>
                  <Text style={styles.productStats}>
                    {product.quantity} unités • {formatCurrency(product.revenue)}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>Aucune vente pour cette période</Text>
          )}
        </View>

        {/* Payment Methods */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Méthodes de paiement</Text>
          {Object.entries(reportData.paymentMethods).length > 0 ? (
            Object.entries(reportData.paymentMethods).map(([method, amount]) => (
              <View key={method} style={styles.paymentItem}>
                <Text style={styles.paymentMethod}>{getPaymentMethodLabel(method)}</Text>
                <Text style={styles.paymentAmount}>{formatCurrency(amount)}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>Aucune vente pour cette période</Text>
          )}
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
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    marginRight: spacing.md,
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: fontSizes.xl,
    fontWeight: '700' as const,
    color: colors.text,
  },
  scrollView: {
    flex: 1,
  },
  periodSelector: {
    flexDirection: 'row' as const,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  periodButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center' as const,
  },
  periodButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  periodButtonText: {
    fontSize: fontSizes.sm,
    fontWeight: '500' as const,
    color: colors.text,
  },
  periodButtonTextActive: {
    color: colors.background,
  },
  summaryGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  summaryCard: {
    width: isSmallScreen ? '48%' : '23%',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryValue: {
    fontSize: fontSizes.lg,
    fontWeight: '700' as const,
    color: colors.text,
    marginTop: spacing.sm,
    textAlign: 'center' as const,
  },
  summaryLabel: {
    fontSize: fontSizes.sm,
    color: colors.textLight,
    marginTop: spacing.xs,
    textAlign: 'center' as const,
  },
  section: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
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
    borderRadius: 8,
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
  productRankText: {
    fontSize: fontSizes.sm,
    fontWeight: '700' as const,
    color: colors.background,
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
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  paymentMethod: {
    fontSize: fontSizes.md,
    fontWeight: '500' as const,
    color: colors.text,
  },
  paymentAmount: {
    fontSize: fontSizes.md,
    fontWeight: '600' as const,
    color: colors.primary,
  },
  emptyText: {
    fontSize: fontSizes.md,
    color: colors.textLight,
    textAlign: 'center' as const,
    fontStyle: 'italic' as const,
    paddingVertical: spacing.xl,
  },
};
