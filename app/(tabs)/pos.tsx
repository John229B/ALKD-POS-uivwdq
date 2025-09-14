
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
    bottom: 30,
    right: 30,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  fabBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: colors.error,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
});

const productStyles = StyleSheet.create({
  productCard: {
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.md,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  productImage: {
    width: '100%',
    height: 120,
    backgroundColor: colors.primaryLight,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  productName: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  productPrice: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  productStock: {
    fontSize: fontSizes.sm,
    color: colors.textLight,
    marginBottom: spacing.sm,
  },
  addButton: {
    backgroundColor: colors.success,
    borderRadius: 8,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  addButtonText: {
    color: colors.secondary,
    fontSize: fontSizes.sm,
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
  stockBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.error + '20',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 6,
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
  const [useAdvanceAmount, setUseAdvanceAmount] = useState(0);
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

  // Update customer advance balance when customer changes
  useEffect(() => {
    if (selectedCustomer) {
      const availableAdvance = Math.max(0, selectedCustomer.balance);
      setCustomerAdvanceBalance(availableAdvance);
      setUseAdvanceAmount(0);
    } else {
      setCustomerAdvanceBalance(0);
      setUseAdvanceAmount(0);
    }
  }, [selectedCustomer]);

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

  // Calculate remaining amount after advance usage
  const remainingAmount = useMemo(() => {
    return Math.max(0, cartTotals.total - useAdvanceAmount);
  }, [cartTotals.total, useAdvanceAmount]);

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

  const removeFromCart = useCallback((productId: string) => {
    setCart(prevCart => prevCart.filter(item => item.productId !== productId));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setSelectedCustomer(null);
    setPaymentMethod('cash');
    setCustomerAdvanceBalance(0);
    setUseAdvanceAmount(0);
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
        amountPaid: paymentMethod === 'credit' ? useAdvanceAmount : cartTotals.total,
        change: paymentMethod === 'credit' ? 0 : 0,
        notes: useAdvanceAmount > 0 ? `Avance utilisée: ${formatCurrency(useAdvanceAmount)}` : '',
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

      // Update customer balance
      let updatedCustomers = customers;
      if (selectedCustomer) {
        updatedCustomers = customers.map(customer => {
          if (customer.id === selectedCustomer.id) {
            let newBalance = customer.balance;
            let transactionAmount = cartTotals.total;
            
            // If using advance, deduct from balance
            if (useAdvanceAmount > 0) {
              newBalance -= useAdvanceAmount;
              transactionAmount -= useAdvanceAmount;
            }
            
            // If credit sale, add remaining amount as debt
            if (paymentMethod === 'credit' && transactionAmount > 0) {
              newBalance -= transactionAmount;
            }

            const newTransaction = {
              id: uuid.v4() as string,
              date: new Date(),
              amount: cartTotals.total,
              type: paymentMethod === 'credit' ? 'gave' as const : 'took' as const,
              paymentMethod,
              description: `Vente - Reçu #${receiptNumber}${useAdvanceAmount > 0 ? ` (Avance: ${formatCurrency(useAdvanceAmount)})` : ''}`,
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
  }, [cart, cartTotals, paymentMethod, selectedCustomer, useAdvanceAmount, products, customers, user, triggerCustomersUpdate, triggerDashboardUpdate, clearCart, formatCurrency]);

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

  const openPaymentMethodSelection = useCallback(() => {
    Alert.alert(
      'Mode de paiement',
      'Choisissez le mode de paiement',
      [
        { text: 'Espèces', onPress: () => setPaymentMethod('cash') },
        { text: 'Mobile Money', onPress: () => setPaymentMethod('mobile_money') },
        { text: 'Carte', onPress: () => setPaymentMethod('card') },
        { text: 'Crédit', onPress: () => setPaymentMethod('credit') },
        { text: 'Annuler', style: 'cancel' },
      ]
    );
  }, []);

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

          {/* Search Bar */}
          <View style={{ padding: spacing.lg }}>
            <View style={[commonStyles.inputContainer, { marginBottom: spacing.md }]}>
              <Icon name="search" size={20} color={colors.textLight} />
              <TextInput
                style={[commonStyles.input, { marginLeft: spacing.sm, flex: 1 }]}
                placeholder="Rechercher par nom ou code produit..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor={colors.textLight}
              />
            </View>

            {/* Category Filters */}
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
                <View
                  key={product.id}
                  style={[
                    productStyles.productCard,
                    {
                      width: isSmallScreen ? '48%' : '31%',
                    }
                  ]}
                >
                  {/* Product Image Placeholder */}
                  <View style={productStyles.productImage}>
                    <Icon name="cube" size={32} color={colors.primary} />
                    {product.stock <= product.minStock && (
                      <View style={productStyles.stockBadge}>
                        <Text style={{ color: colors.error, fontSize: fontSizes.xs, fontWeight: '600' }}>
                          Stock bas
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Product Info */}
                  <Text style={productStyles.productName} numberOfLines={2}>
                    {product.name}
                  </Text>
                  <Text style={productStyles.productPrice}>
                    {formatCurrency(getApplicablePrice(product).price)}
                  </Text>
                  <Text style={productStyles.productStock}>
                    Stock: {formatQuantityWithUnit(product.stock, product.unit)}
                  </Text>

                  {/* Add Button */}
                  <TouchableOpacity
                    style={productStyles.addButton}
                    onPress={() => addToCart(product)}
                    disabled={product.stock <= 0}
                  >
                    <Icon name="add" size={16} color={colors.secondary} />
                    <Text style={productStyles.addButtonText}>Ajouter</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
            <View style={{ height: 120 }} />
          </ScrollView>

          {/* Floating Cart Badge */}
          {cart.length > 0 && (
            <TouchableOpacity
              style={fabStyles.fab}
              onPress={() => setShowCartModal(true)}
            >
              <Icon name="cart" size={28} color={colors.secondary} />
              <View style={fabStyles.fabBadge}>
                <Text style={{ 
                  color: colors.secondary, 
                  fontSize: fontSizes.xs, 
                  fontWeight: 'bold' 
                }}>
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
          <View style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'center',
            alignItems: 'center',
          }}>
            <View style={{
              backgroundColor: colors.background,
              borderRadius: 20,
              width: '90%',
              maxHeight: '80%',
              elevation: 10,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
            }}>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: spacing.lg,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              }}>
                <Text style={commonStyles.subtitle}>Sélectionner un client</Text>
                <TouchableOpacity onPress={() => setShowCustomerModal(false)}>
                  <Icon name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>
              <ScrollView style={{ flex: 1 }}>
                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: spacing.md,
                    paddingHorizontal: spacing.lg,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                  }}
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
                  <View style={{ flex: 1, marginLeft: spacing.md }}>
                    <Text style={{
                      fontSize: fontSizes.md,
                      fontWeight: '600',
                      color: colors.text,
                    }}>
                      Ajouter un nouveau client
                    </Text>
                  </View>
                </TouchableOpacity>
                {customers.map(customer => (
                  <TouchableOpacity
                    key={customer.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: spacing.md,
                      paddingHorizontal: spacing.lg,
                      borderBottomWidth: 1,
                      borderBottomColor: colors.border,
                    }}
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
                    <View style={{ flex: 1, marginLeft: spacing.md }}>
                      <Text style={{
                        fontSize: fontSizes.md,
                        fontWeight: '600',
                        color: colors.text,
                        marginBottom: 4,
                      }}>
                        {customer.name}
                      </Text>
                      <Text style={{
                        fontSize: fontSizes.sm,
                        fontWeight: '500',
                        color: customer.balance >= 0 ? colors.success : colors.error,
                      }}>
                        {formatCurrency(Math.abs(customer.balance))} 
                        <Text>{customer.balance >= 0 ? ' (crédit)' : ' (dette)'}</Text>
                      </Text>
                      {customer.phone && (
                        <Text style={{
                          fontSize: fontSizes.sm,
                          color: colors.textLight,
                        }}>
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
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: spacing.lg,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}>
              <View>
                <Text style={commonStyles.title}>Panier</Text>
                <Text style={[commonStyles.textLight, { fontSize: fontSizes.sm }]}>
                  {cart.length} {cart.length === 1 ? 'article' : 'articles'}
                </Text>
              </View>
              <TouchableOpacity 
                onPress={() => setShowCartModal(false)}
                style={{
                  backgroundColor: colors.error + '20',
                  borderRadius: 20,
                  width: 40,
                  height: 40,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="close" size={24} color={colors.error} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={{ flex: 1 }}>
              {/* Customer Section */}
              <View style={{ padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border }}>
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
                    {selectedCustomer ? selectedCustomer.name : 'Sélectionner un client'}
                  </Text>
                  <Icon name="chevron-down" size={20} color={colors.textLight} />
                </TouchableOpacity>
                
                {selectedCustomer && selectedCustomer.balance > 0 && (
                  <View style={{
                    backgroundColor: colors.success + '20',
                    padding: spacing.md,
                    borderRadius: 12,
                    marginTop: spacing.sm,
                  }}>
                    <Text style={[commonStyles.text, { color: colors.success, fontWeight: '600' }]}>
                      Solde disponible: {formatCurrency(selectedCustomer.balance)}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm }}>
                      <Text style={[commonStyles.textLight, { marginRight: spacing.sm }]}>
                        Utiliser pour payer:
                      </Text>
                      <TouchableOpacity
                        style={[
                          commonStyles.chip,
                          useAdvanceAmount > 0 && commonStyles.chipActive,
                        ]}
                        onPress={() => {
                          const maxUsable = Math.min(selectedCustomer.balance, cartTotals.total);
                          setUseAdvanceAmount(useAdvanceAmount > 0 ? 0 : maxUsable);
                        }}
                      >
                        <Text style={[
                          commonStyles.chipText,
                          useAdvanceAmount > 0 && commonStyles.chipTextActive,
                        ]}>
                          {useAdvanceAmount > 0 ? formatCurrency(useAdvanceAmount) : 'Utiliser'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>

              {/* Cart Items */}
              <View style={{ padding: spacing.lg }}>
                <Text style={[commonStyles.text, { fontWeight: '600', marginBottom: spacing.md }]}>
                  Articles
                </Text>
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
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={[commonStyles.text, { fontWeight: 'bold', color: colors.primary, marginBottom: spacing.xs }]}>
                          {formatCurrency(item.subtotal)}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <TouchableOpacity
                            style={{
                              backgroundColor: colors.error,
                              borderRadius: 16,
                              width: 32,
                              height: 32,
                              alignItems: 'center',
                              justifyContent: 'center',
                              marginRight: spacing.sm,
                            }}
                            onPress={() => updateCartItemQuantity(item.productId, item.quantity - 1)}
                          >
                            <Icon name="remove" size={16} color={colors.secondary} />
                          </TouchableOpacity>
                          <Text style={[commonStyles.text, { minWidth: 30, textAlign: 'center', fontWeight: '600' }]}>
                            {item.quantity}
                          </Text>
                          <TouchableOpacity
                            style={{
                              backgroundColor: colors.success,
                              borderRadius: 16,
                              width: 32,
                              height: 32,
                              alignItems: 'center',
                              justifyContent: 'center',
                              marginLeft: spacing.sm,
                            }}
                            onPress={() => updateCartItemQuantity(item.productId, item.quantity + 1)}
                          >
                            <Icon name="add" size={16} color={colors.secondary} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={{
                              backgroundColor: colors.textLight,
                              borderRadius: 16,
                              width: 32,
                              height: 32,
                              alignItems: 'center',
                              justifyContent: 'center',
                              marginLeft: spacing.sm,
                            }}
                            onPress={() => removeFromCart(item.productId)}
                          >
                            <Icon name="trash" size={16} color={colors.secondary} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>

            {/* Cart Summary - Fixed at bottom */}
            <View style={{
              backgroundColor: colors.background,
              borderTopWidth: 1,
              borderTopColor: colors.border,
              padding: spacing.lg,
            }}>
              {/* Total Amount */}
              <View style={{
                backgroundColor: colors.primaryLight,
                padding: spacing.lg,
                borderRadius: 16,
                marginBottom: spacing.lg,
              }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
                  <Text style={[commonStyles.text, { fontSize: fontSizes.lg, fontWeight: 'bold' }]}>
                    Montant total
                  </Text>
                  <Text style={[commonStyles.text, { fontSize: fontSizes.xl, fontWeight: 'bold', color: colors.primary }]}>
                    {formatCurrency(cartTotals.total)}
                  </Text>
                </View>
                
                {useAdvanceAmount > 0 && (
                  <>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={[commonStyles.textLight, { fontSize: fontSizes.sm }]}>
                        Montant payé en avance:
                      </Text>
                      <Text style={[commonStyles.text, { fontSize: fontSizes.md, color: colors.success }]}>
                        -{formatCurrency(useAdvanceAmount)}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xs, paddingTop: spacing.xs, borderTopWidth: 1, borderTopColor: colors.border }}>
                      <Text style={[commonStyles.text, { fontSize: fontSizes.md, fontWeight: '600' }]}>
                        Montant restant:
                      </Text>
                      <Text style={[commonStyles.text, { fontSize: fontSizes.lg, fontWeight: 'bold', color: colors.primary }]}>
                        {formatCurrency(remainingAmount)}
                      </Text>
                    </View>
                  </>
                )}
              </View>

              {/* Action Buttons */}
              <View style={{ flexDirection: 'row', gap: spacing.md }}>
                <TouchableOpacity
                  style={[buttonStyles.secondary, { flex: 1 }]}
                  onPress={() => setShowCartModal(false)}
                >
                  <Text style={buttonStyles.secondaryText}>Continuer les achats</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[buttonStyles.primary, { flex: 2 }]}
                  onPress={openPaymentMethodSelection}
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
