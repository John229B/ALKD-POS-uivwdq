
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Alert, Modal, Dimensions, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { router } from 'expo-router';
import { commonStyles, colors, buttonStyles, spacing, fontSizes, isSmallScreen } from '../../styles/commonStyles';
import { Product, Customer, CartItem, Sale, SaleItem, AppSettings, Category, UNITS_OF_MEASUREMENT } from '../../types';
import { getProducts, getCustomers, getSales, storeSales, storeProducts, getNextReceiptNumber, getSettings, getCategories, getApplicablePrice, storeCustomers, formatQuantityWithUnit } from '../../utils/storage';
import { useAuthState } from '../../hooks/useAuth';
import Icon from '../../components/Icon';
import uuid from 'react-native-uuid';

// Floating Action Button styles
const fabStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 24,
    right: 16,
    zIndex: 1000,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 30,
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 60,
    minWidth: 140,
    borderWidth: 2,
    borderColor: colors.secondary,
    boxShadow: '0px 6px 20px rgba(255, 215, 0, 0.5)',
    elevation: 12,
  },
  badge: {
    backgroundColor: colors.secondary,
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  buttonText: {
    color: colors.secondary,
    fontSize: 16,
    fontWeight: '700',
  },
});

// Enhanced modal styles for better scrolling and keyboard handling
const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  overlayCenter: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  content: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '95%',
    minHeight: '70%',
    width: '100%',
    flex: 1,
  },
  contentCenter: {
    backgroundColor: colors.card,
    borderRadius: 16,
    width: '100%',
    maxWidth: isSmallScreen ? '95%' : 500,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
    gap: spacing.sm,
  },
  footerSafeArea: {
    paddingBottom: Platform.OS === 'ios' ? 34 : spacing.lg,
  },
});

// New checkout modal styles for modern design
const checkoutStyles = StyleSheet.create({
  summaryCard: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryTitle: {
    fontSize: fontSizes.lg,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  summaryLabel: {
    fontSize: fontSizes.md,
    color: colors.textLight,
    flex: 1,
  },
  summaryValue: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.text,
  },
  totalRow: {
    borderTopWidth: 2,
    borderTopColor: colors.primary,
    paddingTop: spacing.sm,
    marginTop: spacing.sm,
  },
  totalLabel: {
    fontSize: fontSizes.lg,
    fontWeight: '700',
    color: colors.text,
  },
  totalValue: {
    fontSize: fontSizes.xl,
    fontWeight: '800',
    color: colors.primary,
  },
  sectionCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentMethodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  paymentMethodButton: {
    flex: 1,
    minWidth: '48%',
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
  paymentMethodButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  paymentMethodIcon: {
    marginBottom: spacing.xs,
  },
  paymentMethodText: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  paymentMethodTextActive: {
    color: colors.secondary,
  },
  advanceCard: {
    backgroundColor: colors.success + '15',
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.success + '30',
  },
  advanceTitle: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.success,
    marginBottom: spacing.xs,
  },
  advanceAmount: {
    fontSize: fontSizes.lg,
    fontWeight: '700',
    color: colors.success,
    marginBottom: spacing.xs,
  },
  advanceDescription: {
    fontSize: fontSizes.sm,
    color: colors.textLight,
  },
  confirmButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
    minHeight: 56,
  },
  confirmButtonDisabled: {
    opacity: 0.6,
  },
  confirmButtonText: {
    fontSize: fontSizes.lg,
    fontWeight: '700',
    color: colors.secondary,
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderRadius: 16,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
  cancelButtonText: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.textLight,
  },
  customerCard: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  customerName: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  customerBalance: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
  },
  amountInput: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    padding: spacing.md,
    fontSize: fontSizes.lg,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
  amountInputFocused: {
    borderColor: colors.primary,
  },
  paymentBreakdown: {
    backgroundColor: colors.primary + '10',
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
});

