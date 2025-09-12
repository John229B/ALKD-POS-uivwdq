
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { commonStyles, colors, buttonStyles, spacing, fontSizes } from '../styles/commonStyles';
import Icon from '../components/Icon';
import { getCustomers, getSales, storeCustomers, storeSales, getSettings } from '../utils/storage';
import { Customer, Sale, AppSettings } from '../types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import uuid from 'react-native-uuid';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

export default function TransactionSuccessScreen() {
  const params = useLocalSearchParams();
  const customerId = Array.isArray(params.customerId) ? decodeURIComponent(params.customerId[0]) : decodeURIComponent(params.customerId || '');
  const type = Array.isArray(params.type) ? decodeURIComponent(params.type[0]) : decodeURIComponent(params.type || '');
  const amount = Array.isArray(params.amount) ? decodeURIComponent(params.amount[0]) : decodeURIComponent(params.amount || '');
  const date = Array.isArray(params.date) ? decodeURIComponent(params.date[0]) : decodeURIComponent(params.date || '');
  const note = Array.isArray(params.note) ? decodeURIComponent(params.note[0]) : decodeURIComponent(params.note || '');
  const paymentMethod = Array.isArray(params.paymentMethod) ? decodeURIComponent(params.paymentMethod[0]) : decodeURIComponent(params.paymentMethod || '');
  
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [newBalance, setNewBalance] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    processTransaction();
  }, []);

  const processTransaction = async () => {
    try {
      console.log('Processing transaction:', { customerId, type, amount, paymentMethod });
      
      const [customersData, salesData, settingsData] = await Promise.all([
        getCustomers(),
        getSales(),
        getSettings(),
      ]);

      const foundCustomer = customersData.find(c => c.id === customerId);
      if (!foundCustomer) {
        Alert.alert('Erreur', 'Client non trouvé');
        router.back();
        return;
      }

      const numAmount = parseFloat(amount);
      const transactionDate = new Date(date);

      // Create a new sale record for this transaction
      const newSale: Sale = {
        id: uuid.v4() as string,
        customerId: foundCustomer.id,
        customer: foundCustomer,
        items: [],
        subtotal: numAmount,
        discount: 0,
        tax: 0,
        total: numAmount,
        paymentMethod: paymentMethod as any,
        paymentStatus: type === 'gave' ? 'credit' : 'paid',
        amountPaid: type === 'took' ? numAmount : 0,
        change: 0,
        notes: note || `Transaction ${type === 'gave' ? "J'ai donné" : "J'ai pris"}`,
        cashierId: 'admin-001', // TODO: Get from auth context
        createdAt: transactionDate,
        receiptNumber: `TXN-${Date.now()}`,
      };

      // Calculate new balance
      const balanceChange = type === 'gave' ? numAmount : -numAmount;
      const calculatedNewBalance = foundCustomer.creditBalance + balanceChange;

      // Update customer
      const updatedCustomer: Customer = {
        ...foundCustomer,
        creditBalance: Math.max(0, calculatedNewBalance),
        totalPurchases: type === 'gave' 
          ? foundCustomer.totalPurchases + numAmount 
          : foundCustomer.totalPurchases,
        updatedAt: new Date(),
      };

      // Save to storage
      const updatedCustomers = customersData.map(c => 
        c.id === foundCustomer.id ? updatedCustomer : c
      );
      const updatedSales = [...salesData, newSale];

      await Promise.all([
        storeCustomers(updatedCustomers),
        storeSales(updatedSales),
      ]);

      setCustomer(updatedCustomer);
      setSettings(settingsData);
      setNewBalance(updatedCustomer.creditBalance);
      setIsProcessing(false);

      console.log('Transaction processed successfully');
    } catch (error) {
      console.error('Error processing transaction:', error);
      Alert.alert('Erreur', 'Erreur lors du traitement de la transaction');
      router.back();
    }
  };

  const formatCurrency = (amount: number): string => {
    const currency = settings?.currency || 'XOF';
    const currencySymbols = { XOF: 'F CFA', USD: '$', EUR: '€' };
    return `${amount.toLocaleString()} ${currencySymbols[currency]}`;
  };

  const getPaymentMethodLabel = (method: string): string => {
    const labels = {
      cash: 'Especes',
      mobile_money: 'Mobile Money',
      credit: 'Credit',
    };
    return labels[method] || method;
  };

  const getBalanceColor = (balance: number): string => {
    if (balance > 0) return colors.danger; // Red for debt
    if (balance < 0) return colors.success; // Green for credit
    return colors.text;
  };

  const handleShare = async () => {
    try {
      console.log('Starting receipt sharing process...');
      
      // Create a clean receipt text without special characters that could cause encoding issues
      const receiptText = [
        '=== RECU DE TRANSACTION ===',
        '',
        settings?.companyName || 'ALKD-POS',
        format(new Date(date), 'dd/MM/yyyy a HH:mm'),
        '',
        `Client: ${customer?.name || 'N/A'}`,
        `${type === 'gave' ? "J'ai donne" : "J'ai pris"}: ${formatCurrency(parseFloat(amount))}`,
        `Mode: ${getPaymentMethodLabel(paymentMethod)}`,
        note ? `Note: ${note}` : '',
        '',
        `Nouveau solde: ${formatCurrency(Math.abs(newBalance))}`,
        newBalance > 0 ? '(Dette)' : newBalance < 0 ? '(Credit)' : '(Equilibre)',
        '',
        'Merci pour votre confiance!',
        '=========================='
      ].filter(line => line !== '').join('\n');

      console.log('Receipt text prepared:', receiptText);

      // Try to create a temporary file for sharing
      const fileName = `recu_${customer?.name?.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.txt`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;

      console.log('Creating file at:', fileUri);

      // Write the file with UTF-8 encoding
      await FileSystem.writeAsStringAsync(fileUri, receiptText, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      console.log('File created successfully');

      // Check if sharing is available
      if (await Sharing.isAvailableAsync()) {
        console.log('Sharing is available, attempting to share...');
        
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/plain',
          dialogTitle: 'Partager le recu',
          UTI: 'public.plain-text',
        });

        console.log('Sharing completed successfully');
      } else {
        console.log('Sharing not available on this device');
        Alert.alert('Information', 'Le partage n\'est pas disponible sur cet appareil');
      }

      // Clean up the temporary file
      try {
        await FileSystem.deleteAsync(fileUri, { idempotent: true });
        console.log('Temporary file cleaned up');
      } catch (cleanupError) {
        console.log('Could not clean up temporary file:', cleanupError);
      }

    } catch (error) {
      console.error('Error sharing receipt:', error);
      Alert.alert('Erreur', `Erreur lors du partage du recu: ${error.message || 'Erreur inconnue'}`);
    }
  };

  const handleFinish = () => {
    // Return to customer details
    router.replace({
      pathname: '/customer-details',
      params: { customerId: encodeURIComponent(customerId) },
    });
  };

  if (isProcessing || !customer) {
    return (
      <SafeAreaView style={commonStyles.container}>
        <View style={[commonStyles.content, { justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={[commonStyles.text, { marginBottom: spacing.md }]}>
            Traitement de la transaction...
          </Text>
          <View style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            borderWidth: 3,
            borderColor: colors.primary + '30',
            borderTopColor: colors.primary,
          }} />
        </View>
      </SafeAreaView>
    );
  }

  const numAmount = parseFloat(amount);
  const transactionDate = new Date(date);

  return (
    <SafeAreaView style={commonStyles.container}>
      <View style={commonStyles.content}>
        {/* Success Header */}
        <View style={[commonStyles.section, { alignItems: 'center', paddingVertical: spacing.xl }]}>
          <Text style={[commonStyles.title, { 
            color: colors.primary,
            fontSize: fontSizes.xl,
            fontWeight: 'bold',
            marginBottom: spacing.lg
          }]}>
            Transaction reussie!
          </Text>
        </View>

        {/* Receipt Card */}
        <View style={[commonStyles.section, { paddingHorizontal: spacing.lg, flex: 1 }]}>
          <View style={[
            commonStyles.card,
            {
              backgroundColor: colors.secondary,
              borderRadius: 20,
              padding: spacing.xl,
              borderWidth: 1,
              borderColor: colors.border,
              shadowColor: colors.text,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              elevation: 4,
            }
          ]}>
            {/* Company Header */}
            <View style={{ alignItems: 'center', marginBottom: spacing.lg }}>
              <Text style={[commonStyles.text, { 
                fontSize: fontSizes.lg,
                fontWeight: 'bold',
                color: colors.textLight,
                marginBottom: spacing.xs
              }]}>
                {settings?.companyName || 'POISSONNERIE ALKOADO ET'}
              </Text>
              <Text style={[commonStyles.text, { 
                fontSize: fontSizes.lg,
                fontWeight: 'bold',
                color: colors.textLight,
                marginBottom: spacing.sm
              }]}>
                FILS
              </Text>
              <Text style={[commonStyles.textLight, { fontSize: fontSizes.sm }]}>
                {format(transactionDate, "dd/MM/yyyy a HH:mm")}
              </Text>
            </View>

            {/* Transaction Details */}
            <View style={{ alignItems: 'center', marginBottom: spacing.lg }}>
              <Text style={[commonStyles.text, { 
                fontSize: fontSizes.lg,
                fontWeight: '600',
                marginBottom: spacing.sm,
                color: colors.text
              }]}>
                {type === 'gave' ? 'Nouveau montant donne' : 'Nouveau montant paye'}
              </Text>
              <Text style={[commonStyles.title, { 
                color: colors.success,
                fontSize: 32,
                fontWeight: 'bold'
              }]}>
                {formatCurrency(numAmount)}
              </Text>
            </View>

            {/* Customer Info */}
            <View style={{ alignItems: 'center', marginBottom: spacing.lg }}>
              <Text style={[commonStyles.text, { 
                fontSize: fontSizes.md,
                fontWeight: '600',
                color: colors.text
              }]}>
                {customer.name}
              </Text>
              {note && (
                <Text style={[commonStyles.textLight, { 
                  fontSize: fontSizes.sm,
                  marginTop: spacing.xs,
                  textAlign: 'center'
                }]}>
                  {note}
                </Text>
              )}
            </View>

            {/* Payment Method */}
            <View style={{ alignItems: 'center', marginBottom: spacing.lg }}>
              <View style={{
                backgroundColor: colors.primary + '20',
                borderRadius: 20,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
              }}>
                <Text style={[commonStyles.text, { 
                  color: colors.primary,
                  fontSize: fontSizes.sm,
                  fontWeight: '600'
                }]}>
                  {getPaymentMethodLabel(paymentMethod)}
                </Text>
              </View>
            </View>

            {/* New Balance */}
            <View style={{
              backgroundColor: colors.background,
              borderRadius: 15,
              padding: spacing.md,
              alignItems: 'center',
            }}>
              <Text style={[commonStyles.textLight, { 
                fontSize: fontSizes.sm,
                marginBottom: spacing.xs
              }]}>
                Nouveau solde
              </Text>
              <Text style={[commonStyles.text, { 
                color: getBalanceColor(newBalance),
                fontSize: fontSizes.lg,
                fontWeight: 'bold'
              }]}>
                {formatCurrency(Math.abs(newBalance))}
                {newBalance > 0 && ' (Dette)'}
                {newBalance < 0 && ' (Credit)'}
                {newBalance === 0 && ' (Equilibre)'}
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={[commonStyles.section, { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg }]}>
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <TouchableOpacity
              style={[buttonStyles.primary, { 
                flex: 1, 
                backgroundColor: colors.primary,
                borderRadius: 15,
                paddingVertical: spacing.lg
              }]}
              onPress={handleShare}
            >
              <Text style={[commonStyles.text, { 
                color: colors.secondary, 
                fontSize: fontSizes.md, 
                fontWeight: 'bold',
                textAlign: 'center'
              }]}>
                PARTAGER
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[buttonStyles.outline, { 
                flex: 1, 
                backgroundColor: colors.background,
                borderColor: colors.border,
                borderRadius: 15,
                paddingVertical: spacing.lg
              }]}
              onPress={handleFinish}
            >
              <Text style={[commonStyles.text, { 
                color: colors.text, 
                fontSize: fontSizes.md, 
                fontWeight: 'bold',
                textAlign: 'center'
              }]}>
                TERMINER
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
