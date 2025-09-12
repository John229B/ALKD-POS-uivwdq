
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import Icon from '../components/Icon';
import { commonStyles, colors, spacing, fontSizes } from '../styles/commonStyles';
import { AppSettings, Product } from '../types';
import { getSettings, getProducts } from '../utils/storage';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function TicketPreviewScreen() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [settingsData, productsData] = await Promise.all([
        getSettings(),
        getProducts(),
      ]);
      
      setSettings(settingsData);
      setProducts(productsData);
      console.log('Ticket preview data loaded');
    } catch (error) {
      console.error('Error loading ticket preview data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Reload data when screen comes into focus (to reflect settings changes)
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const formatCurrency = (amount: number) => {
    if (!settings) return `${amount}`;
    const { currency } = settings;
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
  };

  const generateSampleTicketData = () => {
    // Generate sample data for the preview
    const sampleItems = products.slice(0, 3).map((product, index) => ({
      name: product.name,
      quantity: index === 0 ? 2 : 1,
      unitPrice: product.retailPrice,
      total: index === 0 ? product.retailPrice * 2 : product.retailPrice,
    }));

    const subtotal = sampleItems.reduce((sum, item) => sum + item.total, 0);
    const tax = settings?.taxRate ? (subtotal * settings.taxRate) / 100 : 0;
    const total = subtotal + tax;

    return {
      receiptNumber: 'REC-001234',
      items: sampleItems,
      subtotal,
      tax,
      total,
      paymentMethod: 'Espèces',
      amountPaid: total,
      change: 0,
      employeeName: 'Employé Exemple',
      createdAt: new Date(),
    };
  };

  const renderTicketPreview = () => {
    if (!settings) return null;

    const sampleData = generateSampleTicketData();
    const { ticketSettings } = settings;

    return (
      <View style={styles.ticketContainer}>
        <View style={styles.ticketContent}>
          {/* Company Logo */}
          {ticketSettings.showLogo && settings.logoUrl && (
            <View style={styles.logoContainer}>
              <Image source={{ uri: settings.logoUrl }} style={styles.logo} />
            </View>
          )}

          {/* Company Name */}
          {ticketSettings.showCompanyName && (
            <Text style={styles.companyName}>{settings.companyName}</Text>
          )}

          {/* Company Address */}
          {ticketSettings.showAddress && settings.companyAddress && (
            <Text style={styles.companyInfo}>{settings.companyAddress}</Text>
          )}

          {/* Company Phone */}
          {ticketSettings.showPhone && settings.companyPhone && (
            <Text style={styles.companyInfo}>Tél: {settings.companyPhone}</Text>
          )}

          {/* Company Email */}
          {ticketSettings.showEmail && settings.companyEmail && (
            <Text style={styles.companyInfo}>Email: {settings.companyEmail}</Text>
          )}

          <View style={styles.separator} />

          {/* Receipt Number */}
          {ticketSettings.showReceiptNumber && (
            <Text style={styles.receiptNumber}>Ticket N°: {sampleData.receiptNumber}</Text>
          )}

          {/* Date and Time */}
          {ticketSettings.showDateTime && (
            <Text style={styles.dateTime}>
              {format(sampleData.createdAt, 'dd/MM/yyyy HH:mm', { locale: fr })}
            </Text>
          )}

          {/* Employee Name */}
          {ticketSettings.showEmployeeName && (
            <Text style={styles.employeeName}>Employé: {sampleData.employeeName}</Text>
          )}

          <View style={styles.separator} />

          {/* Items Header */}
          <Text style={styles.sectionTitle}>ARTICLES</Text>
          <View style={styles.separator} />

          {/* Items List */}
          {sampleData.items.map((item, index) => (
            <View key={index} style={styles.itemRow}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemDetails}>
                  {item.quantity} x {formatCurrency(item.unitPrice)}
                </Text>
              </View>
              <Text style={styles.itemTotal}>{formatCurrency(item.total)}</Text>
            </View>
          ))}

          <View style={styles.separator} />

          {/* Totals */}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Sous-total:</Text>
            <Text style={styles.totalValue}>{formatCurrency(sampleData.subtotal)}</Text>
          </View>

          {ticketSettings.showTax && sampleData.tax > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>TVA ({settings.taxRate}%):</Text>
              <Text style={styles.totalValue}>{formatCurrency(sampleData.tax)}</Text>
            </View>
          )}

          <View style={styles.totalRow}>
            <Text style={styles.grandTotalLabel}>TOTAL:</Text>
            <Text style={styles.grandTotalValue}>{formatCurrency(sampleData.total)}</Text>
          </View>

          <View style={styles.separator} />

          {/* Payment Info */}
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Mode de paiement:</Text>
            <Text style={styles.paymentValue}>{sampleData.paymentMethod}</Text>
          </View>

          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Montant payé:</Text>
            <Text style={styles.paymentValue}>{formatCurrency(sampleData.amountPaid)}</Text>
          </View>

          {sampleData.change > 0 && (
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Monnaie:</Text>
              <Text style={styles.paymentValue}>{formatCurrency(sampleData.change)}</Text>
            </View>
          )}

          <View style={styles.separator} />

          {/* Thank You Message */}
          {ticketSettings.showThankYouMessage && (
            <Text style={styles.thankYouMessage}>
              {settings.customThankYouMessage || settings.receiptFooter || 'Merci pour votre achat !'}
            </Text>
          )}

          <View style={styles.separator} />
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]}>
        <View style={commonStyles.centerContainer}>
          <Text style={[commonStyles.text, { color: colors.textLight }]}>Chargement...</Text>
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
          <Text style={styles.headerTitle}>Aperçu du ticket</Text>
          <Text style={styles.headerSubtitle}>Prévisualisation en temps réel</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/settings')} style={styles.settingsButton}>
          <Icon name="settings-outline" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Info Banner */}
      <View style={styles.infoBanner}>
        <Icon name="information-circle-outline" size={20} color={colors.info} />
        <Text style={styles.infoBannerText}>
          Cet aperçu reflète les paramètres configurés dans les réglages de l&apos;entreprise
        </Text>
      </View>

      {/* Ticket Preview */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.previewContainer}>
          {renderTicketPreview()}
        </View>

        {/* Configuration Summary */}
        <View style={styles.configSummary}>
          <Text style={styles.configTitle}>Configuration actuelle</Text>
          
          <View style={styles.configGrid}>
            <View style={styles.configItem}>
              <Icon 
                name={settings?.ticketSettings.showLogo ? "checkmark-circle" : "close-circle"} 
                size={16} 
                color={settings?.ticketSettings.showLogo ? colors.success : colors.error} 
              />
              <Text style={styles.configText}>Logo</Text>
            </View>

            <View style={styles.configItem}>
              <Icon 
                name={settings?.ticketSettings.showCompanyName ? "checkmark-circle" : "close-circle"} 
                size={16} 
                color={settings?.ticketSettings.showCompanyName ? colors.success : colors.error} 
              />
              <Text style={styles.configText}>Nom entreprise</Text>
            </View>

            <View style={styles.configItem}>
              <Icon 
                name={settings?.ticketSettings.showAddress ? "checkmark-circle" : "close-circle"} 
                size={16} 
                color={settings?.ticketSettings.showAddress ? colors.success : colors.error} 
              />
              <Text style={styles.configText}>Adresse</Text>
            </View>

            <View style={styles.configItem}>
              <Icon 
                name={settings?.ticketSettings.showPhone ? "checkmark-circle" : "close-circle"} 
                size={16} 
                color={settings?.ticketSettings.showPhone ? colors.success : colors.error} 
              />
              <Text style={styles.configText}>Téléphone</Text>
            </View>

            <View style={styles.configItem}>
              <Icon 
                name={settings?.ticketSettings.showEmail ? "checkmark-circle" : "close-circle"} 
                size={16} 
                color={settings?.ticketSettings.showEmail ? colors.success : colors.error} 
              />
              <Text style={styles.configText}>Email</Text>
            </View>

            <View style={styles.configItem}>
              <Icon 
                name={settings?.ticketSettings.showThankYouMessage ? "checkmark-circle" : "close-circle"} 
                size={16} 
                color={settings?.ticketSettings.showThankYouMessage ? colors.success : colors.error} 
              />
              <Text style={styles.configText}>Message</Text>
            </View>
          </View>

          <TouchableOpacity 
            onPress={() => router.push('/settings')} 
            style={styles.configButton}
          >
            <Icon name="settings-outline" size={20} color={colors.primary} />
            <Text style={styles.configButtonText}>Modifier la configuration</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = {
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
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
    fontWeight: '700' as const,
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: fontSizes.sm,
    color: colors.textLight,
    marginTop: 2,
  },
  settingsButton: {
    padding: spacing.sm,
  },
  infoBanner: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: colors.info + '10',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoBannerText: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: fontSizes.sm,
    color: colors.info,
    lineHeight: 18,
  },
  scrollView: {
    flex: 1,
  },
  previewContainer: {
    padding: spacing.lg,
    alignItems: 'center' as const,
  },
  ticketContainer: {
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
    maxWidth: 300,
    width: '100%',
  },
  ticketContent: {
    alignItems: 'center' as const,
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
    fontWeight: '700' as const,
    color: colors.text,
    textAlign: 'center' as const,
    marginBottom: spacing.sm,
  },
  companyInfo: {
    fontSize: fontSizes.sm,
    color: colors.textLight,
    textAlign: 'center' as const,
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
    fontWeight: '600' as const,
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
  },
  sectionTitle: {
    fontSize: fontSizes.md,
    fontWeight: '600' as const,
    color: colors.text,
    textAlign: 'center' as const,
  },
  itemRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
    marginBottom: spacing.sm,
    width: '100%',
  },
  itemInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  itemName: {
    fontSize: fontSizes.sm,
    fontWeight: '500' as const,
    color: colors.text,
    marginBottom: 2,
  },
  itemDetails: {
    fontSize: fontSizes.xs,
    color: colors.textLight,
  },
  itemTotal: {
    fontSize: fontSizes.sm,
    fontWeight: '600' as const,
    color: colors.text,
  },
  totalRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: spacing.xs,
    width: '100%',
  },
  totalLabel: {
    fontSize: fontSizes.sm,
    color: colors.text,
  },
  totalValue: {
    fontSize: fontSizes.sm,
    fontWeight: '600' as const,
    color: colors.text,
  },
  grandTotalLabel: {
    fontSize: fontSizes.md,
    fontWeight: '700' as const,
    color: colors.text,
  },
  grandTotalValue: {
    fontSize: fontSizes.md,
    fontWeight: '700' as const,
    color: colors.primary,
  },
  paymentRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: spacing.xs,
    width: '100%',
  },
  paymentLabel: {
    fontSize: fontSizes.sm,
    color: colors.textLight,
  },
  paymentValue: {
    fontSize: fontSizes.sm,
    fontWeight: '500' as const,
    color: colors.text,
  },
  thankYouMessage: {
    fontSize: fontSizes.sm,
    color: colors.text,
    textAlign: 'center' as const,
    fontStyle: 'italic' as const,
  },
  configSummary: {
    margin: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  configTitle: {
    fontSize: fontSizes.lg,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: spacing.md,
    textAlign: 'center' as const,
  },
  configGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  configItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
    minWidth: '45%',
  },
  configText: {
    fontSize: fontSizes.sm,
    color: colors.text,
    marginLeft: spacing.xs,
  },
  configButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: colors.primary + '10',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  configButtonText: {
    fontSize: fontSizes.md,
    fontWeight: '600' as const,
    color: colors.primary,
    marginLeft: spacing.sm,
  },
};
