
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { commonStyles, colors, buttonStyles } from '../../styles/commonStyles';
import { getCustomers, storeCustomers, getSettings } from '../../utils/storage';
import { Customer, AppSettings } from '../../types';
import Icon from '../../components/Icon';
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
      const [customersData, settingsData] = await Promise.all([
        getCustomers(),
        getSettings(),
      ]);
      setCustomers(customersData);
      setSettings(settingsData);
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
    resetForm();
    setShowAddModal(true);
  };

  const openEditModal = (customer: Customer) => {
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
        // Update existing customer
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
        // Add new customer
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
    // Handle undefined, null, or invalid numbers
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
        <View style={[commonStyles.section, commonStyles.row]}>
          <Text style={commonStyles.title}>Clients</Text>
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
            placeholder="Rechercher un client..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Customers List */}
        <ScrollView style={{ flex: 1, paddingHorizontal: 20 }}>
          {filteredCustomers.map(customer => (
            <TouchableOpacity
              key={customer.id}
              style={[commonStyles.card, { marginBottom: 12 }]}
              onPress={() => openEditModal(customer)}
            >
              <View style={[commonStyles.row, { marginBottom: 8 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[commonStyles.text, { fontWeight: '600', marginBottom: 4 }]}>
                    {customer.name}
                  </Text>
                  {customer.phone && (
                    <Text style={[commonStyles.textLight, { marginBottom: 2 }]}>
                      📞 {customer.phone}
                    </Text>
                  )}
                  {customer.email && (
                    <Text style={[commonStyles.textLight, { marginBottom: 2 }]}>
                      ✉️ {customer.email}
                    </Text>
                  )}
                  {customer.address && (
                    <Text style={[commonStyles.textLight, { fontSize: 12 }]}>
                      📍 {customer.address}
                    </Text>
                  )}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[commonStyles.textLight, { fontSize: 12, marginBottom: 4 }]}>
                    Achats totaux
                  </Text>
                  <Text style={[commonStyles.text, { fontWeight: '600', color: colors.success }]}>
                    {formatCurrency(customer.totalPurchases)}
                  </Text>
                  {customer.creditBalance > 0 && (
                    <Text style={[commonStyles.text, { fontSize: 12, color: colors.warning, marginTop: 4 }]}>
                      Crédit: {formatCurrency(customer.creditBalance)}
                    </Text>
                  )}
                </View>
              </View>

              <View style={[commonStyles.row, { marginTop: 8 }]}>
                <Text style={[commonStyles.textLight, { fontSize: 12 }]}>
                  Client depuis: {new Date(customer.createdAt).toLocaleDateString()}
                </Text>
                <Icon name="chevron-forward" size={16} color={colors.textLight} />
              </View>
            </TouchableOpacity>
          ))}

          {filteredCustomers.length === 0 && (
            <View style={[commonStyles.center, { marginTop: 50 }]}>
              <Icon name="people" size={48} color={colors.textLight} style={{ marginBottom: 16 }} />
              <Text style={[commonStyles.textLight, { textAlign: 'center' }]}>
                {searchQuery ? 'Aucun client trouvé' : 'Aucun client enregistré'}
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
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={[commonStyles.card, { width: '90%', maxWidth: 400, maxHeight: '80%' }]}>
            <View style={[commonStyles.row, { marginBottom: 20 }]}>
              <Text style={commonStyles.subtitle}>
                {editingCustomer ? 'Modifier le client' : 'Ajouter un client'}
              </Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Icon name="close" size={24} color={colors.textLight} />
              </TouchableOpacity>
            </View>

            <ScrollView>
              <View style={{ marginBottom: 16 }}>
                <Text style={[commonStyles.text, { marginBottom: 8 }]}>Nom complet *</Text>
                <TextInput
                  style={commonStyles.input}
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                  placeholder="Nom complet du client"
                />
              </View>

              <View style={{ marginBottom: 16 }}>
                <Text style={[commonStyles.text, { marginBottom: 8 }]}>Téléphone</Text>
                <TextInput
                  style={commonStyles.input}
                  value={formData.phone}
                  onChangeText={(text) => setFormData({ ...formData, phone: text })}
                  placeholder="Numéro de téléphone"
                  keyboardType="phone-pad"
                />
              </View>

              <View style={{ marginBottom: 16 }}>
                <Text style={[commonStyles.text, { marginBottom: 8 }]}>Email</Text>
                <TextInput
                  style={commonStyles.input}
                  value={formData.email}
                  onChangeText={(text) => setFormData({ ...formData, email: text })}
                  placeholder="Adresse email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={{ marginBottom: 20 }}>
                <Text style={[commonStyles.text, { marginBottom: 8 }]}>Adresse</Text>
                <TextInput
                  style={[commonStyles.input, { height: 80, textAlignVertical: 'top' }]}
                  value={formData.address}
                  onChangeText={(text) => setFormData({ ...formData, address: text })}
                  placeholder="Adresse complète"
                  multiline
                />
              </View>

              <TouchableOpacity
                style={[buttonStyles.primary, { marginBottom: 12 }]}
                onPress={saveCustomer}
              >
                <Text style={{ color: colors.secondary, fontSize: 16, fontWeight: '600' }}>
                  {editingCustomer ? 'Modifier' : 'Ajouter'}
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
