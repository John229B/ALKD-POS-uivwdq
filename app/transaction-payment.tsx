
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { commonStyles, colors, buttonStyles, spacing, fontSizes } from '../styles/commonStyles';
import Icon from '../components/Icon';
import { getCustomers, getSettings } from '../utils/storage';
import { Customer, AppSettings } from '../types';

export default function TransactionPaymentScreen() {
  const { customerId, type, amount, date, note } = useLocalSearchParams<{
    customerId: string;
    type: 'gave' | 'took';
    amount: string;
    date: string;
    note: string;
  }>();
  
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);

  const loadData = React.useCallback(async () => {
    try {
      console.log('Loading transaction payment data for:', customerId, type);
      const [customersData, settingsData] = await Promise.all([
        getCustomers(),
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
    } catch (error) {
      console.error('Error loading transaction payment data:', error);
      Alert.alert('Erreur', 'Erreur lors du chargement des données');
    }
  }, [customerId, type]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const formatCurrency = (amount: number): string => {
    const currency = settings?.currency || 'XOF';
    const currencySymbols = { XOF: 'F CFA', USD: '$', EUR: '€' };
    return `${amount.toLocaleString()} ${currencySymbols[currency]}`;
  };

  const handlePaymentMethodSelect = (methodId: string) => {
    router.push({
      pathname: '/transaction-success',
      params: {
        customerId,
        type,
        amount,
        date,
        note,
        paymentMethod: methodId,
      },
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

  const numAmount = parseFloat(amount);
  const paymentMethods = [
    {
      id: 'cash',
      name: 'Paiement en liquide',
      icon: 'cash',
      description: 'Espèces',
      color: colors.success,
      backgroundColor: '#2ecc71',
    },
    {
      id: 'mobile_money',
      name: 'Mobile Money',
      icon: 'phone-portrait',
      description: 'Orange Money, MTN Money, etc.',
      color: '#f39c12',
      backgroundColor: '#f39c12',
    },
    {
      id: 'credit',
      name: 'Paiement à crédit',
      icon: 'card',
      description: 'À crédit',
      color: colors.danger,
      backgroundColor: '#e74c3c',
    },
  ];

  return (
    <SafeAreaView style={commonStyles.container}>
      <View style={commonStyles.content}>
        {/* Header */}
        <View style={[commonStyles.section, commonStyles.header]}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: spacing.md }}>
            <Icon name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[commonStyles.title, { color: colors.primary, textAlign: 'center' }]}>
              MODE DE PAIEMENT
            </Text>
          </View>
          <View style={{ width: 24 }} />
        </View>

        {/* Transaction Summary */}
        <View style={[commonStyles.section, { backgroundColor: colors.background, padding: spacing.lg }]}>
          <Text style={[commonStyles.text, { color: colors.primary, fontSize: fontSizes.md, marginBottom: spacing.sm }]}>
            Résumé de la transaction
          </Text>
          <View style={[commonStyles.row, { marginBottom: spacing.xs }]}>
            <Text style={[commonStyles.text, { flex: 1 }]}>Client:</Text>
            <Text style={[commonStyles.text, { fontWeight: 'bold' }]}>{customer.name}</Text>
          </View>
          <View style={[commonStyles.row, { marginBottom: spacing.xs }]}>
            <Text style={[commonStyles.text, { flex: 1 }]}>Type:</Text>
            <Text style={[commonStyles.text, { 
              fontWeight: 'bold',
              color: type === 'gave' ? colors.danger : colors.success
            }]}>
              {type === 'gave' ? "J'ai donné" : "J'ai pris"}
            </Text>
          </View>
          <View style={[commonStyles.row]}>
            <Text style={[commonStyles.text, { flex: 1 }]}>Montant:</Text>
            <Text style={[commonStyles.title, { 
              fontSize: fontSizes.lg,
              fontWeight: 'bold',
              color: type === 'gave' ? colors.danger : colors.success
            }]}>
              {formatCurrency(numAmount)}
            </Text>
          </View>
        </View>

        {/* Payment Methods with contrasting colors */}
        <View style={[commonStyles.section, { flex: 1, paddingHorizontal: spacing.lg }]}>
          <Text style={[commonStyles.text, { 
            color: colors.primary, 
            fontSize: fontSizes.md, 
            marginBottom: spacing.lg 
          }]}>
            Choisissez le mode de paiement
          </Text>

          {paymentMethods.map(method => (
            <TouchableOpacity
              key={method.id}
              style={[{
                marginBottom: spacing.md,
                borderRadius: 15,
                padding: spacing.lg,
                backgroundColor: method.backgroundColor,
                shadowColor: colors.text,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3,
              }]}
              onPress={() => handlePaymentMethodSelect(method.id)}
            >
              <View style={[commonStyles.row, { alignItems: 'center' }]}>
                <View style={{
                  width: 50,
                  height: 50,
                  borderRadius: 25,
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: spacing.md,
                }}>
                  <Icon name={method.icon} size={24} color={colors.secondary} />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[commonStyles.text, { 
                    fontSize: fontSizes.md,
                    fontWeight: 'bold',
                    color: colors.secondary,
                    marginBottom: spacing.xs
                  }]}>
                    {method.name}
                  </Text>
                  <Text style={[commonStyles.textLight, { 
                    fontSize: fontSizes.sm,
                    color: 'rgba(255, 255, 255, 0.8)'
                  }]}>
                    {method.description}
                  </Text>
                </View>

                <Icon name="chevron-forward" size={20} color={colors.secondary} />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}
