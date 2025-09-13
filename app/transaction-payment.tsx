
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, Alert, ScrollView } from 'react-native';
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
      color: colors.success,
    },
    {
      id: 'mobile_money',
      label: 'Mobile Money',
      icon: 'phone-portrait',
      description: 'Orange Money, MTN Money, etc.',
      color: colors.info,
    },
    {
      id: 'credit',
      label: 'Crédit',
      icon: 'time',
      description: 'Transaction à crédit',
      color: colors.warning,
    },
  ];

  if (!customer) {
    return (
      <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]}>
        <View style={[commonStyles.content, { justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={[commonStyles.text, { color: colors.text }]}>Chargement...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const numAmount = parseFloat(amount);

  return (
    <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]}>
      {/* FIXED: Header with better alignment and contrast */}
      <View style={[
        commonStyles.header, 
        { 
          backgroundColor: colors.background, 
          borderBottomColor: colors.border,
          borderBottomWidth: 1,
          paddingVertical: spacing.lg,
          paddingHorizontal: spacing.lg,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }
      ]}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={{ 
            backgroundColor: colors.backgroundAlt,
            borderRadius: 20,
            padding: spacing.sm,
            borderWidth: 1,
            borderColor: colors.border,
          }}
          activeOpacity={0.7}
        >
          <Icon name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        
        <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: spacing.md }}>
          <Text style={[commonStyles.title, { 
            color: colors.primary,
            fontSize: fontSizes.lg,
            fontWeight: 'bold',
            textAlign: 'center'
          }]}>
            MODE DE PAIEMENT
          </Text>
        </View>
        
        <View style={{ width: 44 }} />
      </View>

      <ScrollView 
        style={{ flex: 1 }} 
        contentContainerStyle={{ padding: spacing.lg }}
        showsVerticalScrollIndicator={false}
      >
        {/* FIXED: Transaction Summary with better organization */}
        <View style={[
          commonStyles.card,
          {
            backgroundColor: colors.background,
            borderWidth: 1,
            borderColor: colors.border,
            marginBottom: spacing.lg,
            borderRadius: 12,
          }
        ]}>
          <View style={{ alignItems: 'center', marginBottom: spacing.md }}>
            <View style={{
              backgroundColor: type === 'gave' ? colors.error + '20' : colors.success + '20',
              borderRadius: 20,
              padding: spacing.sm,
              marginBottom: spacing.sm,
            }}>
              <Icon 
                name={type === 'gave' ? 'arrow-up' : 'arrow-down'} 
                size={20} 
                color={type === 'gave' ? colors.error : colors.success} 
              />
            </View>
            <Text style={[commonStyles.text, { 
              color: colors.text, 
              fontSize: fontSizes.md, 
              fontWeight: '600',
            }]}>
              Résumé de la transaction
            </Text>
          </View>
          
          <View style={{ alignItems: 'center', marginBottom: spacing.sm }}>
            <Text style={[commonStyles.textLight, { fontSize: fontSizes.sm, marginBottom: spacing.xs }]}>
              Client: {customer.name}
            </Text>
            <Text style={[commonStyles.textLight, { fontSize: fontSizes.sm, marginBottom: spacing.xs }]}>
              Type: {type === 'gave' ? "J'ai donné" : "J'ai pris"}
            </Text>
            <Text style={[commonStyles.text, { 
              fontSize: fontSizes.xl, 
              fontWeight: 'bold',
              color: type === 'gave' ? colors.error : colors.success,
              marginBottom: spacing.sm
            }]}>
              {formatCurrency(numAmount)}
            </Text>
          </View>

          {note && (
            <View style={{
              backgroundColor: colors.backgroundAlt,
              borderRadius: 8,
              padding: spacing.sm,
              marginTop: spacing.sm,
            }}>
              <Text style={[commonStyles.textLight, { fontSize: fontSizes.xs, marginBottom: spacing.xs, textAlign: 'center' }]}>
                Note:
              </Text>
              <Text style={[commonStyles.text, { fontSize: fontSizes.sm, color: colors.text, textAlign: 'center' }]}>
                {note}
              </Text>
            </View>
          )}
        </View>

        {/* FIXED: Payment Method Selection with better design */}
        <Text style={[commonStyles.text, { 
          fontSize: fontSizes.md, 
          fontWeight: '600',
          marginBottom: spacing.lg,
          color: colors.text,
          textAlign: 'center',
        }]}>
          Sélectionnez le mode de paiement
        </Text>

        {paymentMethods.map(method => (
          <TouchableOpacity
            key={method.id}
            style={[
              commonStyles.card,
              { 
                marginBottom: spacing.md,
                borderWidth: 2,
                borderColor: paymentMethod === method.id ? method.color : colors.border,
                backgroundColor: paymentMethod === method.id ? method.color + '10' : colors.background,
                borderRadius: 12,
              }
            ]}
            onPress={() => setPaymentMethod(method.id as any)}
            activeOpacity={0.7}
          >
            <View style={[commonStyles.row, { alignItems: 'center' }]}>
              <View style={{
                backgroundColor: paymentMethod === method.id ? method.color + '20' : colors.backgroundAlt,
                borderRadius: 20,
                padding: spacing.md,
                marginRight: spacing.md,
              }}>
                <Icon 
                  name={method.icon} 
                  size={20} 
                  color={paymentMethod === method.id ? method.color : colors.textLight} 
                />
              </View>
              
              <View style={{ flex: 1 }}>
                <Text style={[commonStyles.text, { 
                  fontWeight: '600',
                  marginBottom: spacing.xs,
                  color: paymentMethod === method.id ? method.color : colors.text
                }]}>
                  {method.label}
                </Text>
                <Text style={[commonStyles.textLight, { fontSize: fontSizes.sm }]}>
                  {method.description}
                </Text>
              </View>

              {paymentMethod === method.id && (
                <View style={{
                  backgroundColor: method.color,
                  borderRadius: 12,
                  padding: spacing.xs,
                }}>
                  <Icon name="checkmark" size={16} color={colors.secondary} />
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* FIXED: Action Buttons with better design */}
      <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.lg }}>
        <TouchableOpacity
          style={[
            buttonStyles.primary, 
            { 
              backgroundColor: type === 'gave' ? colors.error : colors.success,
              paddingVertical: spacing.lg,
              borderRadius: 12,
              marginBottom: spacing.sm,
              shadowColor: colors.text,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 3,
            },
            isProcessing && { opacity: 0.7 }
          ]}
          onPress={handleConfirm}
          disabled={isProcessing}
          activeOpacity={0.8}
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
          style={[
            buttonStyles.outline, 
            { 
              paddingVertical: spacing.md,
              borderRadius: 12,
              backgroundColor: colors.backgroundAlt,
              borderColor: colors.border,
              borderWidth: 1,
            }
          ]}
          onPress={() => router.back()}
          disabled={isProcessing}
          activeOpacity={0.7}
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
    </SafeAreaView>
  );
}
