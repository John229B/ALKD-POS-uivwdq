
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
          {/* Header - Better contrast and visibility */}
          <View style={[
            commonStyles.header, 
            { 
              backgroundColor: colors.background, 
              borderBottomColor: colors.border,
              borderBottomWidth: 1,
              paddingVertical: spacing.lg,
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
                fontSize: fontSizes.xl,
                fontWeight: 'bold',
                textAlign: 'center'
              }]}>
                {type === 'gave' ? "J'AI DONNÉ" : "J'AI PRIS"}
              </Text>
              <Text style={[commonStyles.textLight, { 
                fontSize: fontSizes.sm,
                textAlign: 'center',
                marginTop: spacing.xs
              }]}>
                {type === 'gave' 
                  ? 'Crédit accordé ou monnaie rendue'
                  : 'Paiement reçu ou remboursement de dette'
                }
              </Text>
            </View>
            <View style={{ width: 44 }} />
          </View>

          {/* Customer Info - Better visibility */}
          <View style={[
            commonStyles.card, 
            { 
              backgroundColor: colors.background, 
              margin: spacing.lg,
              borderWidth: 2,
              borderColor: type === 'gave' ? colors.error + '30' : colors.success + '30',
              borderRadius: 15,
            }
          ]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
              <View style={{
                backgroundColor: colors.primary + '20',
                borderRadius: 25,
                padding: spacing.md,
                marginRight: spacing.md,
              }}>
                <Icon name="person" size={24} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[commonStyles.text, { 
                  color: colors.textLight, 
                  fontSize: fontSizes.sm, 
                  marginBottom: spacing.xs 
                }]}>
                  Client sélectionné
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
          </View>

          {/* Amount Input - Better design and visibility */}
          <View style={{ flex: 1, paddingHorizontal: spacing.lg }}>
            <View style={[
              commonStyles.card,
              {
                backgroundColor: colors.background,
                borderWidth: 2,
                borderColor: colors.border,
                marginBottom: spacing.lg,
                borderRadius: 15,
              }
            ]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
                <Text style={{ fontSize: 24, marginRight: spacing.sm }}>💰</Text>
                <Text style={[commonStyles.text, { 
                  fontSize: fontSizes.lg, 
                  fontWeight: 'bold',
                  color: colors.text,
                }]}>
                  Montant de la transaction
                </Text>
              </View>

              <TextInput
                style={[
                  commonStyles.input, 
                  { 
                    fontSize: fontSizes.xxl,
                    fontWeight: 'bold',
                    textAlign: 'center',
                    paddingVertical: spacing.xl,
                    marginBottom: spacing.lg,
                    backgroundColor: colors.backgroundAlt,
                    borderColor: amount ? (type === 'gave' ? colors.error : colors.success) : colors.border,
                    borderWidth: 3,
                    color: colors.text,
                    borderRadius: 12,
                  }
                ]}
                value={amount}
                onChangeText={setAmount}
                placeholder="0"
                placeholderTextColor={colors.textLight}
                keyboardType="numeric"
                autoFocus
              />

              {/* Quick Amount Buttons - Better visibility */}
              <Text style={[commonStyles.text, { 
                fontSize: fontSizes.md, 
                marginBottom: spacing.md,
                color: colors.text,
                fontWeight: '600',
              }]}>
                ⚡ Montants rapides
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
                        backgroundColor: amount === quickAmount.toString() ? colors.primary + '20' : colors.backgroundAlt,
                        borderColor: amount === quickAmount.toString() ? colors.primary : colors.border,
                        borderWidth: 2,
                        borderRadius: 10,
                        paddingVertical: spacing.md,
                      }
                    ]}
                    onPress={() => setAmount(quickAmount.toString())}
                    activeOpacity={0.7}
                  >
                    <Text style={{ 
                      color: amount === quickAmount.toString() ? colors.primary : colors.text, 
                      fontSize: fontSizes.sm, 
                      textAlign: 'center',
                      fontWeight: '600'
                    }}>
                      {formatCurrency(quickAmount)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Note Input - IMPROVED: Much more visible and prominent */}
            <View style={[
              commonStyles.card,
              {
                backgroundColor: colors.background,
                borderWidth: 2,
                borderColor: note ? colors.primary : colors.border,
                marginBottom: spacing.lg,
                borderRadius: 15,
              }
            ]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
                <Text style={{ fontSize: 24, marginRight: spacing.sm }}>📝</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[commonStyles.text, { 
                    fontSize: fontSizes.lg, 
                    fontWeight: 'bold',
                    color: colors.text,
                  }]}>
                    Note de transaction
                  </Text>
                  <Text style={[commonStyles.textLight, { 
                    fontSize: fontSizes.sm,
                    marginTop: spacing.xs
                  }]}>
                    Optionnel - Ajoutez des détails sur cette transaction
                  </Text>
                </View>
              </View>

              <TextInput
                style={[
                  commonStyles.input, 
                  { 
                    height: 100, 
                    textAlignVertical: 'top',
                    backgroundColor: colors.backgroundAlt,
                    borderColor: note ? colors.primary : colors.border,
                    borderWidth: 2,
                    color: colors.text,
                    fontSize: fontSizes.md,
                    borderRadius: 10,
                    paddingTop: spacing.md,
                  }
                ]}
                value={note}
                onChangeText={setNote}
                placeholder="Ex: Paiement partiel, Avance client, Retour produit, Remboursement..."
                placeholderTextColor={colors.textLight}
                multiline
                numberOfLines={4}
              />

              {/* Note Examples - Help users understand what to write */}
              <View style={{ 
                backgroundColor: colors.backgroundAlt, 
                borderRadius: 8, 
                padding: spacing.sm, 
                marginTop: spacing.sm 
              }}>
                <Text style={[commonStyles.textLight, { 
                  fontSize: fontSizes.xs, 
                  marginBottom: spacing.xs,
                  fontWeight: '600'
                }]}>
                  💡 Exemples de notes utiles:
                </Text>
                <Text style={[commonStyles.textLight, { fontSize: fontSizes.xs }]}>
                  • "Paiement partiel pour commande du 15/01"
                  {'\n'}• "Avance pour livraison prochaine"
                  {'\n'}• "Remboursement produit défectueux"
                  {'\n'}• "Règlement facture n°123"
                </Text>
              </View>
            </View>

            {/* Preview - Better visibility */}
            {amount && parseFloat(amount) > 0 && (
              <View style={[
                commonStyles.card, 
                { 
                  backgroundColor: type === 'gave' ? colors.error + '10' : colors.success + '10',
                  borderColor: type === 'gave' ? colors.error : colors.success,
                  borderWidth: 2,
                  marginBottom: spacing.lg,
                  borderRadius: 15,
                }
              ]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
                  <Text style={{ fontSize: 20, marginRight: spacing.sm }}>
                    {type === 'gave' ? '📤' : '📥'}
                  </Text>
                  <Text style={[commonStyles.text, { 
                    color: type === 'gave' ? colors.error : colors.success,
                    fontSize: fontSizes.md,
                    fontWeight: 'bold',
                  }]}>
                    Aperçu de la transaction
                  </Text>
                </View>
                
                <Text style={[commonStyles.text, { 
                  fontSize: fontSizes.xl,
                  fontWeight: 'bold',
                  color: type === 'gave' ? colors.error : colors.success,
                  marginBottom: spacing.sm
                }]}>
                  {type === 'gave' ? 'Vous donnez' : 'Vous recevez'}: {formatCurrency(parseFloat(amount))}
                </Text>
                
                {note && (
                  <View style={{
                    backgroundColor: colors.background,
                    borderRadius: 8,
                    padding: spacing.sm,
                    marginTop: spacing.sm,
                  }}>
                    <Text style={[commonStyles.textLight, { 
                      fontSize: fontSizes.xs,
                      marginBottom: spacing.xs,
                      fontWeight: '600'
                    }]}>
                      📋 Note ajoutée:
                    </Text>
                    <Text style={[commonStyles.text, { 
                      fontSize: fontSizes.sm,
                      color: colors.text,
                      fontStyle: 'italic'
                    }]}>
                      "{note}"
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Action Buttons - Better contrast and visibility */}
          <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.lg }}>
            <TouchableOpacity
              style={[
                buttonStyles.primary, 
                { 
                  backgroundColor: type === 'gave' ? colors.error : colors.success,
                  paddingVertical: spacing.xl,
                  borderRadius: 15,
                  marginBottom: spacing.md,
                  shadowColor: colors.text,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.2,
                  shadowRadius: 8,
                  elevation: 4,
                },
                (!amount || parseFloat(amount) <= 0) && { opacity: 0.5 }
              ]}
              onPress={handleContinue}
              disabled={!amount || parseFloat(amount) <= 0}
              activeOpacity={0.8}
            >
              <Text style={[commonStyles.text, { 
                color: colors.secondary, 
                fontSize: fontSizes.lg, 
                fontWeight: 'bold',
                textAlign: 'center'
              }]}>
                ✅ CONTINUER VERS LE PAIEMENT
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
                  borderWidth: 2,
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
                ❌ ANNULER
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
