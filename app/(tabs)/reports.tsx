
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { commonStyles, colors, buttonStyles } from '../../styles/commonStyles';
import { getSales, getProducts, getCustomers, getSettings } from '../../utils/storage';
import { Sale, Product, Customer, AppSettings } from '../../types';
import Icon from '../../components/Icon';

const { width } = Dimensions.get('window');

export default function ReportsScreen() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('today');
  const [reportData, setReportData] = useState({
    totalSales: 0,
    totalRevenue: 0,
    totalProfit: 0,
    averageOrderValue: 0,
    topProducts: [] as Array<{ product: Product; quantity: number; revenue: number }>,
    salesByPaymentMethod: {} as Record<string, number>,
    dailySales: [] as Array<{ date: string; sales: number; revenue: number }>,
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    calculateReportData();
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
      console.error('Error loading reports data:', error);
    }
  };

  const getDateRange = () => {
    const now = new Date();
    let startDate: Date;

    switch (selectedPeriod) {
      case 'today':
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'month':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 30);
        startDate.setHours(0, 0, 0, 0);
        break;
      default:
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
    }

    return { startDate, endDate: now };
  };

  const calculateReportData = () => {
    const { startDate, endDate } = getDateRange();
    
    // Filter sales by date range
    const filteredSales = sales.filter(sale => {
      const saleDate = new Date(sale.createdAt);
      return saleDate >= startDate && saleDate <= endDate;
    });

    // Calculate basic metrics
    const totalSales = filteredSales.length;
    const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
    
    // Calculate profit (revenue - cost)
    let totalProfit = 0;
    filteredSales.forEach(sale => {
      sale.items.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        if (product) {
          totalProfit += (item.unitPrice - product.cost) * item.quantity;
        }
      });
    });

    const averageOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0;

    // Calculate top products
    const productSales = new Map<string, { quantity: number; revenue: number }>();
    filteredSales.forEach(sale => {
      sale.items.forEach(item => {
        const existing = productSales.get(item.productId) || { quantity: 0, revenue: 0 };
        productSales.set(item.productId, {
          quantity: existing.quantity + item.quantity,
          revenue: existing.revenue + item.subtotal,
        });
      });
    });

    const topProducts = Array.from(productSales.entries())
      .map(([productId, data]) => ({
        product: products.find(p => p.id === productId)!,
        quantity: data.quantity,
        revenue: data.revenue,
      }))
      .filter(item => item.product)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Calculate sales by payment method
    const salesByPaymentMethod: Record<string, number> = {};
    filteredSales.forEach(sale => {
      salesByPaymentMethod[sale.paymentMethod] = 
        (salesByPaymentMethod[sale.paymentMethod] || 0) + sale.total;
    });

    // Calculate daily sales for the period
    const dailySales: Array<{ date: string; sales: number; revenue: number }> = [];
    const days = selectedPeriod === 'today' ? 1 : selectedPeriod === 'week' ? 7 : 30;
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(date);
      nextDate.setDate(date.getDate() + 1);
      
      const daySales = filteredSales.filter(sale => {
        const saleDate = new Date(sale.createdAt);
        return saleDate >= date && saleDate < nextDate;
      });
      
      dailySales.push({
        date: date.toLocaleDateString('fr-FR', { 
          day: '2-digit', 
          month: '2-digit' 
        }),
        sales: daySales.length,
        revenue: daySales.reduce((sum, sale) => sum + sale.total, 0),
      });
    }

    setReportData({
      totalSales,
      totalRevenue,
      totalProfit,
      averageOrderValue,
      topProducts,
      salesByPaymentMethod,
      dailySales,
    });
  };

  const formatCurrency = (amount: number | undefined | null): string => {
    // Handle undefined, null, or invalid numbers
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
      cash: 'Espèces',
      mobile_money: 'Mobile Money',
      credit: 'Crédit',
    };
    return labels[method as keyof typeof labels] || method;
  };

  return (
    <SafeAreaView style={commonStyles.container}>
      <ScrollView style={commonStyles.content}>
        {/* Header */}
        <View style={commonStyles.section}>
          <Text style={commonStyles.title}>Rapports & Analyses</Text>
        </View>

        {/* Period Selection */}
        <View style={commonStyles.section}>
          <Text style={[commonStyles.text, { marginBottom: 12 }]}>Période:</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[
              { key: 'today', label: "Aujourd'hui" },
              { key: 'week', label: '7 derniers jours' },
              { key: 'month', label: '30 derniers jours' },
            ].map(period => (
              <TouchableOpacity
                key={period.key}
                style={[
                  buttonStyles.outline,
                  { flex: 1, paddingVertical: 8 },
                  selectedPeriod === period.key && { 
                    backgroundColor: colors.primary, 
                    borderColor: colors.primary 
                  }
                ]}
                onPress={() => setSelectedPeriod(period.key as any)}
              >
                <Text style={{
                  color: selectedPeriod === period.key ? colors.secondary : colors.primary,
                  fontSize: 14,
                  fontWeight: '600',
                  textAlign: 'center'
                }}>
                  {period.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Key Metrics */}
        <View style={commonStyles.section}>
          <Text style={[commonStyles.subtitle, { marginBottom: 16 }]}>
            Métriques clés
          </Text>
          
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            <View style={[commonStyles.card, { flex: 1, minWidth: 150 }]}>
              <View style={[commonStyles.row, { marginBottom: 8 }]}>
                <Icon name="trending-up" size={20} color={colors.success} />
                <Text style={[commonStyles.textLight, { fontSize: 12 }]}>VENTES</Text>
              </View>
              <Text style={[commonStyles.title, { fontSize: 24, color: colors.success }]}>
                {reportData.totalSales}
              </Text>
            </View>

            <View style={[commonStyles.card, { flex: 1, minWidth: 150 }]}>
              <View style={[commonStyles.row, { marginBottom: 8 }]}>
                <Icon name="cash" size={20} color={colors.primary} />
                <Text style={[commonStyles.textLight, { fontSize: 12 }]}>REVENUS</Text>
              </View>
              <Text style={[commonStyles.title, { fontSize: 18, color: colors.primary }]}>
                {formatCurrency(reportData.totalRevenue)}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12 }}>
            <View style={[commonStyles.card, { flex: 1, minWidth: 150 }]}>
              <View style={[commonStyles.row, { marginBottom: 8 }]}>
                <Icon name="stats-chart" size={20} color={colors.info} />
                <Text style={[commonStyles.textLight, { fontSize: 12 }]}>BÉNÉFICES</Text>
              </View>
              <Text style={[commonStyles.title, { fontSize: 18, color: colors.info }]}>
                {formatCurrency(reportData.totalProfit)}
              </Text>
            </View>

            <View style={[commonStyles.card, { flex: 1, minWidth: 150 }]}>
              <View style={[commonStyles.row, { marginBottom: 8 }]}>
                <Icon name="calculator" size={20} color={colors.warning} />
                <Text style={[commonStyles.textLight, { fontSize: 12 }]}>PANIER MOYEN</Text>
              </View>
              <Text style={[commonStyles.title, { fontSize: 18, color: colors.warning }]}>
                {formatCurrency(reportData.averageOrderValue)}
              </Text>
            </View>
          </View>
        </View>

        {/* Top Products */}
        {reportData.topProducts.length > 0 && (
          <View style={commonStyles.section}>
            <Text style={[commonStyles.subtitle, { marginBottom: 16 }]}>
              Produits les plus vendus
            </Text>
            {reportData.topProducts.map((item, index) => (
              <View key={item.product.id} style={[commonStyles.card, { marginBottom: 8 }]}>
                <View style={commonStyles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={[commonStyles.text, { fontWeight: '600' }]}>
                      #{index + 1} {item.product.name}
                    </Text>
                    <Text style={commonStyles.textLight}>
                      {item.quantity} unités vendues
                    </Text>
                  </View>
                  <Text style={[commonStyles.text, { fontWeight: '600', color: colors.success }]}>
                    {formatCurrency(item.revenue)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Payment Methods */}
        {Object.keys(reportData.salesByPaymentMethod).length > 0 && (
          <View style={commonStyles.section}>
            <Text style={[commonStyles.subtitle, { marginBottom: 16 }]}>
              Ventes par méthode de paiement
            </Text>
            {Object.entries(reportData.salesByPaymentMethod).map(([method, amount]) => (
              <View key={method} style={[commonStyles.card, { marginBottom: 8 }]}>
                <View style={commonStyles.row}>
                  <Text style={[commonStyles.text, { fontWeight: '600' }]}>
                    {getPaymentMethodLabel(method)}
                  </Text>
                  <Text style={[commonStyles.text, { fontWeight: '600', color: colors.primary }]}>
                    {formatCurrency(amount)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Daily Sales Chart */}
        {reportData.dailySales.length > 0 && (
          <View style={commonStyles.section}>
            <Text style={[commonStyles.subtitle, { marginBottom: 16 }]}>
              Évolution des ventes
            </Text>
            <View style={commonStyles.card}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', paddingVertical: 20 }}>
                  {reportData.dailySales.map((day, index) => {
                    const maxRevenue = Math.max(...reportData.dailySales.map(d => d.revenue));
                    const height = maxRevenue > 0 ? (day.revenue / maxRevenue) * 100 + 20 : 20;
                    
                    return (
                      <View key={index} style={{ alignItems: 'center', marginHorizontal: 8 }}>
                        <Text style={[commonStyles.textLight, { fontSize: 10, marginBottom: 4 }]}>
                          {formatCurrency(day.revenue)}
                        </Text>
                        <View
                          style={{
                            width: 30,
                            height,
                            backgroundColor: colors.primary,
                            borderRadius: 4,
                            marginBottom: 8,
                          }}
                        />
                        <Text style={[commonStyles.textLight, { fontSize: 10 }]}>
                          {day.date}
                        </Text>
                        <Text style={[commonStyles.textLight, { fontSize: 8 }]}>
                          {day.sales} ventes
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          </View>
        )}

        {/* Export Options */}
        <View style={commonStyles.section}>
          <Text style={[commonStyles.subtitle, { marginBottom: 16 }]}>
            Exporter les données
          </Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity
              style={[buttonStyles.outline, { flex: 1 }]}
              onPress={() => {
                // TODO: Implement PDF export
                console.log('Export PDF not implemented yet');
              }}
            >
              <Icon name="document" size={16} color={colors.primary} style={{ marginBottom: 4 }} />
              <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '600' }}>
                Exporter PDF
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[buttonStyles.outline, { flex: 1 }]}
              onPress={() => {
                // TODO: Implement Excel export
                console.log('Export Excel not implemented yet');
              }}
            >
              <Icon name="grid" size={16} color={colors.primary} style={{ marginBottom: 4 }} />
              <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '600' }}>
                Exporter Excel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
