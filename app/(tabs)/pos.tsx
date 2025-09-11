
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { commonStyles, colors, buttonStyles } from '../../styles/commonStyles';
import { useAuthState } from '../../hooks/useAuth';
import { getProducts, getCustomers, getSales, storeSales, storeProducts, getNextReceiptNumber, getSettings } from '../../utils/storage';
import { Product, Customer, CartItem, Sale, SaleItem, AppSettings } from '../../types';
import Icon from '../../components/Icon';
import uuid from 'react-native-uuid';

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
    setCart([]);
    setSelectedCustomer(null);
    setDiscount(0);
    setAmountPaid('');
    setPaymentMethod('cash');
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
              clearCart();
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

  const formatCurrency = (amount: number) => {
    const currency = settings?.currency || 'XOF';
    const currencySymbols = { XOF: 'FCFA', USD: '$', EUR: '€' };
    return `${amount.toLocaleString()} ${currencySymbols[currency]}`;
  };

  const { subtotal, discountAmount, taxAmount, total } = calculateTotals();

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
                  <TouchableOpacity onPress={clearCart}>
                    <Icon name="trash" size={20} color={colors.danger} />
                  </TouchableOpacity>
                )}
              </View>

              <ScrollView style={{ flex: 1 }}>
                {cart.map(item => (
                  <View key={item.product.id} style={{ marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                    <Text style={[commonStyles.text, { fontWeight: '600', marginBottom: 4 }]}>
                      {item.product.name}
                    </Text>
                    <Text style={[commonStyles.textLight, { marginBottom: 8 }]}>
                      {formatCurrency(item.product.price)} x {item.quantity}
                    </Text>
                    
                    <View style={[commonStyles.row, { marginBottom: 8 }]}>
                      <TouchableOpacity
                        style={{ backgroundColor: colors.backgroundAlt, padding: 8, borderRadius: 4 }}
                        onPress={() => updateCartItemQuantity(item.product.id, item.quantity - 1)}
                      >
                        <Icon name="remove" size={16} color={colors.text} />
                      </TouchableOpacity>
                      <Text style={[commonStyles.text, { marginHorizontal: 16 }]}>
                        {item.quantity}
                      </Text>
                      <TouchableOpacity
                        style={{ backgroundColor: colors.backgroundAlt, padding: 8, borderRadius: 4 }}
                        onPress={() => updateCartItemQuantity(item.product.id, item.quantity + 1)}
                      >
                        <Icon name="add" size={16} color={colors.text} />
                      </TouchableOpacity>
                    </View>

                    <Text style={[commonStyles.text, { fontWeight: '600', color: colors.primary }]}>
                      {formatCurrency(item.subtotal)}
                    </Text>
                  </View>
                ))}
              </ScrollView>

              {cart.length > 0 && (
                <View>
                  <View style={commonStyles.divider} />
                  
                  <View style={[commonStyles.row, { marginBottom: 8 }]}>
                    <Text style={commonStyles.text}>Sous-total:</Text>
                    <Text style={commonStyles.text}>{formatCurrency(subtotal)}</Text>
                  </View>
                  
                  {discountAmount > 0 && (
                    <View style={[commonStyles.row, { marginBottom: 8 }]}>
                      <Text style={commonStyles.text}>Remise:</Text>
                      <Text style={[commonStyles.text, { color: colors.danger }]}>
                        -{formatCurrency(discountAmount)}
                      </Text>
                    </View>
                  )}
                  
                  {taxAmount > 0 && (
                    <View style={[commonStyles.row, { marginBottom: 8 }]}>
                      <Text style={commonStyles.text}>Taxe:</Text>
                      <Text style={commonStyles.text}>{formatCurrency(taxAmount)}</Text>
                    </View>
                  )}
                  
                  <View style={[commonStyles.row, { marginBottom: 16 }]}>
                    <Text style={[commonStyles.text, { fontWeight: '600', fontSize: 18 }]}>Total:</Text>
                    <Text style={[commonStyles.text, { fontWeight: '600', fontSize: 18, color: colors.primary }]}>
                      {formatCurrency(total)}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={buttonStyles.primary}
                    onPress={() => setShowPaymentModal(true)}
                  >
                    <Text style={{ color: colors.secondary, fontSize: 16, fontWeight: '600' }}>
                      Procéder au paiement
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
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
          <View style={[commonStyles.card, { width: '90%', maxWidth: 400, maxHeight: '80%' }]}>
            <View style={[commonStyles.row, { marginBottom: 20 }]}>
              <Text style={commonStyles.subtitle}>Paiement</Text>
              <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
                <Icon name="close" size={24} color={colors.textLight} />
              </TouchableOpacity>
            </View>

            <ScrollView>
              <View style={{ marginBottom: 20 }}>
                <Text style={[commonStyles.text, { marginBottom: 8 }]}>Méthode de paiement:</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {[
                    { key: 'cash', label: 'Espèces', icon: 'cash' },
                    { key: 'mobile_money', label: 'Mobile Money', icon: 'phone-portrait' },
                    { key: 'credit', label: 'Crédit', icon: 'card' },
                  ].map(method => (
                    <TouchableOpacity
                      key={method.key}
                      style={[
                        buttonStyles.outline,
                        { flex: 1, paddingVertical: 8 },
                        paymentMethod === method.key && { backgroundColor: colors.primary, borderColor: colors.primary }
                      ]}
                      onPress={() => setPaymentMethod(method.key as any)}
                    >
                      <Icon 
                        name={method.icon as any} 
                        size={16} 
                        color={paymentMethod === method.key ? colors.secondary : colors.primary}
                        style={{ marginBottom: 4 }}
                      />
                      <Text style={{
                        color: paymentMethod === method.key ? colors.secondary : colors.primary,
                        fontSize: 12,
                        fontWeight: '600',
                        textAlign: 'center'
                      }}>
                        {method.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {paymentMethod !== 'credit' && (
                <View style={{ marginBottom: 20 }}>
                  <Text style={[commonStyles.text, { marginBottom: 8 }]}>Montant payé:</Text>
                  <TextInput
                    style={commonStyles.input}
                    value={amountPaid}
                    onChangeText={setAmountPaid}
                    placeholder={`Minimum: ${formatCurrency(total)}`}
                    keyboardType="numeric"
                  />
                  {parseFloat(amountPaid) > total && (
                    <Text style={[commonStyles.textLight, { marginTop: 4 }]}>
                      Monnaie: {formatCurrency(parseFloat(amountPaid) - total)}
                    </Text>
                  )}
                </View>
              )}

              <View style={{ marginBottom: 20 }}>
                <Text style={[commonStyles.text, { fontWeight: '600', fontSize: 18, textAlign: 'center' }]}>
                  Total à payer: {formatCurrency(total)}
                </Text>
              </View>

              <TouchableOpacity
                style={[buttonStyles.primary, { marginBottom: 12 }]}
                onPress={processSale}
              >
                <Text style={{ color: colors.secondary, fontSize: 16, fontWeight: '600' }}>
                  Confirmer la vente
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={buttonStyles.outline}
                onPress={() => setShowPaymentModal(false)}
              >
                <Text style={{ color: colors.primary, fontSize: 16, fontWeight: '600' }}>
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
