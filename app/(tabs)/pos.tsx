
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
                subtotal: price * newQuantity
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

  const openCart = useCallback(() => {
    if (cart.length === 0) {
      Alert.alert('Panier vide', 'Ajoutez des produits au panier pour continuer');
      return;
    }

    router.push({
      pathname: '/cart',
      params: {
        cartData: JSON.stringify(cart),
      },
    });
  }, [cart]);

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
              onPress={openCart}
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
