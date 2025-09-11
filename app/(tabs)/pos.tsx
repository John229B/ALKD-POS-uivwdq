
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Alert, Modal, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { commonStyles, colors, buttonStyles } from '../../styles/commonStyles';
import { useAuthState } from '../../hooks/useAuth';
import { getProducts, getCustomers, getSales, storeSales, storeProducts, getNextReceiptNumber, getSettings } from '../../utils/storage';
import { Product, Customer, CartItem, Sale, SaleItem, AppSettings } from '../../types';
import Icon from '../../components/Icon';
import uuid from 'react-native-uuid';

const { width } = Dimensions.get('window');
const isTablet = width > 768;

export default function POSScreen() {
  const { user } = useAuthState();
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mobile_money' | 'credit'>('cash');
  const [amountPaid, setAmountPaid] = useState('');
  const [discount, setDiscount] = useState(0);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [productsData, customersData, settingsData] = await Promise.all([
        getProducts(),
        getCustomers(),
        getSettings(),
      ]);
      setProducts(productsData);
      setCustomers(customersData);
      setSettings(settingsData);
    } catch (error) {
      console.error('Error loading POS data:', error);
    }
  };

  const filteredProducts = products.filter(product =>
    product.isActive &&
    product.stock > 0 &&
    (product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
     product.barcode?.includes(searchQuery))
  );

  const addToCart = (product: Product) => {
    const existingItem = cart.find(item => item.product.id === product.id);
    
    if (existingItem) {
      if (existingItem.quantity >= product.stock) {
        Alert.alert('Stock insuffisant', `Stock disponible: ${product.stock}`);
        return;
      }
      
      setCart(cart.map(item =>
        item.product.id === product.id
          ? {
              ...item,
              quantity: item.quantity + 1,
              subtotal: (item.quantity + 1) * item.product.price * (1 - item.discount / 100)
            }
          : item
      ));
    } else {
      const newItem: CartItem = {
        product,
        quantity: 1,
        discount: 0,
        subtotal: product.price,
      };
      setCart([...cart, newItem]);
    }
  };

  const updateCartItemQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    const product = products.find(p => p.id === productId);
    if (product && quantity > product.stock) {
      Alert.alert('Stock insuffisant', `Stock disponible: ${product.stock}`);
      return;
    }

    setCart(cart.map(item =>
      item.product.id === productId
        ? {
            ...item,
            quantity,
            subtotal: quantity * item.product.price * (1 - item.discount / 100)
          }
        : item
    ));
  };

  const updateCartItemDiscount = (productId: string, discount: number) => {
    setCart(cart.map(item =>
      item.product.id === productId
        ? {
            ...item,
            discount,
            subtotal: item.quantity * item.product.price * (1 - discount / 100)
          }
        : item
    ));
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };

  const clearCart = () => {
    Alert.alert(
      'Vider le panier',
      'Êtes-vous sûr de vouloir vider le panier ? Cette action ne peut pas être annulée.',
      [
        {
          text: 'Annuler',
          style: 'cancel',
        },
        {
          text: 'Vider',
          style: 'destructive',
          onPress: () => {
            setCart([]);
            setSelectedCustomer(null);
            setDiscount(0);
            setAmountPaid('');
            setPaymentMethod('cash');
          },
        },
      ]
    );
  };

  const calculateTotals = () => {
    const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
    const discountAmount = subtotal * (discount / 100);
    const taxAmount = settings ? (subtotal - discountAmount) * (settings.taxRate / 100) : 0;
    const total = subtotal - discountAmount + taxAmount;
    
    return { subtotal, discountAmount, taxAmount, total };
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

    const { subtotal, discountAmount, taxAmount, total } = calculateTotals();
    const paidAmount = parseFloat(amountPaid) || 0;

    if (paymentMethod !== 'credit' && paidAmount < total) {
      Alert.alert('Erreur', 'Montant payé insuffisant');
      return;
    }

    try {
      const receiptNumber = await getNextReceiptNumber();
      const saleItems: SaleItem[] = cart.map(item => ({
        id: uuid.v4() as string,
        productId: item.product.id,
        product: item.product,
        quantity: item.quantity,
        unitPrice: item.product.price,
        discount: item.discount,
        subtotal: item.subtotal,
      }));

      const sale: Sale = {
        id: uuid.v4() as string,
        customerId: selectedCustomer?.id,
        customer: selectedCustomer,
        items: saleItems,
        subtotal,
        discount: discountAmount,
        tax: taxAmount,
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

      // Save sale and update products
      const sales = await getSales();
      await storeSales([...sales, sale]);
      await storeProducts(updatedProducts);
      setProducts(updatedProducts);

      Alert.alert(
        'Vente réussie',
        `Reçu: ${receiptNumber}\nTotal: ${formatCurrency(total)}`,
        [
          {
            text: 'OK',
            onPress: () => {
              clearCartWithoutConfirmation();
              setShowPaymentModal(false);
            }
          }
        ]
      );

      console.log('Sale processed successfully:', sale);
    } catch (error) {
      console.error('Error processing sale:', error);
      Alert.alert('Erreur', 'Erreur lors du traitement de la vente');
    }
  };

  const clearCartWithoutConfirmation = () => {
    setCart([]);
    setSelectedCustomer(null);
    setDiscount(0);
    setAmountPaid('');
    setPaymentMethod('cash');
  };

  const formatCurrency = (amount: number) => {
    const currency = settings?.currency || 'XOF';
    const currencySymbols = { XOF: 'FCFA', USD: '$', EUR: '€' };
    return `${amount.toLocaleString()} ${currencySymbols[currency]}`;
  };

  const { subtotal, discountAmount, taxAmount, total } = calculateTotals();

  // Mobile layout (single column)
  if (!isTablet) {
    return (
      <SafeAreaView style={commonStyles.container}>
        <View style={commonStyles.content}>
          {/* Header */}
          <View style={[commonStyles.section, { paddingBottom: 8 }]}>
            <Text style={commonStyles.title}>Point de Vente</Text>
          </View>

          {/* Search */}
          <View style={[commonStyles.section, { paddingTop: 0, paddingBottom: 8 }]}>
            <TextInput
              style={[commonStyles.input, { fontSize: 16 }]}
              placeholder="Rechercher un produit..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Products Grid */}
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
              {filteredProducts.map(product => (
                <TouchableOpacity
                  key={product.id}
                  style={[commonStyles.card, { 
                    width: '48%', 
                    minWidth: 150,
                    minHeight: 100,
                    justifyContent: 'space-between'
                  }]}
                  onPress={() => addToCart(product)}
                >
                  <Text style={[commonStyles.text, { fontWeight: '600', marginBottom: 4, fontSize: 14 }]} numberOfLines={2}>
                    {product.name}
                  </Text>
                  <Text style={[commonStyles.textLight, { marginBottom: 8, fontSize: 12 }]}>
                    Stock: {product.stock}
                  </Text>
                  <Text style={[commonStyles.text, { color: colors.primary, fontWeight: '600', fontSize: 16 }]}>
                    {formatCurrency(product.price)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Cart Summary - Fixed at bottom */}
          {cart.length > 0 && (
            <View style={{
              backgroundColor: colors.card,
              borderTopWidth: 1,
              borderTopColor: colors.border,
              padding: 16,
              paddingBottom: 20,
              boxShadow: `0px -2px 8px ${colors.shadow}`,
              elevation: 5,
            }}>
              <View style={[commonStyles.row, { marginBottom: 12 }]}>
                <Text style={[commonStyles.text, { fontWeight: '600', fontSize: 16 }]}>
                  Panier ({cart.length} article{cart.length > 1 ? 's' : ''})
                </Text>
                <TouchableOpacity 
                  onPress={clearCart}
                  style={{
                    backgroundColor: colors.danger,
                    padding: 8,
                    borderRadius: 6,
                    minWidth: 40,
                    alignItems: 'center',
                  }}
                >
                  <Icon name="trash" size={18} color={colors.textWhite} />
                </TouchableOpacity>
              </View>

              {/* Cart Items Summary */}
              <ScrollView style={{ maxHeight: 120, marginBottom: 12 }}>
                {cart.map(item => (
                  <View key={item.product.id} style={{ 
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    marginBottom: 8,
                    paddingBottom: 8,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border
                  }}>
                    <View style={{ flex: 1 }}>
                      <Text style={[commonStyles.text, { fontWeight: '600', fontSize: 14 }]} numberOfLines={1}>
                        {item.product.name}
                      </Text>
                      <Text style={[commonStyles.textLight, { fontSize: 12 }]}>
                        {formatCurrency(item.product.price)} × {item.quantity}
                      </Text>
                    </View>
                    
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: 8 }}>
                      <TouchableOpacity
                        style={{
                          backgroundColor: colors.backgroundAlt,
                          padding: 6,
                          borderRadius: 4,
                          minWidth: 32,
                          alignItems: 'center',
                        }}
                        onPress={() => updateCartItemQuantity(item.product.id, item.quantity - 1)}
                      >
                        <Text style={{ color: colors.text, fontWeight: '600', fontSize: 16 }}>−</Text>
                      </TouchableOpacity>
                      <Text style={[commonStyles.text, { marginHorizontal: 12, fontWeight: '600', minWidth: 20, textAlign: 'center' }]}>
                        {item.quantity}
                      </Text>
                      <TouchableOpacity
                        style={{
                          backgroundColor: colors.primary,
                          padding: 6,
                          borderRadius: 4,
                          minWidth: 32,
                          alignItems: 'center',
                        }}
                        onPress={() => updateCartItemQuantity(item.product.id, item.quantity + 1)}
                      >
                        <Text style={{ color: colors.secondary, fontWeight: '600', fontSize: 16 }}>+</Text>
                      </TouchableOpacity>
                    </View>

                    <Text style={[commonStyles.text, { 
                      fontWeight: '600', 
                      color: colors.primary, 
                      fontSize: 14,
                      minWidth: 80,
                      textAlign: 'right'
                    }]}>
                      {formatCurrency(item.subtotal)}
                    </Text>
                  </View>
                ))}
              </ScrollView>

              {/* Totals Summary */}
              <View style={{ marginBottom: 16 }}>
                <View style={[commonStyles.row, { marginBottom: 4 }]}>
                  <Text style={[commonStyles.text, { fontSize: 14 }]}>Sous-total:</Text>
                  <Text style={[commonStyles.text, { fontSize: 14 }]}>{formatCurrency(subtotal)}</Text>
                </View>
                
                {discountAmount > 0 && (
                  <View style={[commonStyles.row, { marginBottom: 4 }]}>
                    <Text style={[commonStyles.text, { fontSize: 14 }]}>Remise:</Text>
                    <Text style={[commonStyles.text, { color: colors.danger, fontSize: 14 }]}>
                      -{formatCurrency(discountAmount)}
                    </Text>
                  </View>
                )}
                
                {taxAmount > 0 && (
                  <View style={[commonStyles.row, { marginBottom: 4 }]}>
                    <Text style={[commonStyles.text, { fontSize: 14 }]}>Taxes:</Text>
                    <Text style={[commonStyles.text, { fontSize: 14 }]}>{formatCurrency(taxAmount)}</Text>
                  </View>
                )}
                
                <View style={[commonStyles.row, { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border }]}>
                  <Text style={[commonStyles.text, { fontWeight: '700', fontSize: 18 }]}>Total:</Text>
                  <Text style={[commonStyles.text, { 
                    fontWeight: '700', 
                    fontSize: 18, 
                    color: colors.primary 
                  }]}>
                    {formatCurrency(total)}
                  </Text>
                </View>
              </View>

              {/* Checkout Button - Full width */}
              <TouchableOpacity
                style={[buttonStyles.primary, {
                  width: '100%',
                  paddingVertical: 16,
                  borderRadius: 12,
                }]}
                onPress={() => setShowPaymentModal(true)}
              >
                <Text style={{ 
                  color: colors.secondary, 
                  fontSize: 18, 
                  fontWeight: '700',
                  textAlign: 'center'
                }}>
                  Procéder au paiement
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Payment Modal */}
        <Modal
          visible={showPaymentModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowPaymentModal(false)}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
            <View style={[commonStyles.card, { 
              width: '100%', 
              maxHeight: '85%',
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              borderBottomLeftRadius: 0,
              borderBottomRightRadius: 0,
              margin: 0,
            }]}>
              <View style={[commonStyles.row, { marginBottom: 20 }]}>
                <Text style={[commonStyles.subtitle, { fontSize: 22 }]}>Paiement</Text>
                <TouchableOpacity 
                  onPress={() => setShowPaymentModal(false)}
                  style={{ padding: 4 }}
                >
                  <Icon name="close" size={24} color={colors.textLight} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={{ marginBottom: 24 }}>
                  <Text style={[commonStyles.text, { marginBottom: 12, fontWeight: '600' }]}>Méthode de paiement:</Text>
                  <View style={{ gap: 12 }}>
                    {[
                      { key: 'cash', label: 'Espèces', icon: 'cash' },
                      { key: 'mobile_money', label: 'Mobile Money', icon: 'phone-portrait' },
                      { key: 'credit', label: 'Crédit', icon: 'card' },
                    ].map(method => (
                      <TouchableOpacity
                        key={method.key}
                        style={[
                          {
                            flexDirection: 'row',
                            alignItems: 'center',
                            padding: 16,
                            borderRadius: 12,
                            borderWidth: 2,
                            borderColor: paymentMethod === method.key ? colors.primary : colors.border,
                            backgroundColor: paymentMethod === method.key ? colors.primary : colors.background,
                          }
                        ]}
                        onPress={() => setPaymentMethod(method.key as any)}
                      >
                        <Icon 
                          name={method.icon as any} 
                          size={20} 
                          color={paymentMethod === method.key ? colors.secondary : colors.text}
                          style={{ marginRight: 12 }}
                        />
                        <Text style={{
                          color: paymentMethod === method.key ? colors.secondary : colors.text,
                          fontSize: 16,
                          fontWeight: '600',
                        }}>
                          {method.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {paymentMethod !== 'credit' && (
                  <View style={{ marginBottom: 24 }}>
                    <Text style={[commonStyles.text, { marginBottom: 8, fontWeight: '600' }]}>Montant payé:</Text>
                    <TextInput
                      style={[commonStyles.input, { fontSize: 18, paddingVertical: 16 }]}
                      value={amountPaid}
                      onChangeText={setAmountPaid}
                      placeholder={`Minimum: ${formatCurrency(total)}`}
                      keyboardType="numeric"
                    />
                    {parseFloat(amountPaid) > total && (
                      <Text style={[commonStyles.text, { marginTop: 8, color: colors.success, fontWeight: '600' }]}>
                        Monnaie: {formatCurrency(parseFloat(amountPaid) - total)}
                      </Text>
                    )}
                  </View>
                )}

                <View style={{ 
                  backgroundColor: colors.backgroundAlt, 
                  padding: 16, 
                  borderRadius: 12, 
                  marginBottom: 24 
                }}>
                  <Text style={[commonStyles.text, { 
                    fontWeight: '700', 
                    fontSize: 20, 
                    textAlign: 'center',
                    color: colors.primary
                  }]}>
                    Total à payer: {formatCurrency(total)}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[buttonStyles.primary, { 
                    marginBottom: 12, 
                    paddingVertical: 18,
                    borderRadius: 12,
                  }]}
                  onPress={processSale}
                >
                  <Text style={{ 
                    color: colors.secondary, 
                    fontSize: 18, 
                    fontWeight: '700' 
                  }}>
                    Confirmer la vente
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[buttonStyles.outline, { 
                    paddingVertical: 18,
                    borderRadius: 12,
                    marginBottom: 20,
                  }]}
                  onPress={() => setShowPaymentModal(false)}
                >
                  <Text style={{ 
                    color: colors.primary, 
                    fontSize: 16, 
                    fontWeight: '600' 
                  }}>
                    Annuler
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  // Tablet layout (two columns) - existing layout
  return (
    <SafeAreaView style={commonStyles.container}>
      <View style={commonStyles.content}>
        {/* Header */}
        <View style={[commonStyles.section, { paddingBottom: 8 }]}>
          <Text style={commonStyles.title}>Point de Vente</Text>
        </View>

        <View style={{ flex: 1, flexDirection: 'row' }}>
          {/* Products Section */}
          <View style={{ flex: 2, paddingRight: 10 }}>
            <View style={[commonStyles.section, { paddingTop: 0 }]}>
              <TextInput
                style={[commonStyles.input, { marginBottom: 16 }]}
                placeholder="Rechercher un produit ou scanner un code-barres..."
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            <ScrollView style={{ flex: 1, paddingHorizontal: 20 }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                {filteredProducts.map(product => (
                  <TouchableOpacity
                    key={product.id}
                    style={[commonStyles.card, { width: '48%', minWidth: 150 }]}
                    onPress={() => addToCart(product)}
                  >
                    <Text style={[commonStyles.text, { fontWeight: '600', marginBottom: 4 }]}>
                      {product.name}
                    </Text>
                    <Text style={[commonStyles.textLight, { marginBottom: 8 }]}>
                      Stock: {product.stock}
                    </Text>
                    <Text style={[commonStyles.text, { color: colors.primary, fontWeight: '600' }]}>
                      {formatCurrency(product.price)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Cart Section */}
          <View style={{ flex: 1, paddingLeft: 10 }}>
            <View style={[commonStyles.card, { flex: 1, margin: 20, marginLeft: 0 }]}>
              <View style={[commonStyles.row, { marginBottom: 16 }]}>
                <Text style={commonStyles.subtitle}>Panier</Text>
                {cart.length > 0 && (
                  <TouchableOpacity 
                    onPress={clearCart}
                    style={{
                      backgroundColor: colors.danger,
                      padding: 8,
                      borderRadius: 6,
                      minWidth: 40,
                      alignItems: 'center',
                    }}
                  >
                    <Icon name="trash" size={20} color={colors.textWhite} />
                  </TouchableOpacity>
                )}
              </View>

              <ScrollView style={{ flex: 1 }}>
                {cart.map(item => (
                  <View key={item.product.id} style={{ 
                    marginBottom: 16, 
                    paddingBottom: 16, 
                    borderBottomWidth: 1, 
                    borderBottomColor: colors.border 
                  }}>
                    <Text style={[commonStyles.text, { fontWeight: '700', marginBottom: 4, fontSize: 16 }]}>
                      {item.product.name}
                    </Text>
                    <Text style={[commonStyles.textLight, { marginBottom: 8 }]}>
                      {formatCurrency(item.product.price)} × {item.quantity}
                    </Text>
                    
                    <View style={[commonStyles.row, { marginBottom: 8 }]}>
                      <TouchableOpacity
                        style={{
                          backgroundColor: colors.backgroundAlt,
                          padding: 8,
                          borderRadius: 6,
                          minWidth: 36,
                          alignItems: 'center',
                        }}
                        onPress={() => updateCartItemQuantity(item.product.id, item.quantity - 1)}
                      >
                        <Text style={{ color: colors.text, fontWeight: '600', fontSize: 18 }}>−</Text>
                      </TouchableOpacity>
                      <Text style={[commonStyles.text, { marginHorizontal: 16, fontWeight: '600' }]}>
                        {item.quantity}
                      </Text>
                      <TouchableOpacity
                        style={{
                          backgroundColor: colors.primary,
                          padding: 8,
                          borderRadius: 6,
                          minWidth: 36,
                          alignItems: 'center',
                        }}
                        onPress={() => updateCartItemQuantity(item.product.id, item.quantity + 1)}
                      >
                        <Text style={{ color: colors.secondary, fontWeight: '600', fontSize: 18 }}>+</Text>
                      </TouchableOpacity>
                    </View>

                    <Text style={[commonStyles.text, { 
                      fontWeight: '700', 
                      color: colors.primary,
                      fontSize: 16
                    }]}>
                      {formatCurrency(item.subtotal)}
                    </Text>
                  </View>
                ))}
              </ScrollView>

              {cart.length > 0 && (
                <View>
                  <View style={commonStyles.divider} />
                  
                  <View style={[commonStyles.row, { marginBottom: 8 }]}>
                    <Text style={[commonStyles.text, { fontWeight: '600' }]}>Sous-total:</Text>
                    <Text style={[commonStyles.text, { fontWeight: '600' }]}>{formatCurrency(subtotal)}</Text>
                  </View>
                  
                  {discountAmount > 0 && (
                    <View style={[commonStyles.row, { marginBottom: 8 }]}>
                      <Text style={[commonStyles.text, { fontWeight: '600' }]}>Remise:</Text>
                      <Text style={[commonStyles.text, { color: colors.danger, fontWeight: '600' }]}>
                        -{formatCurrency(discountAmount)}
                      </Text>
                    </View>
                  )}
                  
                  {taxAmount > 0 && (
                    <View style={[commonStyles.row, { marginBottom: 8 }]}>
                      <Text style={[commonStyles.text, { fontWeight: '600' }]}>Taxes:</Text>
                      <Text style={[commonStyles.text, { fontWeight: '600' }]}>{formatCurrency(taxAmount)}</Text>
                    </View>
                  )}
                  
                  <View style={[commonStyles.row, { marginBottom: 20, paddingTop: 8, borderTopWidth: 2, borderTopColor: colors.primary }]}>
                    <Text style={[commonStyles.text, { fontWeight: '700', fontSize: 20 }]}>Total:</Text>
                    <Text style={[commonStyles.text, { 
                      fontWeight: '700', 
                      fontSize: 20, 
                      color: colors.primary 
                    }]}>
                      {formatCurrency(total)}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={[buttonStyles.primary, {
                      width: '100%',
                      paddingVertical: 16,
                      borderRadius: 12,
                    }]}
                    onPress={() => setShowPaymentModal(true)}
                  >
                    <Text style={{ 
                      color: colors.secondary, 
                      fontSize: 18, 
                      fontWeight: '700',
                      textAlign: 'center'
                    }}>
                      Procéder au paiement
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </View>
      </View>

      {/* Payment Modal - Same as mobile */}
      <Modal
        visible={showPaymentModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={[commonStyles.card, { width: '90%', maxWidth: 500, maxHeight: '85%' }]}>
            <View style={[commonStyles.row, { marginBottom: 20 }]}>
              <Text style={[commonStyles.subtitle, { fontSize: 22 }]}>Paiement</Text>
              <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
                <Icon name="close" size={24} color={colors.textLight} />
              </TouchableOpacity>
            </View>

            <ScrollView>
              <View style={{ marginBottom: 24 }}>
                <Text style={[commonStyles.text, { marginBottom: 12, fontWeight: '600' }]}>Méthode de paiement:</Text>
                <View style={{ gap: 12 }}>
                  {[
                    { key: 'cash', label: 'Espèces', icon: 'cash' },
                    { key: 'mobile_money', label: 'Mobile Money', icon: 'phone-portrait' },
                    { key: 'credit', label: 'Crédit', icon: 'card' },
                  ].map(method => (
                    <TouchableOpacity
                      key={method.key}
                      style={[
                        {
                          flexDirection: 'row',
                          alignItems: 'center',
                          padding: 16,
                          borderRadius: 12,
                          borderWidth: 2,
                          borderColor: paymentMethod === method.key ? colors.primary : colors.border,
                          backgroundColor: paymentMethod === method.key ? colors.primary : colors.background,
                        }
                      ]}
                      onPress={() => setPaymentMethod(method.key as any)}
                    >
                      <Icon 
                        name={method.icon as any} 
                        size={20} 
                        color={paymentMethod === method.key ? colors.secondary : colors.text}
                        style={{ marginRight: 12 }}
                      />
                      <Text style={{
                        color: paymentMethod === method.key ? colors.secondary : colors.text,
                        fontSize: 16,
                        fontWeight: '600',
                      }}>
                        {method.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {paymentMethod !== 'credit' && (
                <View style={{ marginBottom: 24 }}>
                  <Text style={[commonStyles.text, { marginBottom: 8, fontWeight: '600' }]}>Montant payé:</Text>
                  <TextInput
                    style={[commonStyles.input, { fontSize: 18, paddingVertical: 16 }]}
                    value={amountPaid}
                    onChangeText={setAmountPaid}
                    placeholder={`Minimum: ${formatCurrency(total)}`}
                    keyboardType="numeric"
                  />
                  {parseFloat(amountPaid) > total && (
                    <Text style={[commonStyles.text, { marginTop: 8, color: colors.success, fontWeight: '600' }]}>
                      Monnaie: {formatCurrency(parseFloat(amountPaid) - total)}
                    </Text>
                  )}
                </View>
              )}

              <View style={{ 
                backgroundColor: colors.backgroundAlt, 
                padding: 16, 
                borderRadius: 12, 
                marginBottom: 24 
              }}>
                <Text style={[commonStyles.text, { 
                  fontWeight: '700', 
                  fontSize: 20, 
                  textAlign: 'center',
                  color: colors.primary
                }]}>
                  Total à payer: {formatCurrency(total)}
                </Text>
              </View>

              <TouchableOpacity
                style={[buttonStyles.primary, { 
                  marginBottom: 12, 
                  paddingVertical: 18,
                  borderRadius: 12,
                }]}
                onPress={processSale}
              >
                <Text style={{ 
                  color: colors.secondary, 
                  fontSize: 18, 
                  fontWeight: '700' 
                }}>
                  Confirmer la vente
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[buttonStyles.outline, { 
                  paddingVertical: 18,
                  borderRadius: 12,
                }]}
                onPress={() => setShowPaymentModal(false)}
              >
                <Text style={{ 
                  color: colors.primary, 
                  fontSize: 16, 
                  fontWeight: '600' 
                }}>
                  Annuler
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
