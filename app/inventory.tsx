
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  RefreshControl,
  Dimensions,
  StyleSheet,
  Alert,
  Modal,
  TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { commonStyles, colors, spacing, fontSizes, isSmallScreen } from '../styles/commonStyles';
import { Product, Sale, Category, AppSettings } from '../types';
import { getProducts, getSales, getCategories, getSettings, storeProducts } from '../utils/storage';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import Icon from '../components/Icon';
import { useDashboardSync } from '../hooks/useCustomersSync';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

interface InventoryStats {
  totalProducts: number;
  totalValue: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  totalStock: number;
  averageStockValue: number;
  topValueProducts: { product: Product; value: number }[];
  lowStockAlerts: Product[];
  categoryBreakdown: { category: string; count: number; value: number; color: string }[];
  stockMovements: { date: string; in: number; out: number }[];
  recentMovements: { 
    type: 'sale' | 'restock'; 
    product: Product; 
    quantity: number; 
    date: Date; 
    value: number;
  }[];
}

interface StockMovement {
  productId: string;
  productName: string;
  type: 'in' | 'out';
  quantity: number;
  date: Date;
  reason: string;
  value: number;
}

const { width: screenWidth } = Dimensions.get('window');

const styles = StyleSheet.create({
  chartContainer: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    elevation: 2,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statCard: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    elevation: 2,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  alertCard: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
    elevation: 1,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  movementCard: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    borderLeftWidth: 3,
    elevation: 1,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
});

