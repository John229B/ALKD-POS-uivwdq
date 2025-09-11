
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { commonStyles, colors, buttonStyles, spacing, fontSizes, isSmallScreen } from '../../styles/commonStyles';
import Icon from '../../components/Icon';
import { getSales, getProducts, getCustomers, getSettings } from '../../utils/storage';
import { Sale, Product, Customer, AppSettings } from '../../types';

export default function ReportsScreen() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month' | 'all'>('today');
  const [reportData, setReportData] = useState<any>(null);

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
      console.log('Loading reports data...');
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
      console.log(`Loaded ${salesData.length} sales for reports`);
    } catch (error) {
      console.error('Error loading reports data:', error);
    }
  };

  const getDateRange = () => {
    const now = new Date();
    let startDate = new Date();

    switch (selectedPeriod) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'all':
        startDate = new Date(0); // Beginning of time
        break;
    }

    return { startDate, endDate: now };
  };

  const calculateReportData = () => {
    const { startDate, endDate } = getDateRange();
    
    const filteredSales = sales.filter(sale => {
      const saleDate = new Date(sale.createdAt);
      return saleDate >= startDate && saleDate <= endDate;
    });

    const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
    const totalSales = filteredSales.length;
    const averageSale = totalSales > 0 ? totalRevenue / totalSales : 0;

    // Payment methods breakdown
    const paymentMethods = filteredSales.reduce((acc, sale) => {
      acc[sale.paymentMethod] = (acc[sale.paymentMethod] || 0) + sale.total;
      return acc;
    }, {} as Record<string, number>);

    // Top selling products
    const productSales = new Map<string, { quantity: number; revenue: number; product: Product }>();
    
    filteredSales.forEach(sale => {
      sale.items.forEach(item => {
        const existing = productSales.get(item.productId);
        const product = products.find(p => p.id === item.productId);
        
        if (product) {
          if (existing) {
            existing.quantity += item.quantity;
            existing.revenue += item.subtotal;
          } else {
            productSales.set(item.productId, {
              quantity: item.quantity,
              revenue: item.subtotal,
              product,
            });
          }
        }
      });
    });

    const topProducts = Array.from(productSales.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Daily sales for the period
    const dailySales = new Map<string, number>();
    filteredSales.forEach(sale => {
      const dateKey = new Date(sale.createdAt).toISOString().split('T')[0];
      dailySales.set(dateKey, (dailySales.get(dateKey) || 0) + sale.total);
    });

    setReportData({
      totalRevenue,
      totalSales,
      averageSale,
      paymentMethods,
      topProducts,
      dailySales: Array.from(dailySales.entries()).sort(),
      filteredSales,
    });
  };

  const formatCurrency = (amount: number | undefined | null): string => {
    if (amount === undefined || amount === null || isNaN(amount)) {
      console.log('formatCurrency called with invalid amount:', amount);
      amount = 0;
    }
    
    const currency = settings?.currency || 'XOF';
    const currencySymbols = { XOF: 'FCFA', USD: '$', EUR: '€' };
    return `${amount.toLocaleString()} ${currencySymbols[currency]}`;
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels = {
      cash: '💵 Espèces',
      mobile_money: '📱 Mobile Money',
      credit: '📋 À crédit',
    };
    return labels[method] || method;
  };

  if (!reportData) {
    return (
      <SafeAreaView style={commonStyles.container}>
        <View style={[commonStyles.content, commonStyles.center]}>
          <Text style={commonStyles.text}>Chargement des rapports...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={commonStyles.container}>
      <View style={commonStyles.content}>
        {/* Header */}
        <View style={[commonStyles.section, commonStyles.header]}>
          <View style={{ flex: 1 }}>
            <Text style={commonStyles.title}>Rapports & Analyses</Text>
            <Text style={[commonStyles.textLight, { fontSize: fontSizes.sm }]}>
              {reportData.totalSales} vente(s) • {formatCurrency(reportData.totalRevenue)}
            </Text>
          </View>
        </View>

        {/* Period Selection */}
        <View style={commonStyles.sectionSmall}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: spacing.xs, paddingHorizontal: spacing.lg }}>
              {[
                { key: 'today', label: 'Aujourd\'hui' },
                { key: 'week', label: '7 derniers jours' },
                { key: 'month', label: '30 derniers jours' },
                { key: 'all', label: 'Tout' },
              ].map(period => (
                <TouchableOpacity
                  key={period.key}
                  style={[
                    buttonStyles.outline,
                    buttonStyles.small,
                    selectedPeriod === period.key && { backgroundColor: colors.primary }
                  ]}
                  onPress={() => setSelectedPeriod(period.key as any)}
                >
                  <Text style={[
                    { color: colors.primary, fontSize: fontSizes.sm },
                    selectedPeriod === period.key && { color: colors.secondary }
                  ]}>
                    {period.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: spacing.xl }}>
          {/* Summary Stats */}
          <View style={commonStyles.gridContainer}>
            <View style={[commonStyles.gridItem, commonStyles.card]}>
              <View style={{ alignItems: 'center' }}>
                <Text style={[commonStyles.text, { fontSize: fontSizes.xl, fontWeight: '600', color: colors.primary }]}>
                  {reportData.totalSales}
                </Text>
                <Text style={[commonStyles.textLight, { fontSize: fontSizes.sm, textAlign: 'center' }]}>
                  Ventes totales
                </Text>
              </View>
            </View>

            <View style={[commonStyles.gridItem, commonStyles.card]}>
              <View style={{ alignItems: 'center' }}>
                <Text style={[commonStyles.text, { fontSize: fontSizes.lg, fontWeight: '600', color: colors.success }]}>
                  {formatCurrency(reportData.totalRevenue)}
                </Text>
                <Text style={[commonStyles.textLight, { fontSize: fontSizes.sm, textAlign: 'center' }]}>
                  Chiffre d'affaires
                </Text>
              </View>
            </View>

            <View style={[commonStyles.gridItem, commonStyles.card]}>
              <View style={{ alignItems: 'center' }}>
                <Text style={[commonStyles.text, { fontSize: fontSizes.lg, fontWeight: '600', color: colors.info }]}>
                  {formatCurrency(reportData.averageSale)}
                </Text>
                <Text style={[commonStyles.textLight, { fontSize: fontSizes.sm, textAlign: 'center' }]}>
                  Panier moyen
                </Text>
              </View>
            </View>
          </View>

          {/* Payment Methods */}
          <View style={commonStyles.section}>
            <Text style={[commonStyles.text, { fontWeight: '600', marginBottom: spacing.sm }]}>
              Répartition par mode de paiement
            </Text>
            {Object.entries(reportData.paymentMethods).map(([method, amount]) => (
              <View key={method} style={[commonStyles.card, commonStyles.cardSmall, { marginBottom: spacing.xs }]}>
                <View style={commonStyles.row}>
                  <Text style={[commonStyles.text, { fontSize: fontSizes.sm }]}>
                    {getPaymentMethodLabel(method)}
                  </Text>
                  <Text style={[commonStyles.text, { fontWeight: '600', color: colors.primary }]}>
                    {formatCurrency(amount)}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* Top Products */}
          {reportData.topProducts.length > 0 && (
            <View style={commonStyles.section}>
              <Text style={[commonStyles.text, { fontWeight: '600', marginBottom: spacing.sm }]}>
                Produits les plus vendus
              </Text>
              {reportData.topProducts.slice(0, 5).map((item, index) => (
                <View key={item.product.id} style={[commonStyles.card, commonStyles.cardSmall, { marginBottom: spacing.xs }]}>
                  <View style={commonStyles.row}>
                    <View style={{ flex: 1 }}>
                      <Text style={[commonStyles.text, { fontWeight: '600', fontSize: fontSizes.sm }]}>
                        #{index + 1} {item.product.name}
                      </Text>
                      <Text style={[commonStyles.textLight, { fontSize: fontSizes.xs }]}>
                        {item.quantity} unités • {formatCurrency(item.revenue)}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[commonStyles.text, { fontSize: fontSizes.sm, color: colors.primary }]}>
                        {((item.revenue / reportData.totalRevenue) * 100).toFixed(1)}%
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Recent Sales */}
          {reportData.filteredSales.length > 0 && (
            <View style={commonStyles.section}>
              <Text style={[commonStyles.text, { fontWeight: '600', marginBottom: spacing.sm }]}>
                Ventes récentes
              </Text>
              {reportData.filteredSales.slice(0, 10).map((sale) => (
                <View key={sale.id} style={[commonStyles.card, commonStyles.cardSmall, { marginBottom: spacing.xs }]}>
                  <View style={commonStyles.row}>
                    <View style={{ flex: 1 }}>
                      <Text style={[commonStyles.text, { fontWeight: '600', fontSize: fontSizes.sm }]}>
                        {sale.receiptNumber}
                      </Text>
                      <Text style={[commonStyles.textLight, { fontSize: fontSizes.xs }]}>
                        {new Date(sale.createdAt).toLocaleString('fr-FR')} • {getPaymentMethodLabel(sale.paymentMethod)}
                      </Text>
                    </View>
                    <Text style={[commonStyles.text, { fontWeight: '600', color: colors.primary }]}>
                      {formatCurrency(sale.total)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
