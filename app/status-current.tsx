
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { commonStyles, colors, buttonStyles, spacing, fontSizes } from '../styles/commonStyles';
import Icon from '../components/Icon';
import { getCustomers, getSales, getSettings } from '../utils/storage';
import { Customer, Sale, AppSettings } from '../types';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function StatusCurrentScreen() {
  const { customerId } = useLocalSearchParams<{ customerId: string }>();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [totalGave, setTotalGave] = useState(0);
  const [totalTook, setTotalTook] = useState(0);
  const [paymentsCount, setPaymentsCount] = useState(0);
  const cardRef = useRef<View>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      console.log('Loading data for current status page');
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

      // Calculate current balance and totals
      const customerSales = salesData.filter(sale => sale.customerId === customerId);
      let balance = 0;
      let gave = 0;
      let took = 0;
      let payments = 0;
      
      customerSales.forEach(sale => {
        if (sale.paymentStatus === 'credit') {
          balance += sale.total; // Debt increases balance
          gave += sale.total;
        } else if (sale.paymentStatus === 'paid') {
          balance -= sale.total; // Payment decreases balance
          took += sale.total;
          payments++;
        }
      });

      setCurrentBalance(balance);
      setTotalGave(gave);
      setTotalTook(took);
      setPaymentsCount(payments);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const formatCurrency = (amount: number): string => {
    const currency = settings?.currency || 'XOF';
    const currencySymbols = { XOF: 'F CFA', USD: '$', EUR: '€' };
    return `${amount.toLocaleString()} ${currencySymbols[currency]}`;
  };

  const generateMessage = (): string => {
    const balanceText = currentBalance === 0 
      ? formatCurrency(0)
      : formatCurrency(Math.abs(currentBalance));
    
    return `Bonjour ${customer?.name},
Voici la situation actuelle de votre compte :
Solde : ${balanceText}
Merci de vérifier vos opérations.`;
  };

  const handleShare = async () => {
    try {
      console.log('Capturing card for sharing with message');
      
      if (!cardRef.current) {
        Alert.alert('Erreur', 'Impossible de capturer la carte');
        return;
      }

      const uri = await captureRef(cardRef.current, {
        format: 'png',
        quality: 1,
      });

      const message = generateMessage();
      
      // Share both image and message together
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'Partager la situation du client',
        UTI: 'image/png',
      });

      console.log('Card and message shared successfully');
    } catch (error) {
      console.error('Error sharing card:', error);
      Alert.alert('Erreur', 'Erreur lors du partage');
    }
  };

  const handleCancel = () => {
    console.log('Cancelling status current - returning to customer details');
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
              SITUATION ACTUELLE
            </Text>
          </View>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.lg }}>
          {/* Status Card */}
          <View 
            ref={cardRef}
            style={{
              backgroundColor: colors.secondary,
              borderRadius: 20,
              padding: spacing.xl,
              marginBottom: spacing.xl,
              alignItems: 'center',
              shadowColor: colors.text,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              elevation: 5,
            }}
          >
            <Text style={[commonStyles.text, { 
              color: colors.primary,
              fontSize: fontSizes.sm,
              marginBottom: spacing.sm,
              textAlign: 'center'
            }]}>
              POISSONNERIE ALKOADO & FILS
            </Text>
            <Text style={[commonStyles.textLight, { 
              fontSize: fontSizes.xs,
              marginBottom: spacing.lg,
              textAlign: 'center'
            }]}>
              {format(new Date(), 'd MMMM à HH:mm', { locale: fr })}
            </Text>

            <Text style={[commonStyles.text, { 
              fontSize: fontSizes.lg,
              fontWeight: 'bold',
              marginBottom: spacing.sm,
              textAlign: 'center'
            }]}>
              Balance nette
            </Text>

            <Text style={[commonStyles.text, { 
              color: currentBalance > 0 ? colors.danger : colors.success,
              fontSize: fontSizes.xl,
              fontWeight: 'bold',
              marginBottom: spacing.lg,
              textAlign: 'center'
            }]}>
              {currentBalance === 0 ? formatCurrency(0) : formatCurrency(Math.abs(currentBalance))}
            </Text>

            {/* Balance Details */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%' }}>
              <View style={{ alignItems: 'center', flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs }}>
                  <Icon name="arrow-up" size={16} color={colors.success} />
                  <Text style={[commonStyles.text, { 
                    color: colors.success,
                    fontSize: fontSizes.md,
                    fontWeight: 'bold',
                    marginLeft: spacing.xs
                  }]}>
                    {formatCurrency(totalTook)}
                  </Text>
                </View>
                <Text style={[commonStyles.textLight, { fontSize: fontSizes.xs }]}>
                  {paymentsCount} Paiements
                </Text>
              </View>

              <View style={{ alignItems: 'center', flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs }}>
                  <Icon name="arrow-down" size={16} color={colors.danger} />
                  <Text style={[commonStyles.text, { 
                    color: colors.danger,
                    fontSize: fontSizes.md,
                    fontWeight: 'bold',
                    marginLeft: spacing.xs
                  }]}>
                    {formatCurrency(totalGave)}
                  </Text>
                </View>
                <Text style={[commonStyles.textLight, { fontSize: fontSizes.xs }]}>
                  Paiements
                </Text>
              </View>
            </View>

            {/* Logo placeholder - Changed from "Mahaal" to "ALKD-POS" */}
            <View style={{ 
              marginTop: spacing.lg,
              backgroundColor: colors.primary + '20',
              borderRadius: 25,
              padding: spacing.sm,
            }}>
              <Text style={[commonStyles.text, { 
                color: colors.primary,
                fontSize: fontSizes.sm,
                fontWeight: 'bold'
              }]}>
                ALKD-POS
              </Text>
            </View>
          </View>

          {/* Message Section */}
          <View style={{ marginBottom: spacing.xl }}>
            <Text style={[commonStyles.text, { 
              color: colors.primary,
              fontSize: fontSizes.md,
              fontWeight: 'bold',
              marginBottom: spacing.md
            }]}>
              VOTRE MESSAGE
            </Text>
            
            <View style={[commonStyles.card, { padding: spacing.lg }]}>
              <Text style={[commonStyles.text, { 
                fontSize: fontSizes.md,
                lineHeight: 24
              }]}>
                {generateMessage()}
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Action Buttons */}
        <View style={{ 
          padding: spacing.lg,
          flexDirection: 'row',
          gap: spacing.md
        }}>
          <TouchableOpacity
            style={[buttonStyles.outline, { 
              flex: 1,
              backgroundColor: colors.danger,
              borderColor: colors.danger
            }]}
            onPress={handleCancel}
          >
            <Text style={[commonStyles.text, { 
              color: colors.secondary,
              fontSize: fontSizes.md,
              fontWeight: 'bold',
              textAlign: 'center'
            }]}>
              ANNULER
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[buttonStyles.primary, { 
              flex: 1,
              backgroundColor: colors.primary
            }]}
            onPress={handleShare}
          >
            <Text style={[commonStyles.text, { 
              color: colors.secondary,
              fontSize: fontSizes.md,
              fontWeight: 'bold',
              textAlign: 'center'
            }]}>
              ENVOYER
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
