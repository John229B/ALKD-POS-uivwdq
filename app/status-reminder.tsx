
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { commonStyles, colors, buttonStyles, spacing, fontSizes } from '../styles/commonStyles';
import Icon from '../components/Icon';
import { getCustomers, getSales, getSettings } from '../utils/storage';
import { Customer, Sale, AppSettings } from '../types';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import * as Clipboard from 'expo-clipboard';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function StatusReminderScreen() {
  const { customerId } = useLocalSearchParams<{ customerId: string }>();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [currentBalance, setCurrentBalance] = useState(0);
  const cardRef = useRef<View>(null);

  const loadData = useCallback(async () => {
    try {
      console.log('Loading data for payment reminder page');
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
        // Check if this is a manual transaction (J'ai pris/donné)
        if (sale.items.length === 0 && sale.notes) {
          if (sale.notes.includes("J'ai donné")) {
            balance += sale.total; // "J'ai donné" increases debt (positive balance)
          } else if (sale.notes.includes("J'ai pris")) {
            balance -= sale.total; // "J'ai pris" reduces debt (negative balance)
          }
        } else {
          // Regular sales transactions
          if (sale.paymentStatus === 'credit') {
            balance += sale.total; // Credit sale adds to debt
          } else if (sale.paymentStatus === 'partial') {
            const unpaidAmount = sale.total - (sale.amountPaid || 0);
            balance += unpaidAmount; // Only unpaid portion adds to debt
          } else if (sale.paymentStatus === 'paid') {
            // Check for overpayment
            const overpayment = (sale.amountPaid || sale.total) - sale.total;
            if (overpayment > 0) {
              balance -= overpayment; // Overpayment creates credit for customer
            }
          }
        }
      });

      setCurrentBalance(balance);
    } catch (error) {
      console.error('Error loading data:', error);
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

  const generateMessage = (): string => {
    let balanceText = '';
    let statusText = '';
    
    if (currentBalance === 0) {
      balanceText = formatCurrency(0);
      statusText = 'Votre compte est équilibré : ' + balanceText;
    } else if (currentBalance > 0) {
      balanceText = formatCurrency(Math.abs(currentBalance));
      statusText = "J'ai donné : " + balanceText;
    } else {
      balanceText = formatCurrency(Math.abs(currentBalance));
      statusText = "J'ai pris : " + balanceText;
    }
    
    return `Bonjour ${customer?.name},
Ceci est un rappel concernant votre solde :
${statusText}
Merci de régulariser votre situation dès que possible.`;
  };

  const handleShare = async () => {
    try {
      console.log('Capturing reminder card for sharing with message');
      
      if (!cardRef.current) {
        Alert.alert('Erreur', 'Impossible de capturer la carte');
        return;
      }

      // First copy the message to clipboard
      const message = generateMessage();
      await Clipboard.setStringAsync(message);
      console.log('Message copied to clipboard');

      // Capture the image directly to cache directory
      const fileName = `reminder_${Date.now()}.png`;
      
      console.log('Capturing image to cache directory');
      
      // Capture directly to the cache directory
      const uri = await captureRef(cardRef.current, {
        format: 'png',
        quality: 1,
        result: 'tmpfile', // This saves directly to a temporary file
      });

      console.log('Image captured to:', uri);
      
      // Check if sharing is available
      const isAvailable = await Sharing.isAvailableAsync();
      
      if (isAvailable) {
        console.log('Sharing reminder image using Expo Sharing');
        // Share the captured image directly
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'ALKD-POS - Rappel de paiement',
        });
        
        console.log('Image shared successfully');
        
        // Show alert about the message being in clipboard
        Alert.alert(
          'Partage réussi', 
          'L\'image a été partagée et le message a été copié dans le presse-papier. Vous pouvez maintenant le coller dans votre application de partage.',
          [{ text: 'OK' }]
        );
      } else {
        console.log('Sharing not available, using clipboard fallback');
        // Fallback: Just copy text to clipboard
        Alert.alert(
          'Partage non disponible', 
          'Le partage n\'est pas disponible sur cet appareil. Le message a été copié dans le presse-papier.',
          [{ text: 'OK' }]
        );
      }

    } catch (error) {
      console.error('Error sharing reminder card:', error);
      
      // Fallback: Copy text to clipboard
      try {
        const message = generateMessage();
        await Clipboard.setStringAsync(message);
        Alert.alert(
          'Erreur de partage', 
          'Erreur lors du partage de l\'image. Le message a été copié dans le presse-papier.',
          [{ text: 'OK' }]
        );
      } catch (clipboardError) {
        console.error('Error copying to clipboard:', clipboardError);
        Alert.alert('Erreur', 'Erreur lors du partage et de la copie');
      }
    }
  };

  const handleCancel = () => {
    console.log('Cancelling payment reminder - returning to customer details');
    // Navigate directly back to customer details page using replace to ensure proper navigation
    router.replace({
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
              RAPPEL DE PAIEMENT
            </Text>
          </View>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.lg }}>
          {/* Reminder Card */}
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
              Rappel de paiement
            </Text>

            {/* Current Balance Display - Fixed to show only current balance */}
            {currentBalance === 0 ? (
              <>
                <Text style={[commonStyles.text, { 
                  color: colors.success,
                  fontSize: fontSizes.xl,
                  fontWeight: 'bold',
                  marginBottom: spacing.sm,
                  textAlign: 'center'
                }]}>
                  {formatCurrency(0)}
                </Text>
                <Text style={[commonStyles.text, { 
                  color: colors.success,
                  fontSize: fontSizes.md,
                  fontWeight: 'bold',
                  textAlign: 'center'
                }]}>
                  Équilibré
                </Text>
              </>
            ) : currentBalance > 0 ? (
              <>
                <Text style={[commonStyles.text, { 
                  color: colors.danger,
                  fontSize: fontSizes.xl,
                  fontWeight: 'bold',
                  marginBottom: spacing.sm,
                  textAlign: 'center'
                }]}>
                  {formatCurrency(Math.abs(currentBalance))}
                </Text>
                <Text style={[commonStyles.text, { 
                  color: colors.danger,
                  fontSize: fontSizes.md,
                  fontWeight: 'bold',
                  textAlign: 'center'
                }]}>
                  J'ai donné
                </Text>
              </>
            ) : (
              <>
                <Text style={[commonStyles.text, { 
                  color: colors.success,
                  fontSize: fontSizes.xl,
                  fontWeight: 'bold',
                  marginBottom: spacing.sm,
                  textAlign: 'center'
                }]}>
                  {formatCurrency(Math.abs(currentBalance))}
                </Text>
                <Text style={[commonStyles.text, { 
                  color: colors.success,
                  fontSize: fontSizes.md,
                  fontWeight: 'bold',
                  textAlign: 'center'
                }]}>
                  J'ai pris
                </Text>
              </>
            )}

            {/* Logo placeholder */}
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
