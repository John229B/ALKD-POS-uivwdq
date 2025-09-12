
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Icon from '../components/Icon';
import { commonStyles, colors, buttonStyles, spacing, fontSizes } from '../styles/commonStyles';
import { BluetoothPrinter } from '../types';
import { getBluetoothPrinters, storeBluetoothPrinters, deleteBluetoothPrinter, setDefaultPrinter, logActivity } from '../utils/storage';
import uuid from 'react-native-uuid';

export default function PrintersScreen() {
  const [printers, setPrinters] = useState<BluetoothPrinter[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPrinter, setEditingPrinter] = useState<BluetoothPrinter | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    paperWidth: 58,
    fontSize: 'medium' as 'small' | 'medium' | 'large',
    encoding: 'UTF-8',
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const printersData = await getBluetoothPrinters();
      setPrinters(printersData);
    } catch (error) {
      console.error('Error loading printers:', error);
      Alert.alert('Erreur', 'Impossible de charger les imprimantes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      paperWidth: 58,
      fontSize: 'medium',
      encoding: 'UTF-8',
    });
    setEditingPrinter(null);
  };

  const openAddModal = () => {
    resetForm();
    setModalVisible(true);
  };

  const openEditModal = (printer: BluetoothPrinter) => {
    setFormData({
      name: printer.name,
      address: printer.address,
      paperWidth: printer.settings.paperWidth,
      fontSize: printer.settings.fontSize,
      encoding: printer.settings.encoding,
    });
    setEditingPrinter(printer);
    setModalVisible(true);
  };

  const savePrinter = async () => {
    if (!formData.name.trim() || !formData.address.trim()) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      const currentPrinters = await getBluetoothPrinters();
      
      // Check for duplicate address
      const existingPrinter = currentPrinters.find(p => 
        p.address === formData.address && p.id !== editingPrinter?.id
      );
      
      if (existingPrinter) {
        Alert.alert('Erreur', 'Une imprimante avec cette adresse existe déjà');
        return;
      }

      let updatedPrinters;
      
      if (editingPrinter) {
        // Update existing printer
        updatedPrinters = currentPrinters.map(printer =>
          printer.id === editingPrinter.id
            ? {
                ...printer,
                name: formData.name,
                address: formData.address,
                settings: {
                  paperWidth: formData.paperWidth,
                  fontSize: formData.fontSize,
                  encoding: formData.encoding,
                },
                updatedAt: new Date(),
              }
            : printer
        );
        await logActivity('admin', 'printers', 'Printer updated', { printerId: editingPrinter.id, name: formData.name });
      } else {
        // Add new printer
        const newPrinter: BluetoothPrinter = {
          id: uuid.v4() as string,
          name: formData.name,
          address: formData.address,
          isDefault: currentPrinters.length === 0, // First printer becomes default
          isConnected: false,
          settings: {
            paperWidth: formData.paperWidth,
            fontSize: formData.fontSize,
            encoding: formData.encoding,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        updatedPrinters = [...currentPrinters, newPrinter];
        await logActivity('admin', 'printers', 'Printer added', { printerId: newPrinter.id, name: formData.name });
      }

      await storeBluetoothPrinters(updatedPrinters);
      setPrinters(updatedPrinters);
      setModalVisible(false);
      resetForm();
      
      Alert.alert(
        'Succès',
        editingPrinter ? 'Imprimante modifiée avec succès' : 'Imprimante ajoutée avec succès'
      );
    } catch (error) {
      console.error('Error saving printer:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder l\'imprimante');
    }
  };

  const handleDeletePrinter = (printer: BluetoothPrinter) => {
    Alert.alert(
      'Confirmer la suppression',
      `Êtes-vous sûr de vouloir supprimer l'imprimante "${printer.name}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteBluetoothPrinter(printer.id);
              await loadData();
              Alert.alert('Succès', 'Imprimante supprimée avec succès');
            } catch (error) {
              console.error('Error deleting printer:', error);
              Alert.alert('Erreur', 'Impossible de supprimer l\'imprimante');
            }
          },
        },
      ]
    );
  };

  const handleSetDefault = async (printer: BluetoothPrinter) => {
    try {
      await setDefaultPrinter(printer.id);
      await loadData();
      Alert.alert('Succès', `"${printer.name}" est maintenant l'imprimante par défaut`);
    } catch (error) {
      console.error('Error setting default printer:', error);
      Alert.alert('Erreur', 'Impossible de définir l\'imprimante par défaut');
    }
  };

  const testConnection = async (printer: BluetoothPrinter) => {
    Alert.alert(
      'Test de connexion',
      'Note: La fonctionnalité de test de connexion Bluetooth n\'est pas disponible dans l\'environnement Expo managed. Cette fonctionnalité sera disponible après la compilation native de l\'application.',
      [{ text: 'OK' }]
    );
    
    // In a real implementation, you would use react-native-bluetooth-escpos-printer
    // to test the connection here
    console.log('Testing connection to printer:', printer.name, printer.address);
  };

  const getFontSizeLabel = (size: string) => {
    const labels = {
      small: 'Petit',
      medium: 'Moyen',
      large: 'Grand',
    };
    return labels[size as keyof typeof labels] || size;
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
          <Text style={styles.headerTitle}>Imprimantes Bluetooth</Text>
          <Text style={styles.headerSubtitle}>{printers.length} imprimante(s)</Text>
        </View>
        <TouchableOpacity onPress={openAddModal} style={styles.addButton}>
          <Icon name="add" size={24} color={colors.background} />
        </TouchableOpacity>
      </View>

      {/* Info Banner */}
      <View style={styles.infoBanner}>
        <Icon name="information-circle-outline" size={20} color={colors.info} />
        <Text style={styles.infoBannerText}>
          Les imprimantes Bluetooth nécessitent une compilation native pour fonctionner pleinement.
        </Text>
      </View>

      {/* Printer List */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {printers.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="print-outline" size={64} color={colors.textLight} />
            <Text style={styles.emptyStateTitle}>Aucune imprimante</Text>
            <Text style={styles.emptyStateText}>Ajoutez votre première imprimante Bluetooth</Text>
            <TouchableOpacity onPress={openAddModal} style={[buttonStyles.primary, { marginTop: spacing.lg }]}>
              <Icon name="add" size={20} color={colors.background} />
              <Text style={[buttonStyles.primaryText, { marginLeft: spacing.sm }]}>Ajouter une imprimante</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.printerList}>
            {printers.map((printer) => (
              <View key={printer.id} style={styles.printerCard}>
                <View style={styles.printerHeader}>
                  <View style={styles.printerInfo}>
                    <View style={styles.printerNameRow}>
                      <Text style={styles.printerName}>{printer.name}</Text>
                      {printer.isDefault && (
                        <View style={styles.defaultBadge}>
                          <Text style={styles.defaultBadgeText}>Par défaut</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.printerAddress}>{printer.address}</Text>
                    <View style={styles.printerStatus}>
                      <View style={[
                        styles.statusDot,
                        { backgroundColor: printer.isConnected ? colors.success : colors.error }
                      ]} />
                      <Text style={[styles.statusText, { color: printer.isConnected ? colors.success : colors.error }]}>
                        {printer.isConnected ? 'Connectée' : 'Déconnectée'}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.printerSettings}>
                  <View style={styles.settingItem}>
                    <Text style={styles.settingLabel}>Largeur papier</Text>
                    <Text style={styles.settingValue}>{printer.settings.paperWidth}mm</Text>
                  </View>
                  <View style={styles.settingItem}>
                    <Text style={styles.settingLabel}>Taille police</Text>
                    <Text style={styles.settingValue}>{getFontSizeLabel(printer.settings.fontSize)}</Text>
                  </View>
                  <View style={styles.settingItem}>
                    <Text style={styles.settingLabel}>Encodage</Text>
                    <Text style={styles.settingValue}>{printer.settings.encoding}</Text>
                  </View>
                </View>

                <View style={styles.printerActions}>
                  <TouchableOpacity
                    onPress={() => testConnection(printer)}
                    style={[styles.actionButton, { backgroundColor: colors.info + '20' }]}
                  >
                    <Icon name="wifi-outline" size={18} color={colors.info} />
                    <Text style={[styles.actionButtonText, { color: colors.info }]}>Tester</Text>
                  </TouchableOpacity>

                  {!printer.isDefault && (
                    <TouchableOpacity
                      onPress={() => handleSetDefault(printer)}
                      style={[styles.actionButton, { backgroundColor: colors.success + '20' }]}
                    >
                      <Icon name="checkmark-circle-outline" size={18} color={colors.success} />
                      <Text style={[styles.actionButtonText, { color: colors.success }]}>Défaut</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    onPress={() => openEditModal(printer)}
                    style={[styles.actionButton, { backgroundColor: colors.warning + '20' }]}
                  >
                    <Icon name="create-outline" size={18} color={colors.warning} />
                    <Text style={[styles.actionButtonText, { color: colors.warning }]}>Modifier</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleDeletePrinter(printer)}
                    style={[styles.actionButton, { backgroundColor: colors.error + '20' }]}
                  >
                    <Icon name="trash-outline" size={18} color={colors.error} />
                    <Text style={[styles.actionButtonText, { color: colors.error }]}>Supprimer</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Add/Edit Printer Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={[commonStyles.text, { color: colors.error }]}>Annuler</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingPrinter ? 'Modifier imprimante' : 'Nouvelle imprimante'}
            </Text>
            <TouchableOpacity onPress={savePrinter}>
              <Text style={[commonStyles.text, { color: colors.primary, fontWeight: '600' }]}>
                Sauvegarder
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Nom de l'imprimante *</Text>
              <TextInput
                style={styles.formInput}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder="Ex: Imprimante Caisse 1"
                placeholderTextColor={colors.textLight}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Adresse Bluetooth *</Text>
              <TextInput
                style={styles.formInput}
                value={formData.address}
                onChangeText={(text) => setFormData({ ...formData, address: text })}
                placeholder="Ex: 00:11:22:33:44:55"
                placeholderTextColor={colors.textLight}
                autoCapitalize="characters"
              />
              <Text style={styles.formHint}>
                Format: XX:XX:XX:XX:XX:XX (adresse MAC Bluetooth)
              </Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Largeur du papier (mm)</Text>
              <View style={styles.paperWidthSelector}>
                {[58, 80].map((width) => (
                  <TouchableOpacity
                    key={width}
                    onPress={() => setFormData({ ...formData, paperWidth: width })}
                    style={[
                      styles.paperWidthOption,
                      formData.paperWidth === width && styles.paperWidthOptionSelected
                    ]}
                  >
                    <Text style={[
                      styles.paperWidthOptionText,
                      formData.paperWidth === width && { color: colors.primary }
                    ]}>
                      {width}mm
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Taille de police</Text>
              <View style={styles.fontSizeSelector}>
                {(['small', 'medium', 'large'] as const).map((size) => (
                  <TouchableOpacity
                    key={size}
                    onPress={() => setFormData({ ...formData, fontSize: size })}
                    style={[
                      styles.fontSizeOption,
                      formData.fontSize === size && styles.fontSizeOptionSelected
                    ]}
                  >
                    <Text style={[
                      styles.fontSizeOptionText,
                      formData.fontSize === size && { color: colors.primary }
                    ]}>
                      {getFontSizeLabel(size)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Encodage</Text>
              <View style={styles.encodingSelector}>
                {['UTF-8', 'ISO-8859-1', 'Windows-1252'].map((encoding) => (
                  <TouchableOpacity
                    key={encoding}
                    onPress={() => setFormData({ ...formData, encoding })}
                    style={[
                      styles.encodingOption,
                      formData.encoding === encoding && styles.encodingOptionSelected
                    ]}
                  >
                    <Text style={[
                      styles.encodingOptionText,
                      formData.encoding === encoding && { color: colors.primary }
                    ]}>
                      {encoding}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
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
  addButton: {
    backgroundColor: colors.primary,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  infoBanner: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: colors.info + '10',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  infoBannerText: {
    flex: 1,
    fontSize: fontSizes.sm,
    color: colors.info,
    lineHeight: 18,
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
  printerList: {
    padding: spacing.lg,
  },
  printerCard: {
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
  printerHeader: {
    marginBottom: spacing.md,
  },
  printerInfo: {
    flex: 1,
  },
  printerNameRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: spacing.xs,
  },
  printerName: {
    fontSize: fontSizes.lg,
    fontWeight: '600' as const,
    color: colors.text,
    flex: 1,
  },
  defaultBadge: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  defaultBadgeText: {
    fontSize: fontSizes.xs,
    fontWeight: '600' as const,
    color: colors.primary,
  },
  printerAddress: {
    fontSize: fontSizes.sm,
    color: colors.textLight,
    marginBottom: spacing.sm,
    fontFamily: 'monospace',
  },
  printerStatus: {
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
    fontSize: fontSizes.sm,
    fontWeight: '500' as const,
  },
  printerSettings: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    marginBottom: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  settingItem: {
    alignItems: 'center' as const,
  },
  settingLabel: {
    fontSize: fontSizes.xs,
    color: colors.textLight,
    marginBottom: spacing.xs,
  },
  settingValue: {
    fontSize: fontSizes.sm,
    fontWeight: '600' as const,
    color: colors.text,
  },
  printerActions: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
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
  modalContent: {
    flex: 1,
    padding: spacing.lg,
  },
  formGroup: {
    marginBottom: spacing.lg,
  },
  formLabel: {
    fontSize: fontSizes.md,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  formInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSizes.md,
    color: colors.text,
    backgroundColor: colors.background,
  },
  formHint: {
    fontSize: fontSizes.xs,
    color: colors.textLight,
    marginTop: spacing.xs,
    fontStyle: 'italic' as const,
  },
  paperWidthSelector: {
    flexDirection: 'row' as const,
    gap: spacing.sm,
  },
  paperWidthOption: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center' as const,
  },
  paperWidthOptionSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  paperWidthOptionText: {
    fontSize: fontSizes.md,
    color: colors.textLight,
  },
  fontSizeSelector: {
    flexDirection: 'row' as const,
    gap: spacing.sm,
  },
  fontSizeOption: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center' as const,
  },
  fontSizeOptionSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  fontSizeOptionText: {
    fontSize: fontSizes.sm,
    color: colors.textLight,
  },
  encodingSelector: {
    gap: spacing.sm,
  },
  encodingOption: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center' as const,
  },
  encodingOptionSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  encodingOptionText: {
    fontSize: fontSizes.sm,
    color: colors.textLight,
  },
};
