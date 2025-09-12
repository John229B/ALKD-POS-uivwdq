
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
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system';
import { documentDirectory } from 'expo-file-system';

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

  const generatePrintableHTML = (): string => {
    if (!sale || !settings) return '';

    const { ticketSettings } = settings;
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Ticket de vente - ${sale.receiptNumber}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body { 
            font-family: 'Courier New', monospace; 
            font-size: 14px; 
            line-height: 1.4;
            color: #000;
            background: #fff;
            padding: 20px;
            max-width: 400px;
            margin: 0 auto;
          }
          
          .ticket-container {
            background: #fff;
            border: 2px solid #000;
            padding: 20px;
            border-radius: 8px;
          }
          
          .center { 
            text-align: center; 
            margin-bottom: 8px;
          }
          
          .bold { 
            font-weight: bold; 
          }
          
          .large {
            font-size: 18px;
            font-weight: bold;
          }
          
          .medium {
            font-size: 16px;
          }
          
          .small {
            font-size: 12px;
            color: #666;
          }
          
          .separator { 
            border-top: 2px dashed #000; 
            margin: 15px 0; 
            height: 2px;
          }
          
          .thin-separator {
            border-top: 1px solid #ccc;
            margin: 8px 0;
          }
          
          .row { 
            display: flex; 
            justify-content: space-between; 
            align-items: center;
            margin: 6px 0; 
            padding: 2px 0;
          }
          
          .row-left {
            text-align: left;
            flex: 1;
          }
          
          .row-right {
            text-align: right;
            font-weight: bold;
          }
          
          .logo { 
            max-width: 80px; 
            max-height: 80px; 
            margin: 0 auto 15px;
            display: block;
            border-radius: 4px;
          }
          
          .company-name {
            font-size: 20px;
            font-weight: bold;
            text-transform: uppercase;
            margin-bottom: 10px;
          }
          
          .company-info {
            font-size: 12px;
            color: #555;
            margin-bottom: 5px;
          }
          
          .receipt-number {
            font-size: 16px;
            font-weight: bold;
            background: #f0f0f0;
            padding: 8px;
            border-radius: 4px;
            margin: 10px 0;
          }
          
          .section-title {
            font-size: 16px;
            font-weight: bold;
            text-transform: uppercase;
            text-align: center;
            margin: 15px 0 10px;
            padding: 8px;
            background: #f8f8f8;
            border-radius: 4px;
          }
          
          .item-row {
            margin-bottom: 12px;
            padding: 8px 0;
            border-bottom: 1px dotted #ccc;
          }
          
          .item-name {
            font-weight: bold;
            font-size: 14px;
            margin-bottom: 4px;
          }
          
          .item-details {
            font-size: 12px;
            color: #666;
            margin-bottom: 4px;
          }
          
          .item-total {
            font-weight: bold;
            text-align: right;
            font-size: 14px;
          }
          
          .totals-section {
            background: #f9f9f9;
            padding: 15px;
            border-radius: 6px;
            margin: 15px 0;
          }
          
          .total-row {
            display: flex;
            justify-content: space-between;
            margin: 8px 0;
            padding: 4px 0;
          }
          
          .grand-total {
            font-size: 18px;
            font-weight: bold;
            border-top: 2px solid #000;
            padding-top: 10px;
            margin-top: 10px;
          }
          
          .payment-section {
            background: #f0f8ff;
            padding: 15px;
            border-radius: 6px;
            margin: 15px 0;
          }
          
          .thank-you {
            text-align: center;
            font-style: italic;
            font-size: 14px;
            margin-top: 20px;
            padding: 15px;
            background: #f0f8f0;
            border-radius: 6px;
            border: 1px solid #d4edda;
          }
          
          .footer-info {
            text-align: center;
            font-size: 11px;
            color: #888;
            margin-top: 20px;
            padding-top: 15px;
            border-top: 1px solid #eee;
          }
          
          @media print {
            body { 
              padding: 10px;
              font-size: 12px;
            }
            .ticket-container {
              border: none;
              padding: 10px;
            }
          }
        </style>
      </head>
      <body>
        <div class="ticket-container">
          ${ticketSettings.showLogo && settings.logoUrl ? `
            <div class="center">
              <img src="${settings.logoUrl}" class="logo" alt="Logo" />
            </div>
          ` : ''}
          
          ${ticketSettings.showCompanyName ? `
            <div class="center company-name">${settings.companyName}</div>
          ` : ''}
          
          ${ticketSettings.showAddress && settings.companyAddress ? `
            <div class="center company-info">${settings.companyAddress}</div>
          ` : ''}
          
          ${ticketSettings.showPhone && settings.companyPhone ? `
            <div class="center company-info">Tél: ${settings.companyPhone}</div>
          ` : ''}
          
          ${ticketSettings.showEmail && settings.companyEmail ? `
            <div class="center company-info">Email: ${settings.companyEmail}</div>
          ` : ''}
          
          <div class="separator"></div>
          
          ${ticketSettings.showReceiptNumber ? `
            <div class="center receipt-number">TICKET N° ${sale.receiptNumber}</div>
          ` : ''}
          
          ${ticketSettings.showDateTime ? `
            <div class="center small">${format(new Date(sale.createdAt), 'dd/MM/yyyy à HH:mm', { locale: fr })}</div>
          ` : ''}
          
          ${ticketSettings.showEmployeeName && sale.cashier ? `
            <div class="center small">Employé: ${sale.cashier.username}</div>
          ` : ''}
          
          ${sale.customer ? `
            <div class="center small">Client: ${sale.customer.name}</div>
          ` : ''}
          
          <div class="separator"></div>
          
          <div class="section-title">DÉTAIL DES ARTICLES</div>
          
          ${sale.items.map(item => {
            const unitInfo = getUnitInfo(item.product?.unit || 'piece');
            return `
              <div class="item-row">
                <div class="item-name">${item.product?.name || 'Produit'}</div>
                <div class="item-details">
                  ${formatQuantityWithUnit(item.quantity, unitInfo.symbol)} × ${formatCurrency(item.unitPrice)}
                </div>
                <div class="item-total">${formatCurrency(item.subtotal)}</div>
              </div>
            `;
          }).join('')}
          
          <div class="separator"></div>
          
          <div class="totals-section">
            <div class="total-row">
              <span>Sous-total:</span>
              <span class="bold">${formatCurrency(sale.subtotal)}</span>
            </div>
            
            ${sale.discount > 0 ? `
              <div class="total-row">
                <span>Remise:</span>
                <span class="bold" style="color: #28a745;">-${formatCurrency(sale.discount)}</span>
              </div>
            ` : ''}
            
            ${ticketSettings.showTax && sale.tax > 0 ? `
              <div class="total-row">
                <span>TVA (${settings.taxRate || 0}%):</span>
                <span class="bold">${formatCurrency(sale.tax)}</span>
              </div>
            ` : ''}
            
            <div class="total-row grand-total">
              <span>TOTAL À PAYER:</span>
              <span>${formatCurrency(sale.total)}</span>
            </div>
          </div>
          
          <div class="payment-section">
            <div class="total-row">
              <span>Mode de paiement:</span>
              <span class="bold">${getPaymentMethodLabel(sale.paymentMethod)}</span>
            </div>
            
            <div class="total-row">
              <span>Montant payé:</span>
              <span class="bold">${formatCurrency(sale.amountPaid)}</span>
            </div>
            
            ${sale.change > 0 ? `
              <div class="total-row">
                <span>Monnaie rendue:</span>
                <span class="bold" style="color: #17a2b8;">${formatCurrency(sale.change)}</span>
              </div>
            ` : ''}
          </div>
          
          ${ticketSettings.showThankYouMessage ? `
            <div class="thank-you">
              ${settings.customThankYouMessage || settings.receiptFooter || 'Merci pour votre achat !<br>À bientôt !'}
            </div>
          ` : ''}
          
          <div class="footer-info">
            Ticket généré le ${format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr })}
          </div>
        </div>
      </body>
      </html>
    `;
  };

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
      
      // Use expo-print for printing
      await Print.printAsync({
        html: htmlContent,
        width: 612,
        height: 792,
        margins: {
          left: 20,
          top: 20,
          right: 20,
          bottom: 20,
        },
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
      console.log('Starting PDF generation and sharing...');
      
      // Generate HTML content
      const htmlContent = generatePrintableHTML();
      
      // Generate PDF using expo-print
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        width: 612,
        height: 792,
        margins: {
          left: 20,
          top: 20,
          right: 20,
          bottom: 20,
        },
      });

      console.log('PDF generated successfully:', uri);

      // Check if documentDirectory is available
      if (!documentDirectory) {
        console.warn('documentDirectory is not available, sharing directly');
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Partager le ticket PDF',
          UTI: 'com.adobe.pdf',
        });
        return;
      }

      // Create a proper filename
      const fileName = `ticket_${sale?.receiptNumber || 'vente'}_${format(new Date(), 'ddMMyyyy_HHmm')}.pdf`;
      const newUri = `${documentDirectory}${fileName}`;
      
      // Move the file to a permanent location
      await FileSystem.moveAsync({
        from: uri,
        to: newUri,
      });

      console.log('PDF ready at:', newUri);

      // Share the PDF
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(newUri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Partager le ticket PDF',
          UTI: 'com.adobe.pdf',
        });
        console.log('PDF shared successfully');
      } else {
        Alert.alert('Information', 'Le partage n\'est pas disponible sur cet appareil');
      }
    } catch (error) {
      console.error('Error generating/sharing PDF:', error);
      Alert.alert('Erreur', 'Erreur lors de la génération du PDF: ' + error.message);
    }
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
              <Text style={styles.receiptNumber}>TICKET N° {sale.receiptNumber}</Text>
            )}

            {/* Date and Time */}
            {settings.ticketSettings.showDateTime && (
              <Text style={styles.dateTime}>
                {format(new Date(sale.createdAt), 'dd/MM/yyyy à HH:mm', { locale: fr })}
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
            <Text style={styles.sectionTitle}>DÉTAIL DES ARTICLES</Text>
            <View style={styles.thinSeparator} />

            {/* Items List */}
            {sale.items.map((item, index) => {
              const unitInfo = getUnitInfo(item.product?.unit || 'piece');
              return (
                <View key={index} style={styles.itemRow}>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{item.product?.name || 'Produit'}</Text>
                    <Text style={styles.itemDetails}>
                      {formatQuantityWithUnit(item.quantity, unitInfo.symbol)} × {formatCurrency(item.unitPrice)}
                    </Text>
                  </View>
                  <Text style={styles.itemTotal}>{formatCurrency(item.subtotal)}</Text>
                </View>
              );
            })}

            <View style={styles.separator} />

            {/* Totals Section */}
            <View style={styles.totalsSection}>
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
                  <Text style={styles.totalLabel}>TVA ({settings.taxRate || 0}%):</Text>
                  <Text style={styles.totalValue}>{formatCurrency(sale.tax)}</Text>
                </View>
              )}

              <View style={[styles.totalRow, styles.grandTotalRow]}>
                <Text style={styles.grandTotalLabel}>TOTAL À PAYER:</Text>
                <Text style={styles.grandTotalValue}>{formatCurrency(sale.total)}</Text>
              </View>
            </View>

            {/* Payment Section */}
            <View style={styles.paymentSection}>
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
                  <Text style={styles.paymentLabel}>Monnaie rendue:</Text>
                  <Text style={[styles.paymentValue, { color: colors.info }]}>{formatCurrency(sale.change)}</Text>
                </View>
              )}
            </View>

            {/* Thank You Message */}
            {settings.ticketSettings.showThankYouMessage && (
              <View style={styles.thankYouContainer}>
                <Text style={styles.thankYouMessage}>
                  {settings.customThankYouMessage || settings.receiptFooter || 'Merci pour votre achat !\nÀ bientôt !'}
                </Text>
              </View>
            )}

            {/* Footer */}
            <View style={styles.footerContainer}>
              <Text style={styles.footerText}>
                Ticket généré le {format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr })}
              </Text>
            </View>
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
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: '#000000',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  ticketContent: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: spacing.lg,
    borderRadius: 8,
  },
  logoContainer: {
    marginBottom: spacing.md,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: colors.background,
  },
  companyName: {
    fontSize: fontSizes.xl,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
  },
  companyInfo: {
    fontSize: fontSizes.sm,
    color: '#333333',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  separator: {
    width: '100%',
    height: 2,
    backgroundColor: '#000000',
    marginVertical: spacing.md,
    borderStyle: 'dashed',
  },
  thinSeparator: {
    width: '100%',
    height: 1,
    backgroundColor: '#cccccc',
    marginVertical: spacing.sm,
  },
  receiptNumber: {
    fontSize: fontSizes.lg,
    fontWeight: '700',
    color: '#000000',
    marginBottom: spacing.xs,
    backgroundColor: '#f0f0f0',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 6,
  },
  dateTime: {
    fontSize: fontSizes.sm,
    color: '#666666',
    marginBottom: spacing.xs,
  },
  employeeName: {
    fontSize: fontSizes.sm,
    color: '#666666',
    marginBottom: spacing.xs,
  },
  customerName: {
    fontSize: fontSizes.sm,
    color: '#666666',
  },
  sectionTitle: {
    fontSize: fontSizes.md,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
    textTransform: 'uppercase',
    backgroundColor: '#f8f8f8',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 6,
    marginBottom: spacing.sm,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
    width: '100%',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
    borderStyle: 'dotted',
  },
  itemInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  itemName: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  itemDetails: {
    fontSize: fontSizes.xs,
    color: '#666666',
  },
  itemTotal: {
    fontSize: fontSizes.sm,
    fontWeight: '700',
    color: '#000000',
  },
  totalsSection: {
    backgroundColor: '#f9f9f9',
    padding: spacing.md,
    borderRadius: 8,
    width: '100%',
    marginBottom: spacing.md,
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
    color: '#000000',
  },
  totalValue: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: '#000000',
  },
  grandTotalRow: {
    borderTopWidth: 2,
    borderTopColor: '#000000',
    paddingTop: spacing.sm,
    marginTop: spacing.sm,
  },
  grandTotalLabel: {
    fontSize: fontSizes.md,
    fontWeight: '700',
    color: '#000000',
  },
  grandTotalValue: {
    fontSize: fontSizes.md,
    fontWeight: '700',
    color: '#000000',
  },
  paymentSection: {
    backgroundColor: '#f0f8ff',
    padding: spacing.md,
    borderRadius: 8,
    width: '100%',
    marginBottom: spacing.md,
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
    color: '#333333',
  },
  paymentValue: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: '#000000',
  },
  thankYouContainer: {
    backgroundColor: '#f0f8f0',
    padding: spacing.md,
    borderRadius: 8,
    width: '100%',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#d4edda',
  },
  thankYouMessage: {
    fontSize: fontSizes.sm,
    color: '#000000',
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  footerContainer: {
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#eeeeee',
    width: '100%',
  },
  footerText: {
    fontSize: fontSizes.xs,
    color: '#888888',
    textAlign: 'center',
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
