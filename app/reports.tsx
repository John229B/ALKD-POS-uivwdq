
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
  Platform,
  StyleSheet,
  Animated
} from 'react-native';
import { commonStyles, colors, spacing, fontSizes, isSmallScreen } from '../styles/commonStyles';
import Icon from '../components/Icon';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Sharing from 'expo-sharing';
import { router } from 'expo-router';
import { getSales, getProducts, getCustomers, getSettings, getCategories, getEmployees } from '../utils/storage';
import { Sale, Product, Customer, AppSettings, Category } from '../types';
import { AuthUser } from '../types/auth';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as FileSystem from 'expo-file-system';
import { useCustomersSync, useDashboardSync } from '../hooks/useCustomersSync';
import { useAuthState } from '../hooks/useAuth';
import { cashierSyncService } from '../utils/cashierSyncService';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';

interface ReportFilters {
  dateRange: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
  paymentMethods: string[];
  creditStatus: string[];
  customerId?: string;
  employeeId?: string;
  productId?: string;
  categoryId?: string;
  debtType?: 'gave' | 'took' | 'all';
  startDate?: Date;
  endDate?: Date;
}

interface ReportData {
  totalRevenue: number;
  totalSales: number;
  averageOrderValue: number;
  totalDebts: number;
  totalAdvances: number;
  totalJaiDonne: number;
  totalJaiPris: number;
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
  employeePerformance: {
    employee: string;
    sales: number;
    revenue: number;
  }[];
  debtAnalysis: {
    totalGave: number;
    totalTook: number;
    netBalance: number;
  };
  filterBreakdown: {
    clients: { name: string; amount: number; color: string }[];
    products: { name: string; amount: number; color: string }[];
    employees: { name: string; amount: number; color: string }[];
    categories: { name: string; amount: number; color: string }[];
    paymentMethods: { name: string; amount: number; color: string }[];
  };
}

const styles = StyleSheet.create({
  syncStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    marginBottom: spacing.md,
  },
  syncStatusText: {
    marginLeft: spacing.sm,
    fontSize: fontSizes.sm,
    color: colors.primary,
    fontWeight: '600',
  },
  cashierHeader: {
    backgroundColor: colors.warning + '20',
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.lg,
  },
  cashierHeaderText: {
    color: colors.warning,
    fontSize: fontSizes.md,
    fontWeight: '600',
    textAlign: 'center',
  },
  restrictedAccess: {
    backgroundColor: colors.error + '20',
    padding: spacing.lg,
    borderRadius: 8,
    alignItems: 'center',
    margin: spacing.lg,
  },
  restrictedText: {
    color: colors.error,
    fontSize: fontSizes.md,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});

const getPaymentMethodLabel = (method: string): string => {
  switch (method) {
    case 'cash': return 'Espèces';
    case 'mobile_money': return 'Mobile Money';
    case 'credit': return 'Crédit';
    case 'card': return 'Carte';
    default: return method;
  }
};

