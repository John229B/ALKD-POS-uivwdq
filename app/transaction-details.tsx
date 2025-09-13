
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { commonStyles, colors, buttonStyles, spacing, fontSizes } from '../styles/commonStyles';
import Icon from '../components/Icon';
import { getCustomers, getSales, getSettings, storeSales, storeCustomers, getProducts, storeProducts } from '../utils/storage';
import { Customer, Sale, AppSettings, Product } from '../types';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface TransactionDetails {
  id: string;
  date: Date;
  amount: number;
  type: 'gave' | 'took';
  paymentMethod: string;
  description: string;
  balance: number;
  saleId?: string;
  sale?: Sale;
}

export default function TransactionDetailsScreen() {
  const { customerId, transactionId } = useLocalSearchParams<{ customerId: string; transactionId: string }>();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [transaction, setTransaction] = useState<TransactionDetails | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editForm, setEditForm] = useState({
    amount: '',
    description: '',
    paymentMethod: 'cash',
  });
  const cardRef = useRef<View>(null);

  const loadData = useCallback(async () => {
    try {
      console.log('Loading transaction details for:', transactionId);
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

      setCustomer(foundCustomer);
      setSettings(settingsData);

      // Find the specific transaction
      const customerSales = salesData.filter(sale => sale.customerId === customerId);
      let foundTransaction: TransactionDetails | null = null;

      // Generate transactions to find the specific one
      customerSales.forEach(sale => {
        if (sale.items.length === 0 && sale.notes) {
          // Manual transaction
          if (sale.notes.includes("J'ai donné") && transactionId === `manual-gave-${sale.id}`) {
            foundTransaction = {
              id: `manual-gave-${sale.id}`,
              date: new Date(sale.createdAt),
              amount: sale.total,
              type: 'gave',
              paymentMethod: sale.paymentMethod,
              description: sale.notes,
              balance: 0,
              saleId: sale.id,
              sale: sale,
            };
          } else if (sale.notes.includes("J'ai pris") && transactionId === `manual-took-${sale.id}`) {
            foundTransaction = {
              id: `manual-took-${sale.id}`,
              date: new Date(sale.createdAt),
              amount: sale.total,
              type: 'took',
              paymentMethod: sale.paymentMethod,
              description: sale.notes,
              balance: 0,
              saleId: sale.id,
              sale: sale,
            };
          }
        } else {
          // Regular sale transaction
          if (transactionId === `sale-${sale.id}`) {
            foundTransaction = {
              id: `sale-${sale.id}`,
              date: new Date(sale.createdAt),
              amount: sale.total,
              type: 'gave',
              paymentMethod: 'credit',
              description: `Vente à crédit ${sale.receiptNumber} - ${sale.items.length} article(s)`,
              balance: 0,
              saleId: sale.id,
              sale: sale,
            };
          }
        }
      });

      if (!foundTransaction) {
        Alert.alert('Erreur', 'Transaction non trouvée');
        router.back();
        return;
      }

      setTransaction(foundTransaction);

      // Set edit form data
      setEditForm({
        amount: foundTransaction.amount.toString(),
        description: foundTransaction.description,
        paymentMethod: foundTransaction.paymentMethod,
      });

      // Calculate current balance
      let balance = 0;
      customerSales.forEach(sale => {
        if (sale.items.length === 0 && sale.notes) {
          if (sale.notes.includes("J'ai donné")) {
            balance += sale.total;
          } else if (sale.notes.includes("J'ai pris")) {
            balance -= sale.total;
          }
        } else {
          if (sale.paymentStatus === 'credit') {
            balance += sale.total;
          } else if (sale.paymentStatus === 'partial') {
            const unpaidAmount = sale.total - (sale.amountPaid || 0);
            balance += unpaidAmount;
          } else if (sale.paymentStatus === 'paid') {
            const overpayment = (sale.amountPaid || sale.total) - sale.total;
            if (overpayment > 0) {
              balance -= overpayment;
            }
          }
        }
      });

      setCurrentBalance(balance);
    } catch (error) {
      console.error('Error loading transaction details:', error);
      Alert.alert('Erreur', 'Erreur lors du chargement des données');
    }
  }, [customerId, transactionId]);

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

  const handleEdit = async () => {
    if (!transaction || !transaction.sale) {
      Alert.alert('Erreur', 'Transaction non modifiable');
      return;
    }

    const newAmount = parseFloat(editForm.amount);
    if (isNaN(newAmount) || newAmount <= 0) {
      Alert.alert('Erreur', 'Montant invalide');
      return;
    }

    try {
      console.log('Editing transaction:', transaction.id);
      
      const [salesData, customersData] = await Promise.all([
        getSales(),
        getCustomers(),
      ]);

      // Update the sale
      const updatedSales = salesData.map(sale => {
        if (sale.id === transaction.saleId) {
          return {
            ...sale,
            total: newAmount,
            notes: editForm.description,
            paymentMethod: editForm.paymentMethod,
            updatedAt: new Date(),
          };
        }
        return sale;
      });

      await storeSales(updatedSales);

      // Recalculate customer balance
      const customerSales = updatedSales.filter(sale => sale.customerId === customerId);
      let newBalance = 0;
      
      customerSales.forEach(sale => {
        if (sale.items.length === 0 && sale.notes) {
          if (sale.notes.includes("J'ai donné")) {
            newBalance += sale.total;
          } else if (sale.notes.includes("J'ai pris")) {
            newBalance -= sale.total;
          }
        } else {
          if (sale.paymentStatus === 'credit') {
            newBalance += sale.total;
          } else if (sale.paymentStatus === 'partial') {
            const unpaidAmount = sale.total - (sale.amountPaid || 0);
            newBalance += unpaidAmount;
          } else if (sale.paymentStatus === 'paid') {
            const overpayment = (sale.amountPaid || sale.total) - sale.total;
            if (overpayment > 0) {
              newBalance -= overpayment;
            }
          }
        }
      });

      // Update customer balance
      const updatedCustomers = customersData.map(c => {
        if (c.id === customerId) {
          return {
            ...c,
            creditBalance: newBalance,
            updatedAt: new Date(),
          };
        }
        return c;
      });

      await storeCustomers(updatedCustomers);

      setShowEditModal(false);
      Alert.alert('Succès', 'Transaction modifiée avec succès', [
        { text: 'OK', onPress: () => loadData() }
      ]);
    } catch (error) {
      console.error('Error editing transaction:', error);
      Alert.alert('Erreur', 'Erreur lors de la modification');
    }
  };

  const handleDelete = async () => {
    if (!transaction || !transaction.sale) {
      Alert.alert('Erreur', 'Transaction non supprimable');
      return;
    }

    try {
      console.log('Deleting transaction:', transaction.id);
      
      const [salesData, customersData, productsData] = await Promise.all([
        getSales(),
        getCustomers(),
        getProducts(),
      ]);

      // If it's a sale with products, restore stock
      if (transaction.sale.items && transaction.sale.items.length > 0) {
        const updatedProducts = productsData.map(product => {
          const saleItem = transaction.sale!.items.find(item => item.productId === product.id);
          if (saleItem) {
            return {
              ...product,
              stock: product.stock + saleItem.quantity,
              updatedAt: new Date(),
            };
          }
          return product;
        });
        await storeProducts(updatedProducts);
        console.log('Stock restored for products');
      }

      // Remove the sale
      const updatedSales = salesData.filter(sale => sale.id !== transaction.saleId);
      await storeSales(updatedSales);

      // Recalculate customer balance
      const customerSales = updatedSales.filter(sale => sale.customerId === customerId);
      let newBalance = 0;
      
      customerSales.forEach(sale => {
        if (sale.items.length === 0 && sale.notes) {
          if (sale.notes.includes("J'ai donné")) {
            newBalance += sale.total;
          } else if (sale.notes.includes("J'ai pris")) {
            newBalance -= sale.total;
          }
        } else {
          if (sale.paymentStatus === 'credit') {
            newBalance += sale.total;
          } else if (sale.paymentStatus === 'partial') {
            const unpaidAmount = sale.total - (sale.amountPaid || 0);
            newBalance += unpaidAmount;
          } else if (sale.paymentStatus === 'paid') {
            const overpayment = (sale.amountPaid || sale.total) - sale.total;
            if (overpayment > 0) {
              newBalance -= overpayment;
            }
          }
        }
      });

      // Update customer balance
      const updatedCustomers = customersData.map(c => {
        if (c.id === customerId) {
          return {
            ...c,
            creditBalance: newBalance,
            updatedAt: new Date(),
          };
        }
        return c;
      });

      await storeCustomers(updatedCustomers);

      setShowDeleteConfirm(false);
      Alert.alert('Succès', 'Transaction supprimée avec succès', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error('Error deleting transaction:', error);
      Alert.alert('Erreur', 'Erreur lors de la suppression');
    }
  };

  const generateShareMessage = (): string => {
    if (!transaction || !customer) return '';

    const products = transaction.sale?.items?.map(item => item.product?.name || 'Produit').join(', ') || 'Transaction manuelle';
    
    return `Bonjour ${customer.name},
Transaction du ${format(transaction.date, 'd MMMM yyyy', { locale: fr })} :
Montant : ${formatCurrency(transaction.amount)}
Produit(s) : ${products}
Solde actuel : ${currentBalance === 0 ? formatCurrency(0) : formatCurrency(Math.abs(currentBalance))}`;
  };

  const handleShare = async () => {
    try {
      console.log('Sharing transaction details');
      
      if (!cardRef.current) {
        Alert.alert('Erreur', 'Impossible de capturer la carte');
        return;
      }

      // Copy message to clipboard
      const message = generateShareMessage();
      await Clipboard.setStringAsync(message);
      console.log('Message copied to clipboard');

      // Capture the image
      const uri = await captureRef(cardRef.current, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });

      console.log('Image captured to:', uri);
      
      // Check if sharing is available
      const isAvailable = await Sharing.isAvailableAsync();
      
      if (isAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'ALKD-POS - Détails de transaction',
        });
        
        Alert.alert(
          'Partage réussi', 
          'L\'image a été partagée et le message a été copié dans le presse-papier.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Partage non disponible', 
          'Le message a été copié dans le presse-papier.',
          [{ text: 'OK' }]
        );
      }

    } catch (error) {
      console.error('Error sharing transaction:', error);
      Alert.alert('Erreur', 'Erreur lors du partage');
    }
  };

  if (!customer || !transaction) {
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
              DÉTAILS TRANSACTION
            </Text>
          </View>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.lg }}>
          {/* Transaction Card for Sharing */}
          <View 
            ref={cardRef}
            style={{
              backgroundColor: colors.secondary,
              borderRadius: 20,
              padding: spacing.xl,
              marginBottom: spacing.xl,
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
            
            <Text style={[commonStyles.text, { 
              fontSize: fontSizes.lg,
              fontWeight: 'bold',
              marginBottom: spacing.md,
              textAlign: 'center'
            }]}>
              Détails de transaction
            </Text>

            <View style={{ marginBottom: spacing.md }}>
              <Text style={[commonStyles.textLight, { fontSize: fontSizes.sm, marginBottom: spacing.xs }]}>
                Date
              </Text>
              <Text style={[commonStyles.text, { fontSize: fontSizes.md, fontWeight: 'bold' }]}>
                {format(transaction.date, 'd MMMM yyyy à HH:mm', { locale: fr })}
              </Text>
            </View>

            <View style={{ marginBottom: spacing.md }}>
              <Text style={[commonStyles.textLight, { fontSize: fontSizes.sm, marginBottom: spacing.xs }]}>
                Montant
              </Text>
              <Text style={[commonStyles.text, { 
                fontSize: fontSizes.xl,
                fontWeight: 'bold',
                color: transaction.type === 'gave' ? colors.danger : colors.success
              }]}>
                {formatCurrency(transaction.amount)}
              </Text>
            </View>

            <View style={{ marginBottom: spacing.md }}>
              <Text style={[commonStyles.textLight, { fontSize: fontSizes.sm, marginBottom: spacing.xs }]}>
                Type
              </Text>
              <Text style={[commonStyles.text, { fontSize: fontSizes.md, fontWeight: 'bold' }]}>
                {transaction.type === 'gave' ? "J'ai donné" : "J'ai pris"} • {getPaymentMethodLabel(transaction.paymentMethod)}
              </Text>
            </View>

            <View style={{ marginBottom: spacing.md }}>
              <Text style={[commonStyles.textLight, { fontSize: fontSizes.sm, marginBottom: spacing.xs }]}>
                Description
              </Text>
              <Text style={[commonStyles.text, { fontSize: fontSizes.md }]}>
                {transaction.description}
              </Text>
            </View>

            <View style={{ marginBottom: spacing.lg }}>
              <Text style={[commonStyles.textLight, { fontSize: fontSizes.sm, marginBottom: spacing.xs }]}>
                Solde actuel
              </Text>
              <Text style={[commonStyles.text, { 
                fontSize: fontSizes.lg,
                fontWeight: 'bold',
                color: currentBalance > 0 ? colors.danger : currentBalance < 0 ? colors.success : colors.text
              }]}>
                {currentBalance === 0 ? formatCurrency(0) : formatCurrency(Math.abs(currentBalance))}
                {currentBalance > 0 && ' (Dette)'}
                {currentBalance < 0 && ' (Crédit)'}
                {currentBalance === 0 && ' (Équilibré)'}
              </Text>
            </View>

            {/* Logo placeholder */}
            <View style={{ 
              alignItems: 'center',
              backgroundColor: colors.primary + '20',
              borderRadius: 25,
              padding: spacing.sm,
              alignSelf: 'center',
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

          {/* Product Details (if it's a sale) */}
          {transaction.sale?.items && transaction.sale.items.length > 0 && (
            <View style={[commonStyles.card, { marginBottom: spacing.xl, padding: spacing.lg }]}>
              <Text style={[commonStyles.text, { 
                fontSize: fontSizes.md,
                fontWeight: 'bold',
                marginBottom: spacing.md,
                color: colors.primary
              }]}>
                Produits vendus
              </Text>
              
              {transaction.sale.items.map((item, index) => (
                <View key={index} style={[commonStyles.row, { marginBottom: spacing.sm }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[commonStyles.text, { fontWeight: '600' }]}>
                      {item.product?.name || 'Produit'}
                    </Text>
                    <Text style={[commonStyles.textLight, { fontSize: fontSizes.sm }]}>
                      {item.quantity} × {formatCurrency(item.unitPrice)}
                    </Text>
                  </View>
                  <Text style={[commonStyles.text, { fontWeight: 'bold' }]}>
                    {formatCurrency(item.subtotal)}
                  </Text>
                </View>
              ))}
            </View>
          )}
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
              backgroundColor: colors.primary + '20',
              borderColor: colors.primary
            }]}
            onPress={() => setShowEditModal(true)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="create-outline" size={20} color={colors.primary} style={{ marginRight: spacing.xs }} />
              <Text style={[commonStyles.text, { 
                color: colors.primary,
                fontSize: fontSizes.sm,
                fontWeight: 'bold'
              }]}>
                ÉDITER
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[buttonStyles.outline, { 
              flex: 1,
              backgroundColor: colors.danger + '20',
              borderColor: colors.danger
            }]}
            onPress={() => setShowDeleteConfirm(true)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="trash-outline" size={20} color={colors.danger} style={{ marginRight: spacing.xs }} />
              <Text style={[commonStyles.text, { 
                color: colors.danger,
                fontSize: fontSizes.sm,
                fontWeight: 'bold'
              }]}>
                SUPPRIMER
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[buttonStyles.primary, { 
              flex: 1,
              backgroundColor: colors.success
            }]}
            onPress={handleShare}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="share-outline" size={20} color={colors.secondary} style={{ marginRight: spacing.xs }} />
              <Text style={[commonStyles.text, { 
                color: colors.secondary,
                fontSize: fontSizes.sm,
                fontWeight: 'bold'
              }]}>
                PARTAGER
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Edit Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={commonStyles.modalOverlay}>
          <View style={commonStyles.modalContent}>
            <View style={[commonStyles.row, { marginBottom: spacing.lg }]}>
              <Text style={commonStyles.subtitle}>
                ✏️ Modifier la transaction
              </Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Icon name="close" size={24} color={colors.textLight} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={{ marginBottom: spacing.md }}>
                <Text style={[commonStyles.text, { marginBottom: spacing.xs, fontWeight: '600' }]}>
                  💰 Montant
                </Text>
                <TextInput
                  style={commonStyles.input}
                  value={editForm.amount}
                  onChangeText={(text) => setEditForm({ ...editForm, amount: text })}
                  placeholder="Montant"
                  keyboardType="numeric"
                />
              </View>

              <View style={{ marginBottom: spacing.md }}>
                <Text style={[commonStyles.text, { marginBottom: spacing.xs, fontWeight: '600' }]}>
                  📝 Description
                </Text>
                <TextInput
                  style={[commonStyles.input, { height: 80, textAlignVertical: 'top' }]}
                  value={editForm.description}
                  onChangeText={(text) => setEditForm({ ...editForm, description: text })}
                  placeholder="Description de la transaction"
                  multiline
                />
              </View>

              <View style={{ marginBottom: spacing.lg }}>
                <Text style={[commonStyles.text, { marginBottom: spacing.xs, fontWeight: '600' }]}>
                  💳 Mode de paiement
                </Text>
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  {[
                    { key: 'cash', label: 'Espèces', icon: '💵' },
                    { key: 'mobile_money', label: 'Mobile Money', icon: '📱' },
                    { key: 'credit', label: 'Crédit', icon: '💳' },
                  ].map((method) => (
                    <TouchableOpacity
                      key={method.key}
                      style={[
                        buttonStyles.outline,
                        { 
                          flex: 1,
                          backgroundColor: editForm.paymentMethod === method.key ? colors.primary : colors.background,
                          borderColor: editForm.paymentMethod === method.key ? colors.primary : colors.border,
                        }
                      ]}
                      onPress={() => setEditForm({ ...editForm, paymentMethod: method.key })}
                    >
                      <Text style={[commonStyles.text, { 
                        color: editForm.paymentMethod === method.key ? colors.secondary : colors.text,
                        fontSize: fontSizes.xs,
                        textAlign: 'center'
                      }]}>
                        {method.icon} {method.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity
                style={[buttonStyles.primary, { marginBottom: spacing.sm }]}
                onPress={handleEdit}
              >
                <Text style={{ color: colors.secondary, fontSize: fontSizes.md, fontWeight: '600' }}>
                  ✅ Sauvegarder les modifications
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={buttonStyles.outline}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={{ color: colors.primary, fontSize: fontSizes.md, fontWeight: '600' }}>
                  ❌ Annuler
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteConfirm}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowDeleteConfirm(false)}
      >
        <View style={commonStyles.modalOverlay}>
          <View style={[commonStyles.modalContent, { maxHeight: 300 }]}>
            <View style={{ alignItems: 'center', marginBottom: spacing.lg }}>
              <View style={{
                backgroundColor: colors.danger + '20',
                borderRadius: 50,
                padding: spacing.lg,
                marginBottom: spacing.md,
              }}>
                <Icon name="warning-outline" size={40} color={colors.danger} />
              </View>
              <Text style={[commonStyles.subtitle, { textAlign: 'center', marginBottom: spacing.sm }]}>
                Supprimer la transaction
              </Text>
              <Text style={[commonStyles.textLight, { textAlign: 'center', fontSize: fontSizes.md }]}>
                Cette action est irréversible. La transaction sera supprimée et les stocks seront restaurés si applicable.
              </Text>
            </View>

            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <TouchableOpacity
                style={[buttonStyles.outline, { flex: 1 }]}
                onPress={() => setShowDeleteConfirm(false)}
              >
                <Text style={{ color: colors.primary, fontSize: fontSizes.md, fontWeight: '600' }}>
                  Annuler
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[buttonStyles.primary, { flex: 1, backgroundColor: colors.danger }]}
                onPress={handleDelete}
              >
                <Text style={{ color: colors.secondary, fontSize: fontSizes.md, fontWeight: '600' }}>
                  Supprimer
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
