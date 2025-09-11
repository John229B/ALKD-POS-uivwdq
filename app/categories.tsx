
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { commonStyles, colors, buttonStyles } from '../styles/commonStyles';
import { getCategories, storeCategories } from '../utils/storage';
import { Category } from '../types';
import Icon from '../components/Icon';
import uuid from 'react-native-uuid';

export default function CategoriesScreen() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3498db',
  });

  const colorOptions = [
    '#3498db', '#e74c3c', '#2ecc71', '#f39c12', 
    '#9b59b6', '#1abc9c', '#e67e22', '#34495e'
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      console.log('Loading categories data...');
      const categoriesData = await getCategories();
      setCategories(categoriesData);
      console.log(`Loaded ${categoriesData.length} categories`);
    } catch (error) {
      console.error('Error loading categories data:', error);
    }
  };

  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    category.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      color: '#3498db',
    });
    setEditingCategory(null);
  };

  const openAddModal = () => {
    console.log('Opening add category modal');
    resetForm();
    setShowAddModal(true);
  };

  const openEditModal = (category: Category) => {
    console.log('Opening edit modal for category:', category.name);
    setFormData({
      name: category.name,
      description: category.description || '',
      color: category.color || '#3498db',
    });
    setEditingCategory(category);
    setShowAddModal(true);
  };

  const saveCategory = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir un nom pour la catégorie');
      return;
    }

    // Check for duplicate names (excluding current category if editing)
    const existingCategory = categories.find(cat => 
      cat.name.toLowerCase() === formData.name.trim().toLowerCase() && 
      cat.id !== editingCategory?.id
    );

    if (existingCategory) {
      Alert.alert('Erreur', 'Une catégorie avec ce nom existe déjà');
      return;
    }

    try {
      let updatedCategories: Category[];

      if (editingCategory) {
        console.log('Updating existing category:', editingCategory.id);
        const updatedCategory: Category = {
          ...editingCategory,
          name: formData.name.trim(),
          description: formData.description.trim(),
          color: formData.color,
          updatedAt: new Date(),
        };

        updatedCategories = categories.map(cat => 
          cat.id === editingCategory.id ? updatedCategory : cat
        );
      } else {
        console.log('Adding new category');
        const newCategory: Category = {
          id: uuid.v4() as string,
          name: formData.name.trim(),
          description: formData.description.trim(),
          color: formData.color,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        updatedCategories = [...categories, newCategory];
      }

      await storeCategories(updatedCategories);
      setCategories(updatedCategories);
      setShowAddModal(false);
      resetForm();

      Alert.alert(
        'Succès',
        editingCategory ? 'Catégorie modifiée avec succès' : 'Catégorie ajoutée avec succès'
      );
    } catch (error) {
      console.error('Error saving category:', error);
      Alert.alert('Erreur', 'Erreur lors de la sauvegarde de la catégorie');
    }
  };

  const toggleCategoryStatus = async (category: Category) => {
    try {
      console.log('Toggling status for category:', category.name);
      const updatedCategories = categories.map(cat =>
        cat.id === category.id
          ? { ...cat, isActive: !cat.isActive, updatedAt: new Date() }
          : cat
      );

      await storeCategories(updatedCategories);
      setCategories(updatedCategories);

      Alert.alert(
        'Succès',
        `Catégorie ${category.isActive ? 'désactivée' : 'activée'} avec succès`
      );
    } catch (error) {
      console.error('Error toggling category status:', error);
      Alert.alert('Erreur', 'Erreur lors de la modification du statut');
    }
  };

  const deleteCategory = async (category: Category) => {
    Alert.alert(
      'Confirmer la suppression',
      `Êtes-vous sûr de vouloir supprimer la catégorie "${category.name}" ?\n\nAttention: Cette action est irréversible.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('Deleting category:', category.id);
              const updatedCategories = categories.filter(cat => cat.id !== category.id);
              await storeCategories(updatedCategories);
              setCategories(updatedCategories);
              Alert.alert('Succès', 'Catégorie supprimée avec succès');
            } catch (error) {
              console.error('Error deleting category:', error);
              Alert.alert('Erreur', 'Erreur lors de la suppression');
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={commonStyles.container}>
      <View style={commonStyles.content}>
        {/* Header */}
        <View style={[commonStyles.section, commonStyles.row]}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ marginRight: 16 }}
          >
            <Icon name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={commonStyles.title}>Gestion des Catégories</Text>
            <Text style={[commonStyles.textLight, { fontSize: 14 }]}>
              {filteredCategories.length} catégorie(s)
            </Text>
          </View>
          <TouchableOpacity
            style={[buttonStyles.primary, { paddingHorizontal: 16, paddingVertical: 8 }]}
            onPress={openAddModal}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Icon name="add" size={20} color={colors.secondary} />
              <Text style={{ color: colors.secondary, fontWeight: '600' }}>Ajouter</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={commonStyles.section}>
          <TextInput
            style={commonStyles.input}
            placeholder="Rechercher une catégorie..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Categories List */}
        <ScrollView style={{ flex: 1, paddingHorizontal: 20 }}>
          {filteredCategories.map(category => (
            <View key={category.id} style={[commonStyles.card, { marginBottom: 12, opacity: category.isActive ? 1 : 0.6 }]}>
              {/* Category Header */}
              <View style={[commonStyles.row, { marginBottom: 8 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <View style={{
                    width: 16,
                    height: 16,
                    borderRadius: 8,
                    backgroundColor: category.color || '#3498db',
                    marginRight: 12
                  }} />
                  <View style={{ flex: 1 }}>
                    <Text style={[commonStyles.text, { fontWeight: '600', marginBottom: 4 }]}>
                      {category.name}
                      {!category.isActive && <Text style={{ color: colors.danger }}> (Inactive)</Text>}
                    </Text>
                    {category.description && (
                      <Text style={[commonStyles.textLight, { fontSize: 12 }]}>
                        {category.description}
                      </Text>
                    )}
                  </View>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={[commonStyles.row, { gap: 8, marginTop: 12 }]}>
                <TouchableOpacity
                  style={[buttonStyles.outline, { flex: 1, paddingVertical: 8 }]}
                  onPress={() => openEditModal(category)}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                    <Icon name="create" size={16} color={colors.primary} />
                    <Text style={{ color: colors.primary, fontSize: 12 }}>Modifier</Text>
                  </View>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    buttonStyles.outline,
                    { flex: 1, paddingVertical: 8 },
                    { borderColor: category.isActive ? colors.danger : colors.success }
                  ]}
                  onPress={() => toggleCategoryStatus(category)}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                    <Icon 
                      name={category.isActive ? "close" : "checkmark"} 
                      size={16} 
                      color={category.isActive ? colors.danger : colors.success} 
                    />
                    <Text style={{ 
                      color: category.isActive ? colors.danger : colors.success, 
                      fontSize: 12 
                    }}>
                      {category.isActive ? 'Désactiver' : 'Activer'}
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[buttonStyles.outline, { paddingVertical: 8, paddingHorizontal: 12, borderColor: colors.danger }]}
                  onPress={() => deleteCategory(category)}
                >
                  <Icon name="trash" size={16} color={colors.danger} />
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {filteredCategories.length === 0 && (
            <View style={{ alignItems: 'center', marginTop: 40 }}>
              <Text style={[commonStyles.textLight, { fontSize: 16, marginBottom: 8 }]}>
                Aucune catégorie trouvée
              </Text>
              <Text style={[commonStyles.textLight, { fontSize: 14 }]}>
                {searchQuery ? 'Essayez un autre terme de recherche' : 'Commencez par ajouter votre première catégorie'}
              </Text>
            </View>
          )}
        </ScrollView>
      </View>

      {/* Add/Edit Category Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={[commonStyles.card, { width: '90%', maxWidth: 500 }]}>
            <View style={[commonStyles.row, { marginBottom: 20 }]}>
              <Text style={commonStyles.subtitle}>
                {editingCategory ? '✏️ Modifier la catégorie' : '➕ Ajouter une catégorie'}
              </Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Icon name="close" size={24} color={colors.textLight} />
              </TouchableOpacity>
            </View>

            <ScrollView>
              <View style={{ marginBottom: 16 }}>
                <Text style={[commonStyles.text, { marginBottom: 8, fontWeight: '600' }]}>
                  📝 Nom de la catégorie *
                </Text>
                <TextInput
                  style={commonStyles.input}
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                  placeholder="Ex: Électronique, Vêtements, Alimentation..."
                />
              </View>

              <View style={{ marginBottom: 16 }}>
                <Text style={[commonStyles.text, { marginBottom: 8, fontWeight: '600' }]}>
                  📄 Description
                </Text>
                <TextInput
                  style={[commonStyles.input, { height: 80, textAlignVertical: 'top' }]}
                  value={formData.description}
                  onChangeText={(text) => setFormData({ ...formData, description: text })}
                  placeholder="Description de la catégorie..."
                  multiline
                />
              </View>

              <View style={{ marginBottom: 20 }}>
                <Text style={[commonStyles.text, { marginBottom: 8, fontWeight: '600' }]}>
                  🎨 Couleur
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                  {colorOptions.map(color => (
                    <TouchableOpacity
                      key={color}
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: color,
                        borderWidth: formData.color === color ? 3 : 1,
                        borderColor: formData.color === color ? colors.text : colors.border,
                      }}
                      onPress={() => setFormData({ ...formData, color })}
                    />
                  ))}
                </View>
              </View>

              <TouchableOpacity
                style={[buttonStyles.primary, { marginBottom: 12 }]}
                onPress={saveCategory}
              >
                <Text style={{ color: colors.secondary, fontSize: 16, fontWeight: '600' }}>
                  {editingCategory ? '✅ Modifier la catégorie' : '➕ Ajouter la catégorie'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={buttonStyles.outline}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={{ color: colors.primary, fontSize: 16, fontWeight: '600' }}>
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
