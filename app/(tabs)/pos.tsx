
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Alert, Modal, Dimensions, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { commonStyles, colors, buttonStyles, spacing, fontSizes, isSmallScreen } from '../../styles/commonStyles';
import { getProducts, getCustomers, getSales, storeSales, storeProducts, getNextReceiptNumber, getSettings, getCategories, getApplicablePrice, storeCustomers, formatQuantityWithUnit } from '../../utils/storage';
import { useCustomersSync, useCustomersUpdater, useDashboardUpdater } from '../../hooks/useCustomersSync';
import { useAuthState } from '../../hooks/useAuth';
import { cashierSyncService } from '../../utils/cashierSyncService';
import Icon from '../../components/Icon';
import uuid from 'react-native-uuid';
import AddCustomerModal from '../../components/AddCustomerModal';
import { Product, Customer, CartItem, Sale, SaleItem, AppSettings, Category, UNITS_OF_MEASUREMENT } from '../../types';

const fabStyles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});

const modalStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderRadius: 20,
    width: '95%',
    maxHeight: '90%',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalBody: {
    flex: 1,
    padding: spacing.lg,
  },
});

const checkoutStyles = StyleSheet.create({
  checkoutContainer: {
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.lg,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  totalLabel: {
    fontSize: fontSizes.md,
    color: colors.text,
  },
  totalAmount: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: colors.primary,
  },
  paymentMethodsContainer: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  paymentMethodButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    marginHorizontal: spacing.xs,
    alignItems: 'center',
  },
  paymentMethodButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  paymentMethodText: {
    fontSize: fontSizes.sm,
    color: colors.text,
  },
  paymentMethodTextActive: {
    color: colors.secondary,
    fontWeight: '600',
  },
});

const customerListStyles = StyleSheet.create({
  customerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  customerInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  customerName: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  customerBalance: {
    fontSize: fontSizes.sm,
    fontWeight: '500',
  },
  customerPhone: {
    fontSize: fontSizes.sm,
    color: colors.textLight,
  },
});

