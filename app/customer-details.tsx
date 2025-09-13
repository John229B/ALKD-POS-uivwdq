
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { commonStyles, colors, buttonStyles, spacing, fontSizes } from '../styles/commonStyles';
import Icon from '../components/Icon';
import { getCustomers, getSales, getSettings, storeCustomers } from '../utils/storage';
import { Customer, Sale, AppSettings } from '../types';
import { formatDistanceToNow, format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface CustomerTransaction {
  id: string;
  date: Date;
  amount: number;
  type: 'gave' | 'took'; // J'ai donné (dette) | J'ai pris (paiement)
  paymentMethod: string;
  description: string;
  balance: number; // Balance after this transaction
}

export default function CustomerDetailsScreen() {
  const { customerId } = useLocalSearchParams<{ customerId: string }>();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [transactions, setTransactions] = useState<CustomerTransaction[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
  });

  const loadData = useCallback(async () => {
    try {
      console.log('Loading customer details for:', customerId);
      const [customersData, salesData, settingsData] = await Promise.all([
        getCustomers(),
        getSales(),
        getSettings(),
      ]);

      const foundCustomer = customersData.find(c => c.id === customerId);
      if (!foundCustomer) {
        Alert.alert('Erreur', 'Client non trouvé');
        router.back();
        return;
      }

      setCustomer(foundCustomer);
      setSettings(settingsData);

      // Set form data for editing
      setFormData({
        name: foundCustomer.name,
        phone: foundCustomer.phone || '',
        email: foundCustomer.email || '',
        address: foundCustomer.address || '',
      });

      // Generate transactions from sales - FIXED LOGIC
      const customerSales = salesData.filter(sale => sale.customerId === customerId);
      const generatedTransactions: CustomerTransaction[] = [];

      console.log(`Found ${customerSales.length} sales for customer ${foundCustomer.name}`);

      // Process each sale to generate appropriate transactions
      customerSales.forEach(sale => {
        console.log('Processing sale:', {
          id: sale.id,
          receiptNumber: sale.receiptNumber,
          total: sale.total,
          paymentStatus: sale.paymentStatus,
          amountPaid: sale.amountPaid,
          paymentMethod: sale.paymentMethod,
          notes: sale.notes,
          itemsCount: sale.items.length
        });

        // Check if this is a manual transaction (J'ai pris/donné)
        if (sale.items.length === 0 && sale.notes) {
          if (sale.notes.includes("J'ai donné")) {
            generatedTransactions.push({
              id: `manual-gave-${sale.id}`,
              date: new Date(sale.createdAt),
              amount: sale.total,
              type: 'gave',
              paymentMethod: sale.paymentMethod,
              description: sale.notes,
              balance: 0, // Will be calculated later
            });
          } else if (sale.notes.includes("J'ai pris")) {
            generatedTransactions.push({
              id: `manual-took-${sale.id}`,
              date: new Date(sale.createdAt),
              amount: sale.total,
              type: 'took',
              paymentMethod: sale.paymentMethod,
              description: sale.notes,
              balance: 0, // Will be calculated later
            });
          }
        } else {
          // Regular sales transactions
          if (sale.paymentStatus === 'credit') {
            // Credit sale = "J'ai donné" (debt) - customer owes the full amount
            generatedTransactions.push({
              id: `sale-${sale.id}`,
              date: new Date(sale.createdAt),
              amount: sale.total,
              type: 'gave',
              paymentMethod: 'credit',
              description: `Vente à crédit ${sale.receiptNumber} - ${sale.items.length} article(s)`,
              balance: 0, // Will be calculated later
            });
          } else if (sale.paymentStatus === 'partial') {
            // Partial payment = "J'ai donné" for unpaid amount
            const unpaidAmount = sale.total - (sale.amountPaid || 0);
            
            if (unpaidAmount > 0) {
              generatedTransactions.push({
                id: `sale-debt-${sale.id}`,
                date: new Date(sale.createdAt),
                amount: unpaidAmount,
                type: 'gave',
                paymentMethod: 'credit',
                description: `Vente partielle ${sale.receiptNumber} - Reste à payer`,
                balance: 0, // Will be calculated later
              });
            }
            
            // Also show the payment received
            const paidAmount = sale.amountPaid || 0;
            if (paidAmount > 0) {
              generatedTransactions.push({
                id: `sale-payment-${sale.id}`,
                date: new Date(sale.createdAt),
                amount: paidAmount,
                type: 'took',
                paymentMethod: sale.paymentMethod,
                description: `Vente partielle ${sale.receiptNumber} - Paiement reçu`,
                balance: 0, // Will be calculated later
              });
            }
          } else if (sale.paymentStatus === 'paid') {
            // Fully paid sale - NO TRANSACTIONS NEEDED (balanced)
            // Only show if there was an overpayment
            const overpayment = (sale.amountPaid || sale.total) - sale.total;
            if (overpayment > 0) {
              generatedTransactions.push({
                id: `sale-overpayment-${sale.id}`,
                date: new Date(sale.createdAt),
                amount: overpayment,
                type: 'took',
                paymentMethod: sale.paymentMethod,
                description: `Vente ${sale.receiptNumber} - Surplus de paiement`,
                balance: 0, // Will be calculated later
              });
            }
          }
        }
      });

      // Sort by date (newest first)
      generatedTransactions.sort((a, b) => b.date.getTime() - a.date.getTime());

      // Calculate running balance - CORRECTED CALCULATION
      let runningBalance = 0;
      
      // Calculate balance from all sales for this customer
      customerSales.forEach(sale => {
        // Check if this is a manual transaction (J'ai pris/donné)
        if (sale.items.length === 0 && sale.notes) {
          if (sale.notes.includes("J'ai donné")) {
            runningBalance += sale.total; // "J'ai donné" increases debt (positive balance)
          } else if (sale.notes.includes("J'ai pris")) {
            runningBalance -= sale.total; // "J'ai pris" reduces debt (negative balance)
          }
        } else {
          // Regular sales transactions
          if (sale.paymentStatus === 'credit') {
            runningBalance += sale.total; // Credit sale adds to debt
          } else if (sale.paymentStatus === 'partial') {
            const unpaidAmount = sale.total - (sale.amountPaid || 0);
            runningBalance += unpaidAmount; // Only unpaid portion adds to debt
          } else if (sale.paymentStatus === 'paid') {
            // Check for overpayment
            const overpayment = (sale.amountPaid || sale.total) - sale.total;
            if (overpayment > 0) {
              runningBalance -= overpayment; // Overpayment creates credit for customer
            }
          }
        }
      });
      
      // Apply balance to transactions for display (working backwards from current balance)
      let tempBalance = runningBalance;
      for (let i = 0; i < generatedTransactions.length; i++) {
        const transaction = generatedTransactions[i];
        transaction.balance = tempBalance;
        
        // Calculate previous balance for display
        if (i < generatedTransactions.length - 1) {
          if (transaction.type === 'gave') {
            tempBalance -= transaction.amount;
          } else {
            tempBalance += transaction.amount;
          }
        }
      }

      setTransactions(generatedTransactions);
      console.log(`Generated ${generatedTransactions.length} transactions for customer. Current balance: ${runningBalance}`);
    } catch (error) {
      console.error('Error loading customer details:', error);
      Alert.alert('Erreur', 'Erreur lors du chargement des données');
    }
  }, [customerId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const formatCurrency = (amount: number): string => {
    const currency = settings?.currency || 'XOF';
    const currencySymbols = { XOF: 'F CFA', USD: '$', EUR: '€' };
    return `${amount.toLocaleString()} ${currencySymbols[currency]}`;
  };

  const getBalanceColor = (balance: number): string => {
    if (balance > 0) return colors.danger; // Red for debt (J'ai donné)
    if (balance === 0) return colors.success; // Green for zero balance
    return colors.success; // Green for credit (J'ai pris)
  };

  const getBalanceLabel = (balance: number): string => {
    if (balance > 0) return "Dette";
    if (balance === 0) return "Équilibré";
    return "Crédit";
  };

  const openTransactionFlow = (type: 'gave' | 'took') => {
    router.push({
      pathname: '/transaction-amount',
      params: {
        customerId,
        type,
      },
    });
  };

  const openSendStatusPage = () => {
    console.log('Opening send status page for customer:', customer?.name);
    router.push({
      pathname: '/send-status',
      params: {
        customerId,
      },
    });
  };

  const getPaymentMethodLabel = (method: string): string => {
    const labels = {
      cash: 'Espèces',
      mobile_money: 'Mobile Money',
      credit: 'Crédit',
    };
    return labels[method] || method;
  };

  const openEditModal = () => {
    console.log('Opening edit modal for customer:', customer?.name);
    setShowEditModal(true);
  };

  const saveCustomer = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Erreur', 'Le nom du client est obligatoire');
      return;
    }

    try {
      console.log('Updating customer:', customer?.id);
      const customersData = await getCustomers();
      
      const updatedCustomer: Customer = {
        ...customer!,
        name: formData.name.trim(),
        phone: formData.phone.trim() || undefined,
        email: formData.email.trim() || undefined,
        address: formData.address.trim() || undefined,
        updatedAt: new Date(),
      };

      const updatedCustomers = customersData.map(c => 
        c.id === customer!.id ? updatedCustomer : c
      );

      await storeCustomers(updatedCustomers);
      setCustomer(updatedCustomer);
      setShowEditModal(false);

      Alert.alert('Succès', 'Informations du client mises à jour avec succès');
    } catch (error) {
      console.error('Error updating customer:', error);
      Alert.alert('Erreur', 'Erreur lors de la mise à jour du client');
    }
  };

  if (!customer) {
    return (
      <SafeAreaView style={commonStyles.container}>
        <View style={[commonStyles.content, { justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={commonStyles.text}>Chargement...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const currentBalance = transactions.length > 0 ? transactions[0].balance : 0;

  return (
    <SafeAreaView style={commonStyles.container}>
      <View style={commonStyles.content}>
        {/* Header */}
        <View style={[commonStyles.section, commonStyles.header]}>
          <TouchableOpacity 
            onPress={() => router.push('/(tabs)/customers')} 
            style={{ marginRight: spacing.md }}
          >
            <Icon name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={[commonStyles.title, { 
              color: colors.primary,
              fontSize: fontSizes.lg,
              fontWeight: 'bold',
              textAlign: 'center'
            }]}>
              {customer.name.toUpperCase()}
            </Text>
          </View>
          <TouchableOpacity onPress={openEditModal}>
            <Icon name="person" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Balance générale */}
        <View style={[commonStyles.section, { backgroundColor: colors.background, padding: spacing.lg }]}>
          <Text style={[commonStyles.text, { color: colors.primary, fontSize: fontSizes.md, marginBottom: spacing.xs }]}>
            Balance générale
          </Text>
          <Text style={[commonStyles.textLight, { fontSize: fontSizes.sm, marginBottom: spacing.xs }]}>
            {getBalanceLabel(currentBalance)}
          </Text>
          <Text style={[commonStyles.title, { 
            color: getBalanceColor(currentBalance), 
            fontSize: fontSizes.xl,
            fontWeight: 'bold'
          }]}>
            {currentBalance === 0 ? formatCurrency(0) : formatCurrency(Math.abs(currentBalance))}
          </Text>
          <TouchableOpacity 
            style={{ position: 'absolute', right: spacing.lg, top: spacing.lg }}
            onPress={openSendStatusPage}
          >
            <View style={{
              backgroundColor: colors.primary + '20',
              borderRadius: 20,
              padding: spacing.sm,
            }}>
              <Icon name="chatbubble-outline" size={20} color={colors.primary} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Operations */}
        <View style={[commonStyles.section, { flex: 1 }]}>
          <Text style={[commonStyles.text, { 
            color: colors.primary, 
            fontSize: fontSizes.md, 
            marginBottom: spacing.md,
            paddingHorizontal: spacing.lg 
          }]}>
            Historique des opérations ({transactions.length})
          </Text>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 120 }}>
            {transactions.map(transaction => (
              <View key={transaction.id} style={[commonStyles.card, { marginBottom: spacing.sm }]}>
                <View style={[commonStyles.row, { alignItems: 'flex-start' }]}>
                  {/* Transaction Icon */}
                  <View style={{
                    backgroundColor: colors.background,
                    borderRadius: 20,
                    padding: spacing.sm,
                    marginRight: spacing.md,
                  }}>
                    <Icon 
                      name={transaction.type === 'gave' ? 'arrow-up' : 'arrow-down'} 
                      size={16} 
                      color={transaction.type === 'gave' ? colors.danger : colors.success} 
                    />
                  </View>

                  {/* Transaction Details */}
                  <View style={{ flex: 1 }}>
                    <Text style={[commonStyles.text, { fontWeight: '600', marginBottom: spacing.xs }]}>
                      {format(transaction.date, 'd MMMM à HH:mm', { locale: fr })}
                    </Text>
                    <Text style={[commonStyles.textLight, { fontSize: fontSizes.sm, marginBottom: spacing.xs }]}>
                      Solde après: {transaction.balance === 0 ? formatCurrency(0) : formatCurrency(Math.abs(transaction.balance))}
                    </Text>
                    <Text style={[commonStyles.textLight, { fontSize: fontSizes.sm }]}>
                      {transaction.description}
                    </Text>
                  </View>

                  {/* Amount and Type */}
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[commonStyles.text, { 
                      color: transaction.type === 'gave' ? colors.danger : colors.success,
                      fontSize: fontSizes.md,
                      fontWeight: 'bold',
                      marginBottom: spacing.xs
                    }]}>
                      {formatCurrency(transaction.amount)}
                    </Text>
                    <Text style={[commonStyles.textLight, { fontSize: fontSizes.xs, marginBottom: 2 }]}>
                      {transaction.type === 'gave' ? "J'ai donné" : "J'ai pris"} • {getPaymentMethodLabel(transaction.paymentMethod)}
                    </Text>
                  </View>
                </View>
              </View>
            ))}

            {transactions.length === 0 && (
              <View style={{ alignItems: 'center', marginTop: 40 }}>
                <Text style={[commonStyles.textLight, { fontSize: fontSizes.lg, marginBottom: spacing.xs }]}>
                  Aucune opération
                </Text>
                <Text style={[commonStyles.textLight, { fontSize: fontSizes.md }]}>
                  Commencez par effectuer une vente ou ajouter une transaction
                </Text>
              </View>
            )}
          </ScrollView>
        </View>

        {/* Add new operation button */}
        <View style={{
          position: 'absolute',
          bottom: 20,
          left: 20,
          right: 20,
          backgroundColor: 'transparent',
        }}>
          <TouchableOpacity
            style={{
              backgroundColor: colors.background,
              borderRadius: 25,
              padding: spacing.md,
              marginBottom: spacing.md,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={[commonStyles.text, { marginRight: spacing.xs }]}>
                Ajoutez une nouvelle opération
              </Text>
              <Text style={{ fontSize: 20 }}>👆</Text>
            </View>
          </TouchableOpacity>

          {/* Action Buttons with improved functionality descriptions */}
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <TouchableOpacity
              style={[buttonStyles.primary, { 
                flex: 1, 
                backgroundColor: colors.success,
                borderRadius: 15,
                paddingVertical: spacing.lg
              }]}
              onPress={() => openTransactionFlow('took')}
            >
              <Text style={[commonStyles.text, { 
                color: colors.secondary, 
                fontSize: fontSizes.md, 
                fontWeight: 'bold',
                textAlign: 'center'
              }]}>
                J'AI PRIS
              </Text>
              <Text style={[commonStyles.text, { 
                color: colors.secondary, 
                fontSize: fontSizes.xs, 
                textAlign: 'center',
                opacity: 0.8
              }]}>
                Paiement reçu / Réduire dette
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[buttonStyles.primary, { 
                flex: 1, 
                backgroundColor: colors.danger,
                borderRadius: 15,
                paddingVertical: spacing.lg
              }]}
              onPress={() => openTransactionFlow('gave')}
            >
              <Text style={[commonStyles.text, { 
                color: colors.secondary, 
                fontSize: fontSizes.md, 
                fontWeight: 'bold',
                textAlign: 'center'
              }]}>
                J'AI DONNÉ
              </Text>
              <Text style={[commonStyles.text, { 
                color: colors.secondary, 
                fontSize: fontSizes.xs, 
                textAlign: 'center',
                opacity: 0.8
              }]}>
                Crédit accordé / Monnaie rendue
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Edit Customer Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={commonStyles.modalOverlay}>
          <View style={commonStyles.modalContent}>
            <View style={[commonStyles.row, { marginBottom: spacing.lg }]}>
              <Text style={commonStyles.subtitle}>
                ✏️ Modifier le client
              </Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
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
                  ✅ Sauvegarder les modifications
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={buttonStyles.outline}
                onPress={() => setShowEditModal(false)}
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
