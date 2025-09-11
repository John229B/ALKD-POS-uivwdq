
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Alert, Modal, Dimensions } from 'react-native';
import uuid from 'react-native-uuid';
import { getProducts, getCustomers, getSales, storeSales, storeProducts, getNextReceiptNumber, getSettings, getCategories, getApplicablePrice } from '../../utils/storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { commonStyles, colors, buttonStyles } from '../../styles/commonStyles';
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
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mobile_money' | 'credit'>('cash');
  const [amountPaid, setAmountPaid] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      console.log('Loading POS data...');
      const [productsData, categoriesData, customersData, settingsData] = await Promise.all([
        getProducts(),
        getCategories(),
        getCustomers(),
        getSettings(),
      ]);
      setProducts(productsData.filter(p => p.isActive));
      setCategories(categoriesData.filter(c => c.isActive));
      setCustomers(customersData);
      setSettings(settingsData);
      console.log(`Loaded ${productsData.length} products, ${categoriesData.length} categories`);
    } catch (error) {
      console.error('Error loading POS data:', error);
    }
  };

  const getCategoryName = (categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category?.name || 'Catégorie inconnue';
  };

  const getCategoryColor = (categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category?.color || '#3498db';
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getCategoryName(product.categoryId).toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.barcode?.includes(searchQuery);
    
    const matchesCategory = selectedCategoryId === 'all' || product.categoryId === selectedCategoryId;
    
    return matchesSearch && matchesCategory;
  });

  const addToCart = (product: Product) => {
    console.log('Adding product to cart:', product.name);
    
    const existingItem = cart.find(item => item.product.id === product.id);
    const newQuantity = existingItem ? existingItem.quantity + 1 : 1;
    
    // Get the applicable price based on the new quantity
    const priceInfo = getApplicablePrice(product, newQuantity);
    
    if (existingItem) {
      updateCartItemQuantity(product.id, newQuantity);
    } else {
      const newItem: CartItem = {
        product,
        quantity: 1,
        discount: 0,
        unitPrice: priceInfo.price,
        subtotal: priceInfo.price,
      };
      setCart([...cart, newItem]);
    }
  };

  const updateCartItemQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart(cart.map(item => {
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
  };

  const updateCartItemDiscount = (productId: string, discount: number) => {
    setCart(cart.map(item => {
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
  };

  const removeFromCart = (productId: string) => {
    console.log('Removing product from cart:', productId);
    setCart(cart.filter(item => item.product.id !== productId));
  };

  const clearCart = () => {
    Alert.alert(
      'Vider le panier',
      'Êtes-vous sûr de vouloir vider le panier ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Vider', style: 'destructive', onPress: clearCartWithoutConfirmation }
      ]
    );
  };

  const clearCartWithoutConfirmation = () => {
    console.log('Clearing cart');
    setCart([]);
    setSelectedCustomer(null);
  };

  const calculateTotals = () => {
    const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
    const tax = subtotal * (settings?.taxRate || 0) / 100;
    const total = subtotal + tax;
    
    return { subtotal, tax, total };
  };

  const processSale = async () => {
    if (cart.length === 0) {
      Alert.alert('Erreur', 'Le panier est vide');
      return;
    }

    if (!user) {
      Alert.alert('Erreur', 'Utilisateur non connecté');
      return;
    }

    const { total } = calculateTotals();
    const paidAmount = parseFloat(amountPaid) || 0;

    if (paymentMethod !== 'credit' && paidAmount < total) {
      Alert.alert('Erreur', 'Le montant payé est insuffisant');
      return;
    }

    try {
      console.log('Processing sale...');
      
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

      const { subtotal, tax } = calculateTotals();
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

      console.log('Sale processed successfully:', receiptNumber);
    } catch (error) {
      console.error('Error processing sale:', error);
      Alert.alert('Erreur', 'Erreur lors du traitement de la vente');
    }
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

  const getPriceLabel = (product: Product, quantity: number) => {
    const priceInfo = getApplicablePrice(product, quantity);
    switch (priceInfo.type) {
      case 'promotional':
        return '🎉 Promo';
      case 'wholesale':
        return '📦 Gros';
      default:
        return '🏷️ Détail';
    }
  };

  const { subtotal, tax, total } = calculateTotals();

  return (
    <SafeAreaView style={commonStyles.container}>
      <View style={commonStyles.content}>
        {/* Header */}
        <View style={[commonStyles.section, commonStyles.row]}>
          <View>
            <Text style={commonStyles.title}>Point de Vente</Text>
            <Text style={[commonStyles.textLight, { fontSize: 14 }]}>
              {cart.length} article(s) dans le panier
            </Text>
          </View>
          {cart.length > 0 && (
            <TouchableOpacity
              style={[buttonStyles.outline, { paddingHorizontal: 12, paddingVertical: 8, borderColor: colors.danger }]}
              onPress={clearCart}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Icon name="trash" size={16} color={colors.danger} />
                <Text style={{ color: colors.danger, fontSize: 12 }}>Vider</Text>
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
        <View style={commonStyles.section}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 20 }}>
              <TouchableOpacity
                style={[
                  buttonStyles.outline,
                  { paddingHorizontal: 16, paddingVertical: 8 },
                  selectedCategoryId === 'all' && { backgroundColor: colors.primary }
                ]}
                onPress={() => setSelectedCategoryId('all')}
              >
                <Text style={[
                  { color: colors.primary, fontSize: 14 },
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
                    { paddingHorizontal: 16, paddingVertical: 8, borderColor: category.color },
                    selectedCategoryId === category.id && { backgroundColor: category.color }
                  ]}
                  onPress={() => setSelectedCategoryId(category.id)}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: selectedCategoryId === category.id ? colors.secondary : category.color
                    }} />
                    <Text style={[
                      { color: category.color, fontSize: 14 },
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

        <View style={{ flex: 1, flexDirection: 'row', gap: 16, paddingHorizontal: 20 }}>
          {/* Products List */}
          <View style={{ flex: 2 }}>
            <Text style={[commonStyles.text, { fontWeight: '600', marginBottom: 12 }]}>
              Produits disponibles
            </Text>
            <ScrollView style={{ flex: 1 }}>
              {filteredProducts.map(product => {
                const categoryColor = getCategoryColor(product.categoryId);
                const priceInfo = getApplicablePrice(product, 1);
                
                return (
                  <TouchableOpacity
                    key={product.id}
                    style={[commonStyles.card, { marginBottom: 8, opacity: product.stock > 0 ? 1 : 0.5 }]}
                    onPress={() => product.stock > 0 && addToCart(product)}
                    disabled={product.stock <= 0}
                  >
                    <View style={[commonStyles.row, { marginBottom: 4 }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={[commonStyles.text, { fontWeight: '600', marginBottom: 2 }]}>
                          {product.name}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <View style={{
                              width: 6,
                              height: 6,
                              borderRadius: 3,
                              backgroundColor: categoryColor
                            }} />
                            <Text style={[commonStyles.textLight, { fontSize: 11 }]}>
                              {getCategoryName(product.categoryId)}
                            </Text>
                          </View>
                          <Text style={[commonStyles.textLight, { fontSize: 11 }]}>
                            Stock: {product.stock}
                          </Text>
                        </View>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={[commonStyles.text, { fontWeight: '600', color: colors.primary }]}>
                          {formatCurrency(priceInfo.price)}
                        </Text>
                        <Text style={[commonStyles.textLight, { fontSize: 10 }]}>
                          {getPriceLabel(product, 1)}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}

              {filteredProducts.length === 0 && (
                <View style={{ alignItems: 'center', marginTop: 40 }}>
                  <Text style={[commonStyles.textLight, { fontSize: 16 }]}>
                    Aucun produit trouvé
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>

          {/* Cart */}
          <View style={{ flex: 1, minWidth: 300 }}>
            <Text style={[commonStyles.text, { fontWeight: '600', marginBottom: 12 }]}>
              Panier
            </Text>
            
            {cart.length === 0 ? (
              <View style={[commonStyles.card, { alignItems: 'center', padding: 40 }]}>
                <Text style={[commonStyles.textLight, { fontSize: 16, marginBottom: 8 }]}>
                  Panier vide
                </Text>
                <Text style={[commonStyles.textLight, { fontSize: 14, textAlign: 'center' }]}>
                  Sélectionnez des produits pour commencer une vente
                </Text>
              </View>
            ) : (
              <>
                <ScrollView style={{ flex: 1, marginBottom: 16 }}>
                  {cart.map(item => {
                    const priceLabel = getPriceLabel(item.product, item.quantity);
                    return (
                      <View key={item.product.id} style={[commonStyles.card, { marginBottom: 8 }]}>
                        <View style={[commonStyles.row, { marginBottom: 8 }]}>
                          <View style={{ flex: 1 }}>
                            <Text style={[commonStyles.text, { fontWeight: '600', marginBottom: 2 }]}>
                              {item.product.name}
                            </Text>
                            <Text style={[commonStyles.textLight, { fontSize: 12 }]}>
                              {formatCurrency(item.unitPrice)} × {item.quantity} {priceLabel}
                            </Text>
                          </View>
                          <TouchableOpacity
                            onPress={() => removeFromCart(item.product.id)}
                            style={{ padding: 4 }}
                          >
                            <Icon name="close" size={16} color={colors.danger} />
                          </TouchableOpacity>
                        </View>

                        <View style={[commonStyles.row, { marginBottom: 8 }]}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <TouchableOpacity
                              style={[buttonStyles.outline, { paddingHorizontal: 8, paddingVertical: 4, minWidth: 32 }]}
                              onPress={() => updateCartItemQuantity(item.product.id, item.quantity - 1)}
                            >
                              <Text style={{ color: colors.primary, textAlign: 'center' }}>-</Text>
                            </TouchableOpacity>
                            <Text style={[commonStyles.text, { minWidth: 30, textAlign: 'center' }]}>
                              {item.quantity}
                            </Text>
                            <TouchableOpacity
                              style={[buttonStyles.outline, { paddingHorizontal: 8, paddingVertical: 4, minWidth: 32 }]}
                              onPress={() => updateCartItemQuantity(item.product.id, item.quantity + 1)}
                            >
                              <Text style={{ color: colors.primary, textAlign: 'center' }}>+</Text>
                            </TouchableOpacity>
                          </View>
                          <Text style={[commonStyles.text, { fontWeight: '600', color: colors.primary }]}>
                            {formatCurrency(item.subtotal)}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </ScrollView>

                {/* Cart Summary */}
                <View style={[commonStyles.card, { marginBottom: 16 }]}>
                  <View style={[commonStyles.row, { marginBottom: 8 }]}>
                    <Text style={commonStyles.text}>Sous-total:</Text>
                    <Text style={commonStyles.text}>{formatCurrency(subtotal)}</Text>
                  </View>
                  {tax > 0 && (
                    <View style={[commonStyles.row, { marginBottom: 8 }]}>
                      <Text style={commonStyles.text}>Taxes ({settings?.taxRate}%):</Text>
                      <Text style={commonStyles.text}>{formatCurrency(tax)}</Text>
                    </View>
                  )}
                  <View style={[commonStyles.row, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8 }]}>
                    <Text style={[commonStyles.text, { fontWeight: '600', fontSize: 16 }]}>Total:</Text>
                    <Text style={[commonStyles.text, { fontWeight: '600', fontSize: 16, color: colors.primary }]}>
                      {formatCurrency(total)}
                    </Text>
                  </View>
                </View>

                {/* Checkout Button */}
                <TouchableOpacity
                  style={[buttonStyles.primary, { paddingVertical: 16 }]}
                  onPress={() => setShowPaymentModal(true)}
                >
                  <Text style={{ color: colors.secondary, fontSize: 16, fontWeight: '600', textAlign: 'center' }}>
                    💳 Procéder au paiement
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>

      {/* Payment Modal */}
      <Modal
        visible={showPaymentModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={[commonStyles.card, { width: '90%', maxWidth: 500 }]}>
            <View style={[commonStyles.row, { marginBottom: 20 }]}>
              <Text style={commonStyles.subtitle}>💳 Paiement</Text>
              <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
                <Icon name="close" size={24} color={colors.textLight} />
              </TouchableOpacity>
            </View>

            <View style={{ marginBottom: 20 }}>
              <Text style={[commonStyles.text, { fontWeight: '600', fontSize: 18, textAlign: 'center' }]}>
                Total à payer: {formatCurrency(total)}
              </Text>
            </View>

            <View style={{ marginBottom: 20 }}>
              <Text style={[commonStyles.text, { marginBottom: 12, fontWeight: '600' }]}>
                Mode de paiement:
              </Text>
              <View style={{ gap: 8 }}>
                {[
                  { key: 'cash', label: '💵 Espèces', value: 'cash' },
                  { key: 'mobile_money', label: '📱 Mobile Money', value: 'mobile_money' },
                  { key: 'credit', label: '📋 À crédit', value: 'credit' },
                ].map(method => (
                  <TouchableOpacity
                    key={method.key}
                    style={[
                      buttonStyles.outline,
                      { paddingVertical: 12 },
                      paymentMethod === method.value && { backgroundColor: colors.primary }
                    ]}
                    onPress={() => setPaymentMethod(method.value as any)}
                  >
                    <Text style={[
                      { color: colors.primary, textAlign: 'center' },
                      paymentMethod === method.value && { color: colors.secondary }
                    ]}>
                      {method.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {paymentMethod !== 'credit' && (
              <View style={{ marginBottom: 20 }}>
                <Text style={[commonStyles.text, { marginBottom: 8, fontWeight: '600' }]}>
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
                  <Text style={[commonStyles.textLight, { marginTop: 4 }]}>
                    Monnaie à rendre: {formatCurrency(parseFloat(amountPaid) - total)}
                  </Text>
                )}
              </View>
            )}

            <TouchableOpacity
              style={[buttonStyles.primary, { marginBottom: 12 }]}
              onPress={processSale}
            >
              <Text style={{ color: colors.secondary, fontSize: 16, fontWeight: '600', textAlign: 'center' }}>
                ✅ Confirmer la vente
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={buttonStyles.outline}
              onPress={() => setShowPaymentModal(false)}
            >
              <Text style={{ color: colors.primary, fontSize: 16, fontWeight: '600', textAlign: 'center' }}>
                ❌ Annuler
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