export default function ReportsScreen() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [employees, setEmployees] = useState<AuthUser[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState<'start' | 'end' | null>(null);
  const [animatedValue] = useState(new Animated.Value(0));
  const [syncStatus, setSyncStatus] = useState<{
    lastSyncTime: Date | null;
    pendingCount: number;
    failedCount: number;
  }>({ lastSyncTime: null, pendingCount: 0, failedCount: 0 });

  const { user } = useAuthState();
  const { customersLastUpdate } = useCustomersSync();
  const { dashboardLastUpdate } = useDashboardSync();

  const [filters, setFilters] = useState<ReportFilters>({
    dateRange: 'month',
    paymentMethods: [],
    creditStatus: [],
    debtType: 'all',
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      console.log('Loading reports data...');

      const [salesData, productsData, customersData, settingsData, categoriesData, employeesData] = await Promise.all([
        getSales(),
        getProducts(),
        getCustomers(),
        getSettings(),
        getCategories(),
        getEmployees(),
      ]);

      // Filter sales based on user role
      let filteredSales = salesData;
      if (user?.role === 'cashier') {
        // Cashiers can only see their own sales
        filteredSales = salesData.filter(sale => sale.employeeId === user.id);
        console.log(`Filtered ${filteredSales.length} sales for cashier ${user.username}`);
      }

      setSales(filteredSales);
      setProducts(productsData);
      setCustomers(customersData);
      setSettings(settingsData);
      setCategories(categoriesData);
      setEmployees(employeesData);

      // Load sync status for cashiers
      if (user?.role === 'cashier') {
        const status = await cashierSyncService.getSyncStatus();
        setSyncStatus(status);
      }

      console.log('Reports data loaded successfully');
    } catch (error) {
      console.error('Error loading reports data:', error);
      Alert.alert('Erreur', 'Impossible de charger les données des rapports');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    loadData();
  }, [customersLastUpdate, loadData]);

  useEffect(() => {
    loadData();
  }, [dashboardLastUpdate, loadData]);

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: false,
    }).start();
  }, [loadData, animatedValue]);

  // Initialize cashier sync service
  useEffect(() => {
    if (user?.role === 'cashier') {
      cashierSyncService.initialize();
      return () => {
        cashierSyncService.stop();
      };
    }
  }, [user]);

  const reportData = useMemo((): ReportData => {
    if (!sales.length || !products.length || !customers.length) {
      return {
        totalRevenue: 0,
        totalSales: 0,
        averageOrderValue: 0,
        totalDebts: 0,
        totalAdvances: 0,
        totalJaiDonne: 0,
        totalJaiPris: 0,
        topProducts: [],
        paymentMethodBreakdown: [],
        creditAnalysis: { totalCredit: 0, partiallyPaid: 0, fullyPaid: 0 },
        dailyTrends: [],
        categoryPerformance: [],
        employeePerformance: [],
        debtAnalysis: { totalGave: 0, totalTook: 0, netBalance: 0 },
        filterBreakdown: { clients: [], products: [], employees: [], categories: [], paymentMethods: [] },
      };
    }

    // Apply date filters
    let filteredSales = sales;
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (filters.dateRange) {
      case 'today':
        filteredSales = sales.filter(sale => sale.date >= startOfToday);
        break;
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        filteredSales = sales.filter(sale => sale.date >= weekAgo);
        break;
      case 'month':
        const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        filteredSales = sales.filter(sale => sale.date >= monthAgo);
        break;
      case 'quarter':
        const quarterAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        filteredSales = sales.filter(sale => sale.date >= quarterAgo);
        break;
      case 'year':
        const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        filteredSales = sales.filter(sale => sale.date >= yearAgo);
        break;
      case 'custom':
        if (filters.startDate && filters.endDate) {
          filteredSales = sales.filter(sale => 
            sale.date >= filters.startDate! && sale.date <= filters.endDate!
          );
        }
        break;
    }

    // Apply other filters
    if (filters.paymentMethods.length > 0) {
      filteredSales = filteredSales.filter(sale => 
        filters.paymentMethods.includes(sale.paymentMethod)
      );
    }

    if (filters.creditStatus.length > 0) {
      filteredSales = filteredSales.filter(sale => 
        filters.creditStatus.includes(sale.status)
      );
    }

    if (filters.customerId) {
      filteredSales = filteredSales.filter(sale => sale.customerId === filters.customerId);
    }

    if (filters.employeeId) {
      filteredSales = filteredSales.filter(sale => sale.employeeId === filters.employeeId);
    }

    // Calculate basic metrics
    const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
    const totalSales = filteredSales.length;
    const averageOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0;

    // Calculate debt analysis
    let totalJaiDonne = 0;
    let totalJaiPris = 0;

    customers.forEach(customer => {
      customer.transactions?.forEach(transaction => {
        if (transaction.type === 'gave') {
          totalJaiDonne += transaction.amount;
        } else if (transaction.type === 'took') {
          totalJaiPris += transaction.amount;
        }
      });
    });

    const debtAnalysis = {
      totalGave: totalJaiDonne,
      totalTook: totalJaiPris,
      netBalance: totalJaiPris - totalJaiDonne,
    };

    // Calculate top products
    const productSales = new Map<string, { quantity: number; revenue: number }>();
    filteredSales.forEach(sale => {
      sale.items.forEach(item => {
        const existing = productSales.get(item.productId) || { quantity: 0, revenue: 0 };
        productSales.set(item.productId, {
          quantity: existing.quantity + item.quantity,
          revenue: existing.revenue + (item.price * item.quantity),
        });
      });
    });

    const topProducts = Array.from(productSales.entries())
      .map(([productId, data]) => {
        const product = products.find(p => p.id === productId);
        return product ? { product, ...data } : null;
      })
      .filter(Boolean)
      .sort((a, b) => b!.revenue - a!.revenue)
      .slice(0, 10) as { product: Product; quantity: number; revenue: number }[];

    // Calculate payment method breakdown
    const paymentMethods = new Map<string, { amount: number; count: number }>();
    filteredSales.forEach(sale => {
      const existing = paymentMethods.get(sale.paymentMethod) || { amount: 0, count: 0 };
      paymentMethods.set(sale.paymentMethod, {
        amount: existing.amount + sale.total,
        count: existing.count + 1,
      });
    });

    const paymentMethodBreakdown = Array.from(paymentMethods.entries()).map(([method, data]) => ({
      method,
      ...data,
    }));

    // Calculate daily trends (last 30 days)
    const dailyTrends: { date: string; revenue: number; sales: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      const daySales = filteredSales.filter(sale => 
        sale.date.toISOString().split('T')[0] === dateStr
      );
      
      dailyTrends.push({
        date: dateStr,
        revenue: daySales.reduce((sum, sale) => sum + sale.total, 0),
        sales: daySales.length,
      });
    }

    // Calculate category performance
    const categoryPerformance = categories.map(category => {
      const categoryProducts = products.filter(p => p.categoryId === category.id);
      let revenue = 0;
      let quantity = 0;

      filteredSales.forEach(sale => {
        sale.items.forEach(item => {
          if (categoryProducts.some(p => p.id === item.productId)) {
            revenue += item.price * item.quantity;
            quantity += item.quantity;
          }
        });
      });

      return {
        category: category.name,
        revenue,
        quantity,
      };
    }).filter(cat => cat.revenue > 0);

    // Calculate employee performance (only for admin/manager)
    const employeePerformance: { employee: string; sales: number; revenue: number }[] = [];
    if (user?.role === 'admin' || user?.role === 'manager') {
      const empPerf = new Map<string, { sales: number; revenue: number }>();
      filteredSales.forEach(sale => {
        if (sale.employeeId) {
          const existing = empPerf.get(sale.employeeId) || { sales: 0, revenue: 0 };
          empPerf.set(sale.employeeId, {
            sales: existing.sales + 1,
            revenue: existing.revenue + sale.total,
          });
        }
      });

      empPerf.forEach((data, employeeId) => {
        const employee = employees.find(e => e.id === employeeId);
        if (employee) {
          employeePerformance.push({
            employee: employee.username,
            ...data,
          });
        }
      });
    }

    // Generate filter colors
    const filterColors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'];

    const filterBreakdown = {
      clients: customers.slice(0, 8).map((customer, index) => ({
        name: customer.name,
        amount: Math.abs(customer.balance),
        color: filterColors[index % filterColors.length],
      })),
      products: topProducts.slice(0, 8).map((item, index) => ({
        name: item.product.name,
        amount: item.revenue,
        color: filterColors[index % filterColors.length],
      })),
      employees: employeePerformance.slice(0, 8).map((emp, index) => ({
        name: emp.employee,
        amount: emp.revenue,
        color: filterColors[index % filterColors.length],
      })),
      categories: categoryPerformance.slice(0, 8).map((cat, index) => ({
        name: cat.category,
        amount: cat.revenue,
        color: filterColors[index % filterColors.length],
      })),
      paymentMethods: paymentMethodBreakdown.slice(0, 8).map((pm, index) => ({
        name: getPaymentMethodLabel(pm.method),
        amount: pm.amount,
        color: filterColors[index % filterColors.length],
      })),
    };

    return {
      totalRevenue,
      totalSales,
      averageOrderValue,
      totalDebts: Math.abs(customers.reduce((sum, c) => sum + Math.min(0, c.balance), 0)),
      totalAdvances: customers.reduce((sum, c) => sum + Math.max(0, c.balance), 0),
      totalJaiDonne,
      totalJaiPris,
      topProducts,
      paymentMethodBreakdown,
      creditAnalysis: {
        totalCredit: filteredSales.filter(s => s.status === 'credit').reduce((sum, s) => sum + s.total, 0),
        partiallyPaid: filteredSales.filter(s => s.status === 'partial').reduce((sum, s) => sum + s.total, 0),
        fullyPaid: filteredSales.filter(s => s.status === 'paid').reduce((sum, s) => sum + s.total, 0),
      },
      dailyTrends,
      categoryPerformance,
      employeePerformance,
      debtAnalysis,
      filterBreakdown,
    };
  }, [sales, products, customers, categories, employees, filters, user]);

  const formatCurrency = useCallback((amount: number): string => {
    if (!settings) return amount.toString();
    const currency = settings.currency === 'XOF' ? 'FCFA' : settings.currency;
    return `${amount.toLocaleString()} ${currency}`;
  }, [settings]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
  }, [loadData]);

  const handleForceSyncNow = useCallback(async () => {
    if (user?.role !== 'cashier') return;
    
    try {
      const success = await cashierSyncService.forceSyncNow();
      if (success) {
        Alert.alert('Synchronisation', 'Vos rapports ont été synchronisés avec succès.');
        const status = await cashierSyncService.getSyncStatus();
        setSyncStatus(status);
      } else {
        Alert.alert('Erreur', 'Échec de la synchronisation. Vérifiez votre connexion internet.');
      }
    } catch (error) {
      console.error('Force sync error:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors de la synchronisation.');
    }
  }, [user]);

  const exportData = useCallback(async () => {
    try {
      const csvData = [
        ['Date', 'Montant', 'Méthode de paiement', 'Statut', 'Client', 'Employé'],
        ...sales.map(sale => [
          sale.date.toLocaleDateString(),
          sale.total.toString(),
          getPaymentMethodLabel(sale.paymentMethod),
          sale.status,
          customers.find(c => c.id === sale.customerId)?.name || 'N/A',
          employees.find(e => e.id === sale.employeeId)?.username || 'N/A',
        ])
      ].map(row => row.join(',')).join('\n');

      const fileName = `rapports_${user?.role === 'cashier' ? 'caissier_' : ''}${new Date().toISOString().split('T')[0]}.csv`;
      const fileUri = `${(FileSystem as any).documentDirectory}${fileName}`;
      
      await FileSystem.writeAsStringAsync(fileUri, csvData, {
        encoding: (FileSystem as any).EncodingType?.UTF8 || 'utf8',
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Exporter les rapports',
        });
      }
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Erreur', 'Impossible d\'exporter les données');
    }
  }, [sales, customers, employees, user]);

  // Check if user has access to reports
  if (user?.role === 'inventory') {
    return (
      <SafeAreaView style={commonStyles.container}>
        <View style={styles.restrictedAccess}>
          <Icon name="lock-closed" size={48} color={colors.error} />
          <Text style={styles.restrictedText}>
            Accès aux rapports non autorisé
          </Text>
          <Text style={[commonStyles.textLight, { textAlign: 'center', marginTop: spacing.sm }]}>
            Votre rôle "Inventaire" ne permet pas l'accès aux rapports de vente.
          </Text>
          <TouchableOpacity
            style={[commonStyles.button, { marginTop: spacing.lg }]}
            onPress={() => router.back()}
          >
            <Text style={commonStyles.buttonText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const renderSummaryCard = ({ title, value, subtitle, icon, color, trend }: {
    title: string;
    value: string;
    subtitle?: string;
    icon: string;
    color?: string;
    trend?: { value: number; isPositive: boolean };
  }) => (
    <Animated.View style={[
      commonStyles.card,
      { 
        flex: 1, 
        margin: spacing.xs,
        opacity: animatedValue,
        transform: [{
          translateY: animatedValue.interpolate({
            inputRange: [0, 1],
            outputRange: [20, 0],
          }),
        }],
      }
    ]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
        <View style={{
          width: 40,
          height: 40,
          backgroundColor: (color || colors.primary) + '20',
          borderRadius: 20,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: spacing.sm,
        }}>
          <Icon name={icon} size={20} color={color || colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[commonStyles.textLight, { fontSize: fontSizes.sm }]}>{title}</Text>
          <Text style={[commonStyles.subtitle, { fontSize: fontSizes.lg }]}>{value}</Text>
        </View>
      </View>
      {subtitle && (
        <Text style={[commonStyles.textLight, { fontSize: fontSizes.xs }]}>{subtitle}</Text>
      )}
      {trend && (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs }}>
          <Icon 
            name={trend.isPositive ? 'trending-up' : 'trending-down'} 
            size={16} 
            color={trend.isPositive ? colors.success : colors.error} 
          />
          <Text style={{
            fontSize: fontSizes.xs,
            color: trend.isPositive ? colors.success : colors.error,
            marginLeft: spacing.xs,
          }}>
            {Math.abs(trend.value).toFixed(1)}%
          </Text>
        </View>
      )}
    </Animated.View>
  );

  const renderMultiFilterChart = () => {
    const data = reportData.filterBreakdown.paymentMethods.slice(0, 5);
    if (data.length === 0) return null;

    return (
      <View style={[commonStyles.card, { margin: spacing.md }]}>
        <Text style={[commonStyles.subtitle, { marginBottom: spacing.md }]}>
          Répartition par méthode de paiement
        </Text>
        <PieChart
          data={data}
          width={Dimensions.get('window').width - 60}
          height={200}
          chartConfig={{
            color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
          }}
          accessor="amount"
          backgroundColor="transparent"
          paddingLeft="15"
          absolute
        />
      </View>
    );
  };

  const renderChart = () => {
    if (reportData.dailyTrends.length === 0) return null;

    const chartData = {
      labels: reportData.dailyTrends.slice(-7).map(trend => 
        new Date(trend.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
      ),
      datasets: [{
        data: reportData.dailyTrends.slice(-7).map(trend => trend.revenue),
        color: (opacity = 1) => colors.primary,
        strokeWidth: 2,
      }],
    };

    return (
      <View style={[commonStyles.card, { margin: spacing.md }]}>
        <Text style={[commonStyles.subtitle, { marginBottom: spacing.md }]}>
          Tendance des ventes (7 derniers jours)
        </Text>
        <LineChart
          data={chartData}
          width={Dimensions.get('window').width - 60}
          height={200}
          chartConfig={{
            backgroundColor: colors.background,
            backgroundGradientFrom: colors.background,
            backgroundGradientTo: colors.background,
            decimalPlaces: 0,
            color: (opacity = 1) => colors.primary,
            labelColor: (opacity = 1) => colors.text,
            style: { borderRadius: 16 },
            propsForDots: {
              r: '4',
              strokeWidth: '2',
              stroke: colors.primary,
            },
          }}
          bezier
          style={{ borderRadius: 16 }}
        />
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={commonStyles.container}>
        <View style={[commonStyles.content, { justifyContent: 'center', alignItems: 'center' }]}>
          <Icon name="analytics" size={48} color={colors.primary} />
          <Text style={[commonStyles.subtitle, { marginTop: spacing.md }]}>
            Chargement des rapports...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={commonStyles.container}>
      <ScrollView
        style={commonStyles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.lg }}>
          <TouchableOpacity onPress={() => router.back()}>
            <Icon name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[commonStyles.title, { marginLeft: spacing.md, flex: 1 }]}>
            {user?.role === 'cashier' ? 'Mes Rapports' : 'Rapports'}
          </Text>
          <TouchableOpacity onPress={exportData}>
            <Icon name="download" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Cashier-specific header */}
        {user?.role === 'cashier' && (
          <View style={[styles.cashierHeader, { margin: spacing.lg }]}>
            <Text style={styles.cashierHeaderText}>
              Rapports personnels - Caissier {user.username}
            </Text>
          </View>
        )}

        {/* Sync Status for Cashiers */}
        {user?.role === 'cashier' && (
          <TouchableOpacity 
            style={[styles.syncStatus, { margin: spacing.lg }]}
            onPress={handleForceSyncNow}
          >
            <Icon 
              name={syncStatus.pendingCount > 0 ? 'sync' : 'checkmark-circle'} 
              size={20} 
              color={syncStatus.pendingCount > 0 ? colors.warning : colors.success} 
            />
            <Text style={styles.syncStatusText}>
              {syncStatus.pendingCount > 0 
                ? `${syncStatus.pendingCount} rapports en attente de sync`
                : 'Rapports synchronisés'
              }
            </Text>
            {syncStatus.lastSyncTime && (
              <Text style={[styles.syncStatusText, { fontSize: fontSizes.xs, opacity: 0.7 }]}>
                {' • '}{syncStatus.lastSyncTime.toLocaleTimeString()}
              </Text>
            )}
          </TouchableOpacity>
        )}

        {/* Summary Cards */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.md }}>
          {renderSummaryCard({
            title: 'Chiffre d\'affaires',
            value: formatCurrency(reportData.totalRevenue),
            icon: 'cash',
            color: colors.success,
            subtitle: user?.role === 'cashier' ? 'Mes ventes uniquement' : 'Total général',
          })}
          {renderSummaryCard({
            title: 'Nombre de ventes',
            value: reportData.totalSales.toString(),
            icon: 'receipt',
            color: colors.primary,
          })}
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.md }}>
          {renderSummaryCard({
            title: 'Panier moyen',
            value: formatCurrency(reportData.averageOrderValue),
            icon: 'calculator',
            color: colors.info,
          })}
          {user?.role !== 'cashier' && renderSummaryCard({
            title: 'Total J\'ai donné',
            value: formatCurrency(reportData.totalJaiDonne),
            icon: 'arrow-up',
            color: colors.error,
          })}
        </View>

        {user?.role !== 'cashier' && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.md }}>
            {renderSummaryCard({
              title: 'Total J\'ai pris',
              value: formatCurrency(reportData.totalJaiPris),
              icon: 'arrow-down',
              color: colors.success,
            })}
            {renderSummaryCard({
              title: 'Balance nette',
              value: formatCurrency(reportData.debtAnalysis.netBalance),
              icon: 'balance',
              color: reportData.debtAnalysis.netBalance >= 0 ? colors.success : colors.error,
            })}
          </View>
        )}

        {/* Charts */}
        {renderChart()}
        {renderMultiFilterChart()}

        {/* Top Products */}
        {reportData.topProducts.length > 0 && (
          <View style={[commonStyles.card, { margin: spacing.lg }]}>
            <Text style={[commonStyles.subtitle, { marginBottom: spacing.md }]}>
              Produits les plus vendus
            </Text>
            {reportData.topProducts.slice(0, 5).map((item, index) => (
              <View key={item.product.id} style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: spacing.sm,
                borderBottomWidth: index < 4 ? 1 : 0,
                borderBottomColor: colors.border,
              }}>
                <View style={{
                  width: 30,
                  height: 30,
                  backgroundColor: colors.primary,
                  borderRadius: 15,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: spacing.md,
                }}>
                  <Text style={{ color: colors.secondary, fontWeight: 'bold' }}>
                    {index + 1}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[commonStyles.text, { fontWeight: '600' }]}>
                    {item.product.name}
                  </Text>
                  <Text style={commonStyles.textLight}>
                    {item.quantity} unités vendues
                  </Text>
                </View>
                <Text style={[commonStyles.text, { fontWeight: '600', color: colors.success }]}>
                  {formatCurrency(item.revenue)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Employee Performance (Admin/Manager only) */}
        {(user?.role === 'admin' || user?.role === 'manager') && reportData.employeePerformance.length > 0 && (
          <View style={[commonStyles.card, { margin: spacing.lg }]}>
            <Text style={[commonStyles.subtitle, { marginBottom: spacing.md }]}>
              Performance des employés
            </Text>
            {reportData.employeePerformance.slice(0, 5).map((emp, index) => (
              <View key={emp.employee} style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: spacing.sm,
                borderBottomWidth: index < Math.min(4, reportData.employeePerformance.length - 1) ? 1 : 0,
                borderBottomColor: colors.border,
              }}>
                <View style={{
                  width: 30,
                  height: 30,
                  backgroundColor: colors.warning,
                  borderRadius: 15,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: spacing.md,
                }}>
                  <Text style={{ color: colors.secondary, fontWeight: 'bold' }}>
                    {index + 1}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[commonStyles.text, { fontWeight: '600' }]}>
                    {emp.employee}
                  </Text>
                  <Text style={commonStyles.textLight}>
                    {emp.sales} ventes
                  </Text>
                </View>
                <Text style={[commonStyles.text, { fontWeight: '600', color: colors.success }]}>
                  {formatCurrency(emp.revenue)}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
