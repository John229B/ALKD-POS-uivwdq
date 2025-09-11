
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { commonStyles, colors, buttonStyles, spacing, fontSizes, isSmallScreen } from '../../styles/commonStyles';
import Icon from '../../components/Icon';
import { getCustomers, storeCustomers, getSettings } from '../../utils/storage';
import { Customer, AppSettings } from '../../types';
import uuid from 'react-native-uuid';

export default function CustomersScreen() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      console.log('Loading customers data...');
      const [customersData, settingsData] = await Promise.all([
        getCustomers(),
        getSettings(),
      ]);
      setCustomers(customersData);
      setSettings(settingsData);
      console.log(`Loaded ${customersData.length} customers`);
    } catch (error) {
      console.error('Error loading customers data:', error);
    }
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.phone?.includes(searchQuery) ||
    customer.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      address: '',
    });
    setEditingCustomer(null);
  };

  const openAddModal = () => {
    console.log('Opening add customer modal');
    resetForm();
    setShowAddModal(true);
  };

  const openEditModal = (customer: Customer) => {
    console.log('Opening edit modal for customer:', customer.name);
    setFormData({
      name: customer.name,
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
    });
    setEditingCustomer(customer);
    setShowAddModal(true);
  };

  const saveCustomer = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Erreur', 'Le nom du client est obligatoire');
      return;
    }

    try {
      let updatedCustomers: Customer[];

      if (editingCustomer) {
        console.log('Updating existing customer:', editingCustomer.id);
        const updatedCustomer: Customer = {
          ...editingCustomer,
          name: formData.name.trim(),
          phone: formData.phone.trim() || undefined,
          email: formData.email.trim() || undefined,
          address: formData.address.trim() || undefined,
          updatedAt: new Date(),
        };

        updatedCustomers = customers.map(c => 
          c.id === editingCustomer.id ? updatedCustomer : c
        );
      } else {
        console.log('Adding new customer');
        const newCustomer: Customer = {
          id: uuid.v4() as string,
          name: formData.name.trim(),
          phone: formData.phone.trim() || undefined,
          email: formData.email.trim() || undefined,
          address: formData.address.trim() || undefined,
          creditBalance: 0,
          totalPurchases: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        updatedCustomers = [...customers, newCustomer];
      }

      await storeCustomers(updatedCustomers);
      setCustomers(updatedCustomers);
      setShowAddModal(false);
      resetForm();

      Alert.alert(
        'Succès',
        editingCustomer ? 'Client modifié avec succès' : 'Client ajouté avec succès'
      );
    } catch (error) {
      console.error('Error saving customer:', error);
      Alert.alert('Erreur', 'Erreur lors de la sauvegarde du client');
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

  return (
    <SafeAreaView style={commonStyles.container}>
      <View style={commonStyles.content}>
        {/* Header */}
        <View style={[commonStyles.section, commonStyles.header]}>
          <View style={{ flex: 1 }}>
            <Text style={commonStyles.title}>Gestion des Clients</Text>
            <Text style={[commonStyles.textLight, { fontSize: fontSizes.sm }]}>
              {filteredCustomers.length} client(s)
            </Text>
          </View>
          <TouchableOpacity
            style={[buttonStyles.primary, isSmallScreen ? buttonStyles.small : {}]}
            onPress={openAddModal}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <Icon name="person-add" size={20} color={colors.secondary} />
              <Text style={{ color: colors.secondary, fontWeight: '600', fontSize: isSmallScreen ? fontSizes.sm : fontSizes.md }}>
                {isSmallScreen ? 'Ajouter' : 'Ajouter client'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={commonStyles.section}>
          <TextInput
            style={commonStyles.input}
            placeholder="Rechercher par nom, téléphone ou email..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Customers List */}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xl }}>
          {filteredCustomers.map(customer => (
            <View key={customer.id} style={[commonStyles.card, { marginBottom: spacing.sm }]}>
              {/* Customer Header */}
              <View style={[commonStyles.row, { marginBottom: spacing.xs, alignItems: 'flex-start' }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[commonStyles.text, { fontWeight: '600', marginBottom: spacing.xs }]}>
                    {customer.name}
                  </Text>
                  <View style={{ gap: 2 }}>
                    {customer.phone && (
                      <Text style={[commonStyles.textLight, { fontSize: fontSizes.sm }]}>
                        📞 {customer.phone}
                      </Text>
                    )}
                    {customer.email && (
                      <Text style={[commonStyles.textLight, { fontSize: fontSizes.sm }]}>
                        ✉️ {customer.email}
                      </Text>
                    )}
                    {customer.address && (
                      <Text style={[commonStyles.textLight, { fontSize: fontSizes.sm }]}>
                        📍 {customer.address}
                      </Text>
                    )}
                  </View>
                </View>
                <TouchableOpacity
                  style={[buttonStyles.outline, buttonStyles.small]}
                  onPress={() => openEditModal(customer)}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                    <Icon name="create" size={14} color={colors.primary} />
                    <Text style={{ color: colors.primary, fontSize: fontSizes.xs }}>Modifier</Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Customer Stats */}
              <View style={[commonStyles.row, { paddingTop: spacing.xs, borderTopWidth: 1, borderTopColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[commonStyles.textLight, { fontSize: fontSizes.xs }]}>
                    💰 Total achats: {formatCurrency(customer.totalPurchases)}
                  </Text>
                  {customer.creditBalance > 0 && (
                    <Text style={[commonStyles.textLight, { fontSize: fontSizes.xs, color: colors.danger }]}>
                      📋 Crédit: {formatCurrency(customer.creditBalance)}
                    </Text>
                  )}
                </View>
                <Text style={[commonStyles.textLight, { fontSize: fontSizes.xs }]}>
                  Client depuis {new Date(customer.createdAt).toLocaleDateString('fr-FR')}
                </Text>
              </View>
            </View>
          ))}

          {filteredCustomers.length === 0 && (
            <View style={{ alignItems: 'center', marginTop: 40 }}>
              <Text style={[commonStyles.textLight, { fontSize: fontSizes.lg, marginBottom: spacing.xs }]}>
                Aucun client trouvé
              </Text>
              <Text style={[commonStyles.textLight, { fontSize: fontSizes.md }]}>
                {searchQuery ? 'Essayez un autre terme de recherche' : 'Commencez par ajouter votre premier client'}
              </Text>
            </View>
          )}
        </ScrollView>
      </View>

      {/* Add/Edit Customer Modal */}
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
                {editingCustomer ? '✏️ Modifier le client' : '👤 Ajouter un client'}
              </Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Icon name="close" size={24} color={colors.textLight} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={{ marginBottom: spacing.md }}>
                <Text style={[commonStyles.text, { marginBottom: spacing.xs, fontWeight: '600' }]}>
                  👤 Nom complet *
                </Text>
                <TextInput
                  style={commonStyles.input}
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                  placeholder="Ex: Jean Dupont"
                />
              </View>

              <View style={{ marginBottom: spacing.md }}>
                <Text style={[commonStyles.text, { marginBottom: spacing.xs, fontWeight: '600' }]}>
                  📞 Téléphone
                </Text>
                <TextInput
                  style={commonStyles.input}
                  value={formData.phone}
                  onChangeText={(text) => setFormData({ ...formData, phone: text })}
                  placeholder="Ex: +225 01 02 03 04 05"
                  keyboardType="phone-pad"
                />
              </View>

              <View style={{ marginBottom: spacing.md }}>
                <Text style={[commonStyles.text, { marginBottom: spacing.xs, fontWeight: '600' }]}>
                  ✉️ Email
                </Text>
                <TextInput
                  style={commonStyles.input}
                  value={formData.email}
                  onChangeText={(text) => setFormData({ ...formData, email: text })}
                  placeholder="Ex: jean.dupont@email.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={{ marginBottom: spacing.lg }}>
                <Text style={[commonStyles.text, { marginBottom: spacing.xs, fontWeight: '600' }]}>
                  📍 Adresse
                </Text>
                <TextInput
                  style={[commonStyles.input, { height: 80, textAlignVertical: 'top' }]}
                  value={formData.address}
                  onChangeText={(text) => setFormData({ ...formData, address: text })}
                  placeholder="Adresse complète du client..."
                  multiline
                />
              </View>

              <TouchableOpacity
                style={[buttonStyles.primary, { marginBottom: spacing.sm }]}
                onPress={saveCustomer}
              >
                <Text style={{ color: colors.secondary, fontSize: fontSizes.md, fontWeight: '600' }}>
                  {editingCustomer ? '✅ Modifier le client' : '➕ Ajouter le client'}
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
