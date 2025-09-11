
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { commonStyles, colors, buttonStyles } from '../../styles/commonStyles';
import { getProducts, storeProducts, getSettings } from '../../utils/storage';
import { Product, AppSettings } from '../../types';
import Icon from '../../components/Icon';
import uuid from 'react-native-uuid';

export default function ProductsScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    cost: '',
    barcode: '',
    category: '',
    stock: '',
    minStock: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [productsData, settingsData] = await Promise.all([
        getProducts(),
        getSettings(),
      ]);
      setProducts(productsData);
      setSettings(settingsData);
    } catch (error) {
      console.error('Error loading products data:', error);
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.barcode?.includes(searchQuery)
  );

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      cost: '',
      barcode: '',
      category: '',
      stock: '',
      minStock: '',
    });
    setEditingProduct(null);
  };

  const openAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  const openEditModal = (product: Product) => {
    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      cost: product.cost.toString(),
      barcode: product.barcode || '',
      category: product.category,
      stock: product.stock.toString(),
      minStock: product.minStock.toString(),
    });
    setEditingProduct(product);
    setShowAddModal(true);
  };

  const saveProduct = async () => {
    if (!formData.name.trim() || !formData.price || !formData.category.trim()) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    const price = parseFloat(formData.price);
    const cost = parseFloat(formData.cost) || 0;
    const stock = parseInt(formData.stock) || 0;
    const minStock = parseInt(formData.minStock) || 0;

    if (price <= 0) {
      Alert.alert('Erreur', 'Le prix doit être supérieur à 0');
      return;
    }

    try {
      let updatedProducts: Product[];

      if (editingProduct) {
        // Update existing product
        const updatedProduct: Product = {
          ...editingProduct,
          name: formData.name.trim(),
          description: formData.description.trim(),
          price,
          cost,
          barcode: formData.barcode.trim() || undefined,
          category: formData.category.trim(),
          stock,
          minStock,
          updatedAt: new Date(),
        };

        updatedProducts = products.map(p => 
          p.id === editingProduct.id ? updatedProduct : p
        );
      } else {
        // Add new product
        const newProduct: Product = {
          id: uuid.v4() as string,
          name: formData.name.trim(),
          description: formData.description.trim(),
          price,
          cost,
          barcode: formData.barcode.trim() || undefined,
          category: formData.category.trim(),
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

  const formatCurrency = (amount: number) => {
    const currency = settings?.currency || 'XOF';
    const currencySymbols = { XOF: 'FCFA', USD: '$', EUR: '€' };
    return `${amount.toLocaleString()} ${currencySymbols[currency]}`;
  };

  const getStockStatus = (product: Product) => {
    if (product.stock <= 0) return { text: 'Rupture', color: colors.danger };
    if (product.stock <= product.minStock) return { text: 'Stock bas', color: colors.warning };
    return { text: 'En stock', color: colors.success };
  };

  return (
    <SafeAreaView style={commonStyles.container}>
      <View style={commonStyles.content}>
        {/* Header */}
        <View style={[commonStyles.section, commonStyles.row]}>
          <Text style={commonStyles.title}>Produits</Text>
          <TouchableOpacity
            style={[buttonStyles.primary, { paddingHorizontal: 16, paddingVertical: 8 }]}
            onPress={openAddModal}
          >
            <Icon name="add" size={20} color={colors.secondary} />
          </TouchableOpacity>
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

        {/* Products List */}
        <ScrollView style={{ flex: 1, paddingHorizontal: 20 }}>
          {filteredProducts.map(product => {
            const stockStatus = getStockStatus(product);
            return (
              <View key={product.id} style={[commonStyles.card, { marginBottom: 12 }]}>
                <View style={[commonStyles.row, { marginBottom: 8 }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[commonStyles.text, { fontWeight: '600', marginBottom: 4 }]}>
                      {product.name}
                    </Text>
                    <Text style={[commonStyles.textLight, { marginBottom: 4 }]}>
                      {product.category}
                    </Text>
                    {product.description && (
                      <Text style={[commonStyles.textLight, { fontSize: 12 }]}>
                        {product.description}
                      </Text>
                    )}
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[commonStyles.text, { fontWeight: '600', color: colors.primary }]}>
                      {formatCurrency(product.price)}
                    </Text>
                    <Text style={[commonStyles.textLight, { fontSize: 12 }]}>
                      Coût: {formatCurrency(product.cost)}
                    </Text>
                  </View>
                </View>

                <View style={[commonStyles.row, { marginBottom: 12 }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[commonStyles.textLight, { fontSize: 12 }]}>
                      Stock: {product.stock} unités
                    </Text>
                    <Text style={[commonStyles.textLight, { fontSize: 12, color: stockStatus.color }]}>
                      {stockStatus.text}
                    </Text>
                  </View>
                  {product.barcode && (
                    <Text style={[commonStyles.textLight, { fontSize: 12 }]}>
                      Code: {product.barcode}
                    </Text>
                  )}
                </View>

                <View style={[commonStyles.row, { gap: 8 }]}>
                  <TouchableOpacity
                    style={[buttonStyles.outline, { flex: 1, paddingVertical: 8 }]}
                    onPress={() => openEditModal(product)}
                  >
                    <Icon name="create" size={16} color={colors.primary} />
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      buttonStyles.outline,
                      { flex: 1, paddingVertical: 8 },
                      { borderColor: product.isActive ? colors.danger : colors.success }
                    ]}
                    onPress={() => toggleProductStatus(product)}
                  >
                    <Icon 
                      name={product.isActive ? "close" : "checkmark"} 
                      size={16} 
                      color={product.isActive ? colors.danger : colors.success} 
                    />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </ScrollView>
      </View>

      {/* Add/Edit Product Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={[commonStyles.card, { width: '90%', maxWidth: 500, maxHeight: '90%' }]}>
            <View style={[commonStyles.row, { marginBottom: 20 }]}>
              <Text style={commonStyles.subtitle}>
                {editingProduct ? 'Modifier le produit' : 'Ajouter un produit'}
              </Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Icon name="close" size={24} color={colors.textLight} />
              </TouchableOpacity>
            </View>

            <ScrollView>
              <View style={{ marginBottom: 16 }}>
                <Text style={[commonStyles.text, { marginBottom: 8 }]}>Nom du produit *</Text>
                <TextInput
                  style={commonStyles.input}
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                  placeholder="Nom du produit"
                />
              </View>

              <View style={{ marginBottom: 16 }}>
                <Text style={[commonStyles.text, { marginBottom: 8 }]}>Description</Text>
                <TextInput
                  style={[commonStyles.input, { height: 80, textAlignVertical: 'top' }]}
                  value={formData.description}
                  onChangeText={(text) => setFormData({ ...formData, description: text })}
                  placeholder="Description du produit"
                  multiline
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[commonStyles.text, { marginBottom: 8 }]}>Prix de vente *</Text>
                  <TextInput
                    style={commonStyles.input}
                    value={formData.price}
                    onChangeText={(text) => setFormData({ ...formData, price: text })}
                    placeholder="0"
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[commonStyles.text, { marginBottom: 8 }]}>Prix d'achat</Text>
                  <TextInput
                    style={commonStyles.input}
                    value={formData.cost}
                    onChangeText={(text) => setFormData({ ...formData, cost: text })}
                    placeholder="0"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={{ marginBottom: 16 }}>
                <Text style={[commonStyles.text, { marginBottom: 8 }]}>Catégorie *</Text>
                <TextInput
                  style={commonStyles.input}
                  value={formData.category}
                  onChangeText={(text) => setFormData({ ...formData, category: text })}
                  placeholder="Catégorie du produit"
                />
              </View>

              <View style={{ marginBottom: 16 }}>
                <Text style={[commonStyles.text, { marginBottom: 8 }]}>Code-barres</Text>
                <TextInput
                  style={commonStyles.input}
                  value={formData.barcode}
                  onChangeText={(text) => setFormData({ ...formData, barcode: text })}
                  placeholder="Code-barres du produit"
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[commonStyles.text, { marginBottom: 8 }]}>Stock initial</Text>
                  <TextInput
                    style={commonStyles.input}
                    value={formData.stock}
                    onChangeText={(text) => setFormData({ ...formData, stock: text })}
                    placeholder="0"
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[commonStyles.text, { marginBottom: 8 }]}>Stock minimum</Text>
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
                style={[buttonStyles.primary, { marginBottom: 12 }]}
                onPress={saveProduct}
              >
                <Text style={{ color: colors.secondary, fontSize: 16, fontWeight: '600' }}>
                  {editingProduct ? 'Modifier' : 'Ajouter'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={buttonStyles.outline}
                onPress={() => setShowAddModal(false)}
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
