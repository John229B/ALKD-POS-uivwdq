
import React, { useState, useEffect, useCallback } from 'react';
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
  const note = Array.isArray(params.note) ? decodeURIComponent(params.note[0]) : decodeURIComponent(params.note || '');
  
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mobile_money' | 'credit'>('cash');
  const [isProcessing, setIsProcessing] = useState(false);

  const loadData = useCallback(async () => {
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
  }, [customerId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const formatCurrency = (amount: number): string => {
    const currency = settings?.currency || 'XOF';
    const currencySymbols = { XOF: 'F CFA', USD: '$', EUR: '€' };
    return `${amount.toLocaleString()} ${currencySymbols[currency]}`;
  };

  const getPaymentMethodLabel = (method: string): string => {
    const labels = {
      cash: 'Espèces',
      mobile_money: 'Mobile Money',
      credit: 'Crédit',
    };
    return labels[method] || method;
  };

  const handleConfirm = () => {
    if (isProcessing) return;

    setIsProcessing(true);

    // Navigate to success screen with all transaction details
    router.push({
      pathname: '/transaction-success',
      params: {
        customerId: encodeURIComponent(customerId),
        type: encodeURIComponent(type),
        amount: encodeURIComponent(amount),
        date: encodeURIComponent(new Date().toISOString()),
        note: encodeURIComponent(note),
        paymentMethod: encodeURIComponent(paymentMethod),
      },
    });
  };

  const paymentMethods = [
    {
      id: 'cash',
      label: 'Espèces',
      icon: 'cash',
      description: 'Paiement en liquide',
    },
    {
      id: 'mobile_money',
      label: 'Mobile Money',
      icon: 'phone-portrait',
      description: 'Orange Money, MTN Money, etc.',
    },
    {
      id: 'credit',
      label: 'Crédit',
      icon: 'time',
      description: 'Transaction à crédit',
    },
  ];

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
          <TouchableOpacity 
            onPress={() => router.back()} 
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
              MODE DE PAIEMENT
            </Text>
          </View>
          <View style={{ width: 24 }} />
        </View>

        {/* Transaction Summary */}
        <View style={[commonStyles.section, { backgroundColor: colors.background, padding: spacing.lg }]}>
          <Text style={[commonStyles.text, { 
            color: colors.primary, 
            fontSize: fontSizes.md, 
            marginBottom: spacing.sm 
          }]}>
            Résumé de la transaction
          </Text>
          
          <View style={[commonStyles.row, { marginBottom: spacing.xs }]}>
            <Text style={[commonStyles.text, { fontSize: fontSizes.sm }]}>Client:</Text>
            <Text style={[commonStyles.text, { fontSize: fontSizes.sm, fontWeight: '600' }]}>
              {customer.name}
            </Text>
          </View>
          
          <View style={[commonStyles.row, { marginBottom: spacing.xs }]}>
            <Text style={[commonStyles.text, { fontSize: fontSizes.sm }]}>Type:</Text>
            <Text style={[commonStyles.text, { 
              fontSize: fontSizes.sm, 
              fontWeight: '600',
              color: type === 'gave' ? colors.danger : colors.success
            }]}>
              {type === 'gave' ? "J'ai donné" : "J'ai pris"}
            </Text>
          </View>
          
          <View style={[commonStyles.row, { marginBottom: spacing.sm }]}>
            <Text style={[commonStyles.text, { fontSize: fontSizes.sm }]}>Montant:</Text>
            <Text style={[commonStyles.text, { 
              fontSize: fontSizes.lg, 
              fontWeight: 'bold',
              color: type === 'gave' ? colors.danger : colors.success
            }]}>
              {formatCurrency(numAmount)}
            </Text>
          </View>

          {note && (
            <View>
              <Text style={[commonStyles.textLight, { fontSize: fontSizes.xs, marginBottom: spacing.xs }]}>
                Note:
              </Text>
              <Text style={[commonStyles.text, { fontSize: fontSizes.sm }]}>
                {note}
              </Text>
            </View>
          )}
        </View>

        {/* Payment Method Selection */}
        <View style={[commonStyles.section, { flex: 1, paddingHorizontal: spacing.lg }]}>
          <Text style={[commonStyles.text, { 
            fontSize: fontSizes.md, 
            fontWeight: '600',
            marginBottom: spacing.lg 
          }]}>
            💳 Sélectionnez le mode de paiement
          </Text>

          {paymentMethods.map(method => (
            <TouchableOpacity
              key={method.id}
              style={[
                commonStyles.card,
                { 
                  marginBottom: spacing.md,
                  borderWidth: 2,
                  borderColor: paymentMethod === method.id ? colors.primary : colors.border
                },
                paymentMethod === method.id && { backgroundColor: colors.primary + '10' }
              ]}
              onPress={() => setPaymentMethod(method.id as any)}
            >
              <View style={[commonStyles.row, { alignItems: 'center' }]}>
                <View style={{
                  backgroundColor: paymentMethod === method.id ? colors.primary + '20' : colors.background,
                  borderRadius: 25,
                  padding: spacing.md,
                  marginRight: spacing.md,
                }}>
                  <Icon 
                    name={method.icon} 
                    size={24} 
                    color={paymentMethod === method.id ? colors.primary : colors.textLight} 
                  />
                </View>
                
                <View style={{ flex: 1 }}>
                  <Text style={[commonStyles.text, { 
                    fontWeight: '600',
                    marginBottom: spacing.xs,
                    color: paymentMethod === method.id ? colors.primary : colors.text
                  }]}>
                    {method.label}
                  </Text>
                  <Text style={[commonStyles.textLight, { fontSize: fontSizes.sm }]}>
                    {method.description}
                  </Text>
                </View>

                {paymentMethod === method.id && (
                  <View style={{
                    backgroundColor: colors.primary,
                    borderRadius: 12,
                    padding: spacing.xs,
                  }}>
                    <Icon name="checkmark" size={16} color={colors.secondary} />
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Confirm Button */}
        <View style={[commonStyles.section, { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg }]}>
          <TouchableOpacity
            style={[
              buttonStyles.primary, 
              { 
                backgroundColor: type === 'gave' ? colors.danger : colors.success,
                paddingVertical: spacing.lg,
                borderRadius: 15
              },
              isProcessing && { opacity: 0.7 }
            ]}
            onPress={handleConfirm}
            disabled={isProcessing}
          >
            <Text style={[commonStyles.text, { 
              color: colors.secondary, 
              fontSize: fontSizes.md, 
              fontWeight: 'bold',
              textAlign: 'center'
            }]}>
              {isProcessing ? 'TRAITEMENT...' : 'CONFIRMER LA TRANSACTION'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[buttonStyles.outline, { 
              marginTop: spacing.md,
              paddingVertical: spacing.lg,
              borderRadius: 15
            }]}
            onPress={() => router.back()}
            disabled={isProcessing}
          >
            <Text style={[commonStyles.text, { 
              color: colors.text, 
              fontSize: fontSizes.md, 
              fontWeight: 'bold',
              textAlign: 'center'
            }]}>
              RETOUR
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
