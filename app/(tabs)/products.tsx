
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Alert, Modal, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { commonStyles, colors, buttonStyles, spacing, fontSizes, isSmallScreen } from '../../styles/commonStyles';
import { getProducts, storeProducts, getSettings, getCategories } from '../../utils/storage';
import { Product, AppSettings, Category } from '../../types';
import Icon from '../../components/Icon';
import uuid from 'react-native-uuid';

export default function ProductsScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState('all');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    retailPrice: '',
    wholesalePrice: '',
    wholesaleMinQuantity: '',
    promotionalPrice: '',
    promotionalValidUntil: '',
    cost: '',
    barcode: '',
    categoryId: '',
    stock: '',
    minStock: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      console.log('Loading products data...');
      const [productsData, categoriesData, settingsData] = await Promise.all([
        getProducts(),
        getCategories(),
        getSettings(),
      ]);
      setProducts(productsData);
      setCategories(categoriesData);
      setSettings(settingsData);
      console.log(`Loaded ${productsData.length} products and ${categoriesData.length} categories`);
    } catch (error) {
      console.error('Error loading products data:', error);
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

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      retailPrice: '',
      wholesalePrice: '',
      wholesaleMinQuantity: '',
      promotionalPrice: '',
      promotionalValidUntil: '',
      cost: '',
      barcode: '',
      categoryId: '',
      stock: '',
      minStock: '',
    });
    setEditingProduct(null);
  };

  const openAddModal = () => {
    console.log('Opening add product modal');
    resetForm();
    setShowAddModal(true);
  };

  const openEditModal = (product: Product) => {
    console.log('Opening edit modal for product:', product.name);
    setFormData({
      name: product.name,
      description: product.description || '',
      retailPrice: product.retailPrice.toString(),
      wholesalePrice: product.wholesalePrice?.toString() || '',
      wholesaleMinQuantity: product.wholesaleMinQuantity?.toString() || '',
      promotionalPrice: product.promotionalPrice?.toString() || '',
      promotionalValidUntil: product.promotionalValidUntil ? 
        new Date(product.promotionalValidUntil).toISOString().split('T')[0] : '',
      cost: product.cost.toString(),
      barcode: product.barcode || '',
      categoryId: product.categoryId,
      stock: product.stock.toString(),
      minStock: product.minStock.toString(),
    });
    setEditingProduct(product);
    setShowAddModal(true);
  };

  const saveProduct = async () => {
    if (!formData.name.trim() || !formData.retailPrice || !formData.categoryId) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires (Nom, Prix de détail, Catégorie)');
      return;
    }

    const retailPrice = parseFloat(formData.retailPrice);
    const wholesalePrice = formData.wholesalePrice ? parseFloat(formData.wholesalePrice) : undefined;
    const wholesaleMinQuantity = formData.wholesaleMinQuantity ? parseInt(formData.wholesaleMinQuantity) : undefined;
    const promotionalPrice = formData.promotionalPrice ? parseFloat(formData.promotionalPrice) : undefined;
    const promotionalValidUntil = formData.promotionalValidUntil ? new Date(formData.promotionalValidUntil) : undefined;
    const cost = parseFloat(formData.cost) || 0;
    const stock = parseInt(formData.stock) || 0;
    const minStock = parseInt(formData.minStock) || 0;

    if (retailPrice <= 0) {
      Alert.alert('Erreur', 'Le prix de détail doit être supérieur à 0');
      return;
    }

    if (wholesalePrice && wholesalePrice <= 0) {
      Alert.alert('Erreur', 'Le prix de gros doit être supérieur à 0');
      return;
    }

    if (promotionalPrice && promotionalPrice <= 0) {
      Alert.alert('Erreur', 'Le prix promotionnel doit être supérieur à 0');
      return;
    }

    if (wholesalePrice && !wholesaleMinQuantity) {
      Alert.alert('Erreur', 'Veuillez spécifier la quantité minimum pour le prix de gros');
      return;
    }

    if (promotionalPrice && !promotionalValidUntil) {
      Alert.alert('Erreur', 'Veuillez spécifier la date limite pour le prix promotionnel');
      return;
    }

    try {
      let updatedProducts: Product[];

      if (editingProduct) {
        console.log('Updating existing product:', editingProduct.id);
        const updatedProduct: Product = {
          ...editingProduct,
          name: formData.name.trim(),
          description: formData.description.trim(),
          retailPrice,
          wholesalePrice,
          wholesaleMinQuantity,
          promotionalPrice,
          promotionalValidUntil,
          cost,
          barcode: formData.barcode.trim() || undefined,
          categoryId: formData.categoryId,
          stock,
          minStock,
          updatedAt: new Date(),
        };

        updatedProducts = products.map(p => 
          p.id === editingProduct.id ? updatedProduct : p
        );
      } else {
        console.log('Adding new product');
        const newProduct: Product = {
          id: uuid.v4() as string,
          name: formData.name.trim(),
          description: formData.description.trim(),
          retailPrice,
          wholesalePrice,
          wholesaleMinQuantity,
          promotionalPrice,
          promotionalValidUntil,
          cost,
          barcode: formData.barcode.trim() || undefined,
          categoryId: formData.categoryId,
          stock,
          minStock,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        updatedProducts = [...products, newProduct];
      }

      await storeProducts(updatedProducts);
      setProducts(updatedProducts);
      setShowAddModal(false);
      resetForm();

      Alert.alert(
        'Succès',
        editingProduct ? 'Produit modifié avec succès' : 'Produit ajouté avec succès'
      );
    } catch (error) {
      console.error('Error saving product:', error);
      Alert.alert('Erreur', 'Erreur lors de la sauvegarde du produit');
    }
  };

  const toggleProductStatus = async (product: Product) => {
    try {
      console.log('Toggling status for product:', product.name);
      const updatedProducts = products.map(p =>
        p.id === product.id
          ? { ...p, isActive: !p.isActive, updatedAt: new Date() }
          : p
      );

      await storeProducts(updatedProducts);
      setProducts(updatedProducts);

      Alert.alert(
        'Succès',
        `Produit ${product.isActive ? 'désactivé' : 'activé'} avec succès`
      );
    } catch (error) {
      console.error('Error toggling product status:', error);
      Alert.alert('Erreur', 'Erreur lors de la modification du statut');
    }
  };

  const formatCurrency = (amount: number | undefined | null): string => {
    if (amount === undefined || amount === null || isNaN(amount)) {
      console.log('formatCurrency called with invalid amount:', amount);
      amount = 0;
    }
    
    const currency = settings?.currency || 'XOF';
    const currencySymbols = { XOF: 'FCFA', USD: '$', EUR: '€' };
    return `${amount.toLocaleString()} ${currencySymbols[currency]}`;
  };

  const getStockStatus = (product: Product) => {
    if (product.stock <= 0) return { text: 'Rupture', color: colors.danger };
    if (product.stock <= product.minStock) return { text: 'Stock bas', color: colors.warning };
    return { text: 'En stock', color: colors.success };
  };

  const getMarginPercentage = (product: Product) => {
    if (product.cost === 0) return 0;
    return ((product.retailPrice - product.cost) / product.cost * 100);
  };

  const getPriceInfo = (product: Product) => {
    const now = new Date();
    const info = [];

    if (product.promotionalPrice && product.promotionalValidUntil && new Date(product.promotionalValidUntil) > now) {
      const daysLeft = Math.ceil((new Date(product.promotionalValidUntil).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      info.push({
        type: 'promotional',
        price: product.promotionalPrice,
        label: `🎉 Promo (${daysLeft}j restants)`,
        color: colors.success
      });
    }

    if (product.wholesalePrice && product.wholesaleMinQuantity) {
      info.push({
        type: 'wholesale',
        price: product.wholesalePrice,
        label: `📦 Gros (${product.wholesaleMinQuantity}+ unités)`,
        color: colors.primary
      });
    }

    return info;
  };

  return (
    <SafeAreaView style={commonStyles.container}>
      <View style={commonStyles.content}>
        {/* Header */}
        <View style={[commonStyles.section, commonStyles.header]}>
          <View style={{ flex: 1 }}>
            <Text style={commonStyles.title}>Gestion des Produits</Text>
            <Text style={[commonStyles.textLight, { fontSize: fontSizes.sm }]}>
              {filteredProducts.length} produit(s) • Version 1.1.0
            </Text>
          </View>
          <View style={commonStyles.headerActions}>
            <TouchableOpacity
              style={[buttonStyles.outline, buttonStyles.small]}
              onPress={() => router.push('/categories')}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                <Icon name="grid" size={16} color={colors.primary} />
                {!isSmallScreen && <Text style={{ color: colors.primary, fontSize: fontSizes.xs }}>Catégories</Text>}
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[buttonStyles.primary, isSmallScreen ? buttonStyles.small : {}]}
              onPress={openAddModal}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                <Icon name="add" size={20} color={colors.secondary} />
                <Text style={{ color: colors.secondary, fontWeight: '600', fontSize: isSmallScreen ? fontSizes.sm : fontSizes.md }}>
                  {isSmallScreen ? 'Ajouter' : 'Ajouter produit'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Search */}
        <View style={commonStyles.section}>
          <TextInput
            style={commonStyles.input}
            placeholder="Rechercher par nom, catégorie ou code-barres..."
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
              {categories.filter(cat => cat.isActive).map(category => (
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

        {/* Products List */}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xl }}>
          {filteredProducts.map(product => {
            const stockStatus = getStockStatus(product);
            const margin = getMarginPercentage(product);
            const priceInfo = getPriceInfo(product);
            const categoryColor = getCategoryColor(product.categoryId);
            
            return (
              <View key={product.id} style={[commonStyles.card, { opacity: product.isActive ? 1 : 0.6 }]}>
                {/* Product Header */}
                <View style={[commonStyles.row, { marginBottom: spacing.xs, alignItems: 'flex-start' }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[commonStyles.text, { fontWeight: '600', marginBottom: spacing.xs }]}>
                      {product.name}
                      {!product.isActive && <Text style={{ color: colors.danger }}> (Inactif)</Text>}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                        <View style={{
                          width: 6,
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: categoryColor
                        }} />
                        <Text style={[commonStyles.textLight, { fontSize: fontSizes.xs }]}>
                          {getCategoryName(product.categoryId)}
                        </Text>
                      </View>
                      {product.barcode && (
                        <Text style={[commonStyles.textLight, { fontSize: fontSizes.xs }]}>
                          🏷️ {product.barcode}
                        </Text>
                      )}
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[commonStyles.text, { fontWeight: '600', color: colors.primary, fontSize: fontSizes.lg }]}>
                      {formatCurrency(product.retailPrice)}
                    </Text>
                    <Text style={[commonStyles.textLight, { fontSize: fontSizes.xs }]}>
                      Coût: {formatCurrency(product.cost)}
                    </Text>
                  </View>
                </View>

                {/* Product Description */}
                {product.description && (
                  <Text style={[commonStyles.textLight, { fontSize: fontSizes.xs, marginBottom: spacing.xs }]}>
                    {product.description}
                  </Text>
                )}

                {/* Price Information */}
                {priceInfo.length > 0 && (
                  <View style={{ marginBottom: spacing.xs }}>
                    {priceInfo.map((info, index) => (
                      <View key={index} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                        <Text style={[commonStyles.textLight, { fontSize: fontSizes.xs, color: info.color }]}>
                          {info.label}: {formatCurrency(info.price)}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Stock and Margin Info */}
                <View style={[commonStyles.row, { marginBottom: spacing.sm, alignItems: 'flex-start' }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[commonStyles.textLight, { fontSize: fontSizes.xs }]}>
                      📊 Stock: {product.stock} unités (Min: {product.minStock})
                    </Text>
                    <Text style={[commonStyles.textLight, { fontSize: fontSizes.xs, color: stockStatus.color, fontWeight: '600' }]}>
                      {stockStatus.text}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[commonStyles.textLight, { fontSize: fontSizes.xs }]}>
                      💰 Marge: {margin.toFixed(1)}%
                    </Text>
                    <Text style={[commonStyles.textLight, { fontSize: fontSizes.xs }]}>
                      Bénéfice: {formatCurrency(product.retailPrice - product.cost)}
                    </Text>
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={commonStyles.buttonContainer}>
                  <TouchableOpacity
                    style={[buttonStyles.outline, buttonStyles.small, { flex: 1 }]}
                    onPress={() => openEditModal(product)}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs }}>
                      <Icon name="create" size={14} color={colors.primary} />
                      <Text style={{ color: colors.primary, fontSize: fontSizes.xs }}>Modifier</Text>
                    </View>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      buttonStyles.outline,
                      buttonStyles.small,
                      { flex: 1, borderColor: product.isActive ? colors.danger : colors.success }
                    ]}
                    onPress={() => toggleProductStatus(product)}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs }}>
                      <Icon 
                        name={product.isActive ? "close" : "checkmark"} 
                        size={14} 
                        color={product.isActive ? colors.danger : colors.success} 
                      />
                      <Text style={{ 
                        color: product.isActive ? colors.danger : colors.success, 
                        fontSize: fontSizes.xs 
                      }}>
                        {product.isActive ? 'Désactiver' : 'Activer'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}

          {filteredProducts.length === 0 && (
            <View style={{ alignItems: 'center', marginTop: 40 }}>
              <Text style={[commonStyles.textLight, { fontSize: fontSizes.lg, marginBottom: spacing.xs }]}>
                Aucun produit trouvé
              </Text>
              <Text style={[commonStyles.textLight, { fontSize: fontSizes.md }]}>
                {searchQuery ? 'Essayez un autre terme de recherche' : 'Commencez par ajouter votre premier produit'}
              </Text>
            </View>
          )}
        </ScrollView>
      </View>

      {/* Add/Edit Product Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={commonStyles.modalOverlay}>
          <View style={commonStyles.modalContent}>
            <View style={[commonStyles.row, { marginBottom: spacing.lg }]}>
              <Text style={commonStyles.subtitle}>
                {editingProduct ? '✏️ Modifier le produit' : '➕ Ajouter un produit'}
              </Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Icon name="close" size={24} color={colors.textLight} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={{ marginBottom: spacing.md }}>
                <Text style={[commonStyles.text, { marginBottom: spacing.xs, fontWeight: '600' }]}>
                  📝 Nom du produit *
                </Text>
                <TextInput
                  style={commonStyles.input}
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                  placeholder="Ex: iPhone 15 Pro"
                />
              </View>

              <View style={{ marginBottom: spacing.md }}>
                <Text style={[commonStyles.text, { marginBottom: spacing.xs, fontWeight: '600' }]}>
                  📄 Description
                </Text>
                <TextInput
                  style={[commonStyles.input, { height: 80, textAlignVertical: 'top' }]}
                  value={formData.description}
                  onChangeText={(text) => setFormData({ ...formData, description: text })}
                  placeholder="Description détaillée du produit..."
                  multiline
                />
              </View>

              {/* Category Selection */}
              <View style={{ marginBottom: spacing.md }}>
                <Text style={[commonStyles.text, { marginBottom: spacing.xs, fontWeight: '600' }]}>
                  📦 Catégorie *
                </Text>
                <TouchableOpacity
                  style={[commonStyles.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
                  onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
                >
                  <Text style={{ color: formData.categoryId ? colors.text : colors.textLight }}>
                    {formData.categoryId ? getCategoryName(formData.categoryId) : 'Sélectionner une catégorie'}
                  </Text>
                  <Icon name={showCategoryDropdown ? "chevron-up" : "chevron-down"} size={20} color={colors.textLight} />
                </TouchableOpacity>
                
                {showCategoryDropdown && (
                  <View style={[commonStyles.card, { marginTop: spacing.xs, maxHeight: 200 }]}>
                    <ScrollView>
                      {categories.filter(cat => cat.isActive).map(category => (
                        <TouchableOpacity
                          key={category.id}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            padding: spacing.sm,
                            borderBottomWidth: 1,
                            borderBottomColor: colors.border,
                          }}
                          onPress={() => {
                            setFormData({ ...formData, categoryId: category.id });
                            setShowCategoryDropdown(false);
                          }}
                        >
                          <View style={{
                            width: 12,
                            height: 12,
                            borderRadius: 6,
                            backgroundColor: category.color,
                            marginRight: spacing.sm
                          }} />
                          <Text style={commonStyles.text}>{category.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* Pricing Section */}
              <Text style={[commonStyles.text, { marginBottom: spacing.sm, fontWeight: '600', fontSize: fontSizes.lg }]}>
                💰 Tarification
              </Text>

              <View style={{ marginBottom: spacing.md }}>
                <Text style={[commonStyles.text, { marginBottom: spacing.xs, fontWeight: '600' }]}>
                  🏷️ Prix de détail *
                </Text>
                <TextInput
                  style={commonStyles.input}
                  value={formData.retailPrice}
                  onChangeText={(text) => setFormData({ ...formData, retailPrice: text })}
                  placeholder="0"
                  keyboardType="numeric"
                />
              </View>

              <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
                <View style={{ flex: 1 }}>
                  <Text style={[commonStyles.text, { marginBottom: spacing.xs, fontWeight: '600' }]}>
                    📦 Prix de gros
                  </Text>
                  <TextInput
                    style={commonStyles.input}
                    value={formData.wholesalePrice}
                    onChangeText={(text) => setFormData({ ...formData, wholesalePrice: text })}
                    placeholder="0"
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[commonStyles.text, { marginBottom: spacing.xs, fontWeight: '600' }]}>
                    📊 Qté min. gros
                  </Text>
                  <TextInput
                    style={commonStyles.input}
                    value={formData.wholesaleMinQuantity}
                    onChangeText={(text) => setFormData({ ...formData, wholesaleMinQuantity: text })}
                    placeholder="0"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
                <View style={{ flex: 1 }}>
                  <Text style={[commonStyles.text, { marginBottom: spacing.xs, fontWeight: '600' }]}>
                    🎉 Prix promotionnel
                  </Text>
                  <TextInput
                    style={commonStyles.input}
                    value={formData.promotionalPrice}
                    onChangeText={(text) => setFormData({ ...formData, promotionalPrice: text })}
                    placeholder="0"
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[commonStyles.text, { marginBottom: spacing.xs, fontWeight: '600' }]}>
                    📅 Valide jusqu'au
                  </Text>
                  <TextInput
                    style={commonStyles.input}
                    value={formData.promotionalValidUntil}
                    onChangeText={(text) => setFormData({ ...formData, promotionalValidUntil: text })}
                    placeholder="YYYY-MM-DD"
                  />
                </View>
              </View>

              <View style={{ marginBottom: spacing.md }}>
                <Text style={[commonStyles.text, { marginBottom: spacing.xs, fontWeight: '600' }]}>
                  🏷️ Prix d'achat
                </Text>
                <TextInput
                  style={commonStyles.input}
                  value={formData.cost}
                  onChangeText={(text) => setFormData({ ...formData, cost: text })}
                  placeholder="0"
                  keyboardType="numeric"
                />
              </View>

              <View style={{ marginBottom: spacing.md }}>
                <Text style={[commonStyles.text, { marginBottom: spacing.xs, fontWeight: '600' }]}>
                  🏷️ Code-barres
                </Text>
                <TextInput
                  style={commonStyles.input}
                  value={formData.barcode}
                  onChangeText={(text) => setFormData({ ...formData, barcode: text })}
                  placeholder="Code-barres ou référence produit"
                />
              </View>

              <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg }}>
                <View style={{ flex: 1 }}>
                  <Text style={[commonStyles.text, { marginBottom: spacing.xs, fontWeight: '600' }]}>
                    📊 Stock initial
                  </Text>
                  <TextInput
                    style={commonStyles.input}
                    value={formData.stock}
                    onChangeText={(text) => setFormData({ ...formData, stock: text })}
                    placeholder="0"
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[commonStyles.text, { marginBottom: spacing.xs, fontWeight: '600' }]}>
                    ⚠️ Stock minimum
                  </Text>
                  <TextInput
                    style={commonStyles.input}
                    value={formData.minStock}
                    onChangeText={(text) => setFormData({ ...formData, minStock: text })}
                    placeholder="0"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[buttonStyles.primary, { marginBottom: spacing.sm }]}
                onPress={saveProduct}
              >
                <Text style={{ color: colors.secondary, fontSize: fontSizes.md, fontWeight: '600' }}>
                  {editingProduct ? '✅ Modifier le produit' : '➕ Ajouter le produit'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={buttonStyles.outline}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={{ color: colors.primary, fontSize: fontSizes.md, fontWeight: '600' }}>
                  ❌ Annuler
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
