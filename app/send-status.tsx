
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { commonStyles, colors, buttonStyles, spacing, fontSizes } from '../styles/commonStyles';
import Icon from '../components/Icon';
import { getCustomers, getSales, getSettings } from '../utils/storage';
import { Customer, Sale, AppSettings } from '../types';

export default function SendStatusScreen() {
  const { customerId } = useLocalSearchParams<{ customerId: string }>();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [currentBalance, setCurrentBalance] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      console.log('Loading data for send status page');
      const [customersData, salesData, settingsData] = await Promise.all([
        getCustomers(),
        getSales(),
        getSettings(),
      ]);

      const foundCustomer = customersData.find(c => c.id === customerId);
      if (!foundCustomer) {
        router.back();
        return;
      }

      setCustomer(foundCustomer);
      setSettings(settingsData);

      // Calculate current balance
      const customerSales = salesData.filter(sale => sale.customerId === customerId);
      let balance = 0;
      
      customerSales.forEach(sale => {
        if (sale.paymentStatus === 'credit') {
          balance += sale.total; // Debt increases balance
        } else if (sale.paymentStatus === 'paid') {
          balance -= sale.total; // Payment decreases balance
        }
      });

      setCurrentBalance(balance);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const formatCurrency = (amount: number): string => {
    const currency = settings?.currency || 'XOF';
    const currencySymbols = { XOF: 'F CFA', USD: '$', EUR: '€' };
    return `${amount.toLocaleString()} ${currencySymbols[currency]}`;
  };

  const handleOptionSelect = (option: 'current' | 'reminder' | 'specific') => {
    console.log('Selected option:', option);
    
    if (option === 'current') {
      router.push({
        pathname: '/status-current',
        params: { customerId },
      });
    } else if (option === 'reminder') {
      router.push({
        pathname: '/status-reminder',
        params: { customerId },
      });
    } else if (option === 'specific') {
      // TODO: Implement "Demander un montant spécifique" functionality
      console.log('Specific amount request not implemented yet');
    }
  };

  const handleCancel = () => {
    console.log('Cancelling send status - returning to customer details');
    // Navigate directly back to customer details page
    router.push({
      pathname: '/customer-details',
      params: { customerId },
    });
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

  return (
    <SafeAreaView style={commonStyles.container}>
      <View style={commonStyles.content}>
        {/* Header */}
        <View style={[commonStyles.section, commonStyles.header]}>
          <TouchableOpacity 
            onPress={handleCancel} 
            style={{ marginRight: spacing.md }}
          >
            <Icon name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={[commonStyles.title, { 
              color: colors.primary,
              fontSize: fontSizes.lg,
              fontWeight: 'bold',
              textAlign: 'center'
            }]}>
              Envoyer statut au client
            </Text>
          </View>
          <View style={{ width: 24 }} />
        </View>

        {/* Customer Info */}
        <View style={[commonStyles.section, { backgroundColor: colors.background, padding: spacing.lg }]}>
          <Text style={[commonStyles.text, { fontSize: fontSizes.md, marginBottom: spacing.xs }]}>
            31 Août à 15:15
          </Text>
          <Text style={[commonStyles.textLight, { fontSize: fontSizes.sm, marginBottom: spacing.xs }]}>
            Solde {currentBalance === 0 ? formatCurrency(0) : formatCurrency(Math.abs(currentBalance))}
          </Text>
          <Text style={[commonStyles.textLight, { fontSize: fontSizes.sm }]}>
            {customer.name}
          </Text>
          <View style={{ position: 'absolute', right: spacing.lg, top: spacing.lg }}>
            <Text style={[commonStyles.text, { 
              color: currentBalance > 0 ? colors.danger : colors.success,
              fontSize: fontSizes.md,
              fontWeight: 'bold'
            }]}>
              {currentBalance === 0 ? formatCurrency(0) : formatCurrency(Math.abs(currentBalance))}
            </Text>
            <Text style={[commonStyles.textLight, { fontSize: fontSizes.xs, textAlign: 'right' }]}>
              {currentBalance > 0 ? "J'ai donné • Crédit" : "J'ai pris • Crédit"}
            </Text>
          </View>
        </View>

        {/* Options */}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.lg }}>
          {/* Situation actuelle */}
          <TouchableOpacity
            style={[commonStyles.card, { marginBottom: spacing.lg, padding: spacing.lg }]}
            onPress={() => handleOptionSelect('current')}
          >
            <View style={[commonStyles.row, { alignItems: 'center' }]}>
              <View style={{
                backgroundColor: colors.primary + '20',
                borderRadius: 25,
                padding: spacing.md,
                marginRight: spacing.lg,
              }}>
                <Icon name="bar-chart-outline" size={24} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[commonStyles.text, { 
                  fontSize: fontSizes.lg, 
                  fontWeight: 'bold',
                  marginBottom: spacing.xs
                }]}>
                  Situation actuelle
                </Text>
              </View>
              <Icon name="chevron-forward" size={20} color={colors.textLight} />
            </View>
          </TouchableOpacity>

          {/* Rappel de paiement */}
          <TouchableOpacity
            style={[commonStyles.card, { marginBottom: spacing.lg, padding: spacing.lg }]}
            onPress={() => handleOptionSelect('reminder')}
          >
            <View style={[commonStyles.row, { alignItems: 'center' }]}>
              <View style={{
                backgroundColor: colors.primary + '20',
                borderRadius: 25,
                padding: spacing.md,
                marginRight: spacing.lg,
              }}>
                <Icon name="notifications-outline" size={24} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[commonStyles.text, { 
                  fontSize: fontSizes.lg, 
                  fontWeight: 'bold',
                  marginBottom: spacing.xs
                }]}>
                  Rappel de paiement
                </Text>
              </View>
              <Icon name="chevron-forward" size={20} color={colors.textLight} />
            </View>
          </TouchableOpacity>

          {/* Demander un montant spécifique */}
          <TouchableOpacity
            style={[commonStyles.card, { marginBottom: spacing.lg, padding: spacing.lg }]}
            onPress={() => handleOptionSelect('specific')}
          >
            <View style={[commonStyles.row, { alignItems: 'center' }]}>
              <View style={{
                backgroundColor: colors.primary + '20',
                borderRadius: 25,
                padding: spacing.md,
                marginRight: spacing.lg,
              }}>
                <Icon name="card-outline" size={24} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[commonStyles.text, { 
                  fontSize: fontSizes.lg, 
                  fontWeight: 'bold',
                  marginBottom: spacing.xs
                }]}>
                  Demander un montant spécifique
                </Text>
              </View>
              <Icon name="chevron-forward" size={20} color={colors.textLight} />
            </View>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
