
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Alert, Modal, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { commonStyles, colors, buttonStyles, spacing, fontSizes, isSmallScreen } from '../styles/commonStyles';
import { getProducts, getCustomers, getSales, storeSales, storeProducts, getNextReceiptNumber, getSettings, storeCustomers, formatQuantityWithUnit, getApplicablePrice } from '../utils/storage';
import { useCustomersSync, useCustomersUpdater, useDashboardUpdater } from '../hooks/useCustomersSync';
import { useAuthState } from '../hooks/useAuth';
import { cashierSyncService } from '../utils/cashierSyncService';
import Icon from '../components/Icon';
import uuid from 'react-native-uuid';
import AddCustomerModal from '../components/AddCustomerModal';
import { Product, Customer, CartItem, Sale, SaleItem, AppSettings } from '../types';

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  headerLeft: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    backgroundColor: colors.error + '20',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionTitle: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  customerSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  customerInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  customerName: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  customerBalance: {
    fontSize: fontSizes.sm,
    fontWeight: '500',
  },
  customerPhone: {
    fontSize: fontSizes.sm,
    color: colors.textLight,
  },
  advanceCard: {
    backgroundColor: colors.success + '20',
    padding: spacing.md,
    borderRadius: 12,
    marginTop: spacing.sm,
  },
  advanceTitle: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: colors.success,
    marginBottom: spacing.xs,
  },
  advanceActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  cartItem: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  itemPrice: {
    fontSize: fontSizes.sm,
    color: colors.textLight,
  },
  itemSubtotal: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: colors.primary,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  quantityButton: {
    borderRadius: 16,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityText: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.text,
    minWidth: 40,
    textAlign: 'center',
  },
  removeButton: {
    backgroundColor: colors.textLight,
    borderRadius: 16,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discountSection: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  discountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  discountInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: fontSizes.sm,
    color: colors.text,
  },
  discountButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  noteInput: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: fontSizes.sm,
    color: colors.text,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  paymentSection: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  paymentMethods: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: colors.border,
    minWidth: '48%',
  },
  paymentMethodActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  paymentIcon: {
    marginRight: spacing.sm,
  },
  paymentText: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: colors.text,
  },
  summaryCard: {
    backgroundColor: colors.primaryLight,
    padding: spacing.lg,
    borderRadius: 16,
    margin: spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  summaryLabel: {
    fontSize: fontSizes.sm,
    color: colors.text,
  },
  summaryValue: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: colors.text,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  totalLabel: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: colors.text,
  },
  totalValue: {
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
    color: colors.primary,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});