export default function InventoryScreen() {
  const [inventoryStats, setInventoryStats] = useState<InventoryStats | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const [showStockModal, setShowStockModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [stockAdjustment, setStockAdjustment] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');

  const { dashboardLastUpdate } = useDashboardSync();

  const loadData = useCallback(async () => {
    try {
      console.log('Loading inventory data...');
      const [productsData, salesData, categoriesData, settingsData] = await Promise.all([
        getProducts(),
        getSales(),
        getCategories(),
        getSettings(),
      ]);

      setProducts(productsData);
      setCategories(categoriesData);
      setSettings(settingsData);

      // Calculate inventory statistics
      const stats = calculateInventoryStats(productsData, salesData, categoriesData, selectedPeriod);
      setInventoryStats(stats);

      console.log(`Loaded inventory data: ${productsData.length} products, ${salesData.length} sales`);
    } catch (error) {
      console.error('Error loading inventory data:', error);
      Alert.alert('Erreur', 'Erreur lors du chargement des données d\'inventaire');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedPeriod]);

  useEffect(() => {
    loadData();
  }, [loadData, dashboardLastUpdate]);

  const calculateInventoryStats = (
    products: Product[], 
    sales: Sale[], 
    categories: Category[],
    period: '7d' | '30d' | '90d'
  ): InventoryStats => {
    const now = new Date();
    const periodDays = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const periodStart = subDays(now, periodDays);

    // Basic stats
    const totalProducts = products.length;
    const totalValue = products.reduce((sum, p) => sum + (p.stock * p.retailPrice), 0);
    const lowStockProducts = products.filter(p => p.stock <= p.minStock && p.stock > 0).length;
    const outOfStockProducts = products.filter(p => p.stock === 0).length;
    const totalStock = products.reduce((sum, p) => sum + p.stock, 0);
    const averageStockValue = totalProducts > 0 ? totalValue / totalProducts : 0;

    // Top value products
    const topValueProducts = products
      .map(p => ({ product: p, value: p.stock * p.retailPrice }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // Low stock alerts
    const lowStockAlerts = products
      .filter(p => p.stock <= p.minStock)
      .sort((a, b) => (a.stock / a.minStock) - (b.stock / b.minStock))
      .slice(0, 10);

    // Category breakdown
    const categoryMap = new Map<string, Category>();
    categories.forEach(cat => categoryMap.set(cat.id, cat));

    const categoryBreakdown = categories.map(category => {
      const categoryProducts = products.filter(p => p.categoryId === category.id);
      const count = categoryProducts.length;
      const value = categoryProducts.reduce((sum, p) => sum + (p.stock * p.retailPrice), 0);
      return {
        category: category.name,
        count,
        value,
        color: category.color || colors.primary,
      };
    }).filter(cb => cb.count > 0);

    // Stock movements (sales in the period)
    const periodSales = sales.filter(sale => 
      new Date(sale.createdAt) >= periodStart && new Date(sale.createdAt) <= now
    );

    const stockMovements: { date: string; in: number; out: number }[] = [];
    for (let i = periodDays - 1; i >= 0; i--) {
      const date = subDays(now, i);
      const dateStr = format(date, 'dd/MM', { locale: fr });
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);
      
      const daySales = periodSales.filter(sale => {
        const saleDate = new Date(sale.createdAt);
        return saleDate >= dayStart && saleDate <= dayEnd;
      });

      const out = daySales.reduce((sum, sale) => 
        sum + sale.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0
      );

      stockMovements.push({ date: dateStr, in: 0, out });
    }

    // Recent movements (last 20 sales)
    const recentSales = sales
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 20);

    const recentMovements: InventoryStats['recentMovements'] = [];
    recentSales.forEach(sale => {
      sale.items.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        if (product) {
          recentMovements.push({
            type: 'sale',
            product,
            quantity: item.quantity,
            date: new Date(sale.createdAt),
            value: item.subtotal,
          });
        }
      });
    });

    return {
      totalProducts,
      totalValue,
      lowStockProducts,
      outOfStockProducts,
      totalStock,
      averageStockValue,
      topValueProducts,
      lowStockAlerts,
      categoryBreakdown,
      stockMovements,
      recentMovements: recentMovements.slice(0, 10),
    };
  };

  const formatCurrency = (amount: number): string => {
    if (!settings) return amount.toString();
    const { symbol, decimals } = {
      XOF: { symbol: 'F CFA', decimals: 0 },
      USD: { symbol: '$', decimals: 2 },
      EUR: { symbol: '€', decimals: 2 },
    }[settings.currency] || { symbol: 'F CFA', decimals: 0 };
    
    return `${amount.toLocaleString('fr-FR', { 
      minimumFractionDigits: decimals, 
      maximumFractionDigits: decimals 
    })} ${symbol}`;
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleStockAdjustment = async () => {
    if (!selectedProduct || !stockAdjustment.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir une quantité valide');
      return;
    }

    let newStock: number;
    
    if (stockAdjustment === '0') {
      // Reset to 0
      newStock = 0;
    } else {
      const adjustment = parseInt(stockAdjustment);
      if (isNaN(adjustment)) {
        Alert.alert('Erreur', 'Veuillez saisir un nombre valide');
        return;
      }
      newStock = Math.max(0, selectedProduct.stock + adjustment);
    }

    try {
      const updatedProducts = products.map(p => 
        p.id === selectedProduct.id 
          ? { ...p, stock: newStock, updatedAt: new Date() }
          : p
      );

      await storeProducts(updatedProducts);
      setProducts(updatedProducts);
      
      // Recalculate stats
      const sales = await getSales();
      const stats = calculateInventoryStats(updatedProducts, sales, categories, selectedPeriod);
      setInventoryStats(stats);

      setShowStockModal(false);
      setSelectedProduct(null);
      setStockAdjustment('');
      setAdjustmentReason('');

      Alert.alert('Succès', `Stock mis à jour: ${selectedProduct.stock} → ${newStock} ${selectedProduct.unit}`);
    } catch (error) {
      console.error('Error updating stock:', error);
      Alert.alert('Erreur', 'Erreur lors de la mise à jour du stock');
    }
  };

  const exportInventoryData = async () => {
    try {
      if (!inventoryStats) return;

      const csvData = [
        ['Nom du Produit', 'Catégorie', 'Stock Actuel', 'Stock Minimum', 'Unité', 'Prix Unitaire', 'Valeur Stock', 'Statut'],
        ...products.map(product => {
          const category = categories.find(cat => cat.id === product.categoryId);
          const stockValue = product.stock * product.retailPrice;
          const status = product.stock <= 0 ? 'Rupture' : product.stock <= product.minStock ? 'Stock bas' : 'En stock';
          
          return [
            product.name,
            category?.name || 'N/A',
            product.stock.toString(),
            product.minStock.toString(),
            product.unit,
            formatCurrency(product.retailPrice),
            formatCurrency(stockValue),
            status
          ];
        })
      ];

      const csvContent = csvData.map(row => row.join(',')).join('\n');
      const fileName = `inventaire_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.csv`;
      const documentDir = (FileSystem as any).documentDirectory;
      const fileUri = documentDir + fileName;

      const encodingType = (FileSystem as any).EncodingType?.UTF8 || 'utf8';
      await FileSystem.writeAsStringAsync(fileUri, csvContent, {
        encoding: encodingType,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Exporter les données d\'inventaire',
        });
      } else {
        Alert.alert('Succès', `Fichier sauvegardé: ${fileName}`);
      }
    } catch (error) {
      console.error('Error exporting inventory data:', error);
      Alert.alert('Erreur', 'Erreur lors de l\'export des données');
    }
  };

  const renderSummaryCard = ({ title, value, subtitle, icon, color = colors.primary }: {
    title: string;
    value: string;
    subtitle?: string;
    icon: string;
    color?: string;
  }) => (
    <View style={[styles.statCard, { flex: 1, marginHorizontal: spacing.xs }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
        <View style={{
          width: 40,
          height: 40,
          backgroundColor: `${color}20`,
          borderRadius: 20,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: spacing.sm,
        }}>
          <Icon name={icon} size={20} color={color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[commonStyles.text, { fontSize: fontSizes.sm, color: colors.textLight }]}>
            {title}
          </Text>
          <Text style={[commonStyles.text, { fontSize: fontSizes.lg, fontWeight: '700', color }]}>
            {value}
          </Text>
          {subtitle && (
            <Text style={[commonStyles.text, { fontSize: fontSizes.xs, color: colors.textLight }]}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>
    </View>
  );

  const renderStockMovementChart = () => {
    if (!inventoryStats || inventoryStats.stockMovements.length === 0) return null;

    const chartData = {
      labels: inventoryStats.stockMovements.map(m => m.date),
      datasets: [
        {
          data: inventoryStats.stockMovements.map(m => m.out),
          color: (opacity = 1) => `rgba(231, 76, 60, ${opacity})`,
          strokeWidth: 3,
        },
      ],
    };

    return (
      <View style={styles.chartContainer}>
        <Text style={[commonStyles.subtitle, { marginBottom: spacing.md }]}>
          📈 Mouvements de Stock ({selectedPeriod})
        </Text>
        <LineChart
          data={chartData}
          width={screenWidth - 60}
          height={200}
          chartConfig={{
            backgroundColor: colors.background,
            backgroundGradientFrom: colors.background,
            backgroundGradientTo: colors.background,
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(231, 76, 60, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(${colors.text === '#000000' ? '0, 0, 0' : '255, 255, 255'}, ${opacity})`,
            style: { borderRadius: 16 },
            propsForDots: {
              r: '4',
              strokeWidth: '2',
              stroke: colors.error,
            },
          }}
          bezier
          style={{ borderRadius: 16 }}
        />
        <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: spacing.sm }}>
          {['7d', '30d', '90d'].map(period => (
            <TouchableOpacity
              key={period}
              style={{
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.xs,
                backgroundColor: selectedPeriod === period ? colors.primary : colors.backgroundAlt,
                borderRadius: 20,
                marginHorizontal: spacing.xs,
              }}
              onPress={() => setSelectedPeriod(period as '7d' | '30d' | '90d')}
            >
              <Text style={{
                color: selectedPeriod === period ? colors.secondary : colors.text,
                fontSize: fontSizes.sm,
                fontWeight: '600',
              }}>
                {period}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderCategoryChart = () => {
    if (!inventoryStats || inventoryStats.categoryBreakdown.length === 0) return null;

    const chartData = inventoryStats.categoryBreakdown.map((item, index) => ({
      name: item.category,
      population: item.count,
      color: item.color,
      legendFontColor: colors.text,
      legendFontSize: 12,
    }));

    return (
      <View style={styles.chartContainer}>
        <Text style={[commonStyles.subtitle, { marginBottom: spacing.md }]}>
          🏷️ Répartition par Catégorie
        </Text>
        <PieChart
          data={chartData}
          width={screenWidth - 60}
          height={200}
          chartConfig={{
            color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
          }}
          accessor="population"
          backgroundColor="transparent"
          paddingLeft="15"
          absolute
        />
      </View>
    );
  };

  const renderTopProductsChart = () => {
    if (!inventoryStats || inventoryStats.topValueProducts.length === 0) return null;

    const chartData = {
      labels: inventoryStats.topValueProducts.map(item => 
        item.product.name.length > 10 
          ? item.product.name.substring(0, 10) + '...' 
          : item.product.name
      ),
      datasets: [{
        data: inventoryStats.topValueProducts.map(item => item.value),
      }],
    };

    return (
      <View style={styles.chartContainer}>
        <Text style={[commonStyles.subtitle, { marginBottom: spacing.md }]}>
          💰 Top Produits par Valeur
        </Text>
        <BarChart
          data={chartData}
          width={screenWidth - 60}
          height={200}
          yAxisLabel=""
          yAxisSuffix=""
          chartConfig={{
            backgroundColor: colors.background,
            backgroundGradientFrom: colors.background,
            backgroundGradientTo: colors.background,
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(52, 152, 219, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(${colors.text === '#000000' ? '0, 0, 0' : '255, 255, 255'}, ${opacity})`,
            style: { borderRadius: 16 },
          }}
          style={{ borderRadius: 16 }}
        />
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={commonStyles.container}>
        <View style={[commonStyles.content, { justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={commonStyles.text}>Chargement de l'inventaire...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={commonStyles.container}>
      <View style={commonStyles.content}>
        {/* Header */}
        <View style={[commonStyles.section, { flexDirection: 'row', alignItems: 'center' }]}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ marginRight: spacing.md }}
          >
            <Icon name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={commonStyles.title}>📦 Inventaire</Text>
            <Text style={[commonStyles.textLight, { fontSize: fontSizes.sm }]}>
              Gestion complète du stock
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/categories')}
            style={{
              backgroundColor: colors.backgroundAlt,
              borderRadius: 20,
              padding: spacing.sm,
              marginRight: spacing.sm,
            }}
          >
            <Icon name="folder" size={20} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={exportInventoryData}
            style={{
              backgroundColor: colors.success,
              borderRadius: 20,
              padding: spacing.sm,
              marginRight: spacing.sm,
            }}
          >
            <Icon name="download" size={20} color={colors.secondary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleRefresh}
            style={{
              backgroundColor: colors.primary,
              borderRadius: 20,
              padding: spacing.sm,
            }}
          >
            <Icon name="refresh" size={20} color={colors.secondary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          showsVerticalScrollIndicator={false}
        >
          {inventoryStats && (
            <>
              {/* Summary Cards */}
              <View style={{ paddingHorizontal: spacing.lg }}>
                <View style={{ flexDirection: 'row', marginBottom: spacing.md }}>
                  {renderSummaryCard({
                    title: 'Produits',
                    value: inventoryStats.totalProducts.toString(),
                    subtitle: 'Total articles',
                    icon: 'cube',
                    color: colors.primary,
                  })}
                  {renderSummaryCard({
                    title: 'Valeur Stock',
                    value: formatCurrency(inventoryStats.totalValue),
                    subtitle: 'Valeur totale',
                    icon: 'cash',
                    color: colors.success,
                  })}
                </View>

                <View style={{ flexDirection: 'row', marginBottom: spacing.md }}>
                  {renderSummaryCard({
                    title: 'Stock Bas',
                    value: inventoryStats.lowStockProducts.toString(),
                    subtitle: 'Alertes stock',
                    icon: 'warning',
                    color: colors.warning,
                  })}
                  {renderSummaryCard({
                    title: 'Rupture',
                    value: inventoryStats.outOfStockProducts.toString(),
                    subtitle: 'Stock épuisé',
                    icon: 'close-circle',
                    color: colors.error,
                  })}
                </View>
              </View>

              {/* Charts */}
              <View style={{ paddingHorizontal: spacing.lg }}>
                {renderStockMovementChart()}
                {renderTopProductsChart()}
                {renderCategoryChart()}
              </View>

              {/* Filters */}
              <View style={{ paddingHorizontal: spacing.lg }}>
                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: colors.backgroundAlt,
                    borderRadius: 12,
                    padding: spacing.md,
                    marginBottom: spacing.md,
                  }}
                  onPress={() => setShowFilters(!showFilters)}
                >
                  <Icon name="filter" size={20} color={colors.primary} />
                  <Text style={[commonStyles.text, { marginLeft: spacing.sm, flex: 1 }]}>
                    Filtres et Options
                  </Text>
                  <Icon name={showFilters ? "chevron-up" : "chevron-down"} size={20} color={colors.textLight} />
                </TouchableOpacity>

                {showFilters && (
                  <View style={[commonStyles.card, { marginBottom: spacing.md }]}>
                    <Text style={[commonStyles.text, { fontWeight: '600', marginBottom: spacing.sm }]}>
                      🏷️ Filtrer par catégorie
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
                      <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                        <TouchableOpacity
                          style={{
                            paddingHorizontal: spacing.md,
                            paddingVertical: spacing.xs,
                            backgroundColor: selectedCategory === 'all' ? colors.primary : colors.backgroundAlt,
                            borderRadius: 20,
                          }}
                          onPress={() => setSelectedCategory('all')}
                        >
                          <Text style={{
                            color: selectedCategory === 'all' ? colors.secondary : colors.text,
                            fontSize: fontSizes.sm,
                            fontWeight: '600',
                          }}>
                            Toutes
                          </Text>
                        </TouchableOpacity>
                        {categories.map(category => (
                          <TouchableOpacity
                            key={category.id}
                            style={{
                              paddingHorizontal: spacing.md,
                              paddingVertical: spacing.xs,
                              backgroundColor: selectedCategory === category.id ? category.color : colors.backgroundAlt,
                              borderRadius: 20,
                            }}
                            onPress={() => setSelectedCategory(category.id)}
                          >
                            <Text style={{
                              color: selectedCategory === category.id ? colors.secondary : colors.text,
                              fontSize: fontSizes.sm,
                              fontWeight: '600',
                            }}>
                              {category.name}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>

                    <Text style={[commonStyles.text, { fontWeight: '600', marginBottom: spacing.sm }]}>
                      📊 Filtrer par stock
                    </Text>
                    <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                      {[
                        { key: 'all', label: 'Tous', icon: 'cube' },
                        { key: 'low', label: 'Stock bas', icon: 'warning' },
                        { key: 'out', label: 'Rupture', icon: 'close-circle' },
                      ].map(filter => (
                        <TouchableOpacity
                          key={filter.key}
                          style={{
                            flex: 1,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            paddingVertical: spacing.sm,
                            backgroundColor: stockFilter === filter.key ? colors.primary : colors.backgroundAlt,
                            borderRadius: 8,
                          }}
                          onPress={() => setStockFilter(filter.key as 'all' | 'low' | 'out')}
                        >
                          <Icon 
                            name={filter.icon} 
                            size={16} 
                            color={stockFilter === filter.key ? colors.secondary : colors.text} 
                          />
                          <Text style={{
                            color: stockFilter === filter.key ? colors.secondary : colors.text,
                            fontSize: fontSizes.xs,
                            fontWeight: '600',
                            marginLeft: spacing.xs,
                          }}>
                            {filter.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </View>

              {/* Filtered Products List */}
              <View style={{ paddingHorizontal: spacing.lg }}>
                <Text style={[commonStyles.subtitle, { marginBottom: spacing.md }]}>
                  📦 Produits en Stock
                </Text>
                {products
                  .filter(product => {
                    // Category filter
                    if (selectedCategory !== 'all' && product.categoryId !== selectedCategory) return false;
                    
                    // Stock filter
                    if (stockFilter === 'low' && product.stock > product.minStock) return false;
                    if (stockFilter === 'out' && product.stock > 0) return false;
                    
                    return true;
                  })
                  .slice(0, 10) // Show only first 10 products
                  .map(product => {
                    const category = categories.find(cat => cat.id === product.categoryId);
                    const stockStatus = product.stock <= 0 ? 'out' : product.stock <= product.minStock ? 'low' : 'good';
                    const statusColor = stockStatus === 'out' ? colors.error : stockStatus === 'low' ? colors.warning : colors.success;
                    
                    return (
                      <View key={product.id} style={[styles.movementCard, { borderLeftColor: statusColor }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <View style={{ flex: 1 }}>
                            <Text style={[commonStyles.text, { fontWeight: '600', fontSize: fontSizes.sm }]}>
                              {product.name}
                            </Text>
                            <Text style={[commonStyles.textLight, { fontSize: fontSizes.xs }]}>
                              {category?.name} • {product.stock} {product.unit} (Min: {product.minStock})
                            </Text>
                            <Text style={[commonStyles.textLight, { fontSize: fontSizes.xs }]}>
                              Valeur: {formatCurrency(product.stock * product.retailPrice)}
                            </Text>
                          </View>
                          <View style={{ alignItems: 'flex-end' }}>
                            <Text style={[
                              commonStyles.text, 
                              { 
                                fontSize: fontSizes.sm, 
                                fontWeight: '600',
                                color: statusColor 
                              }
                            ]}>
                              {stockStatus === 'out' ? 'Rupture' : stockStatus === 'low' ? 'Stock bas' : 'En stock'}
                            </Text>
                            <TouchableOpacity
                              style={{
                                backgroundColor: colors.primary,
                                borderRadius: 15,
                                paddingHorizontal: spacing.sm,
                                paddingVertical: 4,
                                marginTop: 4,
                              }}
                              onPress={() => {
                                setSelectedProduct(product);
                                setShowStockModal(true);
                              }}
                            >
                              <Text style={{ color: colors.secondary, fontSize: fontSizes.xs, fontWeight: '600' }}>
                                Ajuster
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                
                {products.filter(product => {
                  if (selectedCategory !== 'all' && product.categoryId !== selectedCategory) return false;
                  if (stockFilter === 'low' && product.stock > product.minStock) return false;
                  if (stockFilter === 'out' && product.stock > 0) return false;
                  return true;
                }).length > 10 && (
                  <TouchableOpacity
                    style={{
                      backgroundColor: colors.backgroundAlt,
                      borderRadius: 8,
                      padding: spacing.md,
                      alignItems: 'center',
                      marginBottom: spacing.md,
                    }}
                    onPress={() => router.push('/products')}
                  >
                    <Text style={[commonStyles.text, { color: colors.primary, fontWeight: '600' }]}>
                      Voir tous les produits ({products.length - 10} de plus)
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Low Stock Alerts */}
              {inventoryStats.lowStockAlerts.length > 0 && (
                <View style={{ paddingHorizontal: spacing.lg }}>
                  <Text style={[commonStyles.subtitle, { marginBottom: spacing.md }]}>
                    ⚠️ Alertes Stock Bas
                  </Text>
                  {inventoryStats.lowStockAlerts.slice(0, 5).map(product => (
                    <View key={product.id} style={styles.alertCard}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ flex: 1 }}>
                          <Text style={[commonStyles.text, { fontWeight: '600', marginBottom: 4 }]}>
                            {product.name}
                          </Text>
                          <Text style={[commonStyles.textLight, { fontSize: fontSizes.sm }]}>
                            Stock: {product.stock} / Min: {product.minStock}
                          </Text>
                          <Text style={[commonStyles.textLight, { fontSize: fontSizes.xs }]}>
                            Valeur: {formatCurrency(product.stock * product.retailPrice)}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={{
                            backgroundColor: colors.primary,
                            borderRadius: 20,
                            paddingHorizontal: spacing.sm,
                            paddingVertical: spacing.xs,
                          }}
                          onPress={() => {
                            setSelectedProduct(product);
                            setShowStockModal(true);
                          }}
                        >
                          <Text style={{ color: colors.secondary, fontSize: fontSizes.sm, fontWeight: '600' }}>
                            Ajuster
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                  {inventoryStats.lowStockAlerts.length > 5 && (
                    <TouchableOpacity
                      style={{
                        backgroundColor: colors.backgroundAlt,
                        borderRadius: 8,
                        padding: spacing.sm,
                        alignItems: 'center',
                        marginTop: spacing.sm,
                      }}
                    >
                      <Text style={[commonStyles.text, { color: colors.warning, fontWeight: '600', fontSize: fontSizes.sm }]}>
                        +{inventoryStats.lowStockAlerts.length - 5} autres alertes
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Recent Movements */}
              {inventoryStats.recentMovements.length > 0 && (
                <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.xl }}>
                  <Text style={[commonStyles.subtitle, { marginBottom: spacing.md }]}>
                    🔄 Mouvements Récents
                  </Text>
                  {inventoryStats.recentMovements.map((movement, index) => (
                    <View 
                      key={index} 
                      style={[
                        styles.movementCard,
                        { borderLeftColor: movement.type === 'sale' ? colors.error : colors.success }
                      ]}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ flex: 1 }}>
                          <Text style={[commonStyles.text, { fontWeight: '600', fontSize: fontSizes.sm }]}>
                            {movement.product.name}
                          </Text>
                          <Text style={[commonStyles.textLight, { fontSize: fontSizes.xs }]}>
                            {movement.type === 'sale' ? '📤 Vente' : '📥 Réapprovisionnement'} • {movement.quantity} unités
                          </Text>
                          <Text style={[commonStyles.textLight, { fontSize: fontSizes.xs }]}>
                            {format(movement.date, 'dd/MM/yyyy HH:mm', { locale: fr })}
                          </Text>
                        </View>
                        <Text style={[
                          commonStyles.text, 
                          { 
                            fontSize: fontSizes.sm, 
                            fontWeight: '600',
                            color: movement.type === 'sale' ? colors.error : colors.success 
                          }
                        ]}>
                          {movement.type === 'sale' ? '-' : '+'}{formatCurrency(movement.value)}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}
        </ScrollView>
      </View>

      {/* Stock Adjustment Modal */}
      <Modal
        visible={showStockModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowStockModal(false)}
      >
        <View style={{ 
          flex: 1, 
          backgroundColor: 'rgba(0,0,0,0.5)', 
          justifyContent: 'center', 
          alignItems: 'center' 
        }}>
          <View style={[commonStyles.card, { width: '90%', maxWidth: 400 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg }}>
              <Text style={[commonStyles.subtitle, { flex: 1 }]}>
                📦 Ajuster le Stock
              </Text>
              <TouchableOpacity onPress={() => setShowStockModal(false)}>
                <Icon name="close" size={24} color={colors.textLight} />
              </TouchableOpacity>
            </View>

            {selectedProduct && (
              <>
                <View style={{ marginBottom: spacing.md }}>
                  <Text style={[commonStyles.text, { fontWeight: '600', marginBottom: spacing.xs }]}>
                    {selectedProduct.name}
                  </Text>
                  <Text style={[commonStyles.textLight, { fontSize: fontSizes.sm }]}>
                    Stock actuel: {selectedProduct.stock} {selectedProduct.unit}
                  </Text>
                </View>

                <View style={{ marginBottom: spacing.md }}>
                  <Text style={[commonStyles.text, { marginBottom: spacing.xs, fontWeight: '600' }]}>
                    Ajustement (+ ou -)
                  </Text>
                  <TextInput
                    style={commonStyles.input}
                    value={stockAdjustment}
                    onChangeText={setStockAdjustment}
                    placeholder="Ex: +10 ou -5"
                    keyboardType="numeric"
                  />
                </View>

                <View style={{ marginBottom: spacing.md }}>
                  <Text style={[commonStyles.text, { marginBottom: spacing.xs, fontWeight: '600' }]}>
                    Raison de l'ajustement
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.sm }}>
                    {[
                      'Réapprovisionnement',
                      'Correction d\'inventaire',
                      'Produit défectueux',
                      'Vol/Perte',
                      'Retour client',
                      'Autre'
                    ].map(reason => (
                      <TouchableOpacity
                        key={reason}
                        style={{
                          paddingHorizontal: spacing.sm,
                          paddingVertical: spacing.xs,
                          backgroundColor: adjustmentReason === reason ? colors.primary : colors.backgroundAlt,
                          borderRadius: 15,
                        }}
                        onPress={() => setAdjustmentReason(reason)}
                      >
                        <Text style={{
                          color: adjustmentReason === reason ? colors.secondary : colors.text,
                          fontSize: fontSizes.xs,
                          fontWeight: '600',
                        }}>
                          {reason}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {adjustmentReason === 'Autre' && (
                    <TextInput
                      style={commonStyles.input}
                      placeholder="Précisez la raison..."
                      onChangeText={(text) => setAdjustmentReason(`Autre: ${text}`)}
                    />
                  )}
                </View>

                <View style={{ marginBottom: spacing.lg }}>
                  <Text style={[commonStyles.text, { marginBottom: spacing.xs, fontWeight: '600' }]}>
                    Actions rapides
                  </Text>
                  <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                    <TouchableOpacity
                      style={{
                        flex: 1,
                        backgroundColor: colors.success,
                        borderRadius: 8,
                        padding: spacing.sm,
                        alignItems: 'center',
                      }}
                      onPress={() => {
                        setStockAdjustment('+10');
                        setAdjustmentReason('Réapprovisionnement');
                      }}
                    >
                      <Text style={{ color: colors.secondary, fontSize: fontSizes.xs, fontWeight: '600' }}>
                        +10
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{
                        flex: 1,
                        backgroundColor: colors.success,
                        borderRadius: 8,
                        padding: spacing.sm,
                        alignItems: 'center',
                      }}
                      onPress={() => {
                        setStockAdjustment('+50');
                        setAdjustmentReason('Réapprovisionnement');
                      }}
                    >
                      <Text style={{ color: colors.secondary, fontSize: fontSizes.xs, fontWeight: '600' }}>
                        +50
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{
                        flex: 1,
                        backgroundColor: colors.error,
                        borderRadius: 8,
                        padding: spacing.sm,
                        alignItems: 'center',
                      }}
                      onPress={() => {
                        setStockAdjustment('-1');
                        setAdjustmentReason('Produit défectueux');
                      }}
                    >
                      <Text style={{ color: colors.secondary, fontSize: fontSizes.xs, fontWeight: '600' }}>
                        -1
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{
                        flex: 1,
                        backgroundColor: colors.warning,
                        borderRadius: 8,
                        padding: spacing.sm,
                        alignItems: 'center',
                      }}
                      onPress={() => {
                        setStockAdjustment('0');
                        setAdjustmentReason('Correction d\'inventaire');
                      }}
                    >
                      <Text style={{ color: colors.secondary, fontSize: fontSizes.xs, fontWeight: '600' }}>
                        Reset
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  <TouchableOpacity
                    style={[commonStyles.button, { flex: 1, backgroundColor: colors.backgroundAlt }]}
                    onPress={() => setShowStockModal(false)}
                  >
                    <Text style={[commonStyles.buttonText, { color: colors.text }]}>
                      Annuler
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[commonStyles.button, { flex: 1, backgroundColor: colors.primary }]}
                    onPress={handleStockAdjustment}
                  >
                    <Text style={[commonStyles.buttonText, { color: colors.secondary }]}>
                      Confirmer
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
