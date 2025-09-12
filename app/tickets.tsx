
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Icon from '../components/Icon';
import { commonStyles, colors, buttonStyles, spacing, fontSizes } from '../styles/commonStyles';
import { Ticket, BluetoothPrinter, AppSettings } from '../types';
import { getTickets, getBluetoothPrinters, getSettings, logActivity } from '../utils/storage';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import * as Sharing from 'expo-sharing';

export default function TicketsScreen() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [printers, setPrinters] = useState<BluetoothPrinter[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [printModalVisible, setPrintModalVisible] = useState(false);
  const [selectedPrinter, setSelectedPrinter] = useState<BluetoothPrinter | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBy, setFilterBy] = useState<'all' | 'today' | 'week' | 'month'>('all');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [ticketsData, printersData, settingsData] = await Promise.all([
        getTickets(),
        getBluetoothPrinters(),
        getSettings(),
      ]);
      
      setTickets(ticketsData);
      setPrinters(printersData);
      setSettings(settingsData);
      
      // Set default printer
      const defaultPrinter = printersData.find(p => p.isDefault);
      if (defaultPrinter) {
        setSelectedPrinter(defaultPrinter);
      }
    } catch (error) {
      console.error('Error loading tickets data:', error);
      Alert.alert('Erreur', 'Impossible de charger les données');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getFilteredTickets = () => {
    let filtered = tickets;

    // Filter by search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(ticket =>
        ticket.receiptNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.companyName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by date
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    switch (filterBy) {
      case 'today':
        filtered = filtered.filter(ticket => new Date(ticket.createdAt) >= today);
        break;
      case 'week':
        filtered = filtered.filter(ticket => new Date(ticket.createdAt) >= weekAgo);
        break;
      case 'month':
        filtered = filtered.filter(ticket => new Date(ticket.createdAt) >= monthAgo);
        break;
    }

    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  };

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

  const openPreview = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setPreviewModalVisible(true);
  };

  const openPrintModal = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setPrintModalVisible(true);
  };

  const handlePrint = async () => {
    if (!selectedTicket || !selectedPrinter) {
      Alert.alert('Erreur', 'Veuillez sélectionner une imprimante');
      return;
    }

    Alert.alert(
      'Impression',
      'Note: L\'impression Bluetooth n\'est pas disponible dans l\'environnement Expo managed. Cette fonctionnalité sera disponible après la compilation native de l\'application.',
      [{ text: 'OK' }]
    );

    // In a real implementation, you would use react-native-bluetooth-escpos-printer
    // to print the ticket here
    console.log('Printing ticket:', selectedTicket.receiptNumber, 'to printer:', selectedPrinter.name);
    
    await logActivity('user', 'tickets', 'Ticket printed', {
      ticketId: selectedTicket.id,
      receiptNumber: selectedTicket.receiptNumber,
      printerId: selectedPrinter.id,
    });

    setPrintModalVisible(false);
  };

  const handleShare = async (ticket: Ticket) => {
    try {
      const ticketText = generateTicketText(ticket);
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync('data:text/plain;base64,' + btoa(ticketText), {
          mimeType: 'text/plain',
          dialogTitle: `Ticket ${ticket.receiptNumber}`,
        });
      } else {
        Alert.alert('Partage non disponible', 'Le partage n\'est pas disponible sur cette plateforme');
      }

      await logActivity('user', 'tickets', 'Ticket shared', {
        ticketId: ticket.id,
        receiptNumber: ticket.receiptNumber,
      });
    } catch (error) {
      console.error('Error sharing ticket:', error);
      Alert.alert('Erreur', 'Impossible de partager le ticket');
    }
  };

  const generateTicketText = (ticket: Ticket): string => {
    const lines = [
      '================================',
      ticket.companyName.toUpperCase(),
      '================================',
      '',
      `Ticket N°: ${ticket.receiptNumber}`,
      `Date: ${format(new Date(ticket.createdAt), 'dd/MM/yyyy HH:mm', { locale: fr })}`,
      `Employé: ${ticket.employeeName}`,
      '',
      '--------------------------------',
      'ARTICLES',
      '--------------------------------',
    ];

    ticket.items.forEach(item => {
      lines.push(`${item.name}`);
      lines.push(`  ${item.quantity} x ${formatCurrency(item.unitPrice)} = ${formatCurrency(item.total)}`);
    });

    lines.push('--------------------------------');
    lines.push(`Sous-total: ${formatCurrency(ticket.subtotal)}`);
    
    if (ticket.tax > 0) {
      lines.push(`TVA: ${formatCurrency(ticket.tax)}`);
    }
    
    lines.push(`TOTAL: ${formatCurrency(ticket.total)}`);
    lines.push('');
    lines.push(`Mode de paiement: ${ticket.paymentMethod}`);
    lines.push(`Montant payé: ${formatCurrency(ticket.amountPaid)}`);
    
    if (ticket.change > 0) {
      lines.push(`Monnaie: ${formatCurrency(ticket.change)}`);
    }

    lines.push('');
    lines.push('--------------------------------');
    
    if (ticket.customMessage) {
      lines.push(ticket.customMessage);
    } else {
      lines.push('Merci pour votre achat !');
    }
    
    lines.push('================================');

    return lines.join('\n');
  };

  const getFilterLabel = (filter: string) => {
    const labels = {
      all: 'Tous',
      today: 'Aujourd\'hui',
      week: 'Cette semaine',
      month: 'Ce mois',
    };
    return labels[filter as keyof typeof labels] || filter;
  };

  const filteredTickets = getFilteredTickets();

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
          <Text style={styles.headerTitle}>Historique des tickets</Text>
          <Text style={styles.headerSubtitle}>{filteredTickets.length} ticket(s)</Text>
        </View>
      </View>

      {/* Search and Filter */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Icon name="search-outline" size={20} color={colors.textLight} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Rechercher un ticket..."
            placeholderTextColor={colors.textLight}
          />
        </View>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar}>
          {(['all', 'today', 'week', 'month'] as const).map((filter) => (
            <TouchableOpacity
              key={filter}
              onPress={() => setFilterBy(filter)}
              style={[
                styles.filterButton,
                filterBy === filter && styles.filterButtonActive
              ]}
            >
              <Text style={[
                styles.filterButtonText,
                filterBy === filter && styles.filterButtonTextActive
              ]}>
                {getFilterLabel(filter)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Tickets List */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {filteredTickets.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="receipt-outline" size={64} color={colors.textLight} />
            <Text style={styles.emptyStateTitle}>
              {searchQuery.trim() ? 'Aucun ticket trouvé' : 'Aucun ticket'}
            </Text>
            <Text style={styles.emptyStateText}>
              {searchQuery.trim() 
                ? 'Essayez avec d\'autres termes de recherche'
                : 'Les tickets de vente apparaîtront ici'
              }
            </Text>
          </View>
        ) : (
          <View style={styles.ticketsList}>
            {filteredTickets.map((ticket) => (
              <View key={ticket.id} style={styles.ticketCard}>
                <View style={styles.ticketHeader}>
                  <View style={styles.ticketInfo}>
                    <Text style={styles.ticketNumber}>{ticket.receiptNumber}</Text>
                    <Text style={styles.ticketDate}>
                      {format(new Date(ticket.createdAt), 'dd/MM/yyyy HH:mm', { locale: fr })}
                    </Text>
                    <Text style={styles.ticketEmployee}>Par {ticket.employeeName}</Text>
                  </View>
                  <View style={styles.ticketAmount}>
                    <Text style={styles.ticketTotal}>{formatCurrency(ticket.total)}</Text>
                    <Text style={styles.ticketPayment}>{ticket.paymentMethod}</Text>
                  </View>
                </View>

                <View style={styles.ticketItems}>
                  <Text style={styles.ticketItemsTitle}>
                    {ticket.items.length} article(s)
                  </Text>
                  {ticket.items.slice(0, 2).map((item, index) => (
                    <Text key={index} style={styles.ticketItemText}>
                      {item.quantity} x {item.name}
                    </Text>
                  ))}
                  {ticket.items.length > 2 && (
                    <Text style={styles.ticketItemText}>
                      +{ticket.items.length - 2} autre(s)...
                    </Text>
                  )}
                </View>

                <View style={styles.ticketActions}>
                  <TouchableOpacity
                    onPress={() => openPreview(ticket)}
                    style={[styles.actionButton, { backgroundColor: colors.info + '20' }]}
                  >
                    <Icon name="eye-outline" size={16} color={colors.info} />
                    <Text style={[styles.actionButtonText, { color: colors.info }]}>Voir</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => openPrintModal(ticket)}
                    style={[styles.actionButton, { backgroundColor: colors.primary + '20' }]}
                  >
                    <Icon name="print-outline" size={16} color={colors.primary} />
                    <Text style={[styles.actionButtonText, { color: colors.primary }]}>Imprimer</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleShare(ticket)}
                    style={[styles.actionButton, { backgroundColor: colors.success + '20' }]}
                  >
                    <Icon name="share-outline" size={16} color={colors.success} />
                    <Text style={[styles.actionButtonText, { color: colors.success }]}>Partager</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Preview Modal */}
      <Modal
        visible={previewModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setPreviewModalVisible(false)}
      >
        <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setPreviewModalVisible(false)}>
              <Text style={[commonStyles.text, { color: colors.error }]}>Fermer</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Aperçu du ticket</Text>
            <TouchableOpacity onPress={() => selectedTicket && handleShare(selectedTicket)}>
              <Icon name="share-outline" size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {selectedTicket && (
            <ScrollView style={styles.previewContent} showsVerticalScrollIndicator={false}>
              <View style={styles.ticketPreview}>
                <Text style={styles.previewText}>{generateTicketText(selectedTicket)}</Text>
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* Print Modal */}
      <Modal
        visible={printModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setPrintModalVisible(false)}
      >
        <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setPrintModalVisible(false)}>
              <Text style={[commonStyles.text, { color: colors.error }]}>Annuler</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Imprimer le ticket</Text>
            <TouchableOpacity onPress={handlePrint}>
              <Text style={[commonStyles.text, { color: colors.primary, fontWeight: '600' }]}>
                Imprimer
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.printContent}>
            <Text style={styles.sectionTitle}>Sélectionner une imprimante</Text>
            
            {printers.length === 0 ? (
              <View style={styles.noPrintersState}>
                <Icon name="print-outline" size={48} color={colors.textLight} />
                <Text style={styles.noPrintersTitle}>Aucune imprimante</Text>
                <Text style={styles.noPrintersText}>
                  Ajoutez une imprimante Bluetooth pour pouvoir imprimer
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setPrintModalVisible(false);
                    router.push('/printers');
                  }}
                  style={[buttonStyles.primary, { marginTop: spacing.lg }]}
                >
                  <Text style={buttonStyles.primaryText}>Gérer les imprimantes</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.printersList}>
                {printers.map((printer) => (
                  <TouchableOpacity
                    key={printer.id}
                    onPress={() => setSelectedPrinter(printer)}
                    style={[
                      styles.printerOption,
                      selectedPrinter?.id === printer.id && styles.printerOptionSelected
                    ]}
                  >
                    <View style={styles.printerOptionInfo}>
                      <Text style={styles.printerOptionName}>{printer.name}</Text>
                      <Text style={styles.printerOptionAddress}>{printer.address}</Text>
                      <View style={styles.printerOptionStatus}>
                        <View style={[
                          styles.statusDot,
                          { backgroundColor: printer.isConnected ? colors.success : colors.error }
                        ]} />
                        <Text style={[
                          styles.statusText,
                          { color: printer.isConnected ? colors.success : colors.error }
                        ]}>
                          {printer.isConnected ? 'Connectée' : 'Déconnectée'}
                        </Text>
                        {printer.isDefault && (
                          <View style={styles.defaultBadge}>
                            <Text style={styles.defaultBadgeText}>Défaut</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    {selectedPrinter?.id === printer.id && (
                      <Icon name="checkmark-circle" size={24} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </SafeAreaView>
      </Modal>
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
  searchSection: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchBar: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: fontSizes.md,
    color: colors.text,
  },
  filterBar: {
    flexDirection: 'row' as const,
  },
  filterButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterButtonText: {
    fontSize: fontSizes.sm,
    color: colors.textLight,
  },
  filterButtonTextActive: {
    color: colors.background,
    fontWeight: '600' as const,
  },
  scrollView: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl * 2,
  },
  emptyStateTitle: {
    fontSize: fontSizes.xl,
    fontWeight: '600' as const,
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptyStateText: {
    fontSize: fontSizes.md,
    color: colors.textLight,
    textAlign: 'center' as const,
    lineHeight: 22,
  },
  ticketsList: {
    padding: spacing.lg,
  },
  ticketCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  ticketHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
    marginBottom: spacing.md,
  },
  ticketInfo: {
    flex: 1,
  },
  ticketNumber: {
    fontSize: fontSizes.lg,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  ticketDate: {
    fontSize: fontSizes.sm,
    color: colors.textLight,
    marginBottom: spacing.xs,
  },
  ticketEmployee: {
    fontSize: fontSizes.sm,
    color: colors.textLight,
  },
  ticketAmount: {
    alignItems: 'flex-end' as const,
  },
  ticketTotal: {
    fontSize: fontSizes.lg,
    fontWeight: '700' as const,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  ticketPayment: {
    fontSize: fontSizes.sm,
    color: colors.textLight,
  },
  ticketItems: {
    marginBottom: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  ticketItemsTitle: {
    fontSize: fontSizes.sm,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  ticketItemText: {
    fontSize: fontSizes.sm,
    color: colors.textLight,
    marginBottom: 2,
  },
  ticketActions: {
    flexDirection: 'row' as const,
    gap: spacing.sm,
  },
  actionButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 16,
    gap: spacing.xs,
  },
  actionButtonText: {
    fontSize: fontSizes.xs,
    fontWeight: '600' as const,
  },
  modalHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: fontSizes.lg,
    fontWeight: '600' as const,
    color: colors.text,
  },
  previewContent: {
    flex: 1,
    padding: spacing.lg,
  },
  ticketPreview: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  previewText: {
    fontFamily: 'monospace',
    fontSize: fontSizes.sm,
    color: colors.text,
    lineHeight: 18,
  },
  printContent: {
    flex: 1,
    padding: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSizes.lg,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  noPrintersState: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: spacing.xxl,
  },
  noPrintersTitle: {
    fontSize: fontSizes.lg,
    fontWeight: '600' as const,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  noPrintersText: {
    fontSize: fontSizes.md,
    color: colors.textLight,
    textAlign: 'center' as const,
    lineHeight: 22,
  },
  printersList: {
    gap: spacing.md,
  },
  printerOption: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  printerOptionSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  printerOptionInfo: {
    flex: 1,
  },
  printerOptionName: {
    fontSize: fontSizes.md,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  printerOptionAddress: {
    fontSize: fontSizes.sm,
    color: colors.textLight,
    marginBottom: spacing.xs,
    fontFamily: 'monospace',
  },
  printerOptionStatus: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: fontSizes.xs,
    fontWeight: '500' as const,
  },
  defaultBadge: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: spacing.xs,
  },
  defaultBadgeText: {
    fontSize: fontSizes.xs,
    fontWeight: '600' as const,
    color: colors.primary,
  },
};