export default function POSScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [showCartModal, setShowCartModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mobile_money' | 'credit' | 'card'>('cash');
  const [customerAdvanceBalance, setCustomerAdvanceBalance] = useState(0);
  const [paymentBreakdown, setPaymentBreakdown] = useState({
    cashAmount: 0,
    mobileMoneyAmount: 0,
    creditAmount: 0,
    cardAmount: 0,
    remainingAmount: 0,
  });
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const { user } = useAuthState();
  const { triggerCustomersUpdate } = useCustomersUpdater();
  const { triggerDashboardUpdate } = useDashboardUpdater();
  useCustomersSync();

  const loadData = useCallback(async () => {
    try {
      console.log('Loading POS data...');
      const [productsData, customersData, categoriesData, settingsData] = await Promise.all([
        getProducts(),
        getCustomers(),
        getCategories(),
        getSettings(),
      ]);

      setProducts(productsData);
      setCustomers(customersData);
      setCategories(categoriesData);
      setSettings(settingsData);
      setLoading(false);
      console.log('POS data loaded successfully');
    } catch (error) {
      console.error('Error loading POS data:', error);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Update customer advance balance when customer or payment method changes
  useEffect(() => {
    if (selectedCustomer && paymentMethod === 'credit') {
      setCustomerAdvanceBalance(Math.max(0, selectedCustomer.balance));
    } else {
      setCustomerAdvanceBalance(0);
    }
  }, [selectedCustomer, paymentMethod, customerAdvanceBalance]);

  // Calculate cart totals
  const cartTotals = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => {
      const itemSubtotal = (item.price * item.quantity) - (item.discount || 0);
      return sum + itemSubtotal;
    }, 0);
    const discount = cart.reduce((sum, item) => sum + (item.discount || 0), 0);
    const total = subtotal;
    
    return { subtotal, discount, total };
  }, [cart]);

  // Update payment breakdown when total changes
  useEffect(() => {
    const total = cartTotals.total;
    const advanceUsed = Math.min(customerAdvanceBalance, total);
    
    setPaymentBreakdown(prev => ({
      ...prev,
      remainingAmount: Math.max(0, total - advanceUsed),
    }));
  }, [paymentMethod, cartTotals.total, customerAdvanceBalance]);

  // Filter products based on search and category
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          product.barcode?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || product.categoryId === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, selectedCategory]);

  const formatCurrency = useCallback((amount: number): string => {
    if (!settings) return amount.toString();
    const currency = settings.currency === 'XOF' ? 'FCFA' : settings.currency;
    return `${amount.toLocaleString()} ${currency}`;
  }, [settings]);

  const addToCart = useCallback((product: Product) => {
    const priceInfo = getApplicablePrice(product);
    const price = priceInfo.price;
    
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.productId === product.id);
      
      if (existingItem) {
        const newQuantity = existingItem.quantity + 1;
        return prevCart.map(item =>
          item.productId === product.id
            ? { 
                ...item, 
                quantity: newQuantity,
                subtotal: (price * newQuantity) - (item.discount || 0)
              }
            : item
        );
      } else {
        const newItem: CartItem = {
          productId: product.id,
          name: product.name,
          price,
          quantity: 1,
          unit: product.unit,
          discount: 0,
          subtotal: price,
        };
        return [...prevCart, newItem];
      }
    });
  }, []);

  const updateCartItemQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart(prevCart => prevCart.filter(item => item.productId !== productId));
    } else {
      setCart(prevCart =>
        prevCart.map(item =>
          item.productId === productId 
            ? { 
                ...item, 
                quantity,
                subtotal: (item.price * quantity) - (item.discount || 0)
              } 
            : item
        )
      );
    }
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setSelectedCustomer(null);
    setPaymentMethod('cash');
    setCustomerAdvanceBalance(0);
    setPaymentBreakdown({
      cashAmount: 0,
      mobileMoneyAmount: 0,
      creditAmount: 0,
      cardAmount: 0,
      remainingAmount: 0,
    });
  }, []);

  const processSale = useCallback(async () => {
    if (cart.length === 0) {
      Alert.alert('Erreur', 'Le panier est vide');
      return;
    }

    if (!user) {
      Alert.alert('Erreur', 'Utilisateur non connecté');
      return;
    }

    // Validate customer for credit sales
    if (paymentMethod === 'credit' && !selectedCustomer) {
      Alert.alert('Erreur', 'Veuillez sélectionner un client pour une vente à crédit');
      return;
    }

    try {
      console.log('Processing sale...');
      
      const receiptNumber = await getNextReceiptNumber();
      const saleItems: SaleItem[] = cart.map(item => ({
        id: uuid.v4() as string,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.price,
        discount: item.discount || 0,
        subtotal: item.subtotal,
      }));

      const sale: Sale = {
        id: uuid.v4() as string,
        receiptNumber,
        createdAt: new Date(),
        customerId: selectedCustomer?.id,
        customer: selectedCustomer,
        items: saleItems,
        subtotal: cartTotals.subtotal,
        discount: cartTotals.discount,
        tax: 0,
        total: cartTotals.total,
        paymentMethod,
        paymentStatus: paymentMethod === 'credit' ? 'credit' : 'paid',
        amountPaid: paymentMethod === 'credit' ? 0 : cartTotals.total,
        change: paymentMethod === 'credit' ? 0 : 0,
        notes: '',
        cashierId: user.id,
        cashier: user,
      };

      // Update product stock
      const updatedProducts = products.map(product => {
        const cartItem = cart.find(item => item.productId === product.id);
        if (cartItem) {
          return {
            ...product,
            stock: Math.max(0, product.stock - cartItem.quantity),
          };
        }
        return product;
      });

      // Update customer balance if credit sale
      let updatedCustomers = customers;
      if (selectedCustomer && paymentMethod === 'credit') {
        updatedCustomers = customers.map(customer => {
          if (customer.id === selectedCustomer.id) {
            const advanceUsed = Math.min(customerAdvanceBalance, cartTotals.total);
            const newBalance = customer.balance - cartTotals.total + advanceUsed;
            
            const newTransaction = {
              id: uuid.v4() as string,
              date: new Date(),
              amount: cartTotals.total - advanceUsed,
              type: 'gave' as const,
              paymentMethod,
              description: `Vente à crédit - Reçu #${receiptNumber}`,
              balance: newBalance,
              saleId: sale.id,
            };

            return {
              ...customer,
              balance: newBalance,
              transactions: [...(customer.transactions || []), newTransaction],
            };
          }
          return customer;
        });
      }

      // Save data
      const currentSales = await getSales();
      await Promise.all([
        storeSales([...currentSales, sale]),
        storeProducts(updatedProducts),
        storeCustomers(updatedCustomers),
      ]);

      // Sync cashier sale if user is cashier
      if (user.role === 'cashier') {
        await cashierSyncService.addCashierSale(sale, user);
        console.log('Cashier sale added to sync queue');
      }

      // Update state
      setProducts(updatedProducts);
      setCustomers(updatedCustomers);
      
      // Trigger updates
      console.log('POS: Triggering customers update with updated data...');
      await triggerCustomersUpdate();
      console.log('POS: Triggering dashboard update...');
      triggerDashboardUpdate();

      console.log('Sale processed successfully:', sale.id);

      // Close cart modal
      setShowCartModal(false);

      // Navigate to success page
      router.push({
        pathname: '/transaction-success',
        params: {
          saleId: sale.id,
          amount: sale.total.toString(),
          receiptNumber: sale.receiptNumber,
        },
      });

      // Clear cart
      clearCart();
    } catch (error) {
      console.error('Error processing sale:', error);
      Alert.alert('Erreur', 'Impossible de traiter la vente');
    }
  }, [cart, cartTotals, paymentMethod, selectedCustomer, customerAdvanceBalance, products, customers, user, triggerCustomersUpdate, triggerDashboardUpdate, clearCart]);

  const selectCustomer = useCallback((customer: Customer) => {
    setSelectedCustomer(customer);
    setShowCustomerModal(false);
  }, []);

  const handleAddCustomer = useCallback(async (customerData: Omit<Customer, 'id' | 'balance' | 'transactions' | 'totalPurchases' | 'createdAt' | 'updatedAt'>) => {
    const newCustomer: Customer = {
      ...customerData,
      id: uuid.v4() as string,
      balance: 0,
      totalPurchases: 0,
      transactions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const updatedCustomers = [...customers, newCustomer];
    setCustomers(updatedCustomers);
    await storeCustomers(updatedCustomers);
    setSelectedCustomer(newCustomer);
    setShowAddCustomerModal(false);
    
    // Trigger customers update
    console.log('POS: New customer added, triggering update...');
    await triggerCustomersUpdate();
  }, [customers, triggerCustomersUpdate]);

  if (loading) {
    return (
      <SafeAreaView style={commonStyles.container}>
        <View style={[commonStyles.content, { justifyContent: 'center', alignItems: 'center' }]}>
          <Icon name="calculator" size={48} color={colors.primary} />
          <Text style={[commonStyles.subtitle, { marginTop: spacing.md }]}>
            Chargement du point de vente...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={commonStyles.container}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={{ flex: 1 }}>
          {/* Header */}
          <View style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            padding: spacing.lg,
            backgroundColor: colors.background,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}>
            <Text style={[commonStyles.title, { flex: 1 }]}>Point de vente</Text>
            {user?.role === 'cashier' && (
              <View style={{
                backgroundColor: colors.warning + '20',
                paddingHorizontal: spacing.sm,
                paddingVertical: spacing.xs,
                borderRadius: 12,
              }}>
                <Text style={{ color: colors.warning, fontSize: fontSizes.xs, fontWeight: '600' }}>
                  Caissier
                </Text>
              </View>
            )}
          </View>

          {/* Search and Filters */}
          <View style={{ padding: spacing.lg }}>
            <View style={[commonStyles.inputContainer, { marginBottom: spacing.md }]}>
              <Icon name="search" size={20} color={colors.textLight} />
              <TextInput
                style={[commonStyles.input, { marginLeft: spacing.sm }]}
                placeholder="Rechercher un produit..."
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: spacing.md }}
            >
              <TouchableOpacity
                style={[
                  commonStyles.chip,
                  selectedCategory === 'all' && commonStyles.chipActive,
                  { marginRight: spacing.sm }
                ]}
                onPress={() => setSelectedCategory('all')}
              >
                <Text style={[
                  commonStyles.chipText,
                  selectedCategory === 'all' && commonStyles.chipTextActive
                ]}>
                  Tous
                </Text>
              </TouchableOpacity>
              {categories.map(category => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    commonStyles.chip,
                    selectedCategory === category.id && commonStyles.chipActive,
                    { marginRight: spacing.sm }
                  ]}
                  onPress={() => setSelectedCategory(category.id)}
                >
                  <Text style={[
                    commonStyles.chipText,
                    selectedCategory === category.id && commonStyles.chipTextActive
                  ]}>
                    {category.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Products Grid */}
          <ScrollView style={{ flex: 1, paddingHorizontal: spacing.lg }}>
            <View style={{ 
              flexDirection: 'row', 
              flexWrap: 'wrap', 
              justifyContent: 'space-between' 
            }}>
              {filteredProducts.map(product => (
                <TouchableOpacity
                  key={product.id}
                  style={[
                    commonStyles.card,
                    {
                      width: isSmallScreen ? '48%' : '31%',
                      marginBottom: spacing.md,
                      padding: spacing.md,
                    }
                  ]}
                  onPress={() => addToCart(product)}
                >
                  <Text style={[commonStyles.text, { fontWeight: '600', marginBottom: spacing.xs }]}>
                    {product.name}
                  </Text>
                  <Text style={[commonStyles.textLight, { fontSize: fontSizes.sm, marginBottom: spacing.xs }]}>
                    {formatCurrency(getApplicablePrice(product).price)}
                  </Text>
                  <Text style={[commonStyles.textLight, { fontSize: fontSizes.xs }]}>
                    Stock: {formatQuantityWithUnit(product.stock, product.unit)}
                  </Text>
                  {product.stock <= product.minStock && (
                    <View style={{
                      backgroundColor: colors.error + '20',
                      paddingHorizontal: spacing.xs,
                      paddingVertical: 2,
                      borderRadius: 4,
                      marginTop: spacing.xs,
                      alignSelf: 'flex-start',
                    }}>
                      <Text style={{ color: colors.error, fontSize: fontSizes.xs }}>
                        Stock bas
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ height: 200 }} />
          </ScrollView>

          {/* Cart FAB */}
          {cart.length > 0 && (
            <TouchableOpacity
              style={fabStyles.fab}
              onPress={() => setShowCartModal(true)}
            >
              <Icon name="cart" size={24} color={colors.secondary} />
              <View style={{
                position: 'absolute',
                top: -5,
                right: -5,
                backgroundColor: colors.error,
                borderRadius: 10,
                minWidth: 20,
                height: 20,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Text style={{ color: colors.secondary, fontSize: fontSizes.xs, fontWeight: 'bold' }}>
                  {cart.reduce((sum, item) => sum + item.quantity, 0)}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Customer Selection Modal */}
        <Modal
          visible={showCustomerModal}
          animationType="slide"
          transparent
          onRequestClose={() => setShowCustomerModal(false)}
        >
          <View style={modalStyles.modalOverlay}>
            <View style={[modalStyles.modalContent, { height: '80%' }]}>
              <View style={modalStyles.modalHeader}>
                <Text style={commonStyles.subtitle}>Sélectionner un client</Text>
                <TouchableOpacity onPress={() => setShowCustomerModal(false)}>
                  <Icon name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>
              <ScrollView style={{ flex: 1 }}>
                <TouchableOpacity
                  style={customerListStyles.customerItem}
                  onPress={() => setShowAddCustomerModal(true)}
                >
                  <View style={{
                    width: 40,
                    height: 40,
                    backgroundColor: colors.primary,
                    borderRadius: 20,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Icon name="add" size={20} color={colors.secondary} />
                  </View>
                  <View style={customerListStyles.customerInfo}>
                    <Text style={customerListStyles.customerName}>
                      Ajouter un nouveau client
                    </Text>
                  </View>
                </TouchableOpacity>
                {customers.map(customer => (
                  <TouchableOpacity
                    key={customer.id}
                    style={customerListStyles.customerItem}
                    onPress={() => selectCustomer(customer)}
                  >
                    <View style={{
                      width: 40,
                      height: 40,
                      backgroundColor: customer.balance >= 0 ? colors.success : colors.error,
                      borderRadius: 20,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <Icon name="person" size={20} color={colors.secondary} />
                    </View>
                    <View style={customerListStyles.customerInfo}>
                      <Text style={customerListStyles.customerName}>
                        {customer.name}
                      </Text>
                      <Text style={[
                        customerListStyles.customerBalance,
                        { color: customer.balance >= 0 ? colors.success : colors.error }
                      ]}>
                        {formatCurrency(Math.abs(customer.balance))} 
                        <Text>{customer.balance >= 0 ? ' (crédit)' : ' (dette)'}</Text>
                      </Text>
                      {customer.phone && (
                        <Text style={customerListStyles.customerPhone}>
                          {customer.phone}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Add Customer Modal */}
        <AddCustomerModal
          visible={showAddCustomerModal}
          onClose={() => setShowAddCustomerModal(false)}
          onCustomerAdded={handleAddCustomer}
        />

        {/* Cart Modal - Full Screen */}
        <Modal
          visible={showCartModal}
          animationType="slide"
          onRequestClose={() => setShowCartModal(false)}
        >
          <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={modalStyles.modalHeader}>
              <Text style={commonStyles.title}>
                Panier ({cart.length} {cart.length === 1 ? 'article' : 'articles'})
              </Text>
              <TouchableOpacity onPress={() => setShowCartModal(false)}>
                <Icon name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={{ flex: 1 }}>
              {/* Cart Items */}
              <View style={{ padding: spacing.lg }}>
                {cart.map((item, index) => (
                  <View key={`${item.productId}-${index}`} style={[
                    commonStyles.card,
                    { marginBottom: spacing.md, padding: spacing.md }
                  ]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <View style={{ flex: 1 }}>
                        <Text style={[commonStyles.text, { fontWeight: '600', marginBottom: spacing.xs }]}>
                          {item.name}
                        </Text>
                        <Text style={[commonStyles.textLight, { fontSize: fontSizes.sm }]}>
                          {formatCurrency(item.price)} × {formatQuantityWithUnit(item.quantity, item.unit)}
                        </Text>
                        {item.discount && item.discount > 0 && (
                          <Text style={[commonStyles.textLight, { fontSize: fontSizes.sm, color: colors.success }]}>
                            Remise: -{formatCurrency(item.discount)}
                          </Text>
                        )}
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={[commonStyles.text, { fontWeight: 'bold', color: colors.primary }]}>
                          {formatCurrency(item.subtotal)}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs }}>
                          <TouchableOpacity
                            style={{
                              backgroundColor: colors.error,
                              borderRadius: 15,
                              width: 30,
                              height: 30,
                              alignItems: 'center',
                              justifyContent: 'center',
                              marginRight: spacing.xs,
                            }}
                            onPress={() => updateCartItemQuantity(item.productId, item.quantity - 1)}
                          >
                            <Icon name="remove" size={16} color={colors.secondary} />
                          </TouchableOpacity>
                          <Text style={[commonStyles.text, { minWidth: 30, textAlign: 'center' }]}>
                            {item.quantity}
                          </Text>
                          <TouchableOpacity
                            style={{
                              backgroundColor: colors.success,
                              borderRadius: 15,
                              width: 30,
                              height: 30,
                              alignItems: 'center',
                              justifyContent: 'center',
                              marginLeft: spacing.xs,
                            }}
                            onPress={() => updateCartItemQuantity(item.productId, item.quantity + 1)}
                          >
                            <Icon name="add" size={16} color={colors.secondary} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </View>
                ))}
              </View>

              {/* Customer Selection */}
              <View style={{ padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border }}>
                <Text style={[commonStyles.text, { fontWeight: '600', marginBottom: spacing.md }]}>
                  Client
                </Text>
                <TouchableOpacity
                  style={[
                    commonStyles.inputContainer,
                    { paddingVertical: spacing.md, justifyContent: 'space-between', flexDirection: 'row' }
                  ]}
                  onPress={() => setShowCustomerModal(true)}
                >
                  <Text style={[
                    commonStyles.text,
                    { color: selectedCustomer ? colors.text : colors.textLight }
                  ]}>
                    {selectedCustomer ? selectedCustomer.name : 'Sélectionner un client (optionnel)'}
                  </Text>
                  <Icon name="chevron-down" size={20} color={colors.textLight} />
                </TouchableOpacity>
                
                {selectedCustomer && (
                  <View style={{ marginTop: spacing.sm }}>
                    <Text style={[commonStyles.textLight, { fontSize: fontSizes.sm }]}>
                      Solde: {formatCurrency(Math.abs(selectedCustomer.balance))} 
                      <Text>{selectedCustomer.balance >= 0 ? ' (crédit)' : ' (dette)'}</Text>
                    </Text>
                  </View>
                )}
              </View>

              {/* Payment Method */}
              <View style={{ padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border }}>
                <Text style={[commonStyles.text, { fontWeight: '600', marginBottom: spacing.md }]}>
                  Mode de paiement
                </Text>
                <View style={checkoutStyles.paymentMethodsContainer}>
                  {[
                    { key: 'cash', label: 'Espèces', icon: 'cash' },
                    { key: 'mobile_money', label: 'Mobile Money', icon: 'phone' },
                    { key: 'credit', label: 'Crédit', icon: 'time' },
                    { key: 'card', label: 'Carte', icon: 'card' },
                  ].map(method => (
                    <TouchableOpacity
                      key={method.key}
                      style={[
                        checkoutStyles.paymentMethodButton,
                        paymentMethod === method.key && checkoutStyles.paymentMethodButtonActive,
                      ]}
                      onPress={() => setPaymentMethod(method.key as any)}
                    >
                      <Icon 
                        name={method.icon} 
                        size={16} 
                        color={paymentMethod === method.key ? colors.secondary : colors.text} 
                      />
                      <Text style={[
                        checkoutStyles.paymentMethodText,
                        paymentMethod === method.key && checkoutStyles.paymentMethodTextActive,
                        { marginTop: 4 }
                      ]}>
                        {method.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            {/* Totals and Actions - Fixed at bottom */}
            <View style={checkoutStyles.checkoutContainer}>
              <View style={checkoutStyles.totalRow}>
                <Text style={checkoutStyles.totalLabel}>Sous-total:</Text>
                <Text style={checkoutStyles.totalAmount}>
                  {formatCurrency(cartTotals.subtotal)}
                </Text>
              </View>
              
              {cartTotals.discount > 0 && (
                <View style={checkoutStyles.totalRow}>
                  <Text style={[checkoutStyles.totalLabel, { color: colors.success }]}>Remise:</Text>
                  <Text style={[checkoutStyles.totalAmount, { color: colors.success }]}>
                    -{formatCurrency(cartTotals.discount)}
                  </Text>
                </View>
              )}
              
              <View style={[checkoutStyles.totalRow, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm }]}>
                <Text style={[checkoutStyles.totalLabel, { fontSize: fontSizes.lg, fontWeight: 'bold' }]}>
                  Total:
                </Text>
                <Text style={[checkoutStyles.totalAmount, { fontSize: fontSizes.xl, fontWeight: 'bold' }]}>
                  {formatCurrency(cartTotals.total)}
                </Text>
              </View>

              {/* Action Buttons */}
              <View style={{ flexDirection: 'row', marginTop: spacing.lg, gap: spacing.md }}>
                <TouchableOpacity
                  style={[buttonStyles.secondary, { flex: 1 }]}
                  onPress={clearCart}
                >
                  <Text style={buttonStyles.secondaryText}>Vider le panier</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[buttonStyles.primary, { flex: 2 }]}
                  onPress={processSale}
                >
                  <Text style={buttonStyles.primaryText}>Finaliser la vente</Text>
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
