
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
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
        {/* FIXED: Header with better contrast and alignment */}
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
              color: type === 'gave' ? colors.error : colors.success,
              fontSize: fontSizes.lg,
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

        <ScrollView 
          style={{ flex: 1 }} 
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* FIXED: Customer Info with better visibility and layout */}
          <View style={[
            commonStyles.card, 
            { 
              backgroundColor: colors.background, 
              margin: spacing.lg,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 12,
            }
          ]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{
                backgroundColor: colors.primary + '20',
                borderRadius: 20,
                padding: spacing.sm,
                marginRight: spacing.md,
              }}>
                <Icon name="person" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[commonStyles.textLight, { 
                  fontSize: fontSizes.sm, 
                  marginBottom: spacing.xs 
                }]}>
                  Client sélectionné
                </Text>
                <Text style={[commonStyles.title, { 
                  fontSize: fontSizes.md,
                  fontWeight: 'bold',
                  marginBottom: 0,
                  color: colors.text,
                }]}>
                  {customer.name}
                </Text>
              </View>
            </View>
          </View>

          {/* FIXED: Amount Input Section - Clean and organized */}
          <View style={{ paddingHorizontal: spacing.lg, flex: 1 }}>
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
              <Text style={[commonStyles.text, { 
                fontSize: fontSizes.md, 
                fontWeight: 'bold',
                color: colors.text,
                marginBottom: spacing.lg,
                textAlign: 'center',
              }]}>
                💰 Montant de la transaction
              </Text>

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
                    borderWidth: 2,
                    color: colors.text,
                    borderRadius: 10,
                  }
                ]}
                value={amount}
                onChangeText={setAmount}
                placeholder="0"
                placeholderTextColor={colors.textLight}
                keyboardType="numeric"
                autoFocus
              />

              {/* FIXED: Quick Amount Buttons - Better layout */}
              <Text style={[commonStyles.text, { 
                fontSize: fontSizes.sm, 
                marginBottom: spacing.md,
                color: colors.textLight,
                textAlign: 'center',
              }]}>
                Montants rapides
              </Text>

              <View style={{ 
                flexDirection: 'row', 
                flexWrap: 'wrap', 
                justifyContent: 'space-between',
                gap: spacing.sm, 
              }}>
                {quickAmounts.map(quickAmount => (
                  <TouchableOpacity
                    key={quickAmount}
                    style={[
                      { 
                        flex: 1,
                        minWidth: '30%',
                        backgroundColor: amount === quickAmount.toString() ? colors.primary + '20' : colors.backgroundAlt,
                        borderColor: amount === quickAmount.toString() ? colors.primary : colors.border,
                        borderWidth: 1,
                        borderRadius: 8,
                        paddingVertical: spacing.sm,
                        paddingHorizontal: spacing.xs,
                        alignItems: 'center',
                      }
                    ]}
                    onPress={() => setAmount(quickAmount.toString())}
                    activeOpacity={0.7}
                  >
                    <Text style={{ 
                      color: amount === quickAmount.toString() ? colors.primary : colors.text, 
                      fontSize: fontSizes.xs, 
                      textAlign: 'center',
                      fontWeight: '600'
                    }}>
                      {formatCurrency(quickAmount)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* FIXED: Note Input - Clean and well-organized */}
            <View style={[
              commonStyles.card,
              {
                backgroundColor: colors.background,
                borderWidth: 1,
                borderColor: note ? colors.primary : colors.border,
                marginBottom: spacing.lg,
                borderRadius: 12,
              }
            ]}>
              <Text style={[commonStyles.text, { 
                fontSize: fontSizes.md, 
                fontWeight: 'bold',
                color: colors.text,
                marginBottom: spacing.sm,
                textAlign: 'center',
              }]}>
                📝 Note (optionnelle)
              </Text>
              
              <Text style={[commonStyles.textLight, { 
                fontSize: fontSizes.sm,
                marginBottom: spacing.md,
                textAlign: 'center',
              }]}>
                Ajoutez des détails sur cette transaction
              </Text>

              <TextInput
                style={[
                  commonStyles.input, 
                  { 
                    height: 80, 
                    textAlignVertical: 'top',
                    backgroundColor: colors.backgroundAlt,
                    borderColor: note ? colors.primary : colors.border,
                    borderWidth: 1,
                    color: colors.text,
                    fontSize: fontSizes.sm,
                    borderRadius: 8,
                    paddingTop: spacing.sm,
                  }
                ]}
                value={note}
                onChangeText={setNote}
                placeholder="Ex: Paiement partiel, Avance client, Retour produit..."
                placeholderTextColor={colors.textLight}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* FIXED: Preview Section - Clean display */}
            {amount && parseFloat(amount) > 0 && (
              <View style={[
                commonStyles.card, 
                { 
                  backgroundColor: type === 'gave' ? colors.error + '10' : colors.success + '10',
                  borderColor: type === 'gave' ? colors.error : colors.success,
                  borderWidth: 1,
                  marginBottom: spacing.lg,
                  borderRadius: 12,
                }
              ]}>
                <View style={{ alignItems: 'center', marginBottom: spacing.sm }}>
                  <Text style={[commonStyles.text, { 
                    color: type === 'gave' ? colors.error : colors.success,
                    fontSize: fontSizes.md,
                    fontWeight: 'bold',
                  }]}>
                    Aperçu de la transaction
                  </Text>
                </View>
                
                <Text style={[commonStyles.text, { 
                  fontSize: fontSizes.lg,
                  fontWeight: 'bold',
                  color: type === 'gave' ? colors.error : colors.success,
                  textAlign: 'center',
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
                      fontWeight: '600',
                      textAlign: 'center',
                    }]}>
                      Note ajoutée:
                    </Text>
                    <Text style={[commonStyles.text, { 
                      fontSize: fontSizes.sm,
                      color: colors.text,
                      fontStyle: 'italic',
                      textAlign: 'center',
                    }]}>
                      "{note}"
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </ScrollView>

        {/* FIXED: Action Buttons - Better contrast and modern design */}
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
                paddingVertical: spacing.md,
                borderRadius: 12,
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
