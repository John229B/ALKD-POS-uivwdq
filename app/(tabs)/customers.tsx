
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { commonStyles, colors, buttonStyles, spacing, fontSizes, isSmallScreen } from '../../styles/commonStyles';
import Icon from '../../components/Icon';
import CustomerFilterModal from '../../components/CustomerFilterModal';
import { getCustomers, storeCustomers, getSettings, getSales } from '../../utils/storage';
import { Customer, AppSettings, Sale } from '../../types';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import uuid from 'react-native-uuid';

interface FilterOptions {
  filterBy: 'all' | 'gave' | 'took' | 'balanced';
  sortBy: 'recent' | 'old' | 'amount_asc' | 'amount_desc' | 'alphabetical';
}

export default function CustomersScreen() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [filters, setFilters] = useState<FilterOptions>({
    filterBy: 'all',
    sortBy: 'recent'
  });
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
  });

  const loadData = useCallback(async () => {
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
      console.log(`Loaded ${customersData.length} customers and ${salesData.length} sales`);
    } catch (error) {
      console.error('Error loading customers data:', error);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('Customers screen focused, refreshing data...');
      loadData();
    }, [loadData])
  );

  const getCustomerBalance = (customer: Customer) => {
    const customerSales = sales.filter(sale => sale.customerId === customer.id);
    let balance = 0;
    
    customerSales.forEach(sale => {
      if (sale.paymentStatus === 'credit') {
        balance += sale.total; // Debt increases balance (J'ai donné)
      } else if (sale.paymentStatus === 'paid') {
        balance -= sale.total; // Payment decreases balance (J'ai pris)
      }
    });
    
    console.log(`Customer ${customer.name} balance:`, { 
      balance, 
      salesCount: customerSales.length,
      sales: customerSales.map(s => ({ status: s.paymentStatus, total: s.total }))
    });
    
    return balance;
  };

  const getCustomerLastOperation = (customer: Customer) => {
    const customerSales = sales.filter(sale => sale.customerId === customer.id);
    if (customerSales.length === 0) return null;
    
    const lastSale = customerSales.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];
    
    return new Date(lastSale.createdAt);
  };

  // Filter and sort customers based on current filters
  const getFilteredAndSortedCustomers = () => {
    let filtered = customers.filter(customer =>
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.phone?.includes(searchQuery) ||
      customer.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Apply filters
    if (filters.filterBy !== 'all') {
      filtered = filtered.filter(customer => {
        const balance = getCustomerBalance(customer);
        
        switch (filters.filterBy) {
          case 'gave':
            return balance > 0; // Customer owes money (debt)
          case 'took':
            return balance < 0; // Customer has credit
          case 'balanced':
            return balance === 0; // Customer is balanced
          default:
            return true;
        }
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case 'recent':
          const lastOpA = getCustomerLastOperation(a);
          const lastOpB = getCustomerLastOperation(b);
          if (!lastOpA && !lastOpB) return 0;
          if (!lastOpA) return 1;
          if (!lastOpB) return -1;
          return lastOpB.getTime() - lastOpA.getTime();
        
        case 'old':
          const lastOpA2 = getCustomerLastOperation(a);
          const lastOpB2 = getCustomerLastOperation(b);
          if (!lastOpA2 && !lastOpB2) return 0;
          if (!lastOpA2) return 1;
          if (!lastOpB2) return -1;
          return lastOpA2.getTime() - lastOpB2.getTime();
        
        case 'amount_asc':
          return Math.abs(getCustomerBalance(a)) - Math.abs(getCustomerBalance(b));
        
        case 'amount_desc':
          return Math.abs(getCustomerBalance(b)) - Math.abs(getCustomerBalance(a));
        
        case 'alphabetical':
          return a.name.localeCompare(b.name);
        
        default:
          return 0;
      }
    });

    return filtered;
  };

  const filteredCustomers = getFilteredAndSortedCustomers();

  const formatCurrency = (amount: number): string => {
    const currency = settings?.currency || 'XOF';
    const currencySymbols = { XOF: 'F CFA', USD: '$', EUR: '€' };
    return `${amount.toLocaleString()} ${currencySymbols[currency]}`;
  };

  // Calculate summary statistics based on actual customer balances
  const calculateSummary = () => {
    let totalGave = 0; // J'ai donné (total debts)
    let totalTook = 0; // J'ai pris (total payments)

    // Calculate from each customer's balance
    customers.forEach(customer => {
      const customerSales = sales.filter(sale => sale.customerId === customer.id);
      let customerBalance = 0;
      
      customerSales.forEach(sale => {
        if (sale.paymentStatus === 'credit') {
          customerBalance += sale.total; // Debt increases balance
        } else if (sale.paymentStatus === 'paid') {
          customerBalance -= sale.total; // Payment decreases balance
        }
      });

      // Sum up the totals for general balance
      if (customerBalance > 0) {
        totalGave += customerBalance; // Customer owes money (J'ai donné)
      } else if (customerBalance < 0) {
        totalTook += Math.abs(customerBalance); // Customer has credit (J'ai pris)
      }
    });

    console.log('Summary calculation:', { totalGave, totalTook, customersCount: customers.length, salesCount: sales.length });
    return { totalGave, totalTook };
  };

  const getBalanceColor = (balance: number): string => {
    if (balance > 0) return colors.danger; // Red for debt
    if (balance === 0) return colors.success; // Green for zero balance
    return colors.success; // Green for credit (negative balance)
  };

  const getBalanceLabel = (balance: number): string => {
    if (balance > 0) return "Dette";
    if (balance === 0) return "Équilibré";
    return "Crédit";
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

  const deleteCustomer = (customer: Customer) => {
    Alert.alert(
      'Supprimer le client',
      `Êtes-vous sûr de vouloir supprimer définitivement ${customer.name} ?\n\nCette action est irréversible et supprimera également toutes les transactions associées.`,
      [
        {
          text: 'Annuler',
          style: 'cancel',
        },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('Deleting customer:', customer.id);
              
              // Remove customer from customers list
              const updatedCustomers = customers.filter(c => c.id !== customer.id);
              
              // Remove all sales associated with this customer
              const updatedSales = sales.filter(sale => sale.customerId !== customer.id);
              
              // Save updated data
              await Promise.all([
                storeCustomers(updatedCustomers),
                require('../../utils/storage').storeSales(updatedSales),
              ]);
              
              // Update local state
              setCustomers(updatedCustomers);
              setSales(updatedSales);
              
              Alert.alert('Succès', 'Client supprimé avec succès');
            } catch (error) {
              console.error('Error deleting customer:', error);
              Alert.alert('Erreur', 'Erreur lors de la suppression du client');
            }
          },
        },
      ]
    );
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

  const handleApplyFilters = (newFilters: FilterOptions) => {
    console.log('Applying new filters:', newFilters);
    setFilters(newFilters);
  };

  const { totalGave, totalTook } = calculateSummary();
  const generalBalance = totalGave - totalTook; // Positive = overall debt, Negative = overall credit, Zero = balanced
  
  console.log('General balance calculation:', { 
    totalGave, 
    totalTook, 
    generalBalance,
    customersCount: customers.length,
    salesCount: sales.length 
  });

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
            Solde général
          </Text>
          <Text style={[commonStyles.title, { 
            color: generalBalance > 0 ? colors.danger : generalBalance === 0 ? colors.success : colors.success, 
            fontSize: fontSizes.xl,
            fontWeight: 'bold',
            marginBottom: spacing.sm
          }]}>
            {formatCurrency(generalBalance === 0 ? 0 : Math.abs(generalBalance))}
          </Text>
          <Text style={[commonStyles.textLight, { fontSize: fontSizes.sm }]}>
            J'ai donné: <Text style={{ color: totalGave === 0 ? colors.success : colors.danger }}>
              {formatCurrency(totalGave)}
            </Text>
            {' • '}
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
            <TouchableOpacity 
              style={{
                backgroundColor: colors.primary + '20',
                borderRadius: 10,
                padding: spacing.sm,
                minWidth: 44,
                alignItems: 'center',
              }}
              onPress={() => setShowFilterModal(true)}
            >
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
                  onLongPress={() => {
                    Alert.alert(
                      'Options du client',
                      `Que voulez-vous faire avec ${customer.name} ?`,
                      [
                        {
                          text: 'Modifier',
                          onPress: () => openEditModal(customer),
                        },
                        {
                          text: 'Supprimer',
                          style: 'destructive',
                          onPress: () => deleteCustomer(customer),
                        },
                        {
                          text: 'Annuler',
                          style: 'cancel',
                        },
                      ]
                    );
                  }}
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

      {/* Filter Modal */}
      <CustomerFilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        onApply={handleApplyFilters}
        currentFilters={filters}
      />
    </SafeAreaView>
  );
}
