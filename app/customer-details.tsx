
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { commonStyles, colors, buttonStyles, spacing, fontSizes } from '../styles/commonStyles';
import Icon from '../components/Icon';
import { getCustomers, getSales, getSettings } from '../utils/storage';
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

  useEffect(() => {
    loadData();
  }, [customerId]);

  const loadData = async () => {
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

      // Generate transactions from sales and manual entries
      const customerSales = salesData.filter(sale => sale.customerId === customerId);
      const generatedTransactions: CustomerTransaction[] = [];

      // Add sales as transactions
      customerSales.forEach(sale => {
        if (sale.paymentStatus === 'credit') {
          // Credit sale = "J'ai donné" (debt)
          generatedTransactions.push({
            id: `sale-${sale.id}`,
            date: new Date(sale.createdAt),
            amount: sale.total,
            type: 'gave',
            paymentMethod: 'credit',
            description: sale.notes || `Vente ${sale.receiptNumber} - ${sale.items.length} article(s)`,
            balance: 0, // Will be calculated later
          });
        } else if (sale.paymentStatus === 'paid') {
          // Paid sale = "J'ai pris" (payment)
          generatedTransactions.push({
            id: `sale-${sale.id}`,
            date: new Date(sale.createdAt),
            amount: sale.total,
            type: 'took',
            paymentMethod: sale.paymentMethod,
            description: sale.notes || `Vente ${sale.receiptNumber} - ${sale.items.length} article(s)`,
            balance: 0, // Will be calculated later
          });
        }
      });

      // Sort by date (newest first)
      generatedTransactions.sort((a, b) => b.date.getTime() - a.date.getTime());

      // Calculate running balance
      let runningBalance = 0;
      for (let i = generatedTransactions.length - 1; i >= 0; i--) {
        const transaction = generatedTransactions[i];
        if (transaction.type === 'gave') {
          runningBalance += transaction.amount; // Debt increases balance
        } else {
          runningBalance -= transaction.amount; // Payment decreases balance
        }
        transaction.balance = runningBalance;
      }

      setTransactions(generatedTransactions);
      console.log(`Loaded ${generatedTransactions.length} transactions for customer`);
    } catch (error) {
      console.error('Error loading customer details:', error);
      Alert.alert('Erreur', 'Erreur lors du chargement des données');
    }
  };

  const formatCurrency = (amount: number): string => {
    const currency = settings?.currency || 'XOF';
    const currencySymbols = { XOF: 'F CFA', USD: '$', EUR: '€' };
    return `${amount.toLocaleString()} ${currencySymbols[currency]}`;
  };

  const getBalanceColor = (balance: number): string => {
    if (balance > 0) return colors.danger; // Red for debt (J'ai donné)
    if (balance < 0) return colors.success; // Green for credit (J'ai pris)
    return colors.text;
  };

  const getBalanceLabel = (balance: number): string => {
    if (balance > 0) return "J'ai donné";
    if (balance < 0) return "J'ai pris";
    return "Équilibré";
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

  const getPaymentMethodLabel = (method: string): string => {
    const labels = {
      cash: 'Espèces',
      mobile_money: 'Mobile Money',
      credit: 'Crédit',
    };
    return labels[method] || method;
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
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: spacing.md }}>
            <Icon name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[commonStyles.title, { color: colors.primary }]}>
              {customer.name.toUpperCase()}
            </Text>
          </View>
          <TouchableOpacity>
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
            {formatCurrency(Math.abs(currentBalance))}
          </Text>
          <TouchableOpacity style={{ position: 'absolute', right: spacing.lg, top: spacing.lg }}>
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
            Opérations ({transactions.length})
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
                      Solde {formatCurrency(Math.abs(transaction.balance))}
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
                  Commencez par ajouter une transaction
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

          {/* Action Buttons */}
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
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
