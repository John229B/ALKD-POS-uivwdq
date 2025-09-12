
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { commonStyles, colors, buttonStyles, spacing, fontSizes } from '../styles/commonStyles';
import Icon from '../components/Icon';
import { getCustomers, getSettings } from '../utils/storage';
import { Customer, AppSettings } from '../types';

export default function TransactionPaymentScreen() {
  const params = useLocalSearchParams();
  const customerId = Array.isArray(params.customerId) ? decodeURIComponent(params.customerId[0]) : decodeURIComponent(params.customerId || '');
  const type = Array.isArray(params.type) ? decodeURIComponent(params.type[0]) : decodeURIComponent(params.type || '');
  const amount = Array.isArray(params.amount) ? decodeURIComponent(params.amount[0]) : decodeURIComponent(params.amount || '');
  const date = Array.isArray(params.date) ? decodeURIComponent(params.date[0]) : decodeURIComponent(params.date || '');
  const note = Array.isArray(params.note) ? decodeURIComponent(params.note[0]) : decodeURIComponent(params.note || '');
  
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');

  useEffect(() => {
    loadData();
  }, [customerId]);

  const loadData = async () => {
    try {
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
      console.error('Error loading data:', error);
      Alert.alert('Erreur', 'Erreur lors du chargement des données');
    }
  };

  const formatCurrency = (amount: number): string => {
    const currency = settings?.currency || 'XOF';
    const currencySymbols = { XOF: 'F CFA', USD: '$', EUR: '€' };
    return `${amount.toLocaleString()} ${currencySymbols[currency]}`;
  };

  const paymentMethods = [
    {
      id: 'cash',
      name: 'Espèces',
      icon: 'cash-outline',
      description: 'Paiement en liquide',
    },
    {
      id: 'mobile_money',
      name: 'Paiement mobile',
      icon: 'phone-portrait-outline',
      description: 'Mobile Money, Orange Money, etc.',
    },
  ];

  const handlePaymentMethodSelect = (methodId: string) => {
    setSelectedPaymentMethod(methodId);
    
    // Navigate to success screen
    router.push({
      pathname: '/transaction-success',
      params: {
        customerId: encodeURIComponent(customerId),
        type: encodeURIComponent(type),
        amount: encodeURIComponent(amount),
        date: encodeURIComponent(date),
        note: encodeURIComponent(note),
        paymentMethod: encodeURIComponent(methodId),
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

  return (
    <SafeAreaView style={commonStyles.container}>
      <View style={commonStyles.content}>
        {/* Header */}
        <View style={[commonStyles.section, commonStyles.header]}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: spacing.md }}>
            <Icon name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={[commonStyles.title, { color: colors.text, fontSize: fontSizes.lg }]}>
              Modes de paiement
            </Text>
          </View>
        </View>

        {/* Amount to Pay */}
        <View style={[commonStyles.section, { alignItems: 'center', paddingVertical: spacing.xl }]}>
          <Text style={[commonStyles.text, { 
            color: colors.textLight,
            fontSize: fontSizes.md,
            marginBottom: spacing.sm
          }]}>
            Montant à régler
          </Text>
          <Text style={[commonStyles.title, { 
            color: colors.primary,
            fontSize: 48,
            fontWeight: 'bold'
          }]}>
            {formatCurrency(numAmount)}
          </Text>
        </View>

        {/* Payment Method Selection */}
        <View style={[commonStyles.section, { paddingHorizontal: spacing.lg, flex: 1 }]}>
          <Text style={[commonStyles.text, { 
            color: colors.primary,
            fontSize: fontSizes.md,
            marginBottom: spacing.lg,
            fontWeight: '600'
          }]}>
            Sélectionnez mode de paiement
          </Text>

          {paymentMethods.map((method) => (
            <TouchableOpacity
              key={method.id}
              style={[
                commonStyles.card,
                {
                  marginBottom: spacing.md,
                  paddingVertical: spacing.lg,
                  paddingHorizontal: spacing.lg,
                  borderWidth: 2,
                  borderColor: selectedPaymentMethod === method.id ? colors.primary : colors.border,
                  backgroundColor: colors.secondary,
                  borderRadius: 15,
                  shadowColor: colors.text,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 3,
                }
              ]}
              onPress={() => handlePaymentMethodSelect(method.id)}
              activeOpacity={0.8}
            >
              <View style={[commonStyles.row, { alignItems: 'center' }]}>
                <View style={{
                  backgroundColor: colors.primary,
                  borderRadius: 25,
                  padding: spacing.md,
                  marginRight: spacing.md,
                }}>
                  <Icon name={method.icon} size={24} color={colors.secondary} />
                </View>
                
                <View style={{ flex: 1 }}>
                  <Text style={[commonStyles.text, { 
                    fontSize: fontSizes.lg,
                    fontWeight: '600',
                    marginBottom: spacing.xs,
                    color: colors.text
                  }]}>
                    {method.name}
                  </Text>
                  <Text style={[commonStyles.textLight, { 
                    fontSize: fontSizes.sm,
                    color: colors.textLight
                  }]}>
                    {method.description}
                  </Text>
                </View>

                <Icon 
                  name="chevron-forward" 
                  size={20} 
                  color={colors.text} 
                />
              </View>
            </TouchableOpacity>
          ))}

          {/* Future payment methods placeholder */}
          <View style={[
            commonStyles.card,
            {
              marginBottom: spacing.md,
              paddingVertical: spacing.lg,
              paddingHorizontal: spacing.lg,
              borderWidth: 1,
              borderColor: colors.border,
              borderStyle: 'dashed',
              backgroundColor: colors.background,
              borderRadius: 15,
              opacity: 0.6,
            }
          ]}>
            <View style={[commonStyles.row, { alignItems: 'center' }]}>
              <View style={{
                backgroundColor: colors.textLight + '20',
                borderRadius: 25,
                padding: spacing.md,
                marginRight: spacing.md,
              }}>
                <Icon name="add" size={24} color={colors.textLight} />
              </View>
              
              <View style={{ flex: 1 }}>
                <Text style={[commonStyles.text, { 
                  fontSize: fontSizes.lg,
                  fontWeight: '600',
                  marginBottom: spacing.xs,
                  color: colors.textLight
                }]}>
                  Autres modes
                </Text>
                <Text style={[commonStyles.textLight, { 
                  fontSize: fontSizes.sm,
                }]}>
                  Bientôt disponible...
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