export default function POSScreen() {
  const { user } = useAuthState();
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('all');
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mobile_money' | 'credit' | 'advance'>('cash');
  const [amountPaid, setAmountPaid] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState('0');
  const [notes, setNotes] = useState('');
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [customQuantity, setCustomQuantity] = useState('1');
  const [isProcessing, setIsProcessing] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');

  const loadData = useCallback(async () => {
    try {
      console.log('POS: Loading data...');
      const [productsData, customersData, categoriesData, settingsData] = await Promise.all([
        getProducts(),
        getCustomers(),
        getCategories(),
        getSettings(),
      ]);
      setProducts(productsData.filter(p => p.isActive));
      setCustomers(customersData);
      setCategories(categoriesData.filter(c => c.isActive));
      setSettings(settingsData);
      console.log(`POS: Loaded ${productsData.length} products, ${customersData.length} customers, ${categoriesData.length} categories`);
    } catch (error) {
      console.error('POS: Error loading data:', error);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Get unit display name and check if fractions are allowed
  const getUnitInfo = useCallback((unitId: string) => {
    const predefinedUnit = UNITS_OF_MEASUREMENT.find(u => u.id === unitId);
    return {
      symbol: predefinedUnit ? predefinedUnit.symbol : unitId,
      allowsFractions: predefinedUnit ? predefinedUnit.allowsFractions : true, // Custom units allow fractions by default
    };
  }, []);

  // Memoize currency formatter
  const formatCurrency = useCallback((amount: number | undefined | null): string => {
    if (amount === undefined || amount === null || isNaN(amount)) {
      return '0 FCFA';
    }
    
    const currency = settings?.currency || 'XOF';
    const currencySymbols = { XOF: 'FCFA', USD: '$', EUR: '€' };
    return `${amount.toLocaleString()} ${currencySymbols[currency]}`;
  }, [settings?.currency]);

  // Memoize filtered products
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.barcode?.includes(searchQuery);
      
      const matchesCategory = selectedCategoryId === 'all' || product.categoryId === selectedCategoryId;
      
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, selectedCategoryId]);

  // Calculate cart totals with improved discount system
  const cartTotals = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
    const discountAmount = discountType === 'percentage' 
      ? (subtotal * parseFloat(discountValue || '0')) / 100
      : parseFloat(discountValue || '0');
    const taxAmount = settings ? (subtotal - discountAmount) * (settings.taxRate / 100) : 0;
    const total = Math.max(0, subtotal - discountAmount + taxAmount);

    return {
      subtotal,
      discountAmount,
      taxAmount,
      total,
    };
  }, [cart, discountType, discountValue, settings]);

  // Calculate customer advance balance (positive balance = "J'ai pris")
  const customerAdvanceBalance = useMemo(() => {
    if (!selectedCustomer) return 0;
    // Positive creditBalance means debt (J'ai donné)
    // Negative creditBalance means advance (J'ai pris)
    return selectedCustomer.creditBalance < 0 ? Math.abs(selectedCustomer.creditBalance) : 0;
  }, [selectedCustomer]);

  // Calculate payment breakdown when using advances
  const paymentBreakdown = useMemo(() => {
    const total = cartTotals.total;
    const availableAdvance = customerAdvanceBalance;
    
    if (paymentMethod === 'advance' && availableAdvance > 0) {
      const advanceUsed = Math.min(availableAdvance, total);
      const remainingAmount = Math.max(0, total - advanceUsed);
      
      return {
        advanceUsed,
        remainingAmount,
        canPayFully: availableAdvance >= total,
      };
    }
    
    return {
      advanceUsed: 0,
      remainingAmount: total,
      canPayFully: false,
    };
  }, [cartTotals.total, customerAdvanceBalance, paymentMethod]);

  // Filter customers for search
  const filteredCustomers = useMemo(() => {
    if (!customerSearchQuery.trim()) return customers;
    
    return customers.filter(customer =>
      customer.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
      customer.phone?.includes(customerSearchQuery)
    );
  }, [customers, customerSearchQuery]);

  const openQuantityModal = useCallback((product: Product) => {
    setSelectedProduct(product);
    setCustomQuantity('1');
    setShowQuantityModal(true);
  }, []);

  const addToCart = useCallback((product: Product, quantity: number = 1) => {
    console.log('POS: Adding to cart:', product.name, 'quantity:', quantity);
    
    // Validate quantity
    if (quantity <= 0) {
      Alert.alert('Erreur', 'La quantité doit être supérieure à 0');
      return;
    }

    // Check if fractions are allowed for this unit
    const unitInfo = getUnitInfo(product.unit);
    if (!unitInfo.allowsFractions && quantity % 1 !== 0) {
      Alert.alert('Erreur', `Les fractions ne sont pas autorisées pour l'unité "${unitInfo.symbol}"`);
      return;
    }

    // Check stock availability
    if (product.stock < quantity) {
      Alert.alert('Stock insuffisant', `Stock disponible: ${product.stock} ${unitInfo.symbol}`);
      return;
    }

    const priceInfo = getApplicablePrice(product, quantity);
    const unitPrice = priceInfo.price;
    const subtotal = unitPrice * quantity;

    const existingItemIndex = cart.findIndex(item => item.product.id === product.id);

    if (existingItemIndex >= 0) {
      // Update existing item
      const updatedCart = [...cart];
      const existingItem = updatedCart[existingItemIndex];
      const newQuantity = existingItem.quantity + quantity;
      
      // Check total stock for updated quantity
      if (product.stock < newQuantity) {
        Alert.alert('Stock insuffisant', `Stock disponible: ${product.stock} ${unitInfo.symbol}`);
        return;
      }

      // Recalculate price for new total quantity
      const newPriceInfo = getApplicablePrice(product, newQuantity);
      const newUnitPrice = newPriceInfo.price;
      const newSubtotal = newUnitPrice * newQuantity;

      updatedCart[existingItemIndex] = {
        ...existingItem,
        quantity: newQuantity,
        unitPrice: newUnitPrice,
        subtotal: newSubtotal,
      };

      setCart(updatedCart);
    } else {
      // Add new item
      const newItem: CartItem = {
        product,
        quantity,
        discount: 0,
        unitPrice,
        subtotal,
      };

      setCart([...cart, newItem]);
    }

    // Show pricing info if applicable
    if (priceInfo.type === 'promotional') {
      Alert.alert('Prix promotionnel appliqué!', `Prix spécial: ${formatCurrency(unitPrice)}/${unitInfo.symbol}`);
    } else if (priceInfo.type === 'wholesale') {
      Alert.alert('Prix de gros appliqué!', `Prix de gros: ${formatCurrency(unitPrice)}/${unitInfo.symbol}`);
    }
  }, [cart, getUnitInfo, formatCurrency]);

  const handleAddToCartWithQuantity = useCallback(() => {
    if (!selectedProduct) return;

    const quantity = parseFloat(customQuantity);
    if (isNaN(quantity) || quantity <= 0) {
      Alert.alert('Erreur', 'Veuillez saisir une quantité valide');
      return;
    }

    addToCart(selectedProduct, quantity);
    setShowQuantityModal(false);
    setSelectedProduct(null);
  }, [selectedProduct, customQuantity, addToCart]);

  const removeFromCart = useCallback((productId: string) => {
    console.log('POS: Removing from cart:', productId);
    setCart(cart.filter(item => item.product.id !== productId));
  }, [cart]);

  const updateCartItemQuantity = useCallback((productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    const updatedCart = cart.map(item => {
      if (item.product.id === productId) {
        const unitInfo = getUnitInfo(item.product.unit);
        
        // Check if fractions are allowed
        if (!unitInfo.allowsFractions && newQuantity % 1 !== 0) {
          Alert.alert('Erreur', `Les fractions ne sont pas autorisées pour l'unité "${unitInfo.symbol}"`);
          return item;
        }

        // Check stock
        if (item.product.stock < newQuantity) {
          Alert.alert('Stock insuffisant', `Stock disponible: ${item.product.stock} ${unitInfo.symbol}`);
          return item;
        }

        // Recalculate price for new quantity
        const priceInfo = getApplicablePrice(item.product, newQuantity);
        const unitPrice = priceInfo.price;
        const subtotal = unitPrice * newQuantity;

        return {
          ...item,
          quantity: newQuantity,
          unitPrice,
          subtotal,
        };
      }
      return item;
    });

    setCart(updatedCart);
  }, [cart, removeFromCart, getUnitInfo]);

  const clearCart = useCallback(() => {
    Alert.alert(
      'Vider le panier',
      'Êtes-vous sûr de vouloir vider le panier ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Vider', style: 'destructive', onPress: () => setCart([]) },
      ]
    );
  }, []);

  const clearCartWithoutConfirmation = useCallback(() => {
    setCart([]);
  }, []);

  // Reset form when opening checkout modal
  const openCheckoutModal = useCallback(() => {
    // Reset form state
    setSelectedCustomer(null);
    setPaymentMethod('cash');
    setAmountPaid('');
    setDiscountType('percentage');
    setDiscountValue('0');
    setNotes('');
    setCustomerSearchQuery('');
    
    // Set default amount to total
    setAmountPaid(cartTotals.total.toString());
    
    setShowCheckoutModal(true);
  }, [cartTotals.total]);

  const processCheckout = useCallback(async () => {
    if (isProcessing) {
      console.log('POS: Checkout already in progress, ignoring duplicate request');
      return;
    }

    if (cart.length === 0) {
      Alert.alert('Erreur', 'Le panier est vide');
      return;
    }

    // Check if user is authenticated
    if (!user) {
      Alert.alert(
        'Erreur – Utilisateur non connecté',
        'Vous devez être connecté pour finaliser une vente. Veuillez vous reconnecter.',
        [
          { text: 'OK', onPress: () => {
            // Redirect to login
            console.log('User not authenticated, redirecting to login');
            router.replace('/(auth)/login');
          }}
        ]
      );
      return;
    }

    // Check if credit sale or advance payment requires a customer
    if ((paymentMethod === 'credit' || paymentMethod === 'advance') && !selectedCustomer) {
      Alert.alert(
        'Client requis',
        'Veuillez sélectionner un client pour effectuer une vente à crédit ou utiliser des avances.',
        [{ text: 'OK' }]
      );
      return;
    }

    const total = cartTotals.total;
    let effectivePaidAmount = 0;
    let advanceUsed = 0;

    // Calculate payment amounts based on method
    if (paymentMethod === 'advance') {
      // Using customer advance
      advanceUsed = paymentBreakdown.advanceUsed;
      const remainingAmount = paymentBreakdown.remainingAmount;
      
      if (remainingAmount > 0) {
        // Need additional payment
        const additionalPaid = parseFloat(amountPaid) || 0;
        if (additionalPaid < remainingAmount) {
          Alert.alert('Erreur', `Montant insuffisant. Il reste ${formatCurrency(remainingAmount)} à payer après utilisation de l'avance.`);
          return;
        }
        effectivePaidAmount = advanceUsed + additionalPaid;
      } else {
        // Fully covered by advance
        effectivePaidAmount = total;
      }
    } else if (paymentMethod !== 'credit') {
      // Regular payment methods
      effectivePaidAmount = parseFloat(amountPaid) || 0;
      if (effectivePaidAmount < total) {
        Alert.alert('Erreur', 'Le montant payé est insuffisant');
        return;
      }
    }

    setIsProcessing(true);

    try {
      console.log('POS: Processing checkout...');
      console.log('POS: Payment method:', paymentMethod);
      console.log('POS: Total:', total);
      console.log('POS: Advance used:', advanceUsed);
      console.log('POS: Effective paid amount:', effectivePaidAmount);

      // Generate receipt number
      const receiptNumber = await getNextReceiptNumber();

      // Create sale items
      const saleItems: SaleItem[] = cart.map(item => ({
        id: uuid.v4() as string,
        productId: item.product.id,
        product: item.product,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
        subtotal: item.subtotal,
      }));

      // Determine payment status based on payment method and amount
      let paymentStatus: 'paid' | 'partial' | 'credit';
      if (paymentMethod === 'credit') {
        paymentStatus = 'credit';
      } else if (effectivePaidAmount >= total) {
        paymentStatus = 'paid';
      } else {
        paymentStatus = 'partial';
      }

      // Create sale
      const sale: Sale = {
        id: uuid.v4() as string,
        customerId: selectedCustomer?.id,
        customer: selectedCustomer,
        items: saleItems,
        subtotal: cartTotals.subtotal,
        discount: cartTotals.discountAmount,
        tax: cartTotals.taxAmount,
        total: cartTotals.total,
        paymentMethod: paymentMethod === 'advance' ? 'cash' : paymentMethod, // Store as cash for advance payments
        paymentStatus,
        amountPaid: effectivePaidAmount,
        change: Math.max(0, effectivePaidAmount - total),
        notes: paymentMethod === 'advance' && advanceUsed > 0 
          ? `${notes ? notes + ' - ' : ''}Paiement avec avance: ${formatCurrency(advanceUsed)}`
          : notes,
        cashierId: user.id,
        cashier: user,
        createdAt: new Date(),
        receiptNumber,
      };

      // Save sale
      const sales = await getSales();
      await storeSales([...sales, sale]);

      // Update product stock
      const updatedProducts = products.map(product => {
        const cartItem = cart.find(item => item.product.id === product.id);
        if (cartItem) {
          return {
            ...product,
            stock: product.stock - cartItem.quantity,
            updatedAt: new Date(),
          };
        }
        return product;
      });
      await storeProducts(updatedProducts);
      setProducts(updatedProducts.filter(p => p.isActive));

      // Update customer balance based on payment scenario
      if (selectedCustomer) {
        const updatedCustomers = customers.map(customer => {
          if (customer.id === selectedCustomer.id) {
            let newCreditBalance = customer.creditBalance;
            
            console.log('POS: Processing payment for customer:', customer.name);
            console.log('POS: Payment method:', paymentMethod);
            console.log('POS: Total amount:', total);
            console.log('POS: Effective paid amount:', effectivePaidAmount);
            console.log('POS: Advance used:', advanceUsed);
            console.log('POS: Current credit balance:', customer.creditBalance);
            
            if (paymentMethod === 'advance') {
              // Using customer advance
              if (advanceUsed > 0) {
                // Reduce the advance (increase creditBalance towards 0)
                newCreditBalance += advanceUsed;
                console.log('POS: Used advance, new balance after advance usage:', newCreditBalance);
              }
              
              // Handle any remaining amount
              const remainingAmount = total - advanceUsed;
              if (remainingAmount > 0) {
                const additionalPaid = effectivePaidAmount - advanceUsed;
                if (additionalPaid < remainingAmount) {
                  // Partial payment - add unpaid amount to debt
                  newCreditBalance += (remainingAmount - additionalPaid);
                  console.log('POS: Partial payment after advance, adding to debt:', remainingAmount - additionalPaid);
                } else if (additionalPaid > remainingAmount) {
                  // Overpayment - create new advance
                  newCreditBalance -= (additionalPaid - remainingAmount);
                  console.log('POS: Overpayment after advance, creating new advance:', additionalPaid - remainingAmount);
                }
              }
            } else if (paymentMethod === 'credit') {
              // Vente à crédit : ajouter le montant total à la dette
              newCreditBalance += total;
              console.log('POS: Credit sale - adding total to debt. New balance:', newCreditBalance);
            } else if (effectivePaidAmount < total) {
              // Paiement partiel : ajouter le reste non payé à la dette
              const unpaidAmount = total - effectivePaidAmount;
              newCreditBalance += unpaidAmount;
              console.log('POS: Partial payment - adding unpaid amount to debt:', unpaidAmount, 'New balance:', newCreditBalance);
            } else if (effectivePaidAmount > total) {
              // Paiement supérieur : créer une avance avec l'excédent
              const overpayment = effectivePaidAmount - total;
              newCreditBalance -= overpayment;
              console.log('POS: Overpayment - creating advance with excess:', overpayment, 'New balance:', newCreditBalance);
            } else {
              // Paiement total exact : pas de changement de balance
              console.log('POS: Full payment - no balance change. Balance remains:', newCreditBalance);
            }

            return {
              ...customer,
              creditBalance: newCreditBalance,
              totalPurchases: customer.totalPurchases + total,
              updatedAt: new Date(),
            };
          }
          return customer;
        });
        await storeCustomers(updatedCustomers);
        setCustomers(updatedCustomers);
      }

      // Reset form
      clearCartWithoutConfirmation();
      setSelectedCustomer(null);
      setPaymentMethod('cash');
      setAmountPaid('');
      setDiscountType('percentage');
      setDiscountValue('0');
      setNotes('');
      setShowCheckoutModal(false);

      console.log('POS: Checkout completed successfully, redirecting to ticket page');

      // Redirect to ticket page
      router.push({
        pathname: '/sale-ticket',
        params: {
          saleId: sale.id,
        },
      });

    } catch (error: any) {
      console.error('POS: Error processing checkout:', error);
      Alert.alert(
        'Erreur lors du traitement de la vente',
        `Une erreur est survenue: ${error.message || 'Erreur inconnue'}. Veuillez réessayer.`
      );
    } finally {
      setIsProcessing(false);
    }
  }, [cart, cartTotals, paymentMethod, amountPaid, selectedCustomer, notes, user, products, customers, clearCartWithoutConfirmation, isProcessing, paymentBreakdown]);

  // Reset payment method when customer changes
  useEffect(() => {
    if (paymentMethod === 'advance' && customerAdvanceBalance === 0) {
      setPaymentMethod('cash');
    }
  }, [selectedCustomer, paymentMethod, customerAdvanceBalance]);

  // Auto-set amount when payment method or total changes
  useEffect(() => {
    if (paymentMethod === 'advance') {
      // Set amount to remaining amount after advance
      setAmountPaid(paymentBreakdown.remainingAmount.toString());
    } else if (paymentMethod !== 'credit') {
      // Set amount to total for other payment methods
      setAmountPaid(cartTotals.total.toString());
    } else {
      // Credit sale - no amount needed
      setAmountPaid('0');
    }
  }, [paymentMethod, cartTotals.total, paymentBreakdown.remainingAmount]);

  return (
    <SafeAreaView style={commonStyles.container}>
      <View style={commonStyles.content}>
        {/* Header */}
        <View style={[commonStyles.section, commonStyles.header]}>
          <View style={{ flex: 1 }}>
            <Text style={commonStyles.title}>Point de Vente</Text>
            <Text style={[commonStyles.textLight, { fontSize: fontSizes.sm }]}>
              {cart.length} article(s) • {formatCurrency(cartTotals.total)}
            </Text>
          </View>
          <View style={commonStyles.headerActions}>
            {cart.length > 0 && (
              <TouchableOpacity
                style={[buttonStyles.outline, buttonStyles.small]}
                onPress={clearCart}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                  <Icon name="trash" size={16} color={colors.danger} />
                  {!isSmallScreen && <Text style={{ color: colors.danger, fontSize: fontSizes.xs }}>Vider</Text>}
                </View>
              </TouchableOpacity>
            )}
            {!isSmallScreen && (
              <TouchableOpacity
                style={[
                  buttonStyles.outline,
                  (cart.length === 0 || isProcessing) && { opacity: 0.5 }
                ]}
                onPress={openCheckoutModal}
                disabled={cart.length === 0 || isProcessing}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                  <Icon name="card" size={20} color={colors.primary} />
                  <Text style={{ color: colors.primary, fontWeight: '600', fontSize: fontSizes.md }}>
                    {isProcessing ? 'Traitement...' : 'Finaliser'}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={{ flex: 1, flexDirection: isSmallScreen ? 'column' : 'row' }}>
          {/* Products Section */}
          <View style={{ flex: isSmallScreen ? 1 : 2, marginRight: isSmallScreen ? 0 : spacing.md }}>
            {/* Search */}
            <View style={commonStyles.sectionSmall}>
              <TextInput
                style={commonStyles.input}
                placeholder="Rechercher par nom ou code-barres..."
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {/* Category Filter */}
            <View style={commonStyles.sectionSmall}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: spacing.xs, paddingHorizontal: spacing.lg }}>
                  <TouchableOpacity
                    style={[
                      buttonStyles.outline,
                      buttonStyles.small,
                      selectedCategoryId === 'all' && { backgroundColor: colors.primary }
                    ]}
                    onPress={() => setSelectedCategoryId('all')}
                  >
                    <Text style={[
                      { color: colors.primary, fontSize: fontSizes.sm },
                      selectedCategoryId === 'all' && { color: colors.secondary }
                    ]}>
                      Toutes
                    </Text>
                  </TouchableOpacity>
                  {categories.map(category => (
                    <TouchableOpacity
                      key={category.id}
                      style={[
                        buttonStyles.outline,
                        buttonStyles.small,
                        { borderColor: category.color },
                        selectedCategoryId === category.id && { backgroundColor: category.color }
                      ]}
                      onPress={() => setSelectedCategoryId(category.id)}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                        <View style={{
                          width: 6,
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: selectedCategoryId === category.id ? colors.secondary : category.color
                        }} />
                        <Text style={[
                          { color: category.color, fontSize: fontSizes.sm },
                          selectedCategoryId === category.id && { color: colors.secondary }
                        ]}>
                          {category.name}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Products Grid */}
            <ScrollView 
              style={{ flex: 1 }} 
              contentContainerStyle={{ 
                paddingHorizontal: spacing.lg, 
                paddingBottom: cart.length > 0 ? spacing.xl + 80 : spacing.xl 
              }}
            >
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                {filteredProducts.map(product => {
                  const unitInfo = getUnitInfo(product.unit);
                  const priceInfo = getApplicablePrice(product, 1);
                  const stockStatus = product.stock <= 0 ? 'Rupture' : 
                                    product.stock <= (product.minStock || 0) ? 'Stock bas' : 'En stock';
                  const stockColor = product.stock <= 0 ? colors.danger : 
                                   product.stock <= (product.minStock || 0) ? colors.warning : colors.success;

                  return (
                    <TouchableOpacity
                      key={product.id}
                      style={[
                        commonStyles.card,
                        {
                          width: isSmallScreen ? '48%' : '31%',
                          marginBottom: spacing.sm,
                          opacity: product.stock <= 0 ? 0.5 : 1,
                        }
                      ]}
                      onPress={() => product.stock > 0 ? openQuantityModal(product) : null}
                      disabled={product.stock <= 0}
                    >
                      <Text style={[commonStyles.text, { fontWeight: '600', marginBottom: spacing.xs, fontSize: isSmallScreen ? fontSizes.sm : fontSizes.md }]} numberOfLines={2}>
                        {product.name}
                      </Text>
                      
                      <Text style={[commonStyles.text, { color: colors.primary, fontWeight: '600', fontSize: isSmallScreen ? fontSizes.md : fontSizes.lg, marginBottom: spacing.xs }]}>
                        {formatCurrency(priceInfo.price)}/{unitInfo.symbol}
                      </Text>

                      {priceInfo.type === 'promotional' && (
                        <Text style={[commonStyles.textLight, { fontSize: fontSizes.xs, color: colors.success, marginBottom: spacing.xs }]}>
                          🎉 Prix promo!
                        </Text>
                      )}

                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs }}>
                        <Text style={[commonStyles.textLight, { fontSize: fontSizes.xs }]}>
                          Stock: {product.stock} {unitInfo.symbol}
                        </Text>
                        <Text style={[commonStyles.textLight, { fontSize: fontSizes.xs, color: stockColor, fontWeight: '600' }]}>
                          {stockStatus}
                        </Text>
                      </View>

                      {unitInfo.allowsFractions && (
                        <Text style={[commonStyles.textLight, { fontSize: fontSizes.xs, color: colors.primary }]}>
                          ⚖️ Vente fractionnée
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {filteredProducts.length === 0 && (
                <View style={{ alignItems: 'center', marginTop: 40 }}>
                  <Text style={[commonStyles.textLight, { fontSize: fontSizes.lg, marginBottom: spacing.xs }]}>
                    Aucun produit trouvé
                  </Text>
                  <Text style={[commonStyles.textLight, { fontSize: fontSizes.md }]}>
                    Essayez un autre terme de recherche
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>

          {/* Cart Section */}
          {!isSmallScreen && (
            <View style={{ flex: 1, backgroundColor: colors.backgroundAlt, borderRadius: 12, padding: spacing.md }}>
              <Text style={[commonStyles.subtitle, { marginBottom: spacing.md, fontSize: fontSizes.lg }]}>
                🛒 Panier ({cart.length})
              </Text>

              {/* Discount Section in Cart */}
              {cart.length > 0 && (
                <View style={[commonStyles.card, { marginBottom: spacing.md, backgroundColor: colors.background }]}>
                  <Text style={[commonStyles.text, { fontWeight: '600', marginBottom: spacing.sm, fontSize: fontSizes.md }]}>
                    🎯 Remise
                  </Text>
                  
                  <View style={{ flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.sm }}>
                    <TouchableOpacity
                      style={[
                        buttonStyles.outline,
                        buttonStyles.small,
                        { flex: 1 },
                        discountType === 'percentage' && { backgroundColor: colors.primary }
                      ]}
                      onPress={() => setDiscountType('percentage')}
                    >
                      <Text style={[
                        { color: colors.primary, fontSize: fontSizes.xs, textAlign: 'center' },
                        discountType === 'percentage' && { color: colors.secondary }
                      ]}>
                        %
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        buttonStyles.outline,
                        buttonStyles.small,
                        { flex: 1 },
                        discountType === 'fixed' && { backgroundColor: colors.primary }
                      ]}
                      onPress={() => setDiscountType('fixed')}
                    >
                      <Text style={[
                        { color: colors.primary, fontSize: fontSizes.xs, textAlign: 'center' },
                        discountType === 'fixed' && { color: colors.secondary }
                      ]}>
                        FCFA
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <TextInput
                    style={[commonStyles.input, { fontSize: fontSizes.sm }]}
                    value={discountValue}
                    onChangeText={setDiscountValue}
                    placeholder={discountType === 'percentage' ? '0' : '0'}
                    keyboardType="numeric"
                  />

                  {cartTotals.discountAmount > 0 && (
                    <Text style={[commonStyles.textLight, { fontSize: fontSizes.xs, color: colors.success, marginTop: spacing.xs }]}>
                      Économie: {formatCurrency(cartTotals.discountAmount)}
                    </Text>
                  )}
                </View>
              )}

              <ScrollView 
                style={{ flex: 1, marginBottom: spacing.md }}
                contentContainerStyle={{ 
                  paddingBottom: cart.length > 0 ? 80 : 0 
                }}
              >
                {cart.map(item => {
                  const unitInfo = getUnitInfo(item.product.unit);
                  return (
                    <View key={item.product.id} style={[commonStyles.card, { marginBottom: spacing.sm }]}>
                      <View style={[commonStyles.row, { marginBottom: spacing.xs }]}>
                        <Text style={[commonStyles.text, { flex: 1, fontWeight: '600', fontSize: fontSizes.sm }]} numberOfLines={2}>
                          {item.product.name}
                        </Text>
                        <TouchableOpacity onPress={() => removeFromCart(item.product.id)}>
                          <Icon name="close" size={20} color={colors.danger} />
                        </TouchableOpacity>
                      </View>

                      <View style={[commonStyles.row, { marginBottom: spacing.xs }]}>
                        <Text style={[commonStyles.textLight, { fontSize: fontSizes.sm }]}>
                          {formatQuantityWithUnit(item.quantity, unitInfo.symbol)}
                        </Text>
                        <Text style={[commonStyles.text, { fontWeight: '600', fontSize: fontSizes.sm }]}>
                          {formatCurrency(item.subtotal)}
                        </Text>
                      </View>

                      <View style={[commonStyles.row, { alignItems: 'center' }]}>
                        <TouchableOpacity
                          style={[buttonStyles.outline, buttonStyles.small, { minWidth: 30 }]}
                          onPress={() => updateCartItemQuantity(item.product.id, item.quantity - (unitInfo.allowsFractions ? 0.25 : 1))}
                        >
                          <Text style={{ color: colors.primary, textAlign: 'center' }}>-</Text>
                        </TouchableOpacity>

                        <Text style={[commonStyles.text, { marginHorizontal: spacing.sm, minWidth: 60, textAlign: 'center', fontSize: fontSizes.sm }]}>
                          {formatQuantityWithUnit(item.quantity, unitInfo.symbol)}
                        </Text>

                        <TouchableOpacity
                          style={[buttonStyles.outline, buttonStyles.small, { minWidth: 30 }]}
                          onPress={() => updateCartItemQuantity(item.product.id, item.quantity + (unitInfo.allowsFractions ? 0.25 : 1))}
                        >
                          <Text style={{ color: colors.primary, textAlign: 'center' }}>+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}

                {cart.length === 0 && (
                  <View style={{ alignItems: 'center', marginTop: 40 }}>
                    <Text style={[commonStyles.textLight, { fontSize: fontSizes.md }]}>
                      Panier vide
                    </Text>
                    <Text style={[commonStyles.textLight, { fontSize: fontSizes.sm }]}>
                      Ajoutez des produits pour commencer
                    </Text>
                  </View>
                )}
              </ScrollView>

              {/* Cart Summary */}
              {cart.length > 0 && (
                <View style={[commonStyles.card, { backgroundColor: colors.background }]}>
                  <View style={[commonStyles.row, { marginBottom: spacing.xs }]}>
                    <Text style={[commonStyles.text, { fontSize: fontSizes.sm }]}>Sous-total:</Text>
                    <Text style={[commonStyles.text, { fontSize: fontSizes.sm }]}>{formatCurrency(cartTotals.subtotal)}</Text>
                  </View>
                  {cartTotals.discountAmount > 0 && (
                    <View style={[commonStyles.row, { marginBottom: spacing.xs }]}>
                      <Text style={[commonStyles.text, { fontSize: fontSizes.sm }]}>
                        Remise ({discountType === 'percentage' ? `${discountValue}%` : formatCurrency(parseFloat(discountValue || '0'))}):
                      </Text>
                      <Text style={[commonStyles.text, { color: colors.success, fontSize: fontSizes.sm }]}>-{formatCurrency(cartTotals.discountAmount)}</Text>
                    </View>
                  )}
                  {cartTotals.taxAmount > 0 && (
                    <View style={[commonStyles.row, { marginBottom: spacing.xs }]}>
                      <Text style={[commonStyles.text, { fontSize: fontSizes.sm }]}>Taxe ({settings?.taxRate}%):</Text>
                      <Text style={[commonStyles.text, { fontSize: fontSizes.sm }]}>{formatCurrency(cartTotals.taxAmount)}</Text>
                    </View>
                  )}
                  <View style={[commonStyles.row, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.xs }]}>
                    <Text style={[commonStyles.text, { fontWeight: '600', fontSize: fontSizes.md }]}>Total:</Text>
                    <Text style={[commonStyles.text, { fontWeight: '600', fontSize: fontSizes.md, color: colors.primary }]}>
                      {formatCurrency(cartTotals.total)}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          )}
        </View>
      </View>

      {/* Quantity Selection Modal */}
      <Modal
        visible={showQuantityModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowQuantityModal(false)}
      >
        <View style={modalStyles.overlayCenter}>
          <View style={modalStyles.contentCenter}>
            <View style={modalStyles.header}>
              <Text style={[commonStyles.subtitle, { fontSize: isSmallScreen ? fontSizes.lg : fontSizes.subtitle }]}>
                📦 Sélectionner la quantité
              </Text>
              <TouchableOpacity onPress={() => setShowQuantityModal(false)}>
                <Icon name="close" size={24} color={colors.textLight} />
              </TouchableOpacity>
            </View>

            <KeyboardAwareScrollView
              style={{ flex: 1 }}
              contentContainerStyle={modalStyles.scrollContent}
              enableOnAndroid={true}
              keyboardShouldPersistTaps="handled"
              extraScrollHeight={20}
            >
              {selectedProduct && (
                <View>
                  <Text style={[commonStyles.text, { fontWeight: '600', marginBottom: spacing.sm, fontSize: isSmallScreen ? fontSizes.md : fontSizes.lg }]}>
                    {selectedProduct.name}
                  </Text>
                  
                  <Text style={[commonStyles.textLight, { marginBottom: spacing.md, fontSize: isSmallScreen ? fontSizes.sm : fontSizes.md }]}>
                    Prix: {formatCurrency(getApplicablePrice(selectedProduct, parseFloat(customQuantity) || 1).price)}/{getUnitInfo(selectedProduct.unit).symbol}
                  </Text>

                  <Text style={[commonStyles.text, { marginBottom: spacing.xs, fontWeight: '600', fontSize: isSmallScreen ? fontSizes.sm : fontSizes.md }]}>
                    Quantité ({getUnitInfo(selectedProduct.unit).symbol}):
                  </Text>

                  <TextInput
                    style={[commonStyles.input, { marginBottom: spacing.md, fontSize: isSmallScreen ? fontSizes.sm : fontSizes.md }]}
                    value={customQuantity}
                    onChangeText={setCustomQuantity}
                    placeholder="Ex: 1, 0.5, 2.25..."
                    keyboardType="numeric"
                  />

                  {getUnitInfo(selectedProduct.unit).allowsFractions && (
                    <Text style={[commonStyles.textLight, { fontSize: fontSizes.sm, marginBottom: spacing.md, color: colors.success }]}>
                      ⚖️ Les fractions sont autorisées pour cette unité
                    </Text>
                  )}

                  <Text style={[commonStyles.textLight, { fontSize: fontSizes.sm, marginBottom: spacing.lg }]}>
                    Stock disponible: {selectedProduct.stock} {getUnitInfo(selectedProduct.unit).symbol}
                  </Text>

                  {/* Quick quantity buttons */}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.lg }}>
                    {getUnitInfo(selectedProduct.unit).allowsFractions ? (
                      <>
                        {[0.25, 0.5, 0.75, 1, 1.5, 2, 2.5, 3].map(qty => (
                          <TouchableOpacity
                            key={qty}
                            style={[buttonStyles.outline, buttonStyles.small]}
                            onPress={() => setCustomQuantity(qty.toString())}
                          >
                            <Text style={{ color: colors.primary, fontSize: fontSizes.sm }}>
                              {qty}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </>
                    ) : (
                      <>
                        {[1, 2, 3, 4, 5, 10].map(qty => (
                          <TouchableOpacity
                            key={qty}
                            style={[buttonStyles.outline, buttonStyles.small]}
                            onPress={() => setCustomQuantity(qty.toString())}
                          >
                            <Text style={{ color: colors.primary, fontSize: fontSizes.sm }}>
                              {qty}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </>
                    )}
                  </View>
                </View>
              )}
            </KeyboardAwareScrollView>

            <View style={[modalStyles.footer, modalStyles.footerSafeArea]}>
              <TouchableOpacity
                style={buttonStyles.primary}
                onPress={handleAddToCartWithQuantity}
              >
                <Text style={{ color: colors.secondary, fontSize: isSmallScreen ? fontSizes.sm : fontSizes.md, fontWeight: '600' }}>
                  ➕ Ajouter au panier
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={buttonStyles.outline}
                onPress={() => setShowQuantityModal(false)}
              >
                <Text style={{ color: colors.primary, fontSize: isSmallScreen ? fontSizes.sm : fontSizes.md, fontWeight: '600' }}>
                  ❌ Annuler
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* NOUVELLE PAGE DE FINALISATION CORRIGÉE */}
      <Modal
        visible={showCheckoutModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCheckoutModal(false)}
      >
        <KeyboardAvoidingView 
          style={{ flex: 1 }} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <View style={modalStyles.overlay}>
            <View style={modalStyles.content}>
              {/* Header fixe */}
              <View style={modalStyles.header}>
                <Text style={checkoutStyles.summaryTitle}>
                  💳 Finaliser la vente
                </Text>
                <TouchableOpacity onPress={() => setShowCheckoutModal(false)}>
                  <Icon name="close" size={24} color={colors.textLight} />
                </TouchableOpacity>
              </View>

              {/* Contenu scrollable */}
              <KeyboardAwareScrollView
                style={{ flex: 1 }}
                contentContainerStyle={[modalStyles.scrollContent, { paddingTop: spacing.md }]}
                enableOnAndroid={true}
                keyboardShouldPersistTaps="handled"
                extraScrollHeight={100}
                showsVerticalScrollIndicator={false}
              >
                {/* Résumé de commande moderne */}
                <View style={checkoutStyles.summaryCard}>
                  <Text style={checkoutStyles.summaryTitle}>
                    📋 Résumé de la commande
                  </Text>
                  
                  {/* Articles */}
                  {cart.map(item => {
                    const unitInfo = getUnitInfo(item.product.unit);
                    return (
                      <View key={item.product.id} style={checkoutStyles.summaryRow}>
                        <Text style={[checkoutStyles.summaryLabel, { flex: 1 }]} numberOfLines={1}>
                          {item.product.name} × {formatQuantityWithUnit(item.quantity, unitInfo.symbol)}
                        </Text>
                        <Text style={checkoutStyles.summaryValue}>
                          {formatCurrency(item.subtotal)}
                        </Text>
                      </View>
                    );
                  })}
                  
                  {/* Calculs */}
                  <View style={checkoutStyles.summaryRow}>
                    <Text style={checkoutStyles.summaryLabel}>Sous-total:</Text>
                    <Text style={checkoutStyles.summaryValue}>{formatCurrency(cartTotals.subtotal)}</Text>
                  </View>
                  
                  {cartTotals.discountAmount > 0 && (
                    <View style={checkoutStyles.summaryRow}>
                      <Text style={checkoutStyles.summaryLabel}>Remise:</Text>
                      <Text style={[checkoutStyles.summaryValue, { color: colors.success }]}>
                        -{formatCurrency(cartTotals.discountAmount)}
                      </Text>
                    </View>
                  )}
                  
                  {cartTotals.taxAmount > 0 && (
                    <View style={checkoutStyles.summaryRow}>
                      <Text style={checkoutStyles.summaryLabel}>Taxe:</Text>
                      <Text style={checkoutStyles.summaryValue}>{formatCurrency(cartTotals.taxAmount)}</Text>
                    </View>
                  )}
                  
                  <View style={[checkoutStyles.summaryRow, checkoutStyles.totalRow]}>
                    <Text style={checkoutStyles.totalLabel}>Total à payer:</Text>
                    <Text style={checkoutStyles.totalValue}>
                      {formatCurrency(cartTotals.total)}
                    </Text>
                  </View>
                </View>

                {/* 1. SÉLECTION CLIENT AMÉLIORÉE */}
                <View style={checkoutStyles.sectionCard}>
                  <Text style={checkoutStyles.sectionTitle}>
                    👤 Client (optionnel)
                  </Text>
                  
                  {/* Bouton de sélection client */}
                  <TouchableOpacity
                    style={[
                      commonStyles.input, 
                      { 
                        flexDirection: 'row', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        backgroundColor: selectedCustomer ? colors.primary + '10' : colors.backgroundAlt,
                        borderColor: selectedCustomer ? colors.primary : colors.border,
                        borderWidth: 2,
                      }
                    ]}
                    onPress={() => setShowCustomerModal(true)}
                  >
                    <View style={{ flex: 1 }}>
                      {selectedCustomer ? (
                        <View>
                          <Text style={{ 
                            color: colors.text, 
                            fontSize: fontSizes.md,
                            fontWeight: '600',
                          }}>
                            {selectedCustomer.name}
                          </Text>
                          {selectedCustomer.phone && (
                            <Text style={{ 
                              color: colors.textLight, 
                              fontSize: fontSizes.sm,
                            }}>
                              📞 {selectedCustomer.phone}
                            </Text>
                          )}
                        </View>
                      ) : (
                        <Text style={{ 
                          color: colors.textLight, 
                          fontSize: fontSizes.md,
                        }}>
                          Sélectionner un client
                        </Text>
                      )}
                    </View>
                    <Icon name="chevron-down" size={20} color={colors.textLight} />
                  </TouchableOpacity>
                  
                  {/* Informations du client sélectionné */}
                  {selectedCustomer && (
                    <View style={checkoutStyles.customerCard}>
                      <View style={[commonStyles.row, { marginBottom: spacing.xs }]}>
                        <Text style={[commonStyles.text, { fontSize: fontSizes.sm }]}>Solde actuel:</Text>
                        <Text style={[
                          commonStyles.text, 
                          { 
                            fontSize: fontSizes.sm, 
                            fontWeight: '600',
                            color: selectedCustomer.creditBalance > 0 ? colors.danger : 
                                   selectedCustomer.creditBalance < 0 ? colors.success : colors.text
                          }
                        ]}>
                          {selectedCustomer.creditBalance > 0 ? `Dette: ${formatCurrency(selectedCustomer.creditBalance)}` :
                           selectedCustomer.creditBalance < 0 ? `Avance: ${formatCurrency(Math.abs(selectedCustomer.creditBalance))}` :
                           'Équilibré (0 FCFA)'}
                        </Text>
                      </View>
                      
                      {/* Avance disponible */}
                      {customerAdvanceBalance > 0 && (
                        <View style={checkoutStyles.advanceCard}>
                          <Text style={checkoutStyles.advanceTitle}>
                            💰 Avance disponible
                          </Text>
                          <Text style={checkoutStyles.advanceAmount}>
                            {formatCurrency(customerAdvanceBalance)}
                          </Text>
                          <Text style={checkoutStyles.advanceDescription}>
                            Cette avance peut être utilisée pour payer tout ou partie de cet achat.
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>

                {/* 2. MODE DE PAIEMENT MODERNE */}
                <View style={checkoutStyles.sectionCard}>
                  <Text style={checkoutStyles.sectionTitle}>
                    💳 Mode de paiement
                  </Text>
                  <View style={checkoutStyles.paymentMethodGrid}>
                    {[
                      { id: 'cash', label: 'Espèces', icon: 'cash' },
                      { id: 'mobile_money', label: 'Mobile Money', icon: 'phone-portrait' },
                      { id: 'credit', label: 'À crédit', icon: 'time' },
                      ...(selectedCustomer && customerAdvanceBalance > 0 ? [{ id: 'advance', label: 'Utiliser avance', icon: 'wallet' }] : []),
                    ].map(method => (
                      <TouchableOpacity
                        key={method.id}
                        style={[
                          checkoutStyles.paymentMethodButton,
                          paymentMethod === method.id && checkoutStyles.paymentMethodButtonActive,
                          method.id === 'credit' && !selectedCustomer && { opacity: 0.5 },
                          method.id === 'advance' && (!selectedCustomer || customerAdvanceBalance === 0) && { opacity: 0.5 },
                        ]}
                        onPress={() => {
                          if (method.id === 'credit' && !selectedCustomer) {
                            Alert.alert('Client requis', 'Veuillez sélectionner un client pour une vente à crédit.');
                            return;
                          }
                          if (method.id === 'advance' && (!selectedCustomer || customerAdvanceBalance === 0)) {
                            Alert.alert('Avance non disponible', 'Ce client n\'a pas d\'avance disponible.');
                            return;
                          }
                          setPaymentMethod(method.id as any);
                        }}
                        disabled={(method.id === 'credit' && !selectedCustomer) || (method.id === 'advance' && (!selectedCustomer || customerAdvanceBalance === 0))}
                      >
                        <View style={checkoutStyles.paymentMethodIcon}>
                          <Icon 
                            name={method.icon} 
                            size={24} 
                            color={paymentMethod === method.id ? colors.secondary : colors.primary} 
                          />
                        </View>
                        <Text style={[
                          checkoutStyles.paymentMethodText,
                          paymentMethod === method.id && checkoutStyles.paymentMethodTextActive
                        ]}>
                          {method.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* 3. DÉTAIL PAIEMENT AVEC AVANCE */}
                {paymentMethod === 'advance' && selectedCustomer && customerAdvanceBalance > 0 && (
                  <View style={checkoutStyles.sectionCard}>
                    <Text style={checkoutStyles.sectionTitle}>
                      💰 Utilisation de l'avance
                    </Text>
                    
                    <View style={checkoutStyles.paymentBreakdown}>
                      <View style={[checkoutStyles.summaryRow, { marginBottom: spacing.sm }]}>
                        <Text style={checkoutStyles.summaryLabel}>Montant total:</Text>
                        <Text style={checkoutStyles.summaryValue}>
                          {formatCurrency(cartTotals.total)}
                        </Text>
                      </View>
                      
                      <View style={[checkoutStyles.summaryRow, { marginBottom: spacing.sm }]}>
                        <Text style={checkoutStyles.summaryLabel}>Avance utilisée:</Text>
                        <Text style={[checkoutStyles.summaryValue, { color: colors.success }]}>
                          -{formatCurrency(paymentBreakdown.advanceUsed)}
                        </Text>
                      </View>
                      
                      <View style={[checkoutStyles.summaryRow, checkoutStyles.totalRow]}>
                        <Text style={checkoutStyles.totalLabel}>
                          {paymentBreakdown.remainingAmount > 0 ? 'Reste à payer:' : 'Nouvelle avance:'}
                        </Text>
                        <Text style={[
                          checkoutStyles.totalValue, 
                          { 
                            color: paymentBreakdown.remainingAmount > 0 ? colors.warning : colors.success,
                            fontSize: fontSizes.lg 
                          }
                        ]}>
                          {paymentBreakdown.remainingAmount > 0 
                            ? formatCurrency(paymentBreakdown.remainingAmount)
                            : formatCurrency(customerAdvanceBalance - cartTotals.total)
                          }
                        </Text>
                      </View>
                      
                      {paymentBreakdown.canPayFully && (
                        <Text style={[commonStyles.textLight, { fontSize: fontSizes.sm, color: colors.success, textAlign: 'center', marginTop: spacing.sm }]}>
                          ✅ L'avance couvre entièrement cet achat
                        </Text>
                      )}
                    </View>
                  </View>
                )}

                {/* 4. MONTANT PAYÉ - TOUJOURS VISIBLE ET MODIFIABLE */}
                {paymentMethod !== 'credit' && (
                  <View style={checkoutStyles.sectionCard}>
                    <Text style={checkoutStyles.sectionTitle}>
                      💰 {paymentMethod === 'advance' && paymentBreakdown.remainingAmount > 0 
                        ? `Montant supplémentaire (${formatCurrency(paymentBreakdown.remainingAmount)} requis)`
                        : 'Montant payé'
                      }
                    </Text>
                    
                    <TextInput
                      style={[
                        checkoutStyles.amountInput,
                        { 
                          borderColor: parseFloat(amountPaid) >= (paymentMethod === 'advance' ? paymentBreakdown.remainingAmount : cartTotals.total) 
                            ? colors.success 
                            : colors.warning 
                        }
                      ]}
                      value={amountPaid}
                      onChangeText={setAmountPaid}
                      placeholder={formatCurrency(paymentMethod === 'advance' ? paymentBreakdown.remainingAmount : cartTotals.total)}
                      keyboardType="numeric"
                      selectTextOnFocus={true}
                    />
                    
                    {/* Boutons rapides pour montants */}
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm }}>
                      {paymentMethod === 'advance' ? (
                        // Montants pour le reste à payer
                        [paymentBreakdown.remainingAmount, paymentBreakdown.remainingAmount + 1000, paymentBreakdown.remainingAmount + 5000].map(amount => (
                          amount > 0 && (
                            <TouchableOpacity
                              key={amount}
                              style={[buttonStyles.outline, buttonStyles.small]}
                              onPress={() => setAmountPaid(amount.toString())}
                            >
                              <Text style={{ color: colors.primary, fontSize: fontSizes.sm }}>
                                {formatCurrency(amount)}
                              </Text>
                            </TouchableOpacity>
                          )
                        ))
                      ) : (
                        // Montants pour paiement normal
                        [cartTotals.total, cartTotals.total + 1000, cartTotals.total + 5000, cartTotals.total + 10000].map(amount => (
                          <TouchableOpacity
                            key={amount}
                            style={[buttonStyles.outline, buttonStyles.small]}
                            onPress={() => setAmountPaid(amount.toString())}
                          >
                            <Text style={{ color: colors.primary, fontSize: fontSizes.sm }}>
                              {formatCurrency(amount)}
                            </Text>
                          </TouchableOpacity>
                        ))
                      )}
                    </View>
                    
                    {/* Informations sur le paiement */}
                    {parseFloat(amountPaid) > 0 && (
                      <View style={{ marginTop: spacing.sm }}>
                        {paymentMethod === 'advance' ? (
                          // Logique pour paiement avec avance
                          parseFloat(amountPaid) > paymentBreakdown.remainingAmount ? (
                            <Text style={[commonStyles.textLight, { fontSize: fontSizes.sm, color: colors.success }]}>
                              Nouvelle avance créée: {formatCurrency(parseFloat(amountPaid) - paymentBreakdown.remainingAmount)}
                            </Text>
                          ) : parseFloat(amountPaid) < paymentBreakdown.remainingAmount ? (
                            <Text style={[commonStyles.textLight, { fontSize: fontSizes.sm, color: colors.warning }]}>
                              Montant insuffisant: {formatCurrency(paymentBreakdown.remainingAmount - parseFloat(amountPaid))} manquant
                            </Text>
                          ) : (
                            <Text style={[commonStyles.textLight, { fontSize: fontSizes.sm, color: colors.success }]}>
                              ✅ Montant exact
                            </Text>
                          )
                        ) : (
                          // Logique pour paiement normal
                          parseFloat(amountPaid) > cartTotals.total ? (
                            <Text style={[commonStyles.textLight, { fontSize: fontSizes.sm, color: colors.success }]}>
                              Monnaie à rendre: {formatCurrency(parseFloat(amountPaid) - cartTotals.total)}
                            </Text>
                          ) : parseFloat(amountPaid) < cartTotals.total ? (
                            <Text style={[commonStyles.textLight, { fontSize: fontSizes.sm, color: colors.warning }]}>
                              Montant insuffisant: {formatCurrency(cartTotals.total - parseFloat(amountPaid))} manquant
                            </Text>
                          ) : (
                            <Text style={[commonStyles.textLight, { fontSize: fontSizes.sm, color: colors.success }]}>
                              ✅ Montant exact
                            </Text>
                          )
                        )}
                      </View>
                    )}
                  </View>
                )}

                {/* Remise */}
                <View style={checkoutStyles.sectionCard}>
                  <Text style={checkoutStyles.sectionTitle}>
                    🎯 Remise
                  </Text>
                  
                  <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm }}>
                    <TouchableOpacity
                      style={[
                        buttonStyles.outline,
                        { flex: 1 },
                        discountType === 'percentage' && { backgroundColor: colors.primary }
                      ]}
                      onPress={() => setDiscountType('percentage')}
                    >
                      <Text style={[
                        { color: colors.primary, fontSize: fontSizes.sm, textAlign: 'center' },
                        discountType === 'percentage' && { color: colors.secondary }
                      ]}>
                        Pourcentage (%)
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        buttonStyles.outline,
                        { flex: 1 },
                        discountType === 'fixed' && { backgroundColor: colors.primary }
                      ]}
                      onPress={() => setDiscountType('fixed')}
                    >
                      <Text style={[
                        { color: colors.primary, fontSize: fontSizes.sm, textAlign: 'center' },
                        discountType === 'fixed' && { color: colors.secondary }
                      ]}>
                        Montant fixe
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <TextInput
                    style={[commonStyles.input, { fontSize: fontSizes.md }]}
                    value={discountValue}
                    onChangeText={setDiscountValue}
                    placeholder={discountType === 'percentage' ? '0' : '0'}
                    keyboardType="numeric"
                  />

                  {cartTotals.discountAmount > 0 && (
                    <Text style={[commonStyles.textLight, { fontSize: fontSizes.sm, color: colors.success, marginTop: spacing.xs }]}>
                      Économie: {formatCurrency(cartTotals.discountAmount)}
                    </Text>
                  )}
                </View>

                {/* Notes */}
                <View style={checkoutStyles.sectionCard}>
                  <Text style={checkoutStyles.sectionTitle}>
                    📝 Notes (optionnel)
                  </Text>
                  <TextInput
                    style={[commonStyles.input, { height: 80, textAlignVertical: 'top', fontSize: fontSizes.md }]}
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="Notes sur la vente..."
                    multiline
                  />
                </View>

                {/* Espace pour éviter que le contenu soit caché par le footer */}
                <View style={{ height: spacing.xl }} />
              </KeyboardAwareScrollView>

              {/* Footer fixe avec boutons */}
              <View style={[modalStyles.footer, modalStyles.footerSafeArea]}>
                <TouchableOpacity
                  style={[
                    checkoutStyles.confirmButton,
                    isProcessing && checkoutStyles.confirmButtonDisabled
                  ]}
                  onPress={processCheckout}
                  disabled={isProcessing}
                >
                  <Icon name="checkmark-circle" size={24} color={colors.secondary} />
                  <Text style={checkoutStyles.confirmButtonText}>
                    {isProcessing ? 'Traitement en cours...' : `Confirmer la vente - ${formatCurrency(cartTotals.total)}`}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[checkoutStyles.cancelButton, isProcessing && { opacity: 0.5 }]}
                  onPress={() => setShowCheckoutModal(false)}
                  disabled={isProcessing}
                >
                  <Text style={checkoutStyles.cancelButtonText}>
                    Annuler
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Customer Selection Modal AMÉLIORÉ */}
      <Modal
        visible={showCustomerModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCustomerModal(false)}
      >
        <View style={modalStyles.overlayCenter}>
          <View style={modalStyles.contentCenter}>
            <View style={modalStyles.header}>
              <Text style={[commonStyles.subtitle, { fontSize: isSmallScreen ? fontSizes.lg : fontSizes.subtitle }]}>
                👤 Sélectionner un client
              </Text>
              <TouchableOpacity onPress={() => setShowCustomerModal(false)}>
                <Icon name="close" size={24} color={colors.textLight} />
              </TouchableOpacity>
            </View>

            {/* Recherche de client */}
            <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
              <TextInput
                style={commonStyles.input}
                placeholder="Rechercher un client..."
                value={customerSearchQuery}
                onChangeText={setCustomerSearchQuery}
              />
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={modalStyles.scrollContent}>
              {/* Option "Vente sans client" */}
              <TouchableOpacity
                style={[
                  commonStyles.card,
                  { marginBottom: spacing.sm },
                  !selectedCustomer && { backgroundColor: colors.primary }
                ]}
                onPress={() => {
                  setSelectedCustomer(null);
                  setShowCustomerModal(false);
                }}
              >
                <Text style={[
                  commonStyles.text,
                  { fontWeight: '600', fontSize: isSmallScreen ? fontSizes.sm : fontSizes.md },
                  !selectedCustomer && { color: colors.secondary }
                ]}>
                  🚶 Vente sans client
                </Text>
                <Text style={[
                  commonStyles.textLight,
                  { fontSize: fontSizes.sm },
                  !selectedCustomer && { color: colors.secondary, opacity: 0.8 }
                ]}>
                  Paiement comptant uniquement
                </Text>
              </TouchableOpacity>

              {/* Liste des clients filtrés */}
              {filteredCustomers.map(customer => {
                const hasAdvance = customer.creditBalance < 0;
                const advanceAmount = hasAdvance ? Math.abs(customer.creditBalance) : 0;
                const hasDebt = customer.creditBalance > 0;
                
                return (
                  <TouchableOpacity
                    key={customer.id}
                    style={[
                      commonStyles.card,
                      { marginBottom: spacing.sm },
                      selectedCustomer?.id === customer.id && { backgroundColor: colors.primary }
                    ]}
                    onPress={() => {
                      setSelectedCustomer(customer);
                      setShowCustomerModal(false);
                    }}
                  >
                    <Text style={[
                      commonStyles.text,
                      { fontWeight: '600', marginBottom: spacing.xs, fontSize: isSmallScreen ? fontSizes.sm : fontSizes.md },
                      selectedCustomer?.id === customer.id && { color: colors.secondary }
                    ]}>
                      {customer.name}
                    </Text>
                    {customer.phone && (
                      <Text style={[
                        commonStyles.textLight,
                        { fontSize: fontSizes.sm, marginBottom: spacing.xs },
                        selectedCustomer?.id === customer.id && { color: colors.secondary, opacity: 0.8 }
                      ]}>
                        📞 {customer.phone}
                      </Text>
                    )}
                    
                    {/* Solde du client */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                      {hasAdvance && (
                        <View style={{ 
                          backgroundColor: colors.success + '20', 
                          paddingHorizontal: spacing.xs, 
                          paddingVertical: 2, 
                          borderRadius: 6 
                        }}>
                          <Text style={[
                            commonStyles.textLight,
                            { fontSize: fontSizes.xs, color: colors.success, fontWeight: '600' },
                            selectedCustomer?.id === customer.id && { color: colors.secondary }
                          ]}>
                            💰 Avance: {formatCurrency(advanceAmount)}
                          </Text>
                        </View>
                      )}
                      {hasDebt && (
                        <View style={{ 
                          backgroundColor: colors.danger + '20', 
                          paddingHorizontal: spacing.xs, 
                          paddingVertical: 2, 
                          borderRadius: 6 
                        }}>
                          <Text style={[
                            commonStyles.textLight,
                            { fontSize: fontSizes.xs, color: colors.danger, fontWeight: '600' },
                            selectedCustomer?.id === customer.id && { color: colors.secondary }
                          ]}>
                            💳 Dette: {formatCurrency(customer.creditBalance)}
                          </Text>
                        </View>
                      )}
                      {!hasAdvance && !hasDebt && (
                        <View style={{ 
                          backgroundColor: colors.textLight + '20', 
                          paddingHorizontal: spacing.xs, 
                          paddingVertical: 2, 
                          borderRadius: 6 
                        }}>
                          <Text style={[
                            commonStyles.textLight,
                            { fontSize: fontSizes.xs, fontWeight: '600' },
                            selectedCustomer?.id === customer.id && { color: colors.secondary }
                          ]}>
                            ⚖️ Équilibré
                          </Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}

              {filteredCustomers.length === 0 && customerSearchQuery.trim() && (
                <View style={{ alignItems: 'center', marginTop: 40 }}>
                  <Text style={[commonStyles.textLight, { fontSize: fontSizes.md }]}>
                    Aucun client trouvé
                  </Text>
                  <Text style={[commonStyles.textLight, { fontSize: fontSizes.sm }]}>
                    Essayez un autre terme de recherche
                  </Text>
                </View>
              )}

              {customers.length === 0 && (
                <View style={{ alignItems: 'center', marginTop: 40 }}>
                  <Text style={[commonStyles.textLight, { fontSize: fontSizes.md }]}>
                    Aucun client enregistré
                  </Text>
                  <Text style={[commonStyles.textLight, { fontSize: fontSizes.sm }]}>
                    Ajoutez des clients depuis l'onglet Clients
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Floating Action Button - Payer */}
      {cart.length > 0 && (
        <View style={[
          fabStyles.container,
          { bottom: spacing.xl + (isSmallScreen ? 20 : 0) }
        ]}>
          <TouchableOpacity
            style={[
              fabStyles.button,
              { opacity: isProcessing ? 0.7 : 1 }
            ]}
            onPress={openCheckoutModal}
            disabled={isProcessing}
            activeOpacity={0.8}
          >
            <Icon name="card" size={24} color={colors.secondary} />
            <Text style={fabStyles.buttonText}>
              Payer
            </Text>
            <View style={fabStyles.badge}>
              <Text style={fabStyles.badgeText}>
                {cart.length}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}
