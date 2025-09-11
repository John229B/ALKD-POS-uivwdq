
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { commonStyles, colors, buttonStyles, spacing, fontSizes } from '../styles/commonStyles';
import Icon from '../components/Icon';

interface License {
  id: string;
  type: 'monthly' | 'quarterly' | 'yearly' | 'lifetime';
  status: 'active' | 'expired' | 'pending';
  startDate: string;
  endDate?: string;
  clientName: string;
  clientEmail: string;
  price: number;
}

export default function LicensesScreen() {
  const [licenses, setLicenses] = useState<License[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newLicense, setNewLicense] = useState({
    type: 'monthly' as License['type'],
    clientName: '',
    clientEmail: '',
    price: 0,
  });

  useEffect(() => {
    loadLicenses();
  }, []);

  const loadLicenses = () => {
    // Données d'exemple pour la démonstration
    const sampleLicenses: License[] = [
      {
        id: '1',
        type: 'yearly',
        status: 'active',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        clientName: 'Restaurant ABC',
        clientEmail: 'contact@restaurant-abc.com',
        price: 120000,
      },
      {
        id: '2',
        type: 'monthly',
        status: 'active',
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        clientName: 'Boutique XYZ',
        clientEmail: 'info@boutique-xyz.com',
        price: 15000,
      },
      {
        id: '3',
        type: 'lifetime',
        status: 'active',
        startDate: '2023-06-15',
        clientName: 'Supermarché DEF',
        clientEmail: 'admin@supermarche-def.com',
        price: 500000,
      },
    ];
    setLicenses(sampleLicenses);
  };

  const getLicenseTypeLabel = (type: License['type']) => {
    const labels = {
      monthly: 'Mensuelle',
      quarterly: 'Trimestrielle',
      yearly: 'Annuelle',
      lifetime: 'À vie',
    };
    return labels[type];
  };

  const getStatusColor = (status: License['status']) => {
    const statusColors = {
      active: colors.success,
      expired: colors.error,
      pending: colors.warning,
    };
    return statusColors[status];
  };

  const getStatusLabel = (status: License['status']) => {
    const labels = {
      active: 'Active',
      expired: 'Expirée',
      pending: 'En attente',
    };
    return labels[status];
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString()} FCFA`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const addLicense = () => {
    if (!newLicense.clientName || !newLicense.clientEmail) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires.');
      return;
    }

    const startDate = new Date();
    let endDate: Date | undefined;

    switch (newLicense.type) {
      case 'monthly':
        endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + 1);
        break;
      case 'quarterly':
        endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + 3);
        break;
      case 'yearly':
        endDate = new Date(startDate);
        endDate.setFullYear(endDate.getFullYear() + 1);
        break;
      case 'lifetime':
        endDate = undefined;
        break;
    }

    const license: License = {
      id: Date.now().toString(),
      type: newLicense.type,
      status: 'active',
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate?.toISOString().split('T')[0],
      clientName: newLicense.clientName,
      clientEmail: newLicense.clientEmail,
      price: newLicense.price,
    };

    setLicenses([...licenses, license]);
    setShowAddModal(false);
    setNewLicense({
      type: 'monthly',
      clientName: '',
      clientEmail: '',
      price: 0,
    });

    Alert.alert('Succès', 'Licence ajoutée avec succès.');
  };

  const renewLicense = (license: License) => {
    Alert.alert(
      'Renouveler la licence',
      `Voulez-vous renouveler la licence de ${license.clientName} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Renouveler',
          onPress: () => {
            console.log('Renouvellement de la licence:', license.id);
            Alert.alert('Succès', 'Licence renouvelée avec succès.');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Icon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Licences</Text>
          <Text style={styles.headerSubtitle}>Gestion des licences clients</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Icon name="add" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Statistics */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{licenses.filter(l => l.status === 'active').length}</Text>
          <Text style={styles.statLabel}>Actives</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{licenses.filter(l => l.status === 'expired').length}</Text>
          <Text style={styles.statLabel}>Expirées</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {formatCurrency(licenses.reduce((sum, l) => sum + l.price, 0))}
          </Text>
          <Text style={styles.statLabel}>Revenus</Text>
        </View>
      </View>

      {/* Licenses List */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {licenses.map((license) => (
          <View key={license.id} style={styles.licenseCard}>
            <View style={styles.licenseHeader}>
              <View style={styles.licenseInfo}>
                <Text style={styles.clientName}>{license.clientName}</Text>
                <Text style={styles.clientEmail}>{license.clientEmail}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(license.status) + '20' }]}>
                <Text style={[styles.statusText, { color: getStatusColor(license.status) }]}>
                  {getStatusLabel(license.status)}
                </Text>
              </View>
            </View>

            <View style={styles.licenseDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Type:</Text>
                <Text style={styles.detailValue}>{getLicenseTypeLabel(license.type)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Prix:</Text>
                <Text style={styles.detailValue}>{formatCurrency(license.price)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Début:</Text>
                <Text style={styles.detailValue}>{formatDate(license.startDate)}</Text>
              </View>
              {license.endDate && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Fin:</Text>
                  <Text style={styles.detailValue}>{formatDate(license.endDate)}</Text>
                </View>
              )}
            </View>

            {license.status === 'active' && (
              <TouchableOpacity
                style={styles.renewButton}
                onPress={() => renewLicense(license)}
              >
                <Icon name="refresh" size={16} color={colors.primary} />
                <Text style={styles.renewButtonText}>Renouveler</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </ScrollView>

      {/* Add License Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nouvelle Licence</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Icon name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nom du client *</Text>
                <TextInput
                  style={styles.input}
                  value={newLicense.clientName}
                  onChangeText={(text) => setNewLicense({ ...newLicense, clientName: text })}
                  placeholder="Nom du client"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email du client *</Text>
                <TextInput
                  style={styles.input}
                  value={newLicense.clientEmail}
                  onChangeText={(text) => setNewLicense({ ...newLicense, clientEmail: text })}
                  placeholder="email@exemple.com"
                  keyboardType="email-address"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Type de licence</Text>
                <View style={styles.typeButtons}>
                  {(['monthly', 'quarterly', 'yearly', 'lifetime'] as const).map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.typeButton,
                        newLicense.type === type && styles.typeButtonActive,
                      ]}
                      onPress={() => setNewLicense({ ...newLicense, type })}
                    >
                      <Text
                        style={[
                          styles.typeButtonText,
                          newLicense.type === type && styles.typeButtonTextActive,
                        ]}
                      >
                        {getLicenseTypeLabel(type)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Prix (FCFA)</Text>
                <TextInput
                  style={styles.input}
                  value={newLicense.price.toString()}
                  onChangeText={(text) => setNewLicense({ ...newLicense, price: parseInt(text) || 0 })}
                  placeholder="0"
                  keyboardType="numeric"
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[buttonStyles.secondary, { flex: 1, marginRight: spacing.sm }]}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={buttonStyles.secondaryText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[buttonStyles.primary, { flex: 1 }]}
                onPress={addLicense}
              >
                <Text style={buttonStyles.primaryText}>Ajouter</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
    padding: spacing.sm,
  },
  statsContainer: {
    flexDirection: 'row' as const,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statNumber: {
    fontSize: fontSizes.lg,
    fontWeight: '700' as const,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: fontSizes.sm,
    color: colors.textLight,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  licenseCard: {
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
  licenseHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
    marginBottom: spacing.md,
  },
  licenseInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: fontSizes.lg,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  clientEmail: {
    fontSize: fontSizes.sm,
    color: colors.textLight,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
  },
  statusText: {
    fontSize: fontSizes.xs,
    fontWeight: '600' as const,
  },
  licenseDetails: {
    marginBottom: spacing.md,
  },
  detailRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    marginBottom: spacing.xs,
  },
  detailLabel: {
    fontSize: fontSizes.sm,
    color: colors.textLight,
  },
  detailValue: {
    fontSize: fontSizes.sm,
    fontWeight: '600' as const,
    color: colors.text,
  },
  renewButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: colors.primary + '20',
    borderRadius: 8,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  renewButtonText: {
    fontSize: fontSizes.sm,
    fontWeight: '600' as const,
    color: colors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end' as const,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: fontSizes.xl,
    fontWeight: '700' as const,
    color: colors.text,
  },
  modalBody: {
    padding: spacing.lg,
    maxHeight: 400,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  inputLabel: {
    fontSize: fontSizes.sm,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSizes.md,
    color: colors.text,
    backgroundColor: colors.background,
  },
  typeButtons: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: spacing.sm,
  },
  typeButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  typeButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeButtonText: {
    fontSize: fontSizes.sm,
    color: colors.text,
  },
  typeButtonTextActive: {
    color: colors.surface,
    fontWeight: '600' as const,
  },
  modalFooter: {
    flexDirection: 'row' as const,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
};