export default function CartScreen() {
  const params = useLocalSearchParams();
  const cartData = params.cartData ? JSON.parse(params.cartData as string) : [];
  
  const [cart, setCart] = useState<CartItem[]>(cartData);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mobile_money' | 'credit' | 'card'>('cash');
  const [useAdvanceAmount, setUseAdvanceAmount] = useState(0);
  const [discountType, setDiscountType] = useState<'fixed' | 'percentage'>('fixed');
  const [discountValue, setDiscountValue] = useState('');
  const [note, setNote] = useState('');
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const { user } = useAuthState();
  const { triggerCustomersUpdate } = useCustomersUpdater();
  const { triggerDashboardUpdate } = useDashboardUpdater();
  useCustomersSync();

  const loadData = useCallback(async () => {
    try {
      console.log('Loading cart data...');
      const [productsData, customersData, settingsData] = await Promise.all([
        getProducts(),
        getCustomers(),
        getSettings(),
      ]);

      setProducts(productsData);
      setCustomers(customersData);
      setSettings(settingsData);
      setLoading(false);
      console.log('Cart data loaded successfully');
    } catch (error) {
      console.error('Error loading cart data:', error);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Calculate cart totals with discounts
  const cartTotals = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
    
    let discountAmount = 0;
    if (discountValue) {
      const value = parseFloat(discountValue);
      if (!isNaN(value)) {
        if (discountType === 'percentage') {
          discountAmount = (subtotal * value) / 100;
        } else {
          discountAmount = value;
        }
      }
    }
    
    const total = Math.max(0, subtotal - discountAmount);
    
    return { subtotal, discountAmount, total };
  }, [cart, discountValue, discountType]);

  // Calculate remaining amount after advance usage
  const remainingAmount = useMemo(() => {
    return Math.max(0, cartTotals.total - useAdvanceAmount);
  }, [cartTotals.total, useAdvanceAmount]);

  const formatCurrency = useCallback((amount: number): string => {
    if (!settings) return amount.toString();
    const currency = settings.currency === 'XOF' ? 'FCFA' : settings.currency;
    return `${amount.toLocaleString()} ${currency}`;
  }, [settings]);

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
                subtotal: item.price * quantity
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
    Alert.alert(
      'Vider le panier',
      'Êtes-vous sûr de vouloir vider le panier ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Vider', 
          style: 'destructive',
          onPress: () => {
            setCart([]);
            setSelectedCustomer(null);
            setPaymentMethod('cash');
            setUseAdvanceAmount(0);
            setDiscountValue('');
            setNote('');
          }
        },
      ]
    );
  }, []);

  const selectCustomer = useCallback((customer: Customer) => {
    setSelectedCustomer(customer);
    setShowCustomerModal(false);
    setUseAdvanceAmount(0);
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
    
    console.log('Cart: New customer added, triggering update...');
    await triggerCustomersUpdate();
  }, [customers, triggerCustomersUpdate]);

  const applyDiscount = useCallback(() => {
    if (!discountValue) {
      Alert.alert('Erreur', 'Veuillez saisir un montant de réduction');
      return;
    }
    
    const value = parseFloat(discountValue);
    if (isNaN(value) || value < 0) {
      Alert.alert('Erreur', 'Veuillez saisir un montant valide');
      return;
    }
    
    if (discountType === 'percentage' && value > 100) {
      Alert.alert('Erreur', 'Le pourcentage ne peut pas dépasser 100%');
      return;
    }
    
    Alert.alert('Réduction appliquée', `Réduction de ${discountType === 'percentage' ? value + '%' : formatCurrency(value)} appliquée`);
  }, [discountValue, discountType, formatCurrency]);

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
      console.log('Processing sale from cart...');
      
      const receiptNumber = await getNextReceiptNumber();
      const saleItems: SaleItem[] = cart.map(item => ({
        id: uuid.v4() as string,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.price,
        discount: 0,
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
        discount: cartTotals.discountAmount,
        tax: 0,
        total: cartTotals.total,
        paymentMethod,
        paymentStatus: paymentMethod === 'credit' ? 'credit' : 'paid',
        amountPaid: paymentMethod === 'credit' ? useAdvanceAmount : cartTotals.total,
        change: 0,
        notes: note || (useAdvanceAmount > 0 ? `Avance utilisée: ${formatCurrency(useAdvanceAmount)}` : ''),
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
      console.log('Cart: Triggering customers update...');
      await triggerCustomersUpdate();
      console.log('Cart: Triggering dashboard update...');
      triggerDashboardUpdate();

      console.log('Sale processed successfully from cart:', sale.id);

      // Navigate to success page
      router.push({
        pathname: '/transaction-success',
        params: {
          saleId: sale.id,
          amount: sale.total.toString(),
          receiptNumber: sale.receiptNumber,
        },
      });
    } catch (error) {
      console.error('Error processing sale from cart:', error);
      Alert.alert('Erreur', 'Impossible de traiter la vente');
    }
  }, [cart, cartTotals, paymentMethod, selectedCustomer, useAdvanceAmount, products, customers, user, triggerCustomersUpdate, triggerDashboardUpdate, note, formatCurrency]);

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'cash': return 'cash';
      case 'mobile_money': return 'phone';
      case 'card': return 'card';
      case 'credit': return 'time';
      default: return 'cash';
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'cash': return 'Espèces 💵';
      case 'mobile_money': return 'Mobile Money 📱';
      case 'card': return 'Carte 💳';
      case 'credit': return 'Crédit';
      default: return method;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={commonStyles.container}>
        <View style={[commonStyles.content, { justifyContent: 'center', alignItems: 'center' }]}>
          <Icon name="cart" size={48} color={colors.primary} />
          <Text style={[commonStyles.subtitle, { marginTop: spacing.md }]}>
            Chargement du panier...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={commonStyles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={commonStyles.title}>Panier</Text>
          <Text style={[commonStyles.textLight, { fontSize: fontSizes.sm }]}>
            {cart.length} {cart.length === 1 ? 'article sélectionné' : 'articles sélectionnés'}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.actionButton} onPress={clearCart}>
            <Icon name="trash" size={20} color={colors.error} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => router.back()}>
            <Icon name="close" size={20} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }}>
        {/* Customer Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sélection du Client</Text>
          <TouchableOpacity
            style={styles.customerSelector}
            onPress={() => setShowCustomerModal(true)}
          >
            <View style={{
              width: 40,
              height: 40,
              backgroundColor: selectedCustomer 
                ? (selectedCustomer.balance >= 0 ? colors.success : colors.error)
                : colors.textLight,
              borderRadius: 20,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Icon name="person" size={20} color={colors.secondary} />
            </View>
            <View style={styles.customerInfo}>
              {selectedCustomer ? (
                <>
                  <Text style={styles.customerName}>{selectedCustomer.name}</Text>
                  <Text style={[
                    styles.customerBalance,
                    { color: selectedCustomer.balance >= 0 ? colors.success : colors.error }
                  ]}>
                    {selectedCustomer.balance >= 0 ? 'Avance disponible' : 'Dette'}: {formatCurrency(Math.abs(selectedCustomer.balance))}
                  </Text>
                  {selectedCustomer.phone && (
                    <Text style={styles.customerPhone}>{selectedCustomer.phone}</Text>
                  )}
                </>
              ) : (
                <Text style={[styles.customerName, { color: colors.textLight }]}>
                  Sélectionner un client (facultatif)
                </Text>
              )}
            </View>
            <Icon name="chevron-down" size={20} color={colors.textLight} />
          </TouchableOpacity>

          {paymentMethod === 'credit' && !selectedCustomer && (
            <View style={{
              backgroundColor: colors.warning + '20',
              padding: spacing.md,
              borderRadius: 12,
              marginTop: spacing.sm,
            }}>
              <Text style={{ color: colors.warning, fontSize: fontSizes.sm, fontWeight: '600' }}>
                ⚠️ Vente à crédit → Client obligatoire
              </Text>
            </View>
          )}

          {selectedCustomer && selectedCustomer.balance > 0 && (
            <View style={styles.advanceCard}>
              <Text style={styles.advanceTitle}>
                Avance disponible: {formatCurrency(selectedCustomer.balance)}
              </Text>
              <View style={styles.advanceActions}>
                <Text style={[commonStyles.textLight, { fontSize: fontSizes.sm }]}>
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
                    {useAdvanceAmount > 0 ? formatCurrency(useAdvanceAmount) : 'Utiliser mon avance'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Cart Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Liste des Articles</Text>
          {cart.map((item, index) => (
            <View key={`${item.productId}-${index}`} style={styles.cartItem}>
              <View style={styles.itemHeader}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemPrice}>
                    {formatCurrency(item.price)} × {formatQuantityWithUnit(item.quantity, item.unit)}
                  </Text>
                </View>
                <Text style={styles.itemSubtotal}>
                  {formatCurrency(item.subtotal)}
                </Text>
              </View>
              
              <View style={styles.quantityControls}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <TouchableOpacity
                    style={[styles.quantityButton, { backgroundColor: colors.error }]}
                    onPress={() => updateCartItemQuantity(item.productId, item.quantity - 1)}
                  >
                    <Icon name="remove" size={16} color={colors.secondary} />
                  </TouchableOpacity>
                  <Text style={styles.quantityText}>{item.quantity}</Text>
                  <TouchableOpacity
                    style={[styles.quantityButton, { backgroundColor: colors.success }]}
                    onPress={() => updateCartItemQuantity(item.productId, item.quantity + 1)}
                  >
                    <Icon name="add" size={16} color={colors.secondary} />
                  </TouchableOpacity>
                </View>
                
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeFromCart(item.productId)}
                >
                  <Icon name="trash" size={16} color={colors.secondary} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {/* Discount Options */}
        <View style={styles.discountSection}>
          <Text style={styles.sectionTitle}>Options du Panier</Text>
          
          <Text style={[commonStyles.text, { fontWeight: '600', marginBottom: spacing.sm }]}>
            Réductions
          </Text>
          
          <View style={styles.discountRow}>
            <TouchableOpacity
              style={[
                commonStyles.chip,
                discountType === 'fixed' && commonStyles.chipActive,
              ]}
              onPress={() => setDiscountType('fixed')}
            >
              <Text style={[
                commonStyles.chipText,
                discountType === 'fixed' && commonStyles.chipTextActive,
              ]}>
                Montant fixe
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                commonStyles.chip,
                discountType === 'percentage' && commonStyles.chipActive,
              ]}
              onPress={() => setDiscountType('percentage')}
            >
              <Text style={[
                commonStyles.chipText,
                discountType === 'percentage' && commonStyles.chipTextActive,
              ]}>
                Pourcentage
              </Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.discountRow}>
            <TextInput
              style={styles.discountInput}
              placeholder={discountType === 'fixed' ? 'ex: 500' : 'ex: 10'}
              value={discountValue}
              onChangeText={setDiscountValue}
              keyboardType="numeric"
              placeholderTextColor={colors.textLight}
            />
            <TouchableOpacity style={styles.discountButton} onPress={applyDiscount}>
              <Text style={{ color: colors.secondary, fontSize: fontSizes.sm, fontWeight: '600' }}>
                Appliquer
              </Text>
            </TouchableOpacity>
          </View>
          
          <Text style={[commonStyles.text, { fontWeight: '600', marginTop: spacing.md, marginBottom: spacing.sm }]}>
            Note optionnelle
          </Text>
          <TextInput
            style={styles.noteInput}
            placeholder="Ajouter une note pour cette vente..."
            value={note}
            onChangeText={setNote}
            multiline
            placeholderTextColor={colors.textLight}
          />
        </View>

        {/* Payment Methods */}
        <View style={styles.paymentSection}>
          <Text style={styles.sectionTitle}>Paiement</Text>
          
          <View style={styles.paymentMethods}>
            {(['cash', 'mobile_money', 'card', 'credit'] as const).map((method) => (
              <TouchableOpacity
                key={method}
                style={[
                  styles.paymentMethod,
                  paymentMethod === method && styles.paymentMethodActive,
                ]}
                onPress={() => setPaymentMethod(method)}
              >
                <Icon 
                  name={getPaymentMethodIcon(method)} 
                  size={20} 
                  color={paymentMethod === method ? colors.primary : colors.textLight}
                  style={styles.paymentIcon}
                />
                <Text style={[
                  styles.paymentText,
                  { color: paymentMethod === method ? colors.primary : colors.text }
                ]}>
                  {getPaymentMethodLabel(method)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          {selectedCustomer && selectedCustomer.balance > 0 && (
            <TouchableOpacity
              style={[
                styles.paymentMethod,
                { backgroundColor: colors.success + '20', borderColor: colors.success }
              ]}
              onPress={() => {
                const maxUsable = Math.min(selectedCustomer.balance, cartTotals.total);
                setUseAdvanceAmount(maxUsable);
              }}
            >
              <Icon name="wallet" size={20} color={colors.success} style={styles.paymentIcon} />
              <Text style={[styles.paymentText, { color: colors.success }]}>
                Utiliser mon avance ({formatCurrency(selectedCustomer.balance)})
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Summary & Totals */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Sous-total (avant réductions)</Text>
          <Text style={styles.summaryValue}>{formatCurrency(cartTotals.subtotal)}</Text>
        </View>
        
        {cartTotals.discountAmount > 0 && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Réductions appliquées</Text>
            <Text style={[styles.summaryValue, { color: colors.error }]}>
              -{formatCurrency(cartTotals.discountAmount)}
            </Text>
          </View>
        )}
        
        {useAdvanceAmount > 0 && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Montant payé via avance</Text>
            <Text style={[styles.summaryValue, { color: colors.success }]}>
              -{formatCurrency(useAdvanceAmount)}
            </Text>
          </View>
        )}
        
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total final à payer</Text>
          <Text style={styles.totalValue}>{formatCurrency(remainingAmount)}</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[buttonStyles.secondary, { flex: 1 }]}
          onPress={() => router.back()}
        >
          <Icon name="cart" size={20} color={colors.primary} />
          <Text style={[buttonStyles.secondaryText, { marginLeft: spacing.xs }]}>
            Continuer les achats
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[buttonStyles.primary, { flex: 2 }]}
          onPress={processSale}
          disabled={cart.length === 0}
        >
          <Icon name="checkmark" size={20} color={colors.secondary} />
          <Text style={[buttonStyles.primaryText, { marginLeft: spacing.xs }]}>
            Finaliser la vente
          </Text>
        </TouchableOpacity>
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
                      <Text>{customer.balance >= 0 ? ' (avance disponible)' : ' (dette)'}</Text>
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
    </SafeAreaView>
  );
}
