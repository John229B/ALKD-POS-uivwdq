
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Alert, Modal, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { commonStyles, colors, buttonStyles, spacing, fontSizes, isSmallScreen } from '../../styles/commonStyles';
import { Product, Customer, CartItem, Sale, SaleItem, AppSettings, Category, UNITS_OF_MEASUREMENT } from '../../types';
import { getProducts, getCustomers, getSales, storeSales, storeProducts, getNextReceiptNumber, getSettings, getCategories, getApplicablePrice, storeCustomers, formatQuantityWithUnit } from '../../utils/storage';
import { useAuthState } from '../../hooks/useAuth';
import Icon from '../../components/Icon';
import uuid from 'react-native-uuid';

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
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mobile_money' | 'credit'>('cash');
  const [amountPaid, setAmountPaid] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState('0');
  const [notes, setNotes] = useState('');
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [customQuantity, setCustomQuantity] = useState('1');

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

  const processCheckout = useCallback(async () => {
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
          }}
        ]
      );
      return;
    }

    // Check if credit sale requires a customer
    if (paymentMethod === 'credit' && !selectedCustomer) {
      Alert.alert(
        'Client requis',
        'Veuillez sélectionner un client pour effectuer une vente à crédit.',
        [{ text: 'OK' }]
      );
      return;
    }

    const paidAmount = parseFloat(amountPaid) || 0;
    const total = cartTotals.total;

    if (paymentMethod !== 'credit' && paidAmount < total) {
      Alert.alert('Erreur', 'Le montant payé est insuffisant');
      return;
    }

    try {
      console.log('POS: Processing checkout...');

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
        paymentMethod,
        paymentStatus: paymentMethod === 'credit' ? 'credit' : (paidAmount >= total ? 'paid' : 'partial'),
        amountPaid: paidAmount,
        change: Math.max(0, paidAmount - total),
        notes,
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

      // Update customer credit balance if applicable
      if (selectedCustomer && paymentMethod === 'credit') {
        const updatedCustomers = customers.map(customer => {
          if (customer.id === selectedCustomer.id) {
            return {
              ...customer,
              creditBalance: customer.creditBalance + total,
              totalPurchases: customer.totalPurchases + total,
              updatedAt: new Date(),
            };
          }
          return customer;
        });
        await storeCustomers(updatedCustomers);
        setCustomers(updatedCustomers);
      } else if (selectedCustomer) {
        // Update total purchases for non-credit sales
        const updatedCustomers = customers.map(customer => {
          if (customer.id === selectedCustomer.id) {
            return {
              ...customer,
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

      // Redirect to ticket page instead of showing alert
      router.push({
        pathname: '/sale-ticket',
        params: {
          saleId: sale.id,
          receiptNumber: sale.receiptNumber,
          total: sale.total.toString(),
          change: sale.change.toString(),
          paymentMethod: sale.paymentMethod,
          customerId: selectedCustomer?.id || '',
          customerName: selectedCustomer?.name || '',
        },
      });

      console.log('POS: Checkout completed successfully, redirecting to ticket page');
    } catch (error) {
      console.error('POS: Error processing checkout:', error);
      Alert.alert('Erreur', 'Erreur lors du traitement de la vente');
    }
  }, [cart, cartTotals, paymentMethod, amountPaid, selectedCustomer, notes, user, products, customers, clearCartWithoutConfirmation, formatCurrency]);

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
            <TouchableOpacity
              style={[
                buttonStyles.primary,
                isSmallScreen ? buttonStyles.small : {},
                cart.length === 0 && { opacity: 0.5 }
              ]}
              onPress={() => setShowCheckoutModal(true)}
              disabled={cart.length === 0}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                <Icon name="card" size={20} color={colors.secondary} />
                <Text style={{ color: colors.secondary, fontWeight: '600', fontSize: isSmallScreen ? fontSizes.sm : fontSizes.md }}>
                  {isSmallScreen ? 'Payer' : 'Finaliser'}
                </Text>
              </View>
            </TouchableOpacity>
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
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xl }}>
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
                      <Text style={[commonStyles.text, { fontWeight: '600', marginBottom: spacing.xs }]} numberOfLines={2}>
                        {product.name}
                      </Text>
                      
                      <Text style={[commonStyles.text, { color: colors.primary, fontWeight: '600', fontSize: fontSizes.lg, marginBottom: spacing.xs }]}>
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
            <View style={{ flex: 1, backgroundColor: colors.backgroundLight, borderRadius: 12, padding: spacing.md }}>
              <Text style={[commonStyles.subtitle, { marginBottom: spacing.md }]}>
                🛒 Panier ({cart.length})
              </Text>

              {/* Discount Section in Cart */}
              {cart.length > 0 && (
                <View style={[commonStyles.card, { marginBottom: spacing.md, backgroundColor: colors.background }]}>
                  <Text style={[commonStyles.text, { fontWeight: '600', marginBottom: spacing.sm }]}>
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

              <ScrollView style={{ flex: 1, marginBottom: spacing.md }}>
                {cart.map(item => {
                  const unitInfo = getUnitInfo(item.product.unit);
                  return (
                    <View key={item.product.id} style={[commonStyles.card, { marginBottom: spacing.sm }]}>
                      <View style={[commonStyles.row, { marginBottom: spacing.xs }]}>
                        <Text style={[commonStyles.text, { flex: 1, fontWeight: '600' }]} numberOfLines={2}>
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
                        <Text style={[commonStyles.text, { fontWeight: '600' }]}>
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

                        <Text style={[commonStyles.text, { marginHorizontal: spacing.sm, minWidth: 60, textAlign: 'center' }]}>
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
                    <Text style={commonStyles.text}>Sous-total:</Text>
                    <Text style={commonStyles.text}>{formatCurrency(cartTotals.subtotal)}</Text>
                  </View>
                  {cartTotals.discountAmount > 0 && (
                    <View style={[commonStyles.row, { marginBottom: spacing.xs }]}>
                      <Text style={commonStyles.text}>
                        Remise ({discountType === 'percentage' ? `${discountValue}%` : formatCurrency(parseFloat(discountValue || '0'))}):
                      </Text>
                      <Text style={[commonStyles.text, { color: colors.success }]}>-{formatCurrency(cartTotals.discountAmount)}</Text>
                    </View>
                  )}
                  {cartTotals.taxAmount > 0 && (
                    <View style={[commonStyles.row, { marginBottom: spacing.xs }]}>
                      <Text style={commonStyles.text}>Taxe ({settings?.taxRate}%):</Text>
                      <Text style={commonStyles.text}>{formatCurrency(cartTotals.taxAmount)}</Text>
                    </View>
                  )}
                  <View style={[commonStyles.row, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.xs }]}>
                    <Text style={[commonStyles.text, { fontWeight: '600', fontSize: fontSizes.lg }]}>Total:</Text>
                    <Text style={[commonStyles.text, { fontWeight: '600', fontSize: fontSizes.lg, color: colors.primary }]}>
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
        <View style={commonStyles.modalOverlay}>
          <View style={[commonStyles.modalContent, { maxHeight: '60%' }]}>
            <View style={[commonStyles.row, { marginBottom: spacing.lg }]}>
              <Text style={commonStyles.subtitle}>
                📦 Sélectionner la quantité
              </Text>
              <TouchableOpacity onPress={() => setShowQuantityModal(false)}>
                <Icon name="close" size={24} color={colors.textLight} />
              </TouchableOpacity>
            </View>

            {selectedProduct && (
              <View>
                <Text style={[commonStyles.text, { fontWeight: '600', marginBottom: spacing.sm }]}>
                  {selectedProduct.name}
                </Text>
                
                <Text style={[commonStyles.textLight, { marginBottom: spacing.md }]}>
                  Prix: {formatCurrency(getApplicablePrice(selectedProduct, parseFloat(customQuantity) || 1).price)}/{getUnitInfo(selectedProduct.unit).symbol}
                </Text>

                <Text style={[commonStyles.text, { marginBottom: spacing.xs, fontWeight: '600' }]}>
                  Quantité ({getUnitInfo(selectedProduct.unit).symbol}):
                </Text>

                <TextInput
                  style={[commonStyles.input, { marginBottom: spacing.md }]}
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

                <TouchableOpacity
                  style={[buttonStyles.primary, { marginBottom: spacing.sm }]}
                  onPress={handleAddToCartWithQuantity}
                >
                  <Text style={{ color: colors.secondary, fontSize: fontSizes.md, fontWeight: '600' }}>
                    ➕ Ajouter au panier
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={buttonStyles.outline}
                  onPress={() => setShowQuantityModal(false)}
                >
                  <Text style={{ color: colors.primary, fontSize: fontSizes.md, fontWeight: '600' }}>
                    ❌ Annuler
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Checkout Modal */}
      <Modal
        visible={showCheckoutModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCheckoutModal(false)}
      >
        <View style={commonStyles.modalOverlay}>
          <View style={commonStyles.modalContent}>
            <View style={[commonStyles.row, { marginBottom: spacing.lg }]}>
              <Text style={commonStyles.subtitle}>
                💳 Finaliser la vente
              </Text>
              <TouchableOpacity onPress={() => setShowCheckoutModal(false)}>
                <Icon name="close" size={24} color={colors.textLight} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Order Summary */}
              <View style={[commonStyles.card, { marginBottom: spacing.md }]}>
                <Text style={[commonStyles.text, { fontWeight: '600', marginBottom: spacing.sm }]}>
                  📋 Résumé de la commande
                </Text>
                {cart.map(item => {
                  const unitInfo = getUnitInfo(item.product.unit);
                  return (
                    <View key={item.product.id} style={[commonStyles.row, { marginBottom: spacing.xs }]}>
                      <Text style={[commonStyles.textLight, { flex: 1, fontSize: fontSizes.sm }]}>
                        {item.product.name} × {formatQuantityWithUnit(item.quantity, unitInfo.symbol)}
                      </Text>
                      <Text style={[commonStyles.text, { fontSize: fontSizes.sm }]}>
                        {formatCurrency(item.subtotal)}
                      </Text>
                    </View>
                  );
                })}
                
                <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm, marginTop: spacing.sm }}>
                  <View style={[commonStyles.row, { marginBottom: spacing.xs }]}>
                    <Text style={commonStyles.text}>Sous-total:</Text>
                    <Text style={commonStyles.text}>{formatCurrency(cartTotals.subtotal)}</Text>
                  </View>
                  {cartTotals.discountAmount > 0 && (
                    <View style={[commonStyles.row, { marginBottom: spacing.xs }]}>
                      <Text style={commonStyles.text}>Remise:</Text>
                      <Text style={[commonStyles.text, { color: colors.success }]}>-{formatCurrency(cartTotals.discountAmount)}</Text>
                    </View>
                  )}
                  {cartTotals.taxAmount > 0 && (
                    <View style={[commonStyles.row, { marginBottom: spacing.xs }]}>
                      <Text style={commonStyles.text}>Taxe:</Text>
                      <Text style={commonStyles.text}>{formatCurrency(cartTotals.taxAmount)}</Text>
                    </View>
                  )}
                  <View style={[commonStyles.row, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.xs }]}>
                    <Text style={[commonStyles.text, { fontWeight: '600', fontSize: fontSizes.lg }]}>Total:</Text>
                    <Text style={[commonStyles.text, { fontWeight: '600', fontSize: fontSizes.lg, color: colors.primary }]}>
                      {formatCurrency(cartTotals.total)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Customer Selection */}
              <View style={{ marginBottom: spacing.md }}>
                <Text style={[commonStyles.text, { marginBottom: spacing.xs, fontWeight: '600' }]}>
                  👤 Client (optionnel)
                </Text>
                <TouchableOpacity
                  style={[commonStyles.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
                  onPress={() => setShowCustomerModal(true)}
                >
                  <Text style={{ color: selectedCustomer ? colors.text : colors.textLight }}>
                    {selectedCustomer ? selectedCustomer.name : 'Sélectionner un client'}
                  </Text>
                  <Icon name="chevron-down" size={20} color={colors.textLight} />
                </TouchableOpacity>
              </View>

              {/* Payment Method */}
              <View style={{ marginBottom: spacing.md }}>
                <Text style={[commonStyles.text, { marginBottom: spacing.sm, fontWeight: '600' }]}>
                  💳 Mode de paiement
                </Text>
                <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                  {[
                    { id: 'cash', label: 'Espèces', icon: 'cash' },
                    { id: 'mobile_money', label: 'Mobile Money', icon: 'phone-portrait' },
                    { id: 'credit', label: 'À crédit', icon: 'time' },
                  ].map(method => (
                    <TouchableOpacity
                      key={method.id}
                      style={[
                        buttonStyles.outline,
                        buttonStyles.small,
                        { flex: 1 },
                        paymentMethod === method.id && { backgroundColor: colors.primary }
                      ]}
                      onPress={() => setPaymentMethod(method.id as any)}
                    >
                      <View style={{ alignItems: 'center', gap: spacing.xs }}>
                        <Icon 
                          name={method.icon} 
                          size={16} 
                          color={paymentMethod === method.id ? colors.secondary : colors.primary} 
                        />
                        <Text style={[
                          { color: colors.primary, fontSize: fontSizes.xs, textAlign: 'center' },
                          paymentMethod === method.id && { color: colors.secondary }
                        ]}>
                          {method.label}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Amount Paid */}
              {paymentMethod !== 'credit' && (
                <View style={{ marginBottom: spacing.md }}>
                  <Text style={[commonStyles.text, { marginBottom: spacing.xs, fontWeight: '600' }]}>
                    💰 Montant payé
                  </Text>
                  <TextInput
                    style={commonStyles.input}
                    value={amountPaid}
                    onChangeText={setAmountPaid}
                    placeholder={formatCurrency(cartTotals.total)}
                    keyboardType="numeric"
                  />
                  {parseFloat(amountPaid) > cartTotals.total && (
                    <Text style={[commonStyles.textLight, { fontSize: fontSizes.sm, color: colors.success, marginTop: spacing.xs }]}>
                      Monnaie à rendre: {formatCurrency(parseFloat(amountPaid) - cartTotals.total)}
                    </Text>
                  )}
                </View>
              )}

              {/* Discount */}
              <View style={{ marginBottom: spacing.md }}>
                <Text style={[commonStyles.text, { marginBottom: spacing.xs, fontWeight: '600' }]}>
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
                      { color: colors.primary, fontSize: fontSizes.sm, textAlign: 'center' },
                      discountType === 'percentage' && { color: colors.secondary }
                    ]}>
                      Pourcentage (%)
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
                      { color: colors.primary, fontSize: fontSizes.sm, textAlign: 'center' },
                      discountType === 'fixed' && { color: colors.secondary }
                    ]}>
                      Montant fixe
                    </Text>
                  </TouchableOpacity>
                </View>

                <TextInput
                  style={commonStyles.input}
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
              <View style={{ marginBottom: spacing.lg }}>
                <Text style={[commonStyles.text, { marginBottom: spacing.xs, fontWeight: '600' }]}>
                  📝 Notes (optionnel)
                </Text>
                <TextInput
                  style={[commonStyles.input, { height: 80, textAlignVertical: 'top' }]}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Notes sur la vente..."
                  multiline
                />
              </View>

              <TouchableOpacity
                style={[buttonStyles.primary, { marginBottom: spacing.sm }]}
                onPress={processCheckout}
              >
                <Text style={{ color: colors.secondary, fontSize: fontSizes.md, fontWeight: '600' }}>
                  ✅ Confirmer la vente - {formatCurrency(cartTotals.total)}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={buttonStyles.outline}
                onPress={() => setShowCheckoutModal(false)}
              >
                <Text style={{ color: colors.primary, fontSize: fontSizes.md, fontWeight: '600' }}>
                  ❌ Annuler
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Customer Selection Modal */}
      <Modal
        visible={showCustomerModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCustomerModal(false)}
      >
        <View style={commonStyles.modalOverlay}>
          <View style={[commonStyles.modalContent, { maxHeight: '70%' }]}>
            <View style={[commonStyles.row, { marginBottom: spacing.lg }]}>
              <Text style={commonStyles.subtitle}>
                👤 Sélectionner un client
              </Text>
              <TouchableOpacity onPress={() => setShowCustomerModal(false)}>
                <Icon name="close" size={24} color={colors.textLight} />
              </TouchableOpacity>
            </View>

            <ScrollView>
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
                  { fontWeight: '600' },
                  !selectedCustomer && { color: colors.secondary }
                ]}>
                  Vente sans client
                </Text>
              </TouchableOpacity>

              {customers.map(customer => (
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
                    { fontWeight: '600', marginBottom: spacing.xs },
                    selectedCustomer?.id === customer.id && { color: colors.secondary }
                  ]}>
                    {customer.name}
                  </Text>
                  {customer.phone && (
                    <Text style={[
                      commonStyles.textLight,
                      { fontSize: fontSizes.sm },
                      selectedCustomer?.id === customer.id && { color: colors.secondary, opacity: 0.8 }
                    ]}>
                      📞 {customer.phone}
                    </Text>
                  )}
                  {customer.creditBalance > 0 && (
                    <Text style={[
                      commonStyles.textLight,
                      { fontSize: fontSizes.sm, color: colors.warning },
                      selectedCustomer?.id === customer.id && { color: colors.secondary, opacity: 0.8 }
                    ]}>
                      💳 Crédit: {formatCurrency(customer.creditBalance)}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}

              {customers.length === 0 && (
                <View style={{ alignItems: 'center', marginTop: 40 }}>
                  <Text style={[commonStyles.textLight, { fontSize: fontSizes.md }]}>
                    Aucun client enregistré
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
