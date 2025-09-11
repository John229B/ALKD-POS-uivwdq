
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Alert, Modal, Dimensions } from 'react-native';
import uuid from 'react-native-uuid';
import { getProducts, getCustomers, getSales, storeSales, storeProducts, getNextReceiptNumber, getSettings, getCategories, getApplicablePrice, storeCustomers } from '../../utils/storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { commonStyles, colors, buttonStyles, spacing, fontSizes, isSmallScreen } from '../../styles/commonStyles';
import Icon from '../../components/Icon';
import { Product, Customer, CartItem, Sale, SaleItem, AppSettings, Category } from '../../types';
import { useAuthState } from '../../hooks/useAuth';

export default function POSScreen() {
  const { user } = useAuthState();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mobile_money' | 'credit'>('cash');
  const [amountPaid, setAmountPaid] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('all');
  
  // Customer form states
  const [customerForm, setCustomerForm] = useState({
    name: '',
    phone: '',
    address: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      console.log('POS: Loading data...');
      const [productsData, categoriesData, customersData, settingsData] = await Promise.all([
        getProducts(),
        getCategories(),
        getCustomers(),
        getSettings(),
      ]);
      
      // Filter only active products for POS
      const activeProducts = productsData.filter(p => p.isActive === true);
      const activeCategories = categoriesData.filter(c => c.isActive === true);
      
      setProducts(activeProducts);
      setCategories(activeCategories);
      setCustomers(customersData);
      setSettings(settingsData);
      
      console.log(`POS: Loaded ${activeProducts.length} active products out of ${productsData.length} total products`);
      console.log(`POS: Loaded ${activeCategories.length} active categories`);
    } catch (error) {
      console.error('POS: Error loading data:', error);
    }
  };

  // Memoize helper functions to prevent re-renders
  const getCategoryName = useCallback((categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category?.name || 'Catégorie inconnue';
  }, [categories]);

  const getCategoryColor = useCallback((categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category?.color || '#3498db';
  }, [categories]);

  // Memoize currency formatter to prevent infinite loops
  const formatCurrency = useCallback((amount: number | undefined | null): string => {
    if (amount === undefined || amount === null || isNaN(amount)) {
      return '0 FCFA';
    }
    
    const currency = settings?.currency || 'XOF';
    const currencySymbols = { XOF: 'FCFA', USD: '$', EUR: '€' };
    return `${amount.toLocaleString()} ${currencySymbols[currency]}`;
  }, [settings?.currency]);

  // Memoize filtered products to prevent unnecessary recalculations
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        getCategoryName(product.categoryId).toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.barcode?.includes(searchQuery);
      
      const matchesCategory = selectedCategoryId === 'all' || product.categoryId === selectedCategoryId;
      
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, selectedCategoryId, getCategoryName]);

  const addToCart = useCallback((product: Product) => {
    console.log('POS: Adding product to cart:', product.name);
    
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.product.id === product.id);
      const newQuantity = existingItem ? existingItem.quantity + 1 : 1;
      
      // Get the applicable price based on the new quantity
      const priceInfo = getApplicablePrice(product, newQuantity);
      
      if (existingItem) {
        return prevCart.map(item => {
          if (item.product.id === product.id) {
            const subtotal = (priceInfo.price * newQuantity) - item.discount;
            return {
              ...item,
              quantity: newQuantity,
              unitPrice: priceInfo.price,
              subtotal: Math.max(0, subtotal),
            };
          }
          return item;
        });
      } else {
        const newItem: CartItem = {
          product,
          quantity: 1,
          discount: 0,
          unitPrice: priceInfo.price,
          subtotal: priceInfo.price,
        };
        return [...prevCart, newItem];
      }
    });
  }, []);

  const updateCartItemQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart(prevCart => prevCart.map(item => {
      if (item.product.id === productId) {
        // Recalculate price based on new quantity
        const priceInfo = getApplicablePrice(item.product, quantity);
        const subtotal = (priceInfo.price * quantity) - item.discount;
        
        return {
          ...item,
          quantity,
          unitPrice: priceInfo.price,
          subtotal: Math.max(0, subtotal),
        };
      }
      return item;
    }));
  }, []);

  const updateCartItemDiscount = useCallback((productId: string, discount: number) => {
    setCart(prevCart => prevCart.map(item => {
      if (item.product.id === productId) {
        const subtotal = (item.unitPrice * item.quantity) - discount;
        return {
          ...item,
          discount,
          subtotal: Math.max(0, subtotal),
        };
      }
      return item;
    }));
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    console.log('POS: Removing product from cart:', productId);
    setCart(prevCart => prevCart.filter(item => item.product.id !== productId));
  }, []);

  const clearCart = useCallback(() => {
    Alert.alert(
      'Vider le panier',
      'Êtes-vous sûr de vouloir vider le panier ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Vider', style: 'destructive', onPress: clearCartWithoutConfirmation }
      ]
    );
  }, []);

  const clearCartWithoutConfirmation = useCallback(() => {
    console.log('POS: Clearing cart');
    setCart([]);
    setSelectedCustomer(null);
  }, []);

  // Memoize cart totals calculation
  const cartTotals = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
    const tax = subtotal * (settings?.taxRate || 0) / 100;
    const total = subtotal + tax;
    
    return { subtotal, tax, total };
  }, [cart, settings?.taxRate]);

  const resetCustomerForm = useCallback(() => {
    setCustomerForm({
      name: '',
      phone: '',
      address: '',
    });
  }, []);

  const saveCustomer = useCallback(async () => {
    if (!customerForm.name.trim()) {
      Alert.alert('Erreur', 'Le nom du client est requis');
      return;
    }

    try {
      console.log('POS: Saving new customer:', customerForm.name);
      const newCustomer: Customer = {
        id: uuid.v4() as string,
        name: customerForm.name.trim(),
        phone: customerForm.phone.trim(),
        address: customerForm.address.trim(),
        creditBalance: 0,
        totalPurchases: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedCustomers = [...customers, newCustomer];
      await storeCustomers(updatedCustomers);
      setCustomers(updatedCustomers);
      setSelectedCustomer(newCustomer);
      setShowCustomerModal(false);
      resetCustomerForm();

      Alert.alert('Succès', 'Client ajouté avec succès');
    } catch (error) {
      console.error('POS: Error saving customer:', error);
      Alert.alert('Erreur', 'Erreur lors de l\'ajout du client');
    }
  }, [customerForm, customers, resetCustomerForm]);

  const processSale = useCallback(async () => {
    if (cart.length === 0) {
      Alert.alert('Erreur', 'Le panier est vide');
      return;
    }

    if (!user) {
      Alert.alert('Erreur', 'Utilisateur non connecté');
      return;
    }

    // Check if customer is required for credit sales
    if (paymentMethod === 'credit' && !selectedCustomer) {
      Alert.alert(
        'Client requis',
        'Veuillez sélectionner ou créer un client pour la vente à crédit.',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Ajouter client', onPress: () => setShowCustomerModal(true) }
        ]
      );
      return;
    }

    const { total } = cartTotals;
    const paidAmount = parseFloat(amountPaid) || 0;

    if (paymentMethod !== 'credit' && paidAmount < total) {
      Alert.alert('Erreur', 'Le montant payé est insuffisant');
      return;
    }

    try {
      console.log('POS: Processing sale...');
      
      // Create sale record
      const saleItems: SaleItem[] = cart.map(item => ({
        id: uuid.v4() as string,
        productId: item.product.id,
        product: item.product,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
        subtotal: item.subtotal,
      }));

      const { subtotal, tax } = cartTotals;
      const receiptNumber = await getNextReceiptNumber();

      const newSale: Sale = {
        id: uuid.v4() as string,
        customerId: selectedCustomer?.id,
        customer: selectedCustomer,
        items: saleItems,
        subtotal,
        discount: cart.reduce((sum, item) => sum + item.discount, 0),
        tax,
        total,
        paymentMethod,
        paymentStatus: paymentMethod === 'credit' ? 'credit' : 'paid',
        amountPaid: paymentMethod === 'credit' ? 0 : paidAmount,
        change: paymentMethod === 'credit' ? 0 : Math.max(0, paidAmount - total),
        cashierId: user.id,
        cashier: user,
        createdAt: new Date(),
        receiptNumber,
      };

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

      // Update customer credit balance if payment is credit
      let updatedCustomers = customers;
      if (paymentMethod === 'credit' && selectedCustomer) {
        updatedCustomers = customers.map(customer => {
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
      }

      // Save all data
      const sales = await getSales();
      await Promise.all([
        storeSales([...sales, newSale]),
        storeProducts(updatedProducts),
      ]);

      // Update local state
      setProducts(updatedProducts);
      if (paymentMethod === 'credit') {
        setCustomers(updatedCustomers);
      }

      // Clear cart and close modal
      clearCartWithoutConfirmation();
      setShowPaymentModal(false);
      setAmountPaid('');

      Alert.alert(
        'Vente réussie',
        `Reçu N°: ${receiptNumber}\nTotal: ${formatCurrency(total)}${paymentMethod === 'credit' ? '\nStatut: À crédit' : ''}`,
        [{ text: 'OK' }]
      );

      console.log('POS: Sale processed successfully:', receiptNumber);
    } catch (error) {
      console.error('POS: Error processing sale:', error);
      Alert.alert('Erreur', 'Erreur lors du traitement de la vente');
    }
  }, [cart, user, paymentMethod, selectedCustomer, cartTotals, amountPaid, products, customers, clearCartWithoutConfirmation, formatCurrency]);

  const getPriceLabel = useCallback((product: Product, quantity: number) => {
    const priceInfo = getApplicablePrice(product, quantity);
    switch (priceInfo.type) {
      case 'promotional':
        return '🎉 Promo';
      case 'wholesale':
        return '📦 Gros';
      default:
        return '🏷️ Détail';
    }
  }, []);

  const { subtotal, tax, total } = cartTotals;

  return (
    <SafeAreaView style={commonStyles.container}>
      {/* Main Content Area - Scrollable */}
      <View style={{ flex: 1 }}>
        {/* Header */}
        <View style={[commonStyles.section, commonStyles.header]}>
          <View style={{ flex: 1 }}>
            <Text style={commonStyles.title}>Point de Vente</Text>
            <Text style={[commonStyles.textLight, { fontSize: fontSizes.sm }]}>
              {cart.length} article(s) dans le panier • {products.length} produits disponibles
            </Text>
          </View>
          {cart.length > 0 && (
            <TouchableOpacity
              style={[buttonStyles.outline, buttonStyles.small, { borderColor: colors.danger }]}
              onPress={clearCart}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                <Icon name="trash" size={16} color={colors.danger} />
                {!isSmallScreen && <Text style={{ color: colors.danger, fontSize: fontSizes.sm }}>Vider</Text>}
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Search */}
        <View style={commonStyles.section}>
          <TextInput
            style={commonStyles.input}
            placeholder="Rechercher un produit..."
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

        {/* Products List - Scrollable Area */}
        <View style={{ flex: 1, paddingHorizontal: spacing.lg }}>
          <Text style={[commonStyles.text, { fontWeight: '600', marginBottom: spacing.sm }]}>
            Produits disponibles ({filteredProducts.length})
          </Text>
          <ScrollView 
            style={{ flex: 1 }} 
            contentContainerStyle={{ 
              paddingBottom: spacing.xl 
            }}
            showsVerticalScrollIndicator={true}
          >
            {filteredProducts.map(product => {
              const categoryColor = getCategoryColor(product.categoryId);
              const priceInfo = getApplicablePrice(product, 1);
              
              return (
                <TouchableOpacity
                  key={product.id}
                  style={[
                    commonStyles.card, 
                    commonStyles.cardSmall,
                    { 
                      marginBottom: spacing.xs, 
                      opacity: product.stock > 0 ? 1 : 0.5,
                      backgroundColor: product.stock > 0 ? colors.card : colors.backgroundAlt
                    }
                  ]}
                  onPress={() => product.stock > 0 && addToCart(product)}
                  disabled={product.stock <= 0}
                >
                  <View style={[commonStyles.row, { alignItems: 'flex-start' }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[commonStyles.text, { fontWeight: '600', marginBottom: 2, fontSize: fontSizes.sm }]}>
                        {product.name}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                          <View style={{
                            width: 4,
                            height: 4,
                            borderRadius: 2,
                            backgroundColor: categoryColor
                          }} />
                          <Text style={[commonStyles.textLight, { fontSize: fontSizes.xs }]}>
                            {getCategoryName(product.categoryId)}
                          </Text>
                        </View>
                        <Text style={[
                          commonStyles.textLight, 
                          { 
                            fontSize: fontSizes.xs,
                            color: product.stock <= 0 ? colors.danger : product.stock <= product.minStock ? colors.warning : colors.textLight
                          }
                        ]}>
                          Stock: {product.stock}
                        </Text>
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[commonStyles.text, { fontWeight: '600', color: colors.primary, fontSize: fontSizes.md }]}>
                        {formatCurrency(priceInfo.price)}
                      </Text>
                      <Text style={[commonStyles.textLight, { fontSize: fontSizes.xs }]}>
                        {getPriceLabel(product, 1)}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}

            {filteredProducts.length === 0 && (
              <View style={{ alignItems: 'center', marginTop: 40 }}>
                <Text style={[commonStyles.textLight, { fontSize: fontSizes.lg, marginBottom: spacing.xs }]}>
                  Aucun produit trouvé
                </Text>
                <Text style={[commonStyles.textLight, { fontSize: fontSizes.md, textAlign: 'center' }]}>
                  {searchQuery ? 'Essayez un autre terme de recherche' : 'Aucun produit actif disponible'}
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>

      {/* Sticky Cart Footer - Always Visible */}
      {cart.length > 0 && (
        <View style={{
          backgroundColor: colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
          maxHeight: isSmallScreen ? '45%' : '40%',
          boxShadow: `0px -2px 8px ${colors.shadow}`,
          elevation: 8,
        }}>
          <Text style={[commonStyles.text, { fontWeight: '600', marginBottom: spacing.sm }]}>
            Panier ({cart.length})
          </Text>
          
          {/* Scrollable Cart Items */}
          <ScrollView 
            style={{ maxHeight: isSmallScreen ? 120 : 150 }}
            contentContainerStyle={{ paddingBottom: spacing.xs }}
            showsVerticalScrollIndicator={true}
          >
            {cart.map(item => {
              const priceLabel = getPriceLabel(item.product, item.quantity);
              return (
                <View key={item.product.id} style={[
                  commonStyles.card, 
                  commonStyles.cardSmall, 
                  { marginBottom: spacing.xs, backgroundColor: colors.backgroundAlt }
                ]}>
                  <View style={[commonStyles.row, { marginBottom: spacing.xs, alignItems: 'flex-start' }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[commonStyles.text, { fontWeight: '600', marginBottom: 2, fontSize: fontSizes.sm }]}>
                        {item.product.name}
                      </Text>
                      <Text style={[commonStyles.textLight, { fontSize: fontSizes.xs }]}>
                        {formatCurrency(item.unitPrice)} × {item.quantity} {priceLabel}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => removeFromCart(item.product.id)}
                      style={{ padding: spacing.xs }}
                    >
                      <Icon name="close" size={14} color={colors.danger} />
                    </TouchableOpacity>
                  </View>

                  <View style={[commonStyles.row, { alignItems: 'center' }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                      <TouchableOpacity
                        style={[
                          buttonStyles.outline, 
                          buttonStyles.small,
                          { 
                            paddingHorizontal: spacing.xs, 
                            paddingVertical: 2, 
                            minWidth: 28,
                            minHeight: 28
                          }
                        ]}
                        onPress={() => updateCartItemQuantity(item.product.id, item.quantity - 1)}
                      >
                        <Text style={{ color: colors.primary, textAlign: 'center', fontSize: fontSizes.sm, fontWeight: '600' }}>-</Text>
                      </TouchableOpacity>
                      <Text style={[commonStyles.text, { minWidth: 24, textAlign: 'center', fontSize: fontSizes.sm }]}>
                        {item.quantity}
                      </Text>
                      <TouchableOpacity
                        style={[
                          buttonStyles.outline, 
                          buttonStyles.small,
                          { 
                            paddingHorizontal: spacing.xs, 
                            paddingVertical: 2, 
                            minWidth: 28,
                            minHeight: 28
                          }
                        ]}
                        onPress={() => updateCartItemQuantity(item.product.id, item.quantity + 1)}
                      >
                        <Text style={{ color: colors.primary, textAlign: 'center', fontSize: fontSizes.sm, fontWeight: '600' }}>+</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={[commonStyles.text, { fontWeight: '600', color: colors.primary, fontSize: fontSizes.md }]}>
                      {formatCurrency(item.subtotal)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>

          {/* Fixed Cart Summary and Checkout */}
          <View style={{ paddingTop: spacing.sm }}>
            {/* Cart Summary */}
            <View style={[commonStyles.card, { marginBottom: spacing.sm, backgroundColor: colors.backgroundAlt }]}>
              <View style={[commonStyles.row, { marginBottom: spacing.xs }]}>
                <Text style={[commonStyles.text, { fontSize: fontSizes.sm }]}>Sous-total:</Text>
                <Text style={[commonStyles.text, { fontSize: fontSizes.sm }]}>{formatCurrency(subtotal)}</Text>
              </View>
              {tax > 0 && (
                <View style={[commonStyles.row, { marginBottom: spacing.xs }]}>
                  <Text style={[commonStyles.text, { fontSize: fontSizes.sm }]}>Taxes ({settings?.taxRate}%):</Text>
                  <Text style={[commonStyles.text, { fontSize: fontSizes.sm }]}>{formatCurrency(tax)}</Text>
                </View>
              )}
              <View style={[commonStyles.row, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.xs }]}>
                <Text style={[commonStyles.text, { fontWeight: '600', fontSize: fontSizes.md }]}>Total:</Text>
                <Text style={[commonStyles.text, { fontWeight: '600', fontSize: fontSizes.lg, color: colors.primary }]}>
                  {formatCurrency(total)}
                </Text>
              </View>
            </View>

            {/* Checkout Button */}
            <TouchableOpacity
              style={[buttonStyles.primary, { paddingVertical: spacing.md }]}
              onPress={() => setShowPaymentModal(true)}
            >
              <Text style={{ 
                color: colors.secondary, 
                fontSize: fontSizes.lg, 
                fontWeight: '600', 
                textAlign: 'center' 
              }}>
                💳 Procéder au paiement
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Empty Cart State */}
      {cart.length === 0 && (
        <View style={{
          backgroundColor: colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.lg,
          alignItems: 'center',
        }}>
          <Text style={[commonStyles.textLight, { fontSize: fontSizes.lg, marginBottom: spacing.xs }]}>
            Panier vide
          </Text>
          <Text style={[commonStyles.textLight, { fontSize: fontSizes.sm, textAlign: 'center' }]}>
            Sélectionnez des produits pour commencer une vente
          </Text>
        </View>
      )}

      {/* Payment Modal */}
      <Modal
        visible={showPaymentModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View style={commonStyles.modalOverlay}>
          <View style={commonStyles.modalContent}>
            <View style={[commonStyles.row, { marginBottom: spacing.lg }]}>
              <Text style={commonStyles.subtitle}>💳 Paiement</Text>
              <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
                <Icon name="close" size={24} color={colors.textLight} />
              </TouchableOpacity>
            </View>

            <View style={{ marginBottom: spacing.lg }}>
              <Text style={[commonStyles.text, { fontWeight: '600', fontSize: fontSizes.xl, textAlign: 'center' }]}>
                Total à payer: {formatCurrency(total)}
              </Text>
            </View>

            <View style={{ marginBottom: spacing.lg }}>
              <Text style={[commonStyles.text, { marginBottom: spacing.sm, fontWeight: '600' }]}>
                Mode de paiement:
              </Text>
              <View style={{ gap: spacing.xs }}>
                {[
                  { key: 'cash', label: '💵 Espèces', value: 'cash' },
                  { key: 'mobile_money', label: '📱 Mobile Money', value: 'mobile_money' },
                  { key: 'credit', label: '📋 À crédit', value: 'credit' },
                ].map(method => (
                  <TouchableOpacity
                    key={method.key}
                    style={[
                      buttonStyles.outline,
                      { paddingVertical: spacing.md },
                      paymentMethod === method.value && { backgroundColor: colors.primary }
                    ]}
                    onPress={() => setPaymentMethod(method.value as any)}
                  >
                    <Text style={[
                      { color: colors.primary, textAlign: 'center', fontSize: fontSizes.md },
                      paymentMethod === method.value && { color: colors.secondary }
                    ]}>
                      {method.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {paymentMethod === 'credit' && !selectedCustomer && (
              <View style={[commonStyles.card, { backgroundColor: colors.warning + '20', marginBottom: spacing.lg }]}>
                <Text style={[commonStyles.text, { color: colors.warning, textAlign: 'center', fontWeight: '600' }]}>
                  ⚠️ Sélection d&apos;un client requise pour la vente à crédit
                </Text>
              </View>
            )}

            {paymentMethod === 'credit' && (
              <View style={[commonStyles.card, { marginBottom: spacing.lg }]}>
                <Text style={[commonStyles.text, { fontWeight: '600', marginBottom: spacing.sm }]}>
                  Client (requis pour crédit):
                </Text>
                {selectedCustomer ? (
                  <View style={[commonStyles.row, { marginBottom: spacing.sm }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[commonStyles.text, { fontWeight: '600' }]}>{selectedCustomer.name}</Text>
                      <Text style={[commonStyles.textLight, { fontSize: fontSizes.xs }]}>
                        Crédit actuel: {formatCurrency(selectedCustomer.creditBalance)}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setSelectedCustomer(null)}
                      style={{ padding: spacing.xs }}
                    >
                      <Icon name="close" size={16} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={{ gap: spacing.xs }}>
                    <TouchableOpacity
                      style={[buttonStyles.outline, buttonStyles.small]}
                      onPress={() => setShowCustomerModal(true)}
                    >
                      <Text style={{ color: colors.primary, fontSize: fontSizes.sm, textAlign: 'center' }}>
                        + Nouveau client
                      </Text>
                    </TouchableOpacity>
                    <ScrollView 
                      style={{ maxHeight: 100 }}
                      contentContainerStyle={{ gap: spacing.xs }}
                    >
                      {customers.map(customer => (
                        <TouchableOpacity
                          key={customer.id}
                          style={[commonStyles.card, commonStyles.cardSmall]}
                          onPress={() => setSelectedCustomer(customer)}
                        >
                          <Text style={[commonStyles.text, { fontSize: fontSizes.sm }]}>{customer.name}</Text>
                          <Text style={[commonStyles.textLight, { fontSize: fontSizes.xs }]}>
                            Crédit: {formatCurrency(customer.creditBalance)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
            )}

            {paymentMethod !== 'credit' && (
              <View style={{ marginBottom: spacing.lg }}>
                <Text style={[commonStyles.text, { marginBottom: spacing.xs, fontWeight: '600' }]}>
                  Montant reçu:
                </Text>
                <TextInput
                  style={commonStyles.input}
                  value={amountPaid}
                  onChangeText={setAmountPaid}
                  placeholder={total.toString()}
                  keyboardType="numeric"
                />
                {parseFloat(amountPaid) > total && (
                  <Text style={[commonStyles.textLight, { marginTop: spacing.xs }]}>
                    Monnaie à rendre: {formatCurrency(parseFloat(amountPaid) - total)}
                  </Text>
                )}
              </View>
            )}

            <TouchableOpacity
              style={[buttonStyles.primary, { marginBottom: spacing.sm }]}
              onPress={processSale}
            >
              <Text style={{ color: colors.secondary, fontSize: fontSizes.lg, fontWeight: '600', textAlign: 'center' }}>
                ✅ Confirmer la vente
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={buttonStyles.outline}
              onPress={() => setShowPaymentModal(false)}
            >
              <Text style={{ color: colors.primary, fontSize: fontSizes.lg, fontWeight: '600', textAlign: 'center' }}>
                ❌ Annuler
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Customer Creation Modal */}
      <Modal
        visible={showCustomerModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCustomerModal(false)}
      >
        <View style={commonStyles.modalOverlay}>
          <View style={commonStyles.modalContent}>
            <View style={[commonStyles.row, { marginBottom: spacing.lg }]}>
              <Text style={commonStyles.subtitle}>👤 Nouveau Client</Text>
              <TouchableOpacity onPress={() => setShowCustomerModal(false)}>
                <Icon name="close" size={24} color={colors.textLight} />
              </TouchableOpacity>
            </View>

            <View style={{ marginBottom: spacing.lg }}>
              <Text style={[commonStyles.text, { marginBottom: spacing.xs, fontWeight: '600' }]}>
                Nom du client *
              </Text>
              <TextInput
                style={commonStyles.input}
                value={customerForm.name}
                onChangeText={(text) => setCustomerForm({ ...customerForm, name: text })}
                placeholder="Nom complet du client"
              />
            </View>

            <View style={{ marginBottom: spacing.lg }}>
              <Text style={[commonStyles.text, { marginBottom: spacing.xs, fontWeight: '600' }]}>
                Téléphone
              </Text>
              <TextInput
                style={commonStyles.input}
                value={customerForm.phone}
                onChangeText={(text) => setCustomerForm({ ...customerForm, phone: text })}
                placeholder="Numéro de téléphone"
                keyboardType="phone-pad"
              />
            </View>

            <View style={{ marginBottom: spacing.lg }}>
              <Text style={[commonStyles.text, { marginBottom: spacing.xs, fontWeight: '600' }]}>
                Adresse
              </Text>
              <TextInput
                style={commonStyles.input}
                value={customerForm.address}
                onChangeText={(text) => setCustomerForm({ ...customerForm, address: text })}
                placeholder="Adresse du client"
                multiline
                numberOfLines={2}
              />
            </View>

            <TouchableOpacity
              style={[buttonStyles.primary, { marginBottom: spacing.sm }]}
              onPress={saveCustomer}
            >
              <Text style={{ color: colors.secondary, fontSize: fontSizes.lg, fontWeight: '600', textAlign: 'center' }}>
                ✅ Ajouter le client
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={buttonStyles.outline}
              onPress={() => {
                setShowCustomerModal(false);
                resetCustomerForm();
              }}
            >
              <Text style={{ color: colors.primary, fontSize: fontSizes.lg, fontWeight: '600', textAlign: 'center' }}>
                ❌ Annuler
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
