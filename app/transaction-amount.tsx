
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
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
      <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]}>
        <View style={[commonStyles.content, { justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={[commonStyles.text, { color: colors.text }]}>Chargement...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={commonStyles.content}>
          {/* Header - FIXED: Better contrast and visibility */}
          <View style={[
            commonStyles.header, 
            { 
              backgroundColor: colors.background, 
              borderBottomColor: colors.border,
              borderBottomWidth: 1,
            }
          ]}>
            <TouchableOpacity 
              onPress={() => router.back()} 
              style={{ 
                marginRight: spacing.md,
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
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={[commonStyles.title, { 
                color: type === 'gave' ? colors.error : colors.success,
                fontSize: fontSizes.lg,
                fontWeight: 'bold',
                textAlign: 'center'
              }]}>
                {type === 'gave' ? "J'AI DONNÉ" : "J'AI PRIS"}
              </Text>
            </View>
            <View style={{ width: 44 }} />
          </View>

          {/* Customer Info - FIXED: Better visibility */}
          <View style={[
            commonStyles.card, 
            { 
              backgroundColor: colors.background, 
              margin: spacing.lg,
              borderWidth: 1,
              borderColor: colors.border,
            }
          ]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
              <View style={{
                backgroundColor: colors.primary + '20',
                borderRadius: 20,
                padding: spacing.sm,
                marginRight: spacing.md,
              }}>
                <Icon name="person" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[commonStyles.text, { 
                  color: colors.textLight, 
                  fontSize: fontSizes.sm, 
                  marginBottom: spacing.xs 
                }]}>
                  Client
                </Text>
                <Text style={[commonStyles.title, { 
                  fontSize: fontSizes.lg,
                  fontWeight: 'bold',
                  marginBottom: 0,
                  color: colors.text,
                }]}>
                  {customer.name}
                </Text>
              </View>
            </View>
            <Text style={[commonStyles.textLight, { fontSize: fontSizes.sm }]}>
              {type === 'gave' 
                ? 'Montant que vous avez donné (crédit accordé ou monnaie rendue)'
                : 'Montant que vous avez reçu (paiement ou remboursement de dette)'
              }
            </Text>
          </View>

          {/* Amount Input - FIXED: Better design and visibility */}
          <View style={{ flex: 1, paddingHorizontal: spacing.lg }}>
            <View style={[
              commonStyles.card,
              {
                backgroundColor: colors.background,
                borderWidth: 1,
                borderColor: colors.border,
                marginBottom: spacing.lg,
              }
            ]}>
              <Text style={[commonStyles.text, { 
                fontSize: fontSizes.md, 
                fontWeight: '600',
                marginBottom: spacing.md,
                color: colors.text,
              }]}>
                💰 Montant
              </Text>

              <TextInput
                style={[
                  commonStyles.input, 
                  { 
                    fontSize: fontSizes.xl,
                    fontWeight: 'bold',
                    textAlign: 'center',
                    paddingVertical: spacing.lg,
                    marginBottom: spacing.lg,
                    backgroundColor: colors.backgroundAlt,
                    borderColor: amount ? colors.primary : colors.border,
                    borderWidth: 2,
                    color: colors.text,
                  }
                ]}
                value={amount}
                onChangeText={setAmount}
                placeholder="0"
                placeholderTextColor={colors.textLight}
                keyboardType="numeric"
                autoFocus
              />

              {/* Quick Amount Buttons - FIXED: Better visibility */}
              <Text style={[commonStyles.text, { 
                fontSize: fontSizes.sm, 
                marginBottom: spacing.md,
                color: colors.textLight,
                fontWeight: '600',
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
                    style={[
                      buttonStyles.outline, 
                      buttonStyles.small, 
                      { 
                        minWidth: '30%',
                        backgroundColor: colors.backgroundAlt,
                        borderColor: colors.border,
                        borderWidth: 1,
                      }
                    ]}
                    onPress={() => setAmount(quickAmount.toString())}
                    activeOpacity={0.7}
                  >
                    <Text style={{ color: colors.text, fontSize: fontSizes.sm, textAlign: 'center' }}>
                      {formatCurrency(quickAmount)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Note Input - FIXED: Better design */}
            <View style={[
              commonStyles.card,
              {
                backgroundColor: colors.background,
                borderWidth: 1,
                borderColor: colors.border,
                marginBottom: spacing.lg,
              }
            ]}>
              <Text style={[commonStyles.text, { 
                fontSize: fontSizes.md, 
                fontWeight: '600',
                marginBottom: spacing.sm,
                color: colors.text,
              }]}>
                📝 Note (optionnel)
              </Text>

              <TextInput
                style={[
                  commonStyles.input, 
                  { 
                    height: 80, 
                    textAlignVertical: 'top',
                    backgroundColor: colors.backgroundAlt,
                    borderColor: colors.border,
                    borderWidth: 1,
                    color: colors.text,
                  }
                ]}
                value={note}
                onChangeText={setNote}
                placeholder="Ajoutez une note sur cette transaction..."
                placeholderTextColor={colors.textLight}
                multiline
              />
            </View>

            {/* Preview - FIXED: Better visibility */}
            {amount && parseFloat(amount) > 0 && (
              <View style={[
                commonStyles.card, 
                { 
                  backgroundColor: type === 'gave' ? colors.error + '10' : colors.success + '10',
                  borderColor: type === 'gave' ? colors.error : colors.success,
                  borderWidth: 2,
                  marginBottom: spacing.lg
                }
              ]}>
                <Text style={[commonStyles.text, { 
                  color: type === 'gave' ? colors.error : colors.success,
                  fontSize: fontSizes.sm,
                  marginBottom: spacing.xs,
                  fontWeight: '600',
                }]}>
                  Aperçu de la transaction:
                </Text>
                <Text style={[commonStyles.text, { 
                  fontSize: fontSizes.lg,
                  fontWeight: 'bold',
                  color: type === 'gave' ? colors.error : colors.success
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

          {/* Action Buttons - FIXED: Better contrast and visibility */}
          <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.lg }}>
            <TouchableOpacity
              style={[
                buttonStyles.primary, 
                { 
                  backgroundColor: type === 'gave' ? colors.error : colors.success,
                  paddingVertical: spacing.lg,
                  borderRadius: 15,
                  marginBottom: spacing.md,
                },
                (!amount || parseFloat(amount) <= 0) && { opacity: 0.5 }
              ]}
              onPress={handleContinue}
              disabled={!amount || parseFloat(amount) <= 0}
              activeOpacity={0.8}
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
              style={[
                buttonStyles.outline, 
                { 
                  paddingVertical: spacing.lg,
                  borderRadius: 15,
                  backgroundColor: colors.backgroundAlt,
                  borderColor: colors.border,
                  borderWidth: 1,
                }
              ]}
              onPress={() => router.back()}
              activeOpacity={0.7}
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
