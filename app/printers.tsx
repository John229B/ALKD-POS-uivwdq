
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Modal, TextInput, PermissionsAndroid, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Icon from '../components/Icon';
import { commonStyles, colors, buttonStyles, spacing, fontSizes } from '../styles/commonStyles';
import { BluetoothPrinter } from '../types';
import { getBluetoothPrinters, storeBluetoothPrinters, deleteBluetoothPrinter, setDefaultPrinter, logActivity } from '../utils/storage';
import uuid from 'react-native-uuid';

// Note: In Expo managed workflow, we can't use native Bluetooth modules directly
// This is a simulation of what the functionality would look like
// For production, you would need to eject or use EAS Build

interface BluetoothDevice {
  id: string;
  name: string;
  address: string;
  paired: boolean;
  connected: boolean;
}

export default function PrintersScreen() {
  const [printers, setPrinters] = useState<BluetoothPrinter[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [discoveryModalVisible, setDiscoveryModalVisible] = useState(false);
  const [editingPrinter, setEditingPrinter] = useState<BluetoothPrinter | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [discoveredDevices, setDiscoveredDevices] = useState<BluetoothDevice[]>([]);
  const [bluetoothEnabled, setBluetoothEnabled] = useState(false);
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
      console.log('Loaded printers:', printersData.length);
    } catch (error) {
      console.error('Error loading printers:', error);
      Alert.alert('Erreur', 'Impossible de charger les imprimantes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    checkBluetoothStatus();
  }, [loadData]);

  const checkBluetoothStatus = async () => {
    try {
      // In a real implementation, you would check Bluetooth status here
      // For now, we'll simulate it
      console.log('Checking Bluetooth status...');
      setBluetoothEnabled(true); // Simulated
    } catch (error) {
      console.error('Error checking Bluetooth status:', error);
      setBluetoothEnabled(false);
    }
  };

  const requestBluetoothPermissions = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);

        return Object.values(granted).every(permission => permission === PermissionsAndroid.RESULTS.GRANTED);
      } catch (error) {
        console.error('Error requesting Bluetooth permissions:', error);
        return false;
      }
    }
    return true; // iOS doesn't need these permissions
  };

  const enableBluetooth = async (): Promise<boolean> => {
    try {
      console.log('Attempting to enable Bluetooth...');
      
      // In a real implementation, you would enable Bluetooth here
      // For Expo managed workflow, we show a message
      Alert.alert(
        'Bluetooth requis',
        'Veuillez activer le Bluetooth manuellement dans les paramètres de votre appareil pour utiliser les imprimantes.',
        [{ text: 'OK' }]
      );
      
      return true; // Simulated success
    } catch (error) {
      console.error('Error enabling Bluetooth:', error);
      return false;
    }
  };

  const startDiscovery = async () => {
    try {
      console.log('Starting Bluetooth device discovery...');
      
      // Check permissions first
      const hasPermissions = await requestBluetoothPermissions();
      if (!hasPermissions) {
        Alert.alert('Permissions requises', 'Les permissions Bluetooth sont nécessaires pour découvrir les imprimantes.');
        return;
      }

      // Enable Bluetooth if not enabled
      if (!bluetoothEnabled) {
        const enabled = await enableBluetooth();
        if (!enabled) {
          Alert.alert('Erreur', 'Impossible d\'activer le Bluetooth');
          return;
        }
        setBluetoothEnabled(true);
      }

      setIsScanning(true);
      setDiscoveredDevices([]);
      setDiscoveryModalVisible(true);

      // Simulate device discovery
      // In a real implementation, you would use react-native-bluetooth-serial-next
      setTimeout(() => {
        const mockDevices: BluetoothDevice[] = [
          {
            id: '00:11:22:33:44:55',
            name: 'Thermal Printer TP-58',
            address: '00:11:22:33:44:55',
            paired: false,
            connected: false,
          },
          {
            id: '00:11:22:33:44:56',
            name: 'POS Printer 80mm',
            address: '00:11:22:33:44:56',
            paired: false,
            connected: false,
          },
          {
            id: '00:11:22:33:44:57',
            name: 'Bluetooth Printer',
            address: '00:11:22:33:44:57',
            paired: true,
            connected: false,
          },
        ];
        
        setDiscoveredDevices(mockDevices);
        setIsScanning(false);
        console.log('Discovery completed, found', mockDevices.length, 'devices');
      }, 3000);

    } catch (error) {
      console.error('Error during discovery:', error);
      setIsScanning(false);
      Alert.alert('Erreur', 'Impossible de rechercher les imprimantes');
    }
  };

  const connectToDiscoveredDevice = async (device: BluetoothDevice) => {
    try {
      console.log('Connecting to device:', device.name);
      
      // In a real implementation, you would connect to the device here
      Alert.alert(
        'Connexion simulée',
        `Dans une application native, nous nous connecterions maintenant à "${device.name}". Voulez-vous l'ajouter comme imprimante ?`,
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Ajouter',
            onPress: () => {
              setFormData({
                name: device.name,
                address: device.address,
                paperWidth: 58,
                fontSize: 'medium',
                encoding: 'UTF-8',
              });
              setDiscoveryModalVisible(false);
              setModalVisible(true);
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error connecting to device:', error);
      Alert.alert('Erreur', 'Impossible de se connecter à l\'imprimante');
    }
  };

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
    try {
      console.log('Testing connection to printer:', printer.name);
      
      // Simulate connection test
      Alert.alert(
        'Test de connexion',
        `Test de connexion à "${printer.name}"...\n\nNote: Dans une application native, nous testerions la connexion Bluetooth réelle ici.`,
        [
          {
            text: 'Simuler succès',
            onPress: () => {
              Alert.alert('Connexion réussie', `L'imprimante "${printer.name}" répond correctement.`);
            }
          },
          {
            text: 'Simuler échec',
            onPress: () => {
              Alert.alert('Connexion échouée', `Impossible de se connecter à "${printer.name}". Vérifiez que l'imprimante est allumée et à portée.`);
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error testing connection:', error);
      Alert.alert('Erreur', 'Impossible de tester la connexion');
    }
  };

  const reconnectPrinter = async (printer: BluetoothPrinter) => {
    try {
      console.log('Reconnecting to printer:', printer.name);
      
      // In a real implementation, you would attempt to reconnect here
      Alert.alert(
        'Reconnexion',
        `Tentative de reconnexion à "${printer.name}"...`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Simulate successful reconnection
              Alert.alert('Reconnexion réussie', `Reconnecté à "${printer.name}"`);
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error reconnecting printer:', error);
      Alert.alert('Erreur', 'Impossible de reconnecter l\'imprimante');
    }
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
        <TouchableOpacity onPress={startDiscovery} style={styles.addButton}>
          <Icon name="search" size={24} color={colors.background} />
        </TouchableOpacity>
      </View>

      {/* Bluetooth Status Banner */}
      <View style={[styles.infoBanner, { backgroundColor: bluetoothEnabled ? colors.success + '10' : colors.warning + '10' }]}>
        <Icon 
          name={bluetoothEnabled ? "bluetooth" : "bluetooth-outline"} 
          size={20} 
          color={bluetoothEnabled ? colors.success : colors.warning} 
        />
        <Text style={[styles.infoBannerText, { color: bluetoothEnabled ? colors.success : colors.warning }]}>
          {bluetoothEnabled 
            ? 'Bluetooth activé - Prêt à découvrir des imprimantes' 
            : 'Bluetooth désactivé - Activez le Bluetooth pour utiliser les imprimantes'
          }
        </Text>
      </View>

      {/* Printer List */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {printers.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="print-outline" size={64} color={colors.textLight} />
            <Text style={styles.emptyStateTitle}>Aucune imprimante</Text>
            <Text style={styles.emptyStateText}>
              Découvrez et ajoutez vos imprimantes thermiques Bluetooth
            </Text>
            <View style={styles.emptyStateActions}>
              <TouchableOpacity onPress={startDiscovery} style={[buttonStyles.primary, { marginBottom: spacing.md }]}>
                <Icon name="search" size={20} color={colors.background} />
                <Text style={[buttonStyles.primaryText, { marginLeft: spacing.sm }]}>Découvrir des imprimantes</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={openAddModal} style={buttonStyles.secondary}>
                <Icon name="add" size={20} color={colors.primary} />
                <Text style={[buttonStyles.secondaryText, { marginLeft: spacing.sm }]}>Ajouter manuellement</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.printerList}>
            {/* Quick Actions */}
            <View style={styles.quickActions}>
              <TouchableOpacity onPress={startDiscovery} style={styles.quickActionButton}>
                <Icon name="search" size={20} color={colors.primary} />
                <Text style={styles.quickActionText}>Découvrir</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={openAddModal} style={styles.quickActionButton}>
                <Icon name="add" size={20} color={colors.success} />
                <Text style={styles.quickActionText}>Ajouter</Text>
              </TouchableOpacity>
            </View>

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
                      {!printer.isConnected && (
                        <TouchableOpacity 
                          onPress={() => reconnectPrinter(printer)}
                          style={styles.reconnectButton}
                        >
                          <Icon name="refresh" size={16} color={colors.primary} />
                          <Text style={styles.reconnectText}>Reconnecter</Text>
                        </TouchableOpacity>
                      )}
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

      {/* Discovery Modal */}
      <Modal
        visible={discoveryModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setDiscoveryModalVisible(false)}
      >
        <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setDiscoveryModalVisible(false)}>
              <Text style={[commonStyles.text, { color: colors.error }]}>Fermer</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Découverte d'imprimantes</Text>
            <TouchableOpacity onPress={startDiscovery} disabled={isScanning}>
              <Text style={[commonStyles.text, { 
                color: isScanning ? colors.textLight : colors.primary, 
                fontWeight: '600' 
              }]}>
                {isScanning ? 'Recherche...' : 'Actualiser'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.discoveryContent}>
            {isScanning ? (
              <View style={styles.scanningState}>
                <Icon name="bluetooth" size={48} color={colors.primary} />
                <Text style={styles.scanningTitle}>Recherche en cours...</Text>
                <Text style={styles.scanningText}>
                  Recherche d'imprimantes thermiques Bluetooth à proximité
                </Text>
              </View>
            ) : (
              <ScrollView style={styles.deviceList} showsVerticalScrollIndicator={false}>
                {discoveredDevices.length === 0 ? (
                  <View style={styles.noDevicesState}>
                    <Icon name="search-outline" size={48} color={colors.textLight} />
                    <Text style={styles.noDevicesTitle}>Aucune imprimante trouvée</Text>
                    <Text style={styles.noDevicesText}>
                      Assurez-vous que vos imprimantes sont allumées et en mode découvrable
                    </Text>
                  </View>
                ) : (
                  discoveredDevices.map((device) => (
                    <TouchableOpacity
                      key={device.id}
                      onPress={() => connectToDiscoveredDevice(device)}
                      style={styles.deviceItem}
                    >
                      <View style={styles.deviceInfo}>
                        <Text style={styles.deviceName}>{device.name}</Text>
                        <Text style={styles.deviceAddress}>{device.address}</Text>
                        <View style={styles.deviceStatus}>
                          {device.paired && (
                            <View style={styles.pairedBadge}>
                              <Text style={styles.pairedBadgeText}>Appairé</Text>
                            </View>
                          )}
                        </View>
                      </View>
                      <Icon name="chevron-forward" size={20} color={colors.textLight} />
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            )}
          </View>
        </SafeAreaView>
      </Modal>

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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  infoBannerText: {
    flex: 1,
    fontSize: fontSizes.sm,
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
    marginBottom: spacing.xl,
  },
  emptyStateActions: {
    width: '100%',
  },
  printerList: {
    padding: spacing.lg,
  },
  quickActions: {
    flexDirection: 'row' as const,
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  quickActionText: {
    fontSize: fontSizes.md,
    fontWeight: '600' as const,
    color: colors.text,
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
  reconnectButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginLeft: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.primary + '10',
    borderRadius: 8,
    gap: spacing.xs,
  },
  reconnectText: {
    fontSize: fontSizes.xs,
    color: colors.primary,
    fontWeight: '600' as const,
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
  discoveryContent: {
    flex: 1,
    padding: spacing.lg,
  },
  scanningState: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  scanningTitle: {
    fontSize: fontSizes.xl,
    fontWeight: '600' as const,
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  scanningText: {
    fontSize: fontSizes.md,
    color: colors.textLight,
    textAlign: 'center' as const,
    lineHeight: 22,
  },
  deviceList: {
    flex: 1,
  },
  noDevicesState: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: spacing.xxl * 2,
  },
  noDevicesTitle: {
    fontSize: fontSizes.xl,
    fontWeight: '600' as const,
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  noDevicesText: {
    fontSize: fontSizes.md,
    color: colors.textLight,
    textAlign: 'center' as const,
    lineHeight: 22,
  },
  deviceItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: fontSizes.md,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  deviceAddress: {
    fontSize: fontSizes.sm,
    color: colors.textLight,
    fontFamily: 'monospace',
    marginBottom: spacing.xs,
  },
  deviceStatus: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  pairedBadge: {
    backgroundColor: colors.success + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
  },
  pairedBadgeText: {
    fontSize: fontSizes.xs,
    fontWeight: '600' as const,
    color: colors.success,
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
