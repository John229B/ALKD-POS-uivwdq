
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { commonStyles, colors, buttonStyles, spacing, fontSizes } from '../styles/commonStyles';
import Icon from '../components/Icon';
import { getCustomers, getSales, storeCustomers, storeSales, getSettings } from '../utils/storage';
import { Customer, Sale, AppSettings } from '../types';
import { useDashboardUpdater } from '../hooks/useCustomersSync';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import uuid from 'react-native-uuid';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { captureRef } from 'react-native-view-shot';

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
  const receiptRef = React.useRef<View>(null);
  const { triggerDashboardUpdate } = useDashboardUpdater();

  const processTransaction = useCallback(async () => {
    try {
      console.log('Processing transaction:', { customerId, type, amount, paymentMethod, note });
      
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

      // Calculate current balance from all sales
      const customerSales = salesData.filter(sale => sale.customerId === customerId);
      let currentBalance = 0;
      
      customerSales.forEach(sale => {
        // Check if this is a manual transaction (J'ai pris/donné)
        if (sale.items.length === 0 && sale.notes) {
          if (sale.notes.includes("J'ai donné")) {
            currentBalance += sale.total; // "J'ai donné" increases debt (positive balance)
          } else if (sale.notes.includes("J'ai pris")) {
            currentBalance -= sale.total; // "J'ai pris" reduces debt (negative balance)
          }
        } else {
          // Regular sales transactions
          if (sale.paymentStatus === 'credit') {
            currentBalance += sale.total; // Credit sale adds to debt
          } else if (sale.paymentStatus === 'partial') {
            const unpaidAmount = sale.total - (sale.amountPaid || 0);
            currentBalance += unpaidAmount; // Only unpaid portion adds to debt
          } else if (sale.paymentStatus === 'paid') {
            // Check for overpayment
            const overpayment = (sale.amountPaid || sale.total) - sale.total;
            if (overpayment > 0) {
              currentBalance -= overpayment; // Overpayment creates credit for customer
            }
          }
        }
      });

      // Create transaction description with note - IMPROVED
      let transactionDescription = `Transaction ${type === 'gave' ? "J'ai donné" : "J'ai pris"}`;
      if (note && note.trim()) {
        transactionDescription += ` - ${note.trim()}`;
      }

      // Create a new sale record for this transaction - FIXED with note
      const newSale: Sale = {
        id: uuid.v4() as string,
        customerId: foundCustomer.id,
        customer: foundCustomer,
        items: [], // Empty items array indicates manual transaction
        subtotal: numAmount,
        discount: 0,
        tax: 0,
        total: numAmount,
        paymentMethod: paymentMethod as any,
        paymentStatus: 'paid', // Always mark manual transactions as paid
        amountPaid: numAmount,
        change: 0,
        notes: transactionDescription, // Include the note in the transaction
        cashierId: 'admin-001', // TODO: Get from auth context
        createdAt: transactionDate,
        receiptNumber: `TXN-${Date.now()}`,
      };

      // Calculate new balance after this transaction
      const balanceChange = type === 'gave' ? numAmount : -numAmount;
      const calculatedNewBalance = currentBalance + balanceChange;

      // CORRECTED: Update customer using balance field (not creditBalance)
      const updatedCustomer: Customer = {
        ...foundCustomer,
        balance: calculatedNewBalance, // Use balance field consistently
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
      setNewBalance(calculatedNewBalance);
      setIsProcessing(false);

      // CORRECTED: Trigger dashboard update for real-time sync of daily totals
      console.log('Transaction: Triggering dashboard update for real-time sync');
      triggerDashboardUpdate();

      console.log('Transaction processed successfully. New balance:', calculatedNewBalance);
      console.log('Transaction note saved:', note);
    } catch (error) {
      console.error('Error processing transaction:', error);
      Alert.alert('Erreur', 'Erreur lors du traitement de la transaction');
      router.back();
    }
  }, [customerId, type, amount, paymentMethod, date, note, triggerDashboardUpdate]);

  useEffect(() => {
    processTransaction();
  }, [processTransaction]);

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

  const getBalanceColor = (balance: number): string => {
    if (balance > 0) return colors.danger; // Red for debt
    if (balance === 0) return colors.success; // Green for zero balance
    return colors.success; // Green for credit (negative balance)
  };

  const getBalanceStatus = (balance: number): string => {
    if (balance > 0) return 'Dette';
    if (balance === 0) return 'Équilibré';
    return 'Crédit';
  };

  const handleShare = async () => {
    try {
      console.log('Starting receipt sharing as image...');
      
      if (!receiptRef.current) {
        Alert.alert('Erreur', 'Impossible de capturer le reçu');
        return;
      }

      // Import captureRef dynamically since it might not be available on all platforms
      let captureRef: any;
      try {
        const viewShot = await import('react-native-view-shot');
        captureRef = viewShot.captureRef;
      } catch (importError) {
        console.log('react-native-view-shot not available, falling back to text sharing');
        await handleTextShare();
        return;
      }

      // Capture the receipt as an image
      const uri = await captureRef(receiptRef.current, {
        format: 'png',
        quality: 1.0,
        result: 'tmpfile',
      });

      console.log('Receipt captured as image:', uri);

      // Check if sharing is available
      if (await Sharing.isAvailableAsync()) {
        console.log('Sharing receipt image...');
        
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Partager le reçu',
        });

        console.log('Receipt image shared successfully');
      } else {
        console.log('Sharing not available on this device');
        Alert.alert('Information', 'Le partage n\'est pas disponible sur cet appareil');
      }

    } catch (error) {
      console.error('Error sharing receipt as image:', error);
      console.log('Falling back to text sharing...');
      await handleTextShare();
    }
  };

  const handleTextShare = async () => {
    try {
      // Fallback to text sharing if image capture fails
      const balanceStatus = getBalanceStatus(newBalance);
      const receiptText = [
        '=== REÇU DE TRANSACTION ===',
        '',
        settings?.companyName || 'ALKD-POS',
        format(new Date(date), 'dd/MM/yyyy à HH:mm'),
        '',
        `Client: ${customer?.name || 'N/A'}`,
        `${type === 'gave' ? "J'ai donné" : "J'ai pris"}: ${formatCurrency(parseFloat(amount))}`,
        `Mode: ${getPaymentMethodLabel(paymentMethod)}`,
        note ? `Note: ${note}` : '',
        '',
        `Nouveau solde: ${newBalance === 0 ? formatCurrency(0) : formatCurrency(Math.abs(newBalance))}`,
        `(${balanceStatus})`,
        '',
        'Merci pour votre confiance!',
        '=========================='
      ].filter(line => line !== '').join('\n');

      const fileName = `recu_${customer?.name?.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.txt`;
      
      // Use safe property access with fallback values
      const dir = (FileSystem as any).cacheDirectory || (FileSystem as any).documentDirectory || '';
      const fileUri = `${dir}${fileName}`;

      // Use safe encoding type access
      const encodingType = (FileSystem as any).EncodingType?.UTF8 || 'utf8';

      await FileSystem.writeAsStringAsync(fileUri, receiptText, {
        encoding: encodingType,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/plain',
          dialogTitle: 'Partager le reçu',
        });
      }

      // Clean up
      try {
        await FileSystem.deleteAsync(fileUri, { idempotent: true });
      } catch (cleanupError) {
        console.log('Could not clean up temporary file:', cleanupError);
      }

    } catch (error) {
      console.error('Error sharing receipt as text:', error);
      Alert.alert('Erreur', `Erreur lors du partage du reçu: ${error.message || 'Erreur inconnue'}`);
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
            ✅ Transaction réussie!
          </Text>
        </View>

        {/* Receipt Card - This will be captured as image */}
        <View style={[commonStyles.section, { paddingHorizontal: spacing.lg, flex: 1 }]}>
          <View 
            ref={receiptRef}
            style={[
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
            ]}
          >
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
                {format(transactionDate, "dd/MM/yyyy à HH:mm")}
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
                {type === 'gave' ? 'Nouveau montant donné' : 'Nouveau montant payé'}
              </Text>
              <Text style={[commonStyles.title, { 
                color: type === 'gave' ? colors.error : colors.success,
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
            </View>

            {/* Note Section - IMPROVED: More prominent display */}
            {note && note.trim() && (
              <View style={{
                backgroundColor: colors.background,
                borderRadius: 12,
                padding: spacing.md,
                marginBottom: spacing.lg,
                borderWidth: 1,
                borderColor: colors.border,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
                  <Text style={{ fontSize: 16, marginRight: spacing.xs }}>📝</Text>
                  <Text style={[commonStyles.text, { 
                    fontSize: fontSizes.sm,
                    fontWeight: '600',
                    color: colors.textLight
                  }]}>
                    Note de transaction
                  </Text>
                </View>
                <Text style={[commonStyles.text, { 
                  fontSize: fontSizes.md,
                  color: colors.text,
                  fontStyle: 'italic',
                  textAlign: 'center'
                }]}>
                  "{note.trim()}"
                </Text>
              </View>
            )}

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

            {/* New Balance - Fixed to show correct status */}
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
                {newBalance === 0 ? formatCurrency(0) : formatCurrency(Math.abs(newBalance))}
              </Text>
              <Text style={[commonStyles.textLight, { 
                fontSize: fontSizes.sm,
                color: getBalanceColor(newBalance),
                fontWeight: '600'
              }]}>
                ({getBalanceStatus(newBalance)})
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
                📤 PARTAGER
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
                ✅ TERMINER
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
