
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { commonStyles, colors, buttonStyles, spacing, fontSizes, isSmallScreen } from '../../styles/commonStyles';
import Icon from '../../components/Icon';
import { getCustomers, storeCustomers, getSettings, getSales } from '../../utils/storage';
import { Customer, AppSettings, Sale } from '../../types';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import uuid from 'react-native-uuid';

export default function CustomersScreen() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
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
      const [customersData, salesData, settingsData] = await Promise.all([
        getCustomers(),
        getSales(),
        getSettings(),
      ]);
      setCustomers(customersData);
      setSales(salesData);
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

  const formatCurrency = (amount: number): string => {
    const currency = settings?.currency || 'XOF';
    const currencySymbols = { XOF: 'F CFA', USD: '$', EUR: '€' };
    return `${amount.toLocaleString()} ${currencySymbols[currency]}`;
  };

  // Calculate summary statistics
  const calculateSummary = () => {
    let totalGave = 0; // J'ai donné (debts)
    let totalTook = 0; // J'ai pris (payments)

    customers.forEach(customer => {
      const customerSales = sales.filter(sale => sale.customerId === customer.id);
      
      customerSales.forEach(sale => {
        if (sale.paymentStatus === 'credit') {
          totalGave += sale.total; // Debt
        } else if (sale.paymentStatus === 'paid') {
          totalTook += sale.total; // Payment
        }
      });
    });

    return { totalGave, totalTook };
  };

  const getCustomerLastOperation = (customer: Customer) => {
    const customerSales = sales.filter(sale => sale.customerId === customer.id);
    if (customerSales.length === 0) return null;
    
    const lastSale = customerSales.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];
    
    return new Date(lastSale.createdAt);
  };

  const getCustomerBalance = (customer: Customer) => {
    const customerSales = sales.filter(sale => sale.customerId === customer.id);
    let balance = 0;
    
    customerSales.forEach(sale => {
      if (sale.paymentStatus === 'credit') {
        balance += sale.total; // Debt increases balance
      } else if (sale.paymentStatus === 'paid') {
        balance -= sale.total; // Payment decreases balance
      }
    });
    
    return balance;
  };

  const getBalanceColor = (balance: number): string => {
    if (balance > 0) return colors.danger; // Red for debt
    if (balance === 0) return colors.success; // Green for zero balance
    return colors.success; // Green for credit (negative balance)
  };

  const getBalanceLabel = (balance: number): string => {
    if (balance > 0) return "J'ai donné";
    if (balance === 0) return "J'ai pris"; // Show as "J'ai pris" when balanced
    return "J'ai pris";
  };

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

  const { totalGave, totalTook } = calculateSummary();

  return (
    <SafeAreaView style={commonStyles.container}>
      <View style={commonStyles.content}>
        {/* Header */}
        <View style={[commonStyles.section, commonStyles.header]}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: spacing.md }}>
            <Icon name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[commonStyles.title, { color: colors.primary, textAlign: 'center' }]}>
              CLIENTS
            </Text>
          </View>
          <View style={{ width: 24 }} />
        </View>

        {/* Summary Section */}
        <View style={[commonStyles.section, { backgroundColor: colors.background, padding: spacing.lg }]}>
          <Text style={[commonStyles.text, { 
            color: colors.primary, 
            fontSize: fontSizes.md, 
            marginBottom: spacing.md 
          }]}>
            J'ai donné
          </Text>
          <Text style={[commonStyles.title, { 
            color: totalGave === 0 ? colors.success : colors.danger, 
            fontSize: fontSizes.xl,
            fontWeight: 'bold',
            marginBottom: spacing.sm
          }]}>
            {formatCurrency(totalGave)}
          </Text>
          <Text style={[commonStyles.textLight, { fontSize: fontSizes.sm }]}>
            J'ai pris: <Text style={{ color: totalTook === 0 ? colors.success : colors.success }}>
              {formatCurrency(totalTook)}
            </Text>
          </Text>
        </View>

        {/* Clients Section */}
        <View style={[commonStyles.section, { flex: 1 }]}>
          <Text style={[commonStyles.text, { 
            color: colors.primary, 
            fontSize: fontSizes.md, 
            marginBottom: spacing.md,
            paddingHorizontal: spacing.lg 
          }]}>
            Clients ({filteredCustomers.length})
          </Text>

          {/* Search and Filter */}
          <View style={[commonStyles.row, { paddingHorizontal: spacing.lg, marginBottom: spacing.md, gap: spacing.sm }]}>
            <View style={[commonStyles.input, { flex: 1, flexDirection: 'row', alignItems: 'center' }]}>
              <Icon name="search" size={20} color={colors.textLight} style={{ marginRight: spacing.sm }} />
              <TextInput
                style={{ flex: 1, fontSize: fontSizes.md }}
                placeholder="Recherche"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
            <TouchableOpacity style={{
              backgroundColor: colors.primary + '20',
              borderRadius: 10,
              padding: spacing.sm,
              minWidth: 44,
              alignItems: 'center',
            }}>
              <Icon name="options" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Customers List */}
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 100 }}>
            {filteredCustomers.map(customer => {
              const lastOperation = getCustomerLastOperation(customer);
              const balance = getCustomerBalance(customer);
              const initial = customer.name.charAt(0).toUpperCase();
              
              return (
                <TouchableOpacity
                  key={customer.id}
                  style={[commonStyles.card, { marginBottom: spacing.sm }]}
                  onPress={() => router.push(`/customer-details?customerId=${customer.id}`)}
                >
                  <View style={[commonStyles.row, { alignItems: 'center' }]}>
                    {/* Customer Initial */}
                    <View style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: colors.primary + '20',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: spacing.md,
                    }}>
                      <Text style={[commonStyles.text, { 
                        color: colors.primary, 
                        fontWeight: 'bold',
                        fontSize: fontSizes.lg
                      }]}>
                        {initial}
                      </Text>
                    </View>

                    {/* Customer Info */}
                    <View style={{ flex: 1 }}>
                      <Text style={[commonStyles.text, { fontWeight: '600', marginBottom: spacing.xs }]}>
                        {customer.name}
                      </Text>
                      <Text style={[commonStyles.textLight, { fontSize: fontSizes.sm }]}>
                        {lastOperation 
                          ? formatDistanceToNow(lastOperation, { addSuffix: true, locale: fr })
                          : 'Aucune opération'
                        }
                      </Text>
                    </View>

                    {/* Balance */}
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[commonStyles.text, { 
                        color: getBalanceColor(balance),
                        fontSize: fontSizes.md,
                        fontWeight: 'bold',
                        marginBottom: spacing.xs
                      }]}>
                        {balance === 0 ? formatCurrency(0) : formatCurrency(Math.abs(balance))}
                      </Text>
                      <Text style={[commonStyles.textLight, { fontSize: fontSizes.xs }]}>
                        {getBalanceLabel(balance)}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}

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

        {/* Floating Add Button */}
        <TouchableOpacity
          style={{
            position: 'absolute',
            bottom: 20,
            right: 20,
            backgroundColor: colors.primary,
            borderRadius: 30,
            width: 60,
            height: 60,
            alignItems: 'center',
            justifyContent: 'center',
            elevation: 5,
            shadowColor: colors.text,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 4,
          }}
          onPress={openAddModal}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Icon name="person-add" size={24} color={colors.secondary} />
          </View>
        </TouchableOpacity>
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
