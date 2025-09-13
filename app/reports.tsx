
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
  Platform,
  StyleSheet,
  Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { commonStyles, colors, spacing, fontSizes, isSmallScreen } from '../styles/commonStyles';
import Icon from '../components/Icon';
import { getSales, getProducts, getCustomers, getSettings, getCategories, getEmployees } from '../utils/storage';
import { useCustomersSync } from '../hooks/useCustomersSync';
import { Sale, Product, Customer, AppSettings, Category } from '../types';
import { AuthUser } from '../types/auth';
import DateTimePicker from '@react-native-community/datetimepicker';

const { width: screenWidth } = Dimensions.get('window');
const chartWidth = Math.min(screenWidth - (spacing.lg * 2), 350);

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

// Fonction utilitaire pour les libellés des moyens de paiement
const getPaymentMethodLabel = (method: string): string => {
  const labels: { [key: string]: string } = {
    cash: 'Espèces',
    mobile_money: 'Mobile Money',
    credit: 'Crédit',
    advance: 'Avance'
  };
  return labels[method] || method;
};

export default function ReportsScreen() {
  const { customers } = useCustomersSync();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [employees, setEmployees] = useState<AuthUser[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState<'start' | 'end' | null>(null);
  const [activeChart, setActiveChart] = useState<'revenue' | 'sales' | 'products' | 'payments' | 'filters'>('revenue');
  const [animatedValue] = useState(new Animated.Value(0));
  
  const [filters, setFilters] = useState<ReportFilters>({
    dateRange: 'month',
    paymentMethods: ['cash', 'mobile_money', 'credit'],
    creditStatus: ['paid', 'credit', 'partial'],
    debtType: 'all',
  });

  // Couleurs distinctes pour les graphiques multi-filtres
  const filterColors = [
    '#FFD700', // Jaune (couleur principale)
    '#FF6B6B', // Rouge corail
    '#4ECDC4', // Turquoise
    '#45B7D1', // Bleu ciel
    '#96CEB4', // Vert menthe
    '#FFEAA7', // Jaune pâle
    '#DDA0DD', // Violet clair
    '#98D8C8', // Vert d'eau
    '#F7DC6F', // Jaune doré
    '#BB8FCE', // Lavande
  ];

  const loadData = useCallback(async () => {
    try {
      console.log('Loading reports data...');
      const [salesData, productsData, settingsData, categoriesData, employeesData] = await Promise.all([
        getSales(),
        getProducts(),
        getSettings(),
        getCategories(),
        getEmployees()
      ]);
      
      setSales(salesData || []);
      setProducts(productsData || []);
      setSettings(settingsData);
      setCategories(categoriesData || []);
      setEmployees(employeesData || []);
      console.log(`Reports data loaded successfully - ${customers.length} customers (from sync)`);
    } catch (error) {
      console.error('Error loading reports data:', error);
      Alert.alert('Erreur', 'Impossible de charger les données des rapports');
    } finally {
      setLoading(false);
    }
  }, [customers.length]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  useEffect(() => {
    loadData();
    // Animation d'entrée fluide
    Animated.timing(animatedValue, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
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
      
      // Filter by employee
      if (filters.employeeId && sale.employeeId !== filters.employeeId) return false;
      
      // Filter by product
      if (filters.productId) {
        const hasProduct = sale.items.some(item => item.productId === filters.productId);
        if (!hasProduct) return false;
      }
      
      // Filter by category
      if (filters.categoryId) {
        const hasCategory = sale.items.some(item => {
          const product = products.find(p => p.id === item.productId);
          return product?.categoryId === filters.categoryId;
        });
        if (!hasCategory) return false;
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
      case 'custom':
        if (filters.startDate) {
          filtered = filtered.filter(sale => 
            new Date(sale.createdAt) >= filters.startDate!
          );
        }
        if (filters.endDate) {
          filtered = filtered.filter(sale => 
            new Date(sale.createdAt) <= filters.endDate!
          );
        }
        break;
    }

    return filtered;
  }, [sales, filters, products]);

  const reportData = useMemo((): ReportData => {
    if (!filteredSales.length) {
      return {
        totalRevenue: 0,
        totalSales: 0,
        averageOrderValue: 0,
        totalDebts: 0,
        totalAdvances: 0,
        topProducts: [],
        paymentMethodBreakdown: [],
        creditAnalysis: { totalCredit: 0, partiallyPaid: 0, fullyPaid: 0 },
        dailyTrends: [],
        categoryPerformance: [],
        employeePerformance: [],
        debtAnalysis: { totalGave: 0, totalTook: 0, netBalance: 0 },
        filterBreakdown: {
          clients: [],
          products: [],
          employees: [],
          categories: [],
          paymentMethods: []
        }
      };
    }

    const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
    const totalSales = filteredSales.length;
    const averageOrderValue = totalRevenue / totalSales;

    // Calcul des dettes et avances
    let totalDebts = 0;
    let totalAdvances = 0;
    
    customers.forEach(customer => {
      if (customer.balance < 0) {
        totalDebts += Math.abs(customer.balance); // J'ai donné
      } else if (customer.balance > 0) {
        totalAdvances += customer.balance; // J'ai pris
      }
    });

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
      partiallyPaid: partialSales.reduce((sum, sale) => sum + (sale.total - (sale.amountPaid || 0)), 0),
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

    const categoryPerformance = Array.from(categoryStats.entries()).map(([categoryId, stats]) => {
      const category = categories.find(c => c.id === categoryId);
      return {
        category: category?.name || 'Catégorie inconnue',
        revenue: stats.revenue,
        quantity: stats.quantity
      };
    });

    // Employee performance
    const employeeStats = new Map();
    filteredSales.forEach(sale => {
      if (sale.employeeId) {
        const existing = employeeStats.get(sale.employeeId) || { sales: 0, revenue: 0 };
        employeeStats.set(sale.employeeId, {
          sales: existing.sales + 1,
          revenue: existing.revenue + sale.total
        });
      }
    });

    const employeePerformance = Array.from(employeeStats.entries()).map(([employeeId, stats]) => {
      const employee = employees.find(e => e.id === employeeId);
      return {
        employee: employee?.username || 'Employé inconnu',
        sales: stats.sales,
        revenue: stats.revenue
      };
    });

    // Debt analysis
    const debtAnalysis = {
      totalGave: totalDebts,
      totalTook: totalAdvances,
      netBalance: totalAdvances - totalDebts
    };

    // Filter breakdown for multi-color chart
    const clientStats = new Map();
    const productFilterStats = new Map();
    const employeeFilterStats = new Map();
    const categoryFilterStats = new Map();
    const paymentFilterStats = new Map();

    filteredSales.forEach(sale => {
      // Client breakdown
      const customer = customers.find(c => c.id === sale.customerId);
      const clientName = customer?.name || 'Client anonyme';
      clientStats.set(clientName, (clientStats.get(clientName) || 0) + sale.total);

      // Employee breakdown
      const employee = employees.find(e => e.id === sale.employeeId);
      const employeeName = employee?.username || 'Employé inconnu';
      employeeFilterStats.set(employeeName, (employeeFilterStats.get(employeeName) || 0) + sale.total);

      // Payment method breakdown
      paymentFilterStats.set(sale.paymentMethod, (paymentFilterStats.get(sale.paymentMethod) || 0) + sale.total);

      // Product and category breakdown
      sale.items.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        if (product) {
          productFilterStats.set(product.name, (productFilterStats.get(product.name) || 0) + item.subtotal);
          
          const category = categories.find(c => c.id === product.categoryId);
          const categoryName = category?.name || 'Catégorie inconnue';
          categoryFilterStats.set(categoryName, (categoryFilterStats.get(categoryName) || 0) + item.subtotal);
        }
      });
    });

    const filterBreakdown = {
      clients: Array.from(clientStats.entries())
        .map(([name, amount], index) => ({ name, amount, color: filterColors[index % filterColors.length] }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 8),
      products: Array.from(productFilterStats.entries())
        .map(([name, amount], index) => ({ name, amount, color: filterColors[index % filterColors.length] }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 8),
      employees: Array.from(employeeFilterStats.entries())
        .map(([name, amount], index) => ({ name, amount, color: filterColors[index % filterColors.length] }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 8),
      categories: Array.from(categoryFilterStats.entries())
        .map(([name, amount], index) => ({ name, amount, color: filterColors[index % filterColors.length] }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 8),
      paymentMethods: Array.from(paymentFilterStats.entries())
        .map(([method, amount], index) => ({ 
          name: getPaymentMethodLabel(method), 
          amount, 
          color: filterColors[index % filterColors.length] 
        }))
        .sort((a, b) => b.amount - a.amount)
    };

    return {
      totalRevenue,
      totalSales,
      averageOrderValue,
      totalDebts,
      totalAdvances,
      topProducts,
      paymentMethodBreakdown,
      creditAnalysis,
      dailyTrends,
      categoryPerformance,
      employeePerformance,
      debtAnalysis,
      filterBreakdown
    };
  }, [filteredSales, products, customers, categories, employees]);

  const formatCurrency = useCallback((amount: number) => {
    const currency = settings?.currency || 'XOF';
    const currencySymbols = { XOF: 'FCFA', USD: '$', EUR: '€' };
    return `${amount.toLocaleString()} ${currencySymbols[currency]}`;
  }, [settings]);

  const ensureDirectoryExists = useCallback(async (dirPath: string): Promise<boolean> => {
    try {
      console.log('Checking directory existence:', dirPath);
      const dirInfo = await FileSystem.getInfoAsync(dirPath);
      
      if (!dirInfo.exists) {
        console.log('Directory does not exist, creating:', dirPath);
        await FileSystem.makeDirectoryAsync(dirPath, { intermediates: true });
        console.log('Directory created successfully');
        return true;
      }
      
      console.log('Directory already exists');
      return true;
    } catch (error) {
      console.error('Error ensuring directory exists:', error);
      return false;
    }
  }, []);

  const getFileSystemDirectory = useCallback(async (): Promise<string | null> => {
    try {
      const documentDir = (FileSystem as any).documentDirectory;
      const cacheDir = (FileSystem as any).cacheDirectory;
      const dir = documentDir || cacheDir;
      
      if (!dir) {
        console.warn('Neither documentDirectory nor cacheDirectory is available');
        return null;
      }

      console.log('Using directory:', dir);
      
      const dirExists = await ensureDirectoryExists(dir);
      if (!dirExists) {
        console.error('Failed to ensure directory exists');
        return null;
      }
      
      return dir;
    } catch (error) {
      console.error('Error accessing FileSystem directories:', error);
      return null;
    }
  }, [ensureDirectoryExists]);

  const exportToPDF = useCallback(async () => {
    try {
      console.log('Starting PDF export...');
      
      const reportContent = `
RAPPORT DE VENTES DÉTAILLÉ - ${settings?.companyName || 'ALKD-POS'}
Période: ${filters.dateRange === 'custom' ? 
  `${filters.startDate?.toLocaleDateString('fr-FR')} - ${filters.endDate?.toLocaleDateString('fr-FR')}` : 
  filters.dateRange}
Date de génération: ${new Date().toLocaleDateString('fr-FR')}

=== RÉSUMÉ EXÉCUTIF ===
Chiffre d'affaires total: ${formatCurrency(reportData.totalRevenue)}
Nombre de ventes: ${reportData.totalSales}
Panier moyen: ${formatCurrency(reportData.averageOrderValue)}

=== ANALYSE DETTES ET AVANCES ===
Total dettes (J'ai donné): ${formatCurrency(reportData.totalDebts)}
Total avances (J'ai pris): ${formatCurrency(reportData.totalAdvances)}
Balance nette: ${formatCurrency(reportData.debtAnalysis.netBalance)}

=== TOP PRODUITS ===
${reportData.topProducts.slice(0, 10).map((item, index) => 
  `${index + 1}. ${item.product.name} - ${item.quantity} unités - ${formatCurrency(item.revenue)}`
).join('\n')}

=== PERFORMANCE PAR CATÉGORIE ===
${reportData.categoryPerformance.map(item => 
  `${item.category}: ${formatCurrency(item.revenue)} (${item.quantity} unités)`
).join('\n')}

=== PERFORMANCE EMPLOYÉS ===
${reportData.employeePerformance.map(item => 
  `${item.employee}: ${item.sales} ventes - ${formatCurrency(item.revenue)}`
).join('\n')}

=== MOYENS DE PAIEMENT ===
${reportData.paymentMethodBreakdown.map(item => 
  `${getPaymentMethodLabel(item.method)}: ${formatCurrency(item.amount)} (${item.count} transactions)`
).join('\n')}

=== ANALYSE CRÉDIT ===
Crédit total: ${formatCurrency(reportData.creditAnalysis.totalCredit)}
Partiellement payé: ${formatCurrency(reportData.creditAnalysis.partiallyPaid)}
Entièrement payé: ${formatCurrency(reportData.creditAnalysis.fullyPaid)}

=== TENDANCES QUOTIDIENNES ===
${reportData.dailyTrends.map(item => 
  `${new Date(item.date).toLocaleDateString('fr-FR')}: ${formatCurrency(item.revenue)} (${item.sales} ventes)`
).join('\n')}
      `;

      const fileName = `rapport_detaille_${new Date().toISOString().split('T')[0]}.txt`;
      
      const dir = await getFileSystemDirectory();
      
      if (!dir) {
        console.log('No file system directory available, showing report in alert');
        Alert.alert(
          'Rapport généré',
          'Le rapport a été généré mais ne peut pas être sauvegardé sur cet appareil. Voici un résumé:\n\n' +
          `CA total: ${formatCurrency(reportData.totalRevenue)}\n` +
          `Ventes: ${reportData.totalSales}\n` +
          `Panier moyen: ${formatCurrency(reportData.averageOrderValue)}\n` +
          `Dettes: ${formatCurrency(reportData.totalDebts)}\n` +
          `Avances: ${formatCurrency(reportData.totalAdvances)}`,
          [{ text: 'OK' }]
        );
        return;
      }
      
      const fileUri = `${dir}${fileName}`;
      
      console.log('Writing report to file:', fileUri);
      
      const encodingType = (FileSystem as any).EncodingType?.UTF8 || 'utf8';
      
      await FileSystem.writeAsStringAsync(fileUri, reportContent, {
        encoding: encodingType,
      });
      
      console.log('Report file written successfully');
      
      if (await Sharing.isAvailableAsync()) {
        console.log('Sharing is available, sharing file...');
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/plain',
          dialogTitle: 'Partager le rapport PDF'
        });
        console.log('File shared successfully');
      } else {
        console.log('Sharing not available, showing success alert');
        Alert.alert('Succès', `Rapport exporté vers: ${fileUri}`);
      }
      
    } catch (error) {
      console.error('Error exporting report:', error);
      Alert.alert(
        'Erreur d\'export', 
        'Impossible d\'exporter le rapport. Vérifiez les permissions de stockage.',
        [{ text: 'OK' }]
      );
    }
  }, [reportData, settings, filters, formatCurrency, getFileSystemDirectory]);

  const exportToExcel = useCallback(async () => {
    try {
      console.log('Starting Excel export...');
      
      const csvContent = [
        // Header
        'Date,Numéro Reçu,Client,Employé,Produit,Catégorie,Quantité,Prix Unitaire,Sous-total,Méthode Paiement,Statut',
        // Data rows
        ...filteredSales.flatMap(sale => 
          sale.items.map(item => {
            const product = products.find(p => p.id === item.productId);
            const category = categories.find(c => c.id === product?.categoryId);
            const customer = customers.find(c => c.id === sale.customerId);
            const employee = employees.find(e => e.id === sale.employeeId);
            return [
              new Date(sale.createdAt).toLocaleDateString('fr-FR'),
              sale.receiptNumber,
              customer?.name || 'Client anonyme',
              employee?.username || 'Employé inconnu',
              product?.name || 'Produit inconnu',
              category?.name || 'Catégorie inconnue',
              item.quantity,
              item.price,
              item.subtotal,
              getPaymentMethodLabel(sale.paymentMethod),
              sale.paymentStatus === 'paid' ? 'Payé' : 
              sale.paymentStatus === 'credit' ? 'À crédit' : 'Partiellement payé'
            ].join(',');
          })
        )
      ].join('\n');

      const fileName = `rapport_excel_${new Date().toISOString().split('T')[0]}.csv`;
      
      const dir = await getFileSystemDirectory();
      
      if (!dir) {
        console.log('No file system directory available for Excel export');
        Alert.alert(
          'Export Excel',
          'Impossible de sauvegarder le fichier Excel sur cet appareil.',
          [{ text: 'OK' }]
        );
        return;
      }
      
      const fileUri = `${dir}${fileName}`;
      
      console.log('Writing Excel file to:', fileUri);
      
      const encodingType = (FileSystem as any).EncodingType?.UTF8 || 'utf8';
      
      await FileSystem.writeAsStringAsync(fileUri, csvContent, {
        encoding: encodingType,
      });
      
      console.log('Excel file written successfully');
      
      if (await Sharing.isAvailableAsync()) {
        console.log('Sharing Excel file...');
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Partager le rapport Excel'
        });
        console.log('Excel file shared successfully');
      } else {
        console.log('Sharing not available for Excel file');
        Alert.alert('Succès', `Rapport Excel exporté vers: ${fileUri}`);
      }
      
    } catch (error) {
      console.error('Error exporting Excel report:', error);
      Alert.alert(
        'Erreur d\'export Excel', 
        'Impossible d\'exporter le rapport Excel.',
        [{ text: 'OK' }]
      );
    }
  }, [filteredSales, products, categories, customers, employees, getFileSystemDirectory]);

  const chartConfig = {
    backgroundColor: colors.background,
    backgroundGradientFrom: colors.background,
    backgroundGradientTo: colors.background,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(255, 193, 7, ${opacity})`,
    labelColor: (opacity = 1) => colors.text,
    style: {
      borderRadius: 12,
    },
    propsForDots: {
      r: "4",
      strokeWidth: "2",
      stroke: colors.primary
    }
  };

  const renderSummaryCard = ({ title, value, subtitle, icon, color = colors.primary, trend }: any) => (
    <Animated.View 
      style={[
        styles.summaryCard, 
        { 
          borderLeftColor: color,
          opacity: animatedValue,
          transform: [{
            translateY: animatedValue.interpolate({
              inputRange: [0, 1],
              outputRange: [30, 0]
            })
          }]
        }
      ]}
    >
      <View style={styles.summaryHeader}>
        <View style={[styles.summaryIcon, { backgroundColor: color + '15' }]}>
          <Icon name={icon} size={20} color={color} />
        </View>
        <View style={styles.summaryContent}>
          <Text style={styles.summaryTitle}>{title}</Text>
          <Text style={[styles.summaryValue, { color }]} numberOfLines={1} adjustsFontSizeToFit>
            {value}
          </Text>
          {subtitle && <Text style={styles.summarySubtitle} numberOfLines={1}>{subtitle}</Text>}
          {trend && (
            <View style={styles.trendContainer}>
              <Icon 
                name={trend > 0 ? "trending-up" : "trending-down"} 
                size={14} 
                color={trend > 0 ? colors.success : colors.error} 
              />
              <Text style={[styles.trendText, { color: trend > 0 ? colors.success : colors.error }]}>
                {Math.abs(trend)}%
              </Text>
            </View>
          )}
        </View>
      </View>
    </Animated.View>
  );

  const renderMultiFilterChart = () => {
    const data = reportData.filterBreakdown.clients.concat(
      reportData.filterBreakdown.products.slice(0, 3),
      reportData.filterBreakdown.employees.slice(0, 2),
      reportData.filterBreakdown.categories.slice(0, 2)
    ).slice(0, 10);

    if (data.length === 0) {
      return (
        <View style={styles.noDataContainer}>
          <Icon name="pie-chart" size={48} color={colors.textLight} />
          <Text style={styles.noDataText}>Aucune donnée disponible</Text>
        </View>
      );
    }

    const pieData = data.map((item, index) => ({
      name: item.name.length > 12 ? item.name.substring(0, 12) + '...' : item.name,
      amount: item.amount,
      color: item.color,
      legendFontColor: colors.text,
      legendFontSize: 11
    }));

    return (
      <View style={styles.multiFilterChartContainer}>
        <PieChart
          data={pieData}
          width={chartWidth}
          height={200}
          chartConfig={chartConfig}
          accessor="amount"
          backgroundColor="transparent"
          paddingLeft="15"
          style={styles.chart}
          hasLegend={false}
        />
        <View style={styles.legendContainer}>
          {pieData.map((item, index) => (
            <View key={index} style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: item.color }]} />
              <Text style={styles.legendText} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.legendValue}>
                {formatCurrency(item.amount)}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderChart = () => {
    if (reportData.dailyTrends.length === 0 && activeChart !== 'filters') {
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
                data: reportData.dailyTrends.map(item => Math.max(item.revenue, 0)),
                color: (opacity = 1) => colors.primary,
                strokeWidth: 2
              }]
            }}
            width={chartWidth}
            height={200}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
            withHorizontalLabels={true}
            withVerticalLabels={true}
            withDots={true}
            withShadow={false}
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
                data: reportData.dailyTrends.map(item => Math.max(item.sales, 0))
              }]
            }}
            width={chartWidth}
            height={200}
            chartConfig={chartConfig}
            style={styles.chart}
            withHorizontalLabels={true}
            withVerticalLabels={true}
            showValuesOnTopOfBars={false}
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
          color: filterColors[index % filterColors.length],
          legendFontColor: colors.text,
          legendFontSize: 11
        }));

        return (
          <PieChart
            data={pieData}
            width={chartWidth}
            height={200}
            chartConfig={chartConfig}
            accessor="amount"
            backgroundColor="transparent"
            paddingLeft="15"
            style={styles.chart}
          />
        );
      
      case 'filters':
        return renderMultiFilterChart();
      
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <Animated.View style={{ opacity: animatedValue }}>
            <Icon name="analytics" size={48} color={colors.primary} />
          </Animated.View>
          <Text style={styles.loadingText}>Chargement des rapports...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]}>
      {/* Header épuré et moderne */}
      <Animated.View style={[styles.header, { opacity: animatedValue }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Rapports Avancés</Text>
          <Text style={styles.headerSubtitle}>Analyses en temps réel</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => setShowFilters(true)} style={styles.actionButton}>
            <Icon name="filter" size={18} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={exportToPDF} style={styles.actionButton}>
            <Icon name="download" size={18} color={colors.success} />
          </TouchableOpacity>
          <TouchableOpacity onPress={exportToExcel} style={styles.actionButton}>
            <Icon name="grid" size={18} color={colors.info} />
          </TouchableOpacity>
        </View>
      </Animated.View>

      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Cartes récapitulatives épurées */}
        <View style={styles.summaryContainer}>
          {renderSummaryCard({
            title: 'Chiffre d\'affaires',
            value: formatCurrency(reportData.totalRevenue),
            subtitle: `${reportData.totalSales} ventes`,
            icon: 'trending-up',
            color: colors.success,
            trend: 12.5
          })}
          
          {renderSummaryCard({
            title: 'Panier moyen',
            value: formatCurrency(reportData.averageOrderValue),
            subtitle: 'Par transaction',
            icon: 'calculator',
            color: colors.info,
            trend: 8.3
          })}
          
          {renderSummaryCard({
            title: 'Total Dettes',
            value: formatCurrency(reportData.totalDebts),
            subtitle: 'J\'ai donné',
            icon: 'arrow-up',
            color: colors.error,
            trend: -5.2
          })}
          
          {renderSummaryCard({
            title: 'Total Avances',
            value: formatCurrency(reportData.totalAdvances),
            subtitle: 'J\'ai pris',
            icon: 'arrow-down',
            color: colors.warning,
            trend: 15.7
          })}
          
          {renderSummaryCard({
            title: 'Balance Nette',
            value: formatCurrency(reportData.debtAnalysis.netBalance),
            subtitle: reportData.debtAnalysis.netBalance >= 0 ? 'Positif' : 'Négatif',
            icon: 'balance',
            color: reportData.debtAnalysis.netBalance >= 0 ? colors.success : colors.error
          })}
        </View>

        {/* Section graphiques modernisée */}
        <Animated.View style={[styles.chartSection, { opacity: animatedValue }]}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>Analyses Graphiques</Text>
            <View style={styles.chartTabs}>
              {[
                { key: 'revenue', label: 'CA', icon: 'trending-up' },
                { key: 'sales', label: 'Ventes', icon: 'bar-chart' },
                { key: 'payments', label: 'Paiements', icon: 'card' },
                { key: 'filters', label: 'Multi-Filtres', icon: 'pie-chart' }
              ].map(tab => (
                <TouchableOpacity
                  key={tab.key}
                  style={[styles.chartTab, activeChart === tab.key && styles.activeChartTab]}
                  onPress={() => setActiveChart(tab.key as any)}
                >
                  <Icon 
                    name={tab.icon} 
                    size={14} 
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
        </Animated.View>

        {/* Performance employés épurée */}
        {reportData.employeePerformance.length > 0 && (
          <Animated.View style={[styles.section, { opacity: animatedValue }]}>
            <Text style={styles.sectionTitle}>Performance Employés</Text>
            <View style={styles.performanceGrid}>
              {reportData.employeePerformance.slice(0, 4).map((item, index) => (
                <View key={index} style={styles.performanceCard}>
                  <View style={styles.performanceRank}>
                    <Text style={styles.performanceRankText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.performanceName} numberOfLines={1}>
                    {item.employee}
                  </Text>
                  <Text style={styles.performanceAmount}>
                    {formatCurrency(item.revenue)}
                  </Text>
                  <Text style={styles.performanceStats}>
                    {item.sales} ventes
                  </Text>
                  <View style={styles.performanceProgress}>
                    <View 
                      style={[
                        styles.performanceProgressBar,
                        { 
                          width: `${(item.revenue / (reportData.employeePerformance[0]?.revenue || 1)) * 100}%`,
                          backgroundColor: colors.primary 
                        }
                      ]} 
                    />
                  </View>
                </View>
              ))}
            </View>
          </Animated.View>
        )}

        {/* Top Produits en grille */}
        {reportData.topProducts.length > 0 && (
          <Animated.View style={[styles.section, { opacity: animatedValue }]}>
            <Text style={styles.sectionTitle}>Top Produits</Text>
            <View style={styles.productsGrid}>
              {reportData.topProducts.slice(0, 6).map((item, index) => (
                <View key={item.product.id} style={styles.productCard}>
                  <View style={styles.productRank}>
                    <Text style={styles.productRankText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.productName} numberOfLines={2}>
                    {item.product.name}
                  </Text>
                  <Text style={styles.productAmount}>
                    {formatCurrency(item.revenue)}
                  </Text>
                  <Text style={styles.productQuantity}>
                    {item.quantity} unités
                  </Text>
                </View>
              ))}
            </View>
          </Animated.View>
        )}

        {/* Performance par catégorie simplifiée */}
        {reportData.categoryPerformance.length > 0 && (
          <Animated.View style={[styles.section, { opacity: animatedValue }]}>
            <Text style={styles.sectionTitle}>Performance par Catégorie</Text>
            <View style={styles.categoryList}>
              {reportData.categoryPerformance.slice(0, 5).map((item, index) => (
                <View key={index} style={styles.categoryItem}>
                  <View style={styles.categoryInfo}>
                    <Text style={styles.categoryName} numberOfLines={1}>
                      {item.category}
                    </Text>
                    <Text style={styles.categoryQuantity}>
                      {item.quantity} unités
                    </Text>
                  </View>
                  <Text style={styles.categoryAmount}>
                    {formatCurrency(item.revenue)}
                  </Text>
                </View>
              ))}
            </View>
          </Animated.View>
        )}

        {/* Moyens de paiement épurés */}
        {reportData.paymentMethodBreakdown.length > 0 && (
          <Animated.View style={[styles.section, { opacity: animatedValue }]}>
            <Text style={styles.sectionTitle}>Moyens de paiement</Text>
            <View style={styles.paymentList}>
              {reportData.paymentMethodBreakdown.map((item, index) => (
                <View key={item.method} style={styles.paymentItem}>
                  <View style={[styles.paymentIcon, { backgroundColor: filterColors[index % filterColors.length] + '20' }]}>
                    <Icon 
                      name={item.method === 'cash' ? 'cash' : item.method === 'mobile_money' ? 'phone' : 'card'} 
                      size={16} 
                      color={filterColors[index % filterColors.length]} 
                    />
                  </View>
                  <View style={styles.paymentInfo}>
                    <Text style={styles.paymentMethod}>
                      {getPaymentMethodLabel(item.method)}
                    </Text>
                    <Text style={styles.paymentCount}>
                      {item.count} transactions
                    </Text>
                  </View>
                  <Text style={styles.paymentAmount}>
                    {formatCurrency(item.amount)}
                  </Text>
                </View>
              ))}
            </View>
          </Animated.View>
        )}

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Modal de filtres modernisé */}
      <Modal
        visible={showFilters}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFilters(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filtres Avancés</Text>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <Icon name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Période */}
            <View style={styles.filterSection}>
              <Text style={styles.filterTitle}>Période</Text>
              <View style={styles.filterOptions}>
                {[
                  { key: 'today', label: 'Aujourd\'hui' },
                  { key: 'week', label: 'Cette semaine' },
                  { key: 'month', label: 'Ce mois' },
                  { key: 'quarter', label: 'Ce trimestre' },
                  { key: 'year', label: 'Cette année' },
                  { key: 'custom', label: 'Personnalisée' }
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
              
              {filters.dateRange === 'custom' && (
                <View style={styles.customDateContainer}>
                  <TouchableOpacity 
                    style={styles.dateButton}
                    onPress={() => setShowDatePicker('start')}
                  >
                    <Text style={styles.dateButtonText}>
                      Date début: {filters.startDate?.toLocaleDateString('fr-FR') || 'Sélectionner'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.dateButton}
                    onPress={() => setShowDatePicker('end')}
                  >
                    <Text style={styles.dateButtonText}>
                      Date fin: {filters.endDate?.toLocaleDateString('fr-FR') || 'Sélectionner'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Clients */}
            <View style={styles.filterSection}>
              <Text style={styles.filterTitle}>Client</Text>
              <View style={styles.filterOptions}>
                <TouchableOpacity
                  style={[
                    styles.filterOption,
                    !filters.customerId && styles.activeFilterOption
                  ]}
                  onPress={() => setFilters(prev => ({ ...prev, customerId: undefined }))}
                >
                  <Text style={[
                    styles.filterOptionText,
                    !filters.customerId && styles.activeFilterOptionText
                  ]}>
                    Tous les clients
                  </Text>
                </TouchableOpacity>
                {customers.slice(0, 5).map(customer => (
                  <TouchableOpacity
                    key={customer.id}
                    style={[
                      styles.filterOption,
                      filters.customerId === customer.id && styles.activeFilterOption
                    ]}
                    onPress={() => setFilters(prev => ({ 
                      ...prev, 
                      customerId: prev.customerId === customer.id ? undefined : customer.id 
                    }))}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      filters.customerId === customer.id && styles.activeFilterOptionText
                    ]} numberOfLines={1}>
                      {customer.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Employés */}
            <View style={styles.filterSection}>
              <Text style={styles.filterTitle}>Employé</Text>
              <View style={styles.filterOptions}>
                <TouchableOpacity
                  style={[
                    styles.filterOption,
                    !filters.employeeId && styles.activeFilterOption
                  ]}
                  onPress={() => setFilters(prev => ({ ...prev, employeeId: undefined }))}
                >
                  <Text style={[
                    styles.filterOptionText,
                    !filters.employeeId && styles.activeFilterOptionText
                  ]}>
                    Tous les employés
                  </Text>
                </TouchableOpacity>
                {employees.map(employee => (
                  <TouchableOpacity
                    key={employee.id}
                    style={[
                      styles.filterOption,
                      filters.employeeId === employee.id && styles.activeFilterOption
                    ]}
                    onPress={() => setFilters(prev => ({ 
                      ...prev, 
                      employeeId: prev.employeeId === employee.id ? undefined : employee.id 
                    }))}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      filters.employeeId === employee.id && styles.activeFilterOptionText
                    ]} numberOfLines={1}>
                      {employee.username}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Catégories */}
            <View style={styles.filterSection}>
              <Text style={styles.filterTitle}>Catégorie</Text>
              <View style={styles.filterOptions}>
                <TouchableOpacity
                  style={[
                    styles.filterOption,
                    !filters.categoryId && styles.activeFilterOption
                  ]}
                  onPress={() => setFilters(prev => ({ ...prev, categoryId: undefined }))}
                >
                  <Text style={[
                    styles.filterOptionText,
                    !filters.categoryId && styles.activeFilterOptionText
                  ]}>
                    Toutes les catégories
                  </Text>
                </TouchableOpacity>
                {categories.map(category => (
                  <TouchableOpacity
                    key={category.id}
                    style={[
                      styles.filterOption,
                      filters.categoryId === category.id && styles.activeFilterOption
                    ]}
                    onPress={() => setFilters(prev => ({ 
                      ...prev, 
                      categoryId: prev.categoryId === category.id ? undefined : category.id 
                    }))}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      filters.categoryId === category.id && styles.activeFilterOptionText
                    ]} numberOfLines={1}>
                      {category.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Moyens de paiement */}
            <View style={styles.filterSection}>
              <Text style={styles.filterTitle}>Moyens de paiement</Text>
              <View style={styles.filterOptions}>
                {[
                  { key: 'cash', label: 'Espèces' },
                  { key: 'mobile_money', label: 'Mobile Money' },
                  { key: 'credit', label: 'Crédit' },
                  { key: 'advance', label: 'Avance' }
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

            {/* Type de dette */}
            <View style={styles.filterSection}>
              <Text style={styles.filterTitle}>Dettes et Avances</Text>
              <View style={styles.filterOptions}>
                {[
                  { key: 'all', label: 'Tout' },
                  { key: 'gave', label: 'J\'ai donné (Dettes)' },
                  { key: 'took', label: 'J\'ai pris (Avances)' }
                ].map(option => (
                  <TouchableOpacity
                    key={option.key}
                    style={[
                      styles.filterOption,
                      filters.debtType === option.key && styles.activeFilterOption
                    ]}
                    onPress={() => setFilters(prev => ({ ...prev, debtType: option.key as any }))}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      filters.debtType === option.key && styles.activeFilterOptionText
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Statut crédit */}
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
              style={styles.resetFiltersButton}
              onPress={() => setFilters({
                dateRange: 'month',
                paymentMethods: ['cash', 'mobile_money', 'credit'],
                creditStatus: ['paid', 'credit', 'partial'],
                debtType: 'all',
              })}
            >
              <Text style={styles.resetFiltersText}>Réinitialiser</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.applyFiltersButton}
              onPress={() => setShowFilters(false)}
            >
              <Text style={styles.applyFiltersText}>Appliquer</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={showDatePicker === 'start' ? filters.startDate || new Date() : filters.endDate || new Date()}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowDatePicker(null);
            if (selectedDate) {
              setFilters(prev => ({
                ...prev,
                [showDatePicker === 'start' ? 'startDate' : 'endDate']: selectedDate
              }));
            }
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.sm,
    marginRight: spacing.md,
    borderRadius: 8,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: fontSizes.xl,
    fontWeight: '700',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: fontSizes.sm,
    color: colors.textLight,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    padding: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    fontSize: fontSizes.lg,
    color: colors.textLight,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  summaryContainer: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    borderLeftWidth: 3,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  summaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryContent: {
    flex: 1,
  },
  summaryTitle: {
    fontSize: fontSizes.sm,
    fontWeight: '500',
    color: colors.textLight,
    marginBottom: spacing.xs,
  },
  summaryValue: {
    fontSize: fontSizes.xl,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  summarySubtitle: {
    fontSize: fontSizes.xs,
    color: colors.textLight,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  trendText: {
    fontSize: fontSizes.xs,
    fontWeight: '600',
  },
  chartSection: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderRadius: 12,
    padding: spacing.lg,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chartTitle: {
    fontSize: fontSizes.lg,
    fontWeight: '600',
    color: colors.text,
  },
  chartTabs: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  chartTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 6,
    gap: spacing.xs,
  },
  activeChartTab: {
    backgroundColor: colors.primary,
  },
  chartTabText: {
    fontSize: fontSizes.xs,
    color: colors.textLight,
  },
  activeChartTabText: {
    color: colors.surface,
    fontWeight: '600',
  },
  chartContainer: {
    alignItems: 'center',
  },
  chart: {
    borderRadius: 12,
  },
  multiFilterChartContainer: {
    alignItems: 'center',
    width: '100%',
  },
  legendContainer: {
    marginTop: spacing.md,
    width: '100%',
    gap: spacing.xs,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    flex: 1,
    fontSize: fontSizes.xs,
    color: colors.text,
  },
  legendValue: {
    fontSize: fontSizes.xs,
    fontWeight: '600',
    color: colors.primary,
  },
  noDataContainer: {
    alignItems: 'center',
    justifyContent: 'center',
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
    borderRadius: 12,
    padding: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSizes.lg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  performanceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  performanceCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
  },
  performanceRank: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.success + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  performanceRankText: {
    fontSize: fontSizes.xs,
    fontWeight: '600',
    color: colors.success,
  },
  performanceName: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  performanceAmount: {
    fontSize: fontSizes.md,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
  },
  performanceStats: {
    fontSize: fontSizes.xs,
    color: colors.textLight,
  },
  performanceProgress: {
    width: '100%',
    height: 3,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: spacing.xs,
  },
  performanceProgressBar: {
    height: '100%',
    borderRadius: 2,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  productCard: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
  },
  productRank: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productRankText: {
    fontSize: fontSizes.xs,
    fontWeight: '600',
    color: colors.primary,
  },
  productName: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    minHeight: 32,
  },
  productAmount: {
    fontSize: fontSizes.md,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
  },
  productQuantity: {
    fontSize: fontSizes.xs,
    color: colors.textLight,
  },
  categoryList: {
    gap: spacing.sm,
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  categoryInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  categoryName: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  categoryQuantity: {
    fontSize: fontSizes.xs,
    color: colors.textLight,
  },
  categoryAmount: {
    fontSize: fontSizes.md,
    fontWeight: '700',
    color: colors.primary,
  },
  paymentList: {
    gap: spacing.sm,
  },
  paymentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  paymentIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentInfo: {
    flex: 1,
  },
  paymentMethod: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  paymentCount: {
    fontSize: fontSizes.xs,
    color: colors.textLight,
  },
  paymentAmount: {
    fontSize: fontSizes.md,
    fontWeight: '700',
    color: colors.primary,
  },
  bottomSpacing: {
    height: spacing.xl,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  modalTitle: {
    fontSize: fontSizes.xl,
    fontWeight: '700',
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
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  filterOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 6,
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
    fontWeight: '600',
  },
  customDateContainer: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  dateButton: {
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  dateButtonText: {
    fontSize: fontSizes.sm,
    color: colors.text,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing.md,
  },
  resetFiltersButton: {
    flex: 1,
    backgroundColor: colors.textLight,
    paddingVertical: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  resetFiltersText: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.surface,
  },
  applyFiltersButton: {
    flex: 2,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  applyFiltersText: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.surface,
  },
});
