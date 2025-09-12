
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Image, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { commonStyles, colors, buttonStyles, spacing, fontSizes } from '../styles/commonStyles';
import Icon from '../components/Icon';
import { getSales, getSettings, getBluetoothPrinters, formatQuantityWithUnit } from '../utils/storage';
import { Sale, AppSettings, BluetoothPrinter, UNITS_OF_MEASUREMENT } from '../types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import * as Sharing from 'expo-sharing';
import * as Print from 'react-native-print';
import { captureRef } from 'react-native-view-shot';

export default function SaleTicketScreen() {
  const params = useLocalSearchParams();
  const saleId = Array.isArray(params.saleId) ? params.saleId[0] : params.saleId;

  const [sale, setSale] = useState<Sale | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [printers, setPrinters] = useState<BluetoothPrinter[]>([]);
  const [loading, setLoading] = useState(true);
  const ticketRef = useRef<View>(null);

  const loadData = useCallback(async () => {
    try {
      console.log('Loading sale ticket data for sale:', saleId);
      
      if (!saleId) {
        console.error('No sale ID provided');
        Alert.alert('Erreur', 'ID de vente manquant');
        router.back();
        return;
      }

      const [salesData, settingsData, printersData] = await Promise.all([
        getSales(),
        getSettings(),
        getBluetoothPrinters(),
      ]);

      const foundSale = salesData.find(s => s.id === saleId);
      if (!foundSale) {
        console.error('Sale not found:', saleId);
        Alert.alert('Erreur', 'Vente non trouvée');
        router.back();
        return;
      }

      setSale(foundSale);
      setSettings(settingsData);
      setPrinters(printersData);
      console.log('Sale ticket data loaded successfully');
    } catch (error) {
      console.error('Error loading sale ticket data:', error);
      Alert.alert('Erreur', 'Erreur lors du chargement des données');
      router.back();
    } finally {
      setLoading(false);
    }
  }, [saleId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const formatCurrency = useCallback((amount: number): string => {
    if (!settings) return `${amount}`;
    const currency = settings.currency;
    const currencySymbols = {
      XOF: 'F CFA',
      USD: '$',
      EUR: '€',
      GBP: '£',
      JPY: '¥',
      CAD: 'C$',
      AUD: 'A$',
    };
    return `${amount.toLocaleString()} ${currencySymbols[currency] || currency}`;
  }, [settings]);

  const getPaymentMethodLabel = (method: string): string => {
    const labels = {
      cash: 'Espèces',
      mobile_money: 'Mobile Money',
      credit: 'À crédit',
    };
    return labels[method] || method;
  };

  const getUnitInfo = useCallback((unitId: string) => {
    const predefinedUnit = UNITS_OF_MEASUREMENT.find(u => u.id === unitId);
    return {
      symbol: predefinedUnit ? predefinedUnit.symbol : unitId,
      allowsFractions: predefinedUnit ? predefinedUnit.allowsFractions : true,
    };
  }, []);

  const handlePrint = async () => {
    try {
      console.log('Starting ticket printing...');
      
      const defaultPrinter = printers.find(p => p.isDefault);
      if (!defaultPrinter) {
        Alert.alert(
          'Aucune imprimante',
          'Aucune imprimante par défaut configurée. Voulez-vous configurer une imprimante ?',
          [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Configurer', onPress: () => router.push('/printers') },
          ]
        );
        return;
      }

      // Generate HTML content for printing
      const htmlContent = generatePrintableHTML();
      
      // Use react-native-print for printing
      await Print.print({
        html: htmlContent,
      });

      console.log('Ticket printed successfully');
      Alert.alert('Succès', 'Ticket imprimé avec succès');
    } catch (error) {
      console.error('Error printing ticket:', error);
      Alert.alert('Erreur', 'Erreur lors de l\'impression du ticket');
    }
  };

  const handleSharePDF = async () => {
    try {
      console.log('Starting PDF sharing...');
      
      if (!ticketRef.current) {
        Alert.alert('Erreur', 'Impossible de capturer le ticket');
        return;
      }

      // Capture the ticket as an image
      const uri = await captureRef(ticketRef.current, {
        format: 'png',
        quality: 1.0,
        result: 'tmpfile',
      });

      console.log('Ticket captured as image:', uri);

      // Share the image
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Partager le ticket',
        });
        console.log('Ticket shared successfully');
      } else {
        Alert.alert('Information', 'Le partage n\'est pas disponible sur cet appareil');
      }
    } catch (error) {
      console.error('Error sharing ticket:', error);
      Alert.alert('Erreur', 'Erreur lors du partage du ticket');
    }
  };

  const generatePrintableHTML = (): string => {
    if (!sale || !settings) return '';

    const { ticketSettings } = settings;
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: monospace; font-size: 12px; margin: 0; padding: 20px; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .separator { border-top: 1px dashed #000; margin: 10px 0; }
          .row { display: flex; justify-content: space-between; margin: 5px 0; }
          .logo { max-width: 60px; max-height: 60px; }
        </style>
      </head>
      <body>
        ${ticketSettings.showLogo && settings.logoUrl ? `<div class="center"><img src="${settings.logoUrl}" class="logo" /></div>` : ''}
        ${ticketSettings.showCompanyName ? `<div class="center bold">${settings.companyName}</div>` : ''}
        ${ticketSettings.showAddress && settings.companyAddress ? `<div class="center">${settings.companyAddress}</div>` : ''}
        ${ticketSettings.showPhone && settings.companyPhone ? `<div class="center">Tél: ${settings.companyPhone}</div>` : ''}
        ${ticketSettings.showEmail && settings.companyEmail ? `<div class="center">Email: ${settings.companyEmail}</div>` : ''}
        
        <div class="separator"></div>
        
        ${ticketSettings.showReceiptNumber ? `<div class="center bold">Ticket N°: ${sale.receiptNumber}</div>` : ''}
        ${ticketSettings.showDateTime ? `<div class="center">${format(new Date(sale.createdAt), 'dd/MM/yyyy HH:mm', { locale: fr })}</div>` : ''}
        ${ticketSettings.showEmployeeName && sale.cashier ? `<div class="center">Employé: ${sale.cashier.username}</div>` : ''}
        ${sale.customer ? `<div class="center">Client: ${sale.customer.name}</div>` : ''}
        
        <div class="separator"></div>
        
        <div class="center bold">ARTICLES</div>
        <div class="separator"></div>
        
        ${sale.items.map(item => {
          const unitInfo = getUnitInfo(item.product?.unit || 'pièce');
          return `
            <div class="row">
              <div>${item.product?.name || 'Produit'}</div>
              <div>${formatCurrency(item.subtotal)}</div>
            </div>
            <div style="font-size: 10px; margin-left: 10px;">
              ${formatQuantityWithUnit(item.quantity, unitInfo.symbol)} x ${formatCurrency(item.unitPrice)}
            </div>
          `;
        }).join('')}
        
        <div class="separator"></div>
        
        <div class="row">
          <div>Sous-total:</div>
          <div>${formatCurrency(sale.subtotal)}</div>
        </div>
        
        ${sale.discount > 0 ? `
          <div class="row">
            <div>Remise:</div>
            <div>-${formatCurrency(sale.discount)}</div>
          </div>
        ` : ''}
        
        ${ticketSettings.showTax && sale.tax > 0 ? `
          <div class="row">
            <div>TVA:</div>
            <div>${formatCurrency(sale.tax)}</div>
          </div>
        ` : ''}
        
        <div class="row bold">
          <div>TOTAL:</div>
          <div>${formatCurrency(sale.total)}</div>
        </div>
        
        <div class="separator"></div>
        
        <div class="row">
          <div>Mode de paiement:</div>
          <div>${getPaymentMethodLabel(sale.paymentMethod)}</div>
        </div>
        
        <div class="row">
          <div>Montant payé:</div>
          <div>${formatCurrency(sale.amountPaid)}</div>
        </div>
        
        ${sale.change > 0 ? `
          <div class="row">
            <div>Monnaie:</div>
            <div>${formatCurrency(sale.change)}</div>
          </div>
        ` : ''}
        
        <div class="separator"></div>
        
        ${ticketSettings.showThankYouMessage ? `
          <div class="center">
            ${settings.customThankYouMessage || settings.receiptFooter || 'Merci pour votre achat !'}
          </div>
        ` : ''}
      </body>
      </html>
    `;
  };

  const handleNewSale = () => {
    router.replace('/(tabs)/pos');
  };

  if (loading || !sale || !settings) {
    return (
      <SafeAreaView style={commonStyles.container}>
        <View style={[commonStyles.content, { justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={[commonStyles.text, { marginBottom: spacing.md }]}>
            Chargement du ticket...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Ticket de vente</Text>
          <Text style={styles.headerSubtitle}>Reçu N° {sale.receiptNumber}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handlePrint} style={styles.headerButton}>
            <Icon name="print" size={20} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSharePDF} style={styles.headerButton}>
            <Icon name="share" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Success Banner */}
        <View style={styles.successBanner}>
          <Icon name="checkmark-circle" size={32} color={colors.success} />
          <Text style={styles.successTitle}>Vente réussie !</Text>
          <Text style={styles.successSubtitle}>
            Total: {formatCurrency(sale.total)}
          </Text>
          {sale.change > 0 && (
            <Text style={styles.changeText}>
              Monnaie: {formatCurrency(sale.change)}
            </Text>
          )}
        </View>

        {/* Ticket Preview */}
        <View style={styles.ticketContainer}>
          <View 
            ref={ticketRef}
            style={styles.ticketContent}
          >
            {/* Company Logo */}
            {settings.ticketSettings.showLogo && settings.logoUrl && (
              <View style={styles.logoContainer}>
                <Image source={{ uri: settings.logoUrl }} style={styles.logo} />
              </View>
            )}

            {/* Company Name */}
            {settings.ticketSettings.showCompanyName && (
              <Text style={styles.companyName}>{settings.companyName}</Text>
            )}

            {/* Company Address */}
            {settings.ticketSettings.showAddress && settings.companyAddress && (
              <Text style={styles.companyInfo}>{settings.companyAddress}</Text>
            )}

            {/* Company Phone */}
            {settings.ticketSettings.showPhone && settings.companyPhone && (
              <Text style={styles.companyInfo}>Tél: {settings.companyPhone}</Text>
            )}

            {/* Company Email */}
            {settings.ticketSettings.showEmail && settings.companyEmail && (
              <Text style={styles.companyInfo}>Email: {settings.companyEmail}</Text>
            )}

            <View style={styles.separator} />

            {/* Receipt Number */}
            {settings.ticketSettings.showReceiptNumber && (
              <Text style={styles.receiptNumber}>Ticket N°: {sale.receiptNumber}</Text>
            )}

            {/* Date and Time */}
            {settings.ticketSettings.showDateTime && (
              <Text style={styles.dateTime}>
                {format(new Date(sale.createdAt), 'dd/MM/yyyy HH:mm', { locale: fr })}
              </Text>
            )}

            {/* Employee Name */}
            {settings.ticketSettings.showEmployeeName && sale.cashier && (
              <Text style={styles.employeeName}>Employé: {sale.cashier.username}</Text>
            )}

            {/* Customer Name */}
            {sale.customer && (
              <Text style={styles.customerName}>Client: {sale.customer.name}</Text>
            )}

            <View style={styles.separator} />

            {/* Items Header */}
            <Text style={styles.sectionTitle}>ARTICLES</Text>
            <View style={styles.separator} />

            {/* Items List */}
            {sale.items.map((item, index) => {
              const unitInfo = getUnitInfo(item.product?.unit || 'pièce');
              return (
                <View key={index} style={styles.itemRow}>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{item.product?.name || 'Produit'}</Text>
                    <Text style={styles.itemDetails}>
                      {formatQuantityWithUnit(item.quantity, unitInfo.symbol)} x {formatCurrency(item.unitPrice)}
                    </Text>
                  </View>
                  <Text style={styles.itemTotal}>{formatCurrency(item.subtotal)}</Text>
                </View>
              );
            })}

            <View style={styles.separator} />

            {/* Totals */}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Sous-total:</Text>
              <Text style={styles.totalValue}>{formatCurrency(sale.subtotal)}</Text>
            </View>

            {sale.discount > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Remise:</Text>
                <Text style={[styles.totalValue, { color: colors.success }]}>-{formatCurrency(sale.discount)}</Text>
              </View>
            )}

            {settings.ticketSettings.showTax && sale.tax > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>TVA ({settings.taxRate}%):</Text>
                <Text style={styles.totalValue}>{formatCurrency(sale.tax)}</Text>
              </View>
            )}

            <View style={styles.totalRow}>
              <Text style={styles.grandTotalLabel}>TOTAL:</Text>
              <Text style={styles.grandTotalValue}>{formatCurrency(sale.total)}</Text>
            </View>

            <View style={styles.separator} />

            {/* Payment Info */}
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Mode de paiement:</Text>
              <Text style={styles.paymentValue}>{getPaymentMethodLabel(sale.paymentMethod)}</Text>
            </View>

            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Montant payé:</Text>
              <Text style={styles.paymentValue}>{formatCurrency(sale.amountPaid)}</Text>
            </View>

            {sale.change > 0 && (
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Monnaie:</Text>
                <Text style={styles.paymentValue}>{formatCurrency(sale.change)}</Text>
              </View>
            )}

            <View style={styles.separator} />

            {/* Thank You Message */}
            {settings.ticketSettings.showThankYouMessage && (
              <Text style={styles.thankYouMessage}>
                {settings.customThankYouMessage || settings.receiptFooter || 'Merci pour votre achat !'}
              </Text>
            )}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[buttonStyles.primary, styles.actionButton]}
            onPress={handlePrint}
          >
            <Icon name="print" size={20} color={colors.secondary} />
            <Text style={styles.actionButtonText}>Imprimer</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[buttonStyles.outline, styles.actionButton]}
            onPress={handleSharePDF}
          >
            <Icon name="share" size={20} color={colors.primary} />
            <Text style={[styles.actionButtonText, { color: colors.primary }]}>Partager PDF</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[buttonStyles.primary, styles.actionButton, { backgroundColor: colors.success }]}
            onPress={handleNewSale}
          >
            <Icon name="add" size={20} color={colors.secondary} />
            <Text style={styles.actionButtonText}>Nouvelle vente</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  backButton: {
    padding: spacing.sm,
    marginRight: spacing.sm,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: fontSizes.xl,
    fontWeight: '700',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: fontSizes.sm,
    color: colors.textLight,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  headerButton: {
    padding: spacing.sm,
  },
  scrollView: {
    flex: 1,
  },
  successBanner: {
    alignItems: 'center',
    backgroundColor: colors.success + '10',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.success + '30',
  },
  successTitle: {
    fontSize: fontSizes.xl,
    fontWeight: '700',
    color: colors.success,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  successSubtitle: {
    fontSize: fontSizes.lg,
    fontWeight: '600',
    color: colors.text,
  },
  changeText: {
    fontSize: fontSizes.md,
    color: colors.textLight,
    marginTop: spacing.xs,
  },
  ticketContainer: {
    margin: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  ticketContent: {
    alignItems: 'center',
    backgroundColor: colors.secondary,
    padding: spacing.lg,
    borderRadius: 8,
  },
  logoContainer: {
    marginBottom: spacing.md,
  },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: colors.background,
  },
  companyName: {
    fontSize: fontSizes.lg,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  companyInfo: {
    fontSize: fontSizes.sm,
    color: colors.textLight,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  separator: {
    width: '100%',
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  receiptNumber: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  dateTime: {
    fontSize: fontSizes.sm,
    color: colors.textLight,
    marginBottom: spacing.xs,
  },
  employeeName: {
    fontSize: fontSizes.sm,
    color: colors.textLight,
    marginBottom: spacing.xs,
  },
  customerName: {
    fontSize: fontSizes.sm,
    color: colors.textLight,
  },
  sectionTitle: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
    width: '100%',
  },
  itemInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  itemName: {
    fontSize: fontSizes.sm,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 2,
  },
  itemDetails: {
    fontSize: fontSizes.xs,
    color: colors.textLight,
  },
  itemTotal: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: colors.text,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
    width: '100%',
  },
  totalLabel: {
    fontSize: fontSizes.sm,
    color: colors.text,
  },
  totalValue: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: colors.text,
  },
  grandTotalLabel: {
    fontSize: fontSizes.md,
    fontWeight: '700',
    color: colors.text,
  },
  grandTotalValue: {
    fontSize: fontSizes.md,
    fontWeight: '700',
    color: colors.primary,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
    width: '100%',
  },
  paymentLabel: {
    fontSize: fontSizes.sm,
    color: colors.textLight,
  },
  paymentValue: {
    fontSize: fontSizes.sm,
    fontWeight: '500',
    color: colors.text,
  },
  thankYouMessage: {
    fontSize: fontSizes.sm,
    color: colors.text,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  actionButton: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  actionButtonText: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.secondary,
  },
});
