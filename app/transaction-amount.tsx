
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { commonStyles, colors, buttonStyles, spacing, fontSizes } from '../styles/commonStyles';
import Icon from '../components/Icon';
import { getCustomers, getSettings } from '../utils/storage';
import { Customer, AppSettings } from '../types';

export default function TransactionAmountScreen() {
  const params = useLocalSearchParams();
  const customerId = Array.isArray(params.customerId) ? params.customerId[0] : params.customerId || '';
  const type = Array.isArray(params.type) ? params.type[0] : params.type || '';
  
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

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

  const handleContinue = () => {
    const numAmount = parseFloat(amount);
    
    if (!amount.trim() || isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Erreur', 'Veuillez saisir un montant valide');
      return;
    }

    // Navigate to payment method selection
    router.push({
      pathname: '/transaction-payment',
      params: {
        customerId: encodeURIComponent(customerId),
        type: encodeURIComponent(type),
        amount: encodeURIComponent(amount),
        note: encodeURIComponent(note),
      },
    });
  };

  const quickAmounts = [1000, 2000, 5000, 10000, 20000, 50000];

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
              {type === 'gave' ? "J'AI DONNÉ" : "J'AI PRIS"}
            </Text>
          </View>
          <View style={{ width: 24 }} />
        </View>

        {/* Customer Info */}
        <View style={[commonStyles.section, { backgroundColor: colors.background, padding: spacing.lg }]}>
          <Text style={[commonStyles.text, { 
            color: colors.primary, 
            fontSize: fontSizes.md, 
            marginBottom: spacing.xs 
          }]}>
            Client
          </Text>
          <Text style={[commonStyles.title, { 
            fontSize: fontSizes.lg,
            fontWeight: 'bold',
            marginBottom: spacing.sm
          }]}>
            {customer.name}
          </Text>
          <Text style={[commonStyles.textLight, { fontSize: fontSizes.sm }]}>
            {type === 'gave' 
              ? 'Montant que vous avez donné (crédit accordé ou monnaie rendue)'
              : 'Montant que vous avez reçu (paiement ou remboursement de dette)'
            }
          </Text>
        </View>

        {/* Amount Input */}
        <View style={[commonStyles.section, { flex: 1, paddingHorizontal: spacing.lg }]}>
          <Text style={[commonStyles.text, { 
            fontSize: fontSizes.md, 
            fontWeight: '600',
            marginBottom: spacing.md 
          }]}>
            💰 Montant
          </Text>

          <TextInput
            style={[commonStyles.input, { 
              fontSize: fontSizes.xl,
              fontWeight: 'bold',
              textAlign: 'center',
              paddingVertical: spacing.lg,
              marginBottom: spacing.lg
            }]}
            value={amount}
            onChangeText={setAmount}
            placeholder="0"
            keyboardType="numeric"
            autoFocus
          />

          {/* Quick Amount Buttons */}
          <Text style={[commonStyles.text, { 
            fontSize: fontSizes.sm, 
            marginBottom: spacing.md,
            color: colors.textLight
          }]}>
            Montants rapides:
          </Text>

          <View style={{ 
            flexDirection: 'row', 
            flexWrap: 'wrap', 
            gap: spacing.sm, 
            marginBottom: spacing.lg 
          }}>
            {quickAmounts.map(quickAmount => (
              <TouchableOpacity
                key={quickAmount}
                style={[buttonStyles.outline, buttonStyles.small, { minWidth: '30%' }]}
                onPress={() => setAmount(quickAmount.toString())}
              >
                <Text style={{ color: colors.primary, fontSize: fontSizes.sm, textAlign: 'center' }}>
                  {formatCurrency(quickAmount)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Note Input */}
          <Text style={[commonStyles.text, { 
            fontSize: fontSizes.md, 
            fontWeight: '600',
            marginBottom: spacing.sm 
          }]}>
            📝 Note (optionnel)
          </Text>

          <TextInput
            style={[commonStyles.input, { 
              height: 80, 
              textAlignVertical: 'top',
              marginBottom: spacing.xl
            }]}
            value={note}
            onChangeText={setNote}
            placeholder="Ajoutez une note sur cette transaction..."
            multiline
          />

          {/* Preview */}
          {amount && parseFloat(amount) > 0 && (
            <View style={[commonStyles.card, { 
              backgroundColor: type === 'gave' ? colors.danger + '10' : colors.success + '10',
              borderColor: type === 'gave' ? colors.danger : colors.success,
              borderWidth: 1,
              marginBottom: spacing.lg
            }]}>
              <Text style={[commonStyles.text, { 
                color: type === 'gave' ? colors.danger : colors.success,
                fontSize: fontSizes.sm,
                marginBottom: spacing.xs
              }]}>
                Aperçu de la transaction:
              </Text>
              <Text style={[commonStyles.text, { 
                fontSize: fontSizes.lg,
                fontWeight: 'bold',
                color: type === 'gave' ? colors.danger : colors.success
              }]}>
                {type === 'gave' ? 'Vous donnez' : 'Vous recevez'}: {formatCurrency(parseFloat(amount))}
              </Text>
              {note && (
                <Text style={[commonStyles.textLight, { 
                  fontSize: fontSizes.sm,
                  marginTop: spacing.xs
                }]}>
                  Note: {note}
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Continue Button */}
        <View style={[commonStyles.section, { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg }]}>
          <TouchableOpacity
            style={[
              buttonStyles.primary, 
              { 
                backgroundColor: type === 'gave' ? colors.danger : colors.success,
                paddingVertical: spacing.lg,
                borderRadius: 15
              },
              (!amount || parseFloat(amount) <= 0) && { opacity: 0.5 }
            ]}
            onPress={handleContinue}
            disabled={!amount || parseFloat(amount) <= 0}
          >
            <Text style={[commonStyles.text, { 
              color: colors.secondary, 
              fontSize: fontSizes.md, 
              fontWeight: 'bold',
              textAlign: 'center'
            }]}>
              CONTINUER
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[buttonStyles.outline, { 
              marginTop: spacing.md,
              paddingVertical: spacing.lg,
              borderRadius: 15
            }]}
            onPress={() => router.back()}
          >
            <Text style={[commonStyles.text, { 
              color: colors.text, 
              fontSize: fontSizes.md, 
              fontWeight: 'bold',
              textAlign: 'center'
            }]}>
              ANNULER
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
