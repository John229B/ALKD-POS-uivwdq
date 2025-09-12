
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Modal, TextInput, Switch, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Icon from '../components/Icon';
import { commonStyles, colors, buttonStyles, spacing, fontSizes } from '../styles/commonStyles';
import { AppSettings, CURRENCIES, LANGUAGES, TicketSettings } from '../types';
import { getSettings, storeSettings, logActivity } from '../utils/storage';
import * as ImagePicker from 'expo-image-picker';

export default function SettingsScreen() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [logoModalVisible, setLogoModalVisible] = useState(false);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [currencyModalVisible, setCurrencyModalVisible] = useState(false);
  const [companyModalVisible, setCompanyModalVisible] = useState(false);
  const [ticketSettingsModalVisible, setTicketSettingsModalVisible] = useState(false);
  const [formData, setFormData] = useState({
    companyName: '',
    companyAddress: '',
    companyPhone: '',
    companyEmail: '',
    receiptFooter: '',
    customThankYouMessage: '',
    taxRate: 0,
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const settingsData = await getSettings();
      console.log('Loaded settings data:', settingsData);
      
      // Ensure ticketSettings has default values to prevent undefined errors
      const safeSettings = {
        ...settingsData,
        ticketSettings: {
          showLogo: true,
          showCompanyName: true,
          showAddress: true,
          showPhone: true,
          showEmail: false,
          showThankYouMessage: true,
          showReceiptNumber: true,
          showDateTime: true,
          showEmployeeName: true,
          showTax: true,
          ...settingsData.ticketSettings, // Override with existing settings if they exist
        }
      };
      
      setSettings(safeSettings);
      setFormData({
        companyName: safeSettings.companyName,
        companyAddress: safeSettings.companyAddress,
        companyPhone: safeSettings.companyPhone,
        companyEmail: safeSettings.companyEmail,
        receiptFooter: safeSettings.receiptFooter || '',
        customThankYouMessage: safeSettings.customThankYouMessage || '',
        taxRate: safeSettings.taxRate,
      });
    } catch (error) {
      console.error('Error loading settings:', error);
      Alert.alert('Erreur', 'Impossible de charger les paramètres');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const updateSettings = async (updates: Partial<AppSettings>) => {
    if (!settings) return;

    try {
      const updatedSettings = { ...settings, ...updates };
      await storeSettings(updatedSettings);
      setSettings(updatedSettings);
      await logActivity('admin', 'settings', 'Settings updated', updates);
    } catch (error) {
      console.error('Error updating settings:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder les paramètres');
    }
  };

  const handleLanguageChange = async (language: 'fr' | 'en') => {
    await updateSettings({ language });
    setLanguageModalVisible(false);
    Alert.alert('Succès', 'Langue mise à jour avec succès');
  };

  const handleCurrencyChange = async (currency: keyof typeof CURRENCIES) => {
    await updateSettings({ currency });
    setCurrencyModalVisible(false);
    Alert.alert('Succès', 'Devise mise à jour avec succès');
  };

  const handleLogoSelection = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permission requise', 'L\'accès à la galerie est nécessaire pour sélectionner un logo');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await updateSettings({ logoUrl: result.assets[0].uri });
        setLogoModalVisible(false);
        Alert.alert('Succès', 'Logo mis à jour avec succès');
      }
    } catch (error) {
      console.error('Error selecting logo:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner le logo');
    }
  };

  const handleRemoveLogo = async () => {
    Alert.alert(
      'Supprimer le logo',
      'Êtes-vous sûr de vouloir supprimer le logo de l\'entreprise ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            await updateSettings({ logoUrl: undefined });
            setLogoModalVisible(false);
            Alert.alert('Succès', 'Logo supprimé avec succès');
          },
        },
      ]
    );
  };

  const handleCompanyInfoSave = async () => {
    if (!formData.companyName.trim()) {
      Alert.alert('Erreur', 'Le nom de l\'entreprise est obligatoire');
      return;
    }

    await updateSettings({
      companyName: formData.companyName,
      companyAddress: formData.companyAddress,
      companyPhone: formData.companyPhone,
      companyEmail: formData.companyEmail,
      receiptFooter: formData.receiptFooter,
      customThankYouMessage: formData.customThankYouMessage,
      taxRate: formData.taxRate,
    });
    
    setCompanyModalVisible(false);
    Alert.alert('Succès', 'Informations de l\'entreprise mises à jour');
  };

  const handleTicketSettingToggle = async (setting: keyof TicketSettings) => {
    if (!settings || !settings.ticketSettings) return;
    
    const updatedTicketSettings = {
      ...settings.ticketSettings,
      [setting]: !settings.ticketSettings[setting],
    };
    
    await updateSettings({ ticketSettings: updatedTicketSettings });
  };

  const toggleOfflineMode = async () => {
    if (!settings) return;
    await updateSettings({ offlineMode: !settings.offlineMode });
  };

  const toggleAutoSync = async () => {
    if (!settings) return;
    await updateSettings({ autoSync: !settings.autoSync });
  };

  if (loading || !settings) {
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
        <Text style={styles.headerTitle}>Paramètres</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Company Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Entreprise</Text>
          
          <TouchableOpacity onPress={() => setLogoModalVisible(true)} style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Icon name="image-outline" size={24} color={colors.primary} />
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Logo de l'entreprise</Text>
                <Text style={styles.settingSubtitle}>
                  {settings.logoUrl ? 'Logo configuré' : 'Aucun logo'}
                </Text>
              </View>
            </View>
            <Icon name="chevron-forward" size={20} color={colors.textLight} />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setCompanyModalVisible(true)} style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Icon name="business-outline" size={24} color={colors.primary} />
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Informations de l'entreprise</Text>
                <Text style={styles.settingSubtitle}>{settings.companyName}</Text>
              </View>
            </View>
            <Icon name="chevron-forward" size={20} color={colors.textLight} />
          </TouchableOpacity>
        </View>

        {/* Ticket Configuration Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Configuration des tickets</Text>
          
          <TouchableOpacity onPress={() => setTicketSettingsModalVisible(true)} style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Icon name="receipt-outline" size={24} color={colors.success} />
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Éléments du ticket</Text>
                <Text style={styles.settingSubtitle}>Personnaliser l&apos;apparence des tickets</Text>
              </View>
            </View>
            <Icon name="chevron-forward" size={20} color={colors.textLight} />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/tickets')} style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Icon name="eye-outline" size={24} color={colors.info} />
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Aperçu du ticket</Text>
                <Text style={styles.settingSubtitle}>Voir le rendu en temps réel</Text>
              </View>
            </View>
            <Icon name="chevron-forward" size={20} color={colors.textLight} />
          </TouchableOpacity>
        </View>

        {/* Localization Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Localisation</Text>
          
          <TouchableOpacity onPress={() => setLanguageModalVisible(true)} style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Icon name="language-outline" size={24} color={colors.info} />
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Langue</Text>
                <Text style={styles.settingSubtitle}>
                  {LANGUAGES[settings.language].flag} {LANGUAGES[settings.language].name}
                </Text>
              </View>
            </View>
            <Icon name="chevron-forward" size={20} color={colors.textLight} />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setCurrencyModalVisible(true)} style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Icon name="card-outline" size={24} color={colors.success} />
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Devise</Text>
                <Text style={styles.settingSubtitle}>
                  {CURRENCIES[settings.currency].symbol} - {CURRENCIES[settings.currency].name}
                </Text>
              </View>
            </View>
            <Icon name="chevron-forward" size={20} color={colors.textLight} />
          </TouchableOpacity>
        </View>

        {/* Sync & Offline Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Synchronisation</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Icon name="cloud-offline-outline" size={24} color={colors.warning} />
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Mode hors ligne</Text>
                <Text style={styles.settingSubtitle}>
                  Fonctionner sans connexion Internet
                </Text>
              </View>
            </View>
            <Switch
              value={settings.offlineMode}
              onValueChange={toggleOfflineMode}
              trackColor={{ false: colors.border, true: colors.warning + '40' }}
              thumbColor={settings.offlineMode ? colors.warning : colors.textLight}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Icon name="sync-outline" size={24} color={colors.info} />
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Synchronisation automatique</Text>
                <Text style={styles.settingSubtitle}>
                  Synchroniser automatiquement les données
                </Text>
              </View>
            </View>
            <Switch
              value={settings.autoSync}
              onValueChange={toggleAutoSync}
              trackColor={{ false: colors.border, true: colors.info + '40' }}
              thumbColor={settings.autoSync ? colors.info : colors.textLight}
            />
          </View>
        </View>

        {/* Advanced Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Avancé</Text>
          
          <TouchableOpacity onPress={() => router.push('/employees')} style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Icon name="people-outline" size={24} color={colors.primary} />
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Gestion des employés</Text>
                <Text style={styles.settingSubtitle}>Employés, rôles et permissions</Text>
              </View>
            </View>
            <Icon name="chevron-forward" size={20} color={colors.textLight} />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/printers')} style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Icon name="print-outline" size={24} color={colors.info} />
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Imprimantes Bluetooth</Text>
                <Text style={styles.settingSubtitle}>Configuration des imprimantes</Text>
              </View>
            </View>
            <Icon name="chevron-forward" size={20} color={colors.textLight} />
          </TouchableOpacity>
        </View>

        {/* App Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Application</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Icon name="information-circle-outline" size={24} color={colors.textLight} />
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Version</Text>
                <Text style={styles.settingSubtitle}>ALKD-POS v1.1.0</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Logo Modal */}
      <Modal
        visible={logoModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setLogoModalVisible(false)}
      >
        <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setLogoModalVisible(false)}>
              <Text style={[commonStyles.text, { color: colors.error }]}>Annuler</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Logo de l'entreprise</Text>
            <View style={{ width: 60 }} />
          </View>

          <View style={styles.logoModalContent}>
            {settings.logoUrl && (
              <View style={styles.currentLogo}>
                <Text style={styles.currentLogoTitle}>Logo actuel</Text>
                <Image source={{ uri: settings.logoUrl }} style={styles.logoPreview} />
              </View>
            )}

            <View style={styles.logoActions}>
              <TouchableOpacity onPress={handleLogoSelection} style={[buttonStyles.primary, { marginBottom: spacing.md }]}>
                <Icon name="image-outline" size={20} color={colors.background} />
                <Text style={[buttonStyles.primaryText, { marginLeft: spacing.sm }]}>
                  {settings.logoUrl ? 'Changer le logo' : 'Sélectionner un logo'}
                </Text>
              </TouchableOpacity>

              {settings.logoUrl && (
                <TouchableOpacity onPress={handleRemoveLogo} style={[buttonStyles.secondary, { borderColor: colors.error }]}>
                  <Icon name="trash-outline" size={20} color={colors.error} />
                  <Text style={[buttonStyles.secondaryText, { color: colors.error, marginLeft: spacing.sm }]}>
                    Supprimer le logo
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Ticket Settings Modal */}
      <Modal
        visible={ticketSettingsModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setTicketSettingsModalVisible(false)}
      >
        <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setTicketSettingsModalVisible(false)}>
              <Text style={[commonStyles.text, { color: colors.error }]}>Fermer</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Configuration du ticket</Text>
            <TouchableOpacity onPress={() => router.push('/tickets')}>
              <Text style={[commonStyles.text, { color: colors.primary, fontWeight: '600' }]}>
                Aperçu
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.ticketSettingsContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.ticketSettingsDescription}>
              Activez ou désactivez les éléments qui apparaîtront sur vos tickets de vente.
            </Text>

            <View style={styles.ticketSettingsList}>
              <View style={styles.ticketSettingItem}>
                <View style={styles.ticketSettingLeft}>
                  <Icon name="image-outline" size={24} color={colors.primary} />
                  <View style={styles.ticketSettingInfo}>
                    <Text style={styles.ticketSettingTitle}>Logo de l'entreprise</Text>
                    <Text style={styles.ticketSettingSubtitle}>Afficher le logo sur le ticket</Text>
                  </View>
                </View>
                <Switch
                  value={settings.ticketSettings?.showLogo || false}
                  onValueChange={() => handleTicketSettingToggle('showLogo')}
                  trackColor={{ false: colors.border, true: colors.primary + '40' }}
                  thumbColor={settings.ticketSettings?.showLogo ? colors.primary : colors.textLight}
                />
              </View>

              <View style={styles.ticketSettingItem}>
                <View style={styles.ticketSettingLeft}>
                  <Icon name="business-outline" size={24} color={colors.primary} />
                  <View style={styles.ticketSettingInfo}>
                    <Text style={styles.ticketSettingTitle}>Nom de l'entreprise</Text>
                    <Text style={styles.ticketSettingSubtitle}>Afficher le nom de l'entreprise</Text>
                  </View>
                </View>
                <Switch
                  value={settings.ticketSettings?.showCompanyName || false}
                  onValueChange={() => handleTicketSettingToggle('showCompanyName')}
                  trackColor={{ false: colors.border, true: colors.primary + '40' }}
                  thumbColor={settings.ticketSettings?.showCompanyName ? colors.primary : colors.textLight}
                />
              </View>

              <View style={styles.ticketSettingItem}>
                <View style={styles.ticketSettingLeft}>
                  <Icon name="location-outline" size={24} color={colors.info} />
                  <View style={styles.ticketSettingInfo}>
                    <Text style={styles.ticketSettingTitle}>Adresse</Text>
                    <Text style={styles.ticketSettingSubtitle}>Afficher l'adresse de l'entreprise</Text>
                  </View>
                </View>
                <Switch
                  value={settings.ticketSettings?.showAddress || false}
                  onValueChange={() => handleTicketSettingToggle('showAddress')}
                  trackColor={{ false: colors.border, true: colors.info + '40' }}
                  thumbColor={settings.ticketSettings?.showAddress ? colors.info : colors.textLight}
                />
              </View>

              <View style={styles.ticketSettingItem}>
                <View style={styles.ticketSettingLeft}>
                  <Icon name="call-outline" size={24} color={colors.success} />
                  <View style={styles.ticketSettingInfo}>
                    <Text style={styles.ticketSettingTitle}>Numéro de téléphone</Text>
                    <Text style={styles.ticketSettingSubtitle}>Afficher le téléphone</Text>
                  </View>
                </View>
                <Switch
                  value={settings.ticketSettings?.showPhone || false}
                  onValueChange={() => handleTicketSettingToggle('showPhone')}
                  trackColor={{ false: colors.border, true: colors.success + '40' }}
                  thumbColor={settings.ticketSettings?.showPhone ? colors.success : colors.textLight}
                />
              </View>

              <View style={styles.ticketSettingItem}>
                <View style={styles.ticketSettingLeft}>
                  <Icon name="mail-outline" size={24} color={colors.warning} />
                  <View style={styles.ticketSettingInfo}>
                    <Text style={styles.ticketSettingTitle}>Adresse email</Text>
                    <Text style={styles.ticketSettingSubtitle}>Afficher l'email de l'entreprise</Text>
                  </View>
                </View>
                <Switch
                  value={settings.ticketSettings?.showEmail || false}
                  onValueChange={() => handleTicketSettingToggle('showEmail')}
                  trackColor={{ false: colors.border, true: colors.warning + '40' }}
                  thumbColor={settings.ticketSettings?.showEmail ? colors.warning : colors.textLight}
                />
              </View>

              <View style={styles.ticketSettingItem}>
                <View style={styles.ticketSettingLeft}>
                  <Icon name="heart-outline" size={24} color={colors.error} />
                  <View style={styles.ticketSettingInfo}>
                    <Text style={styles.ticketSettingTitle}>Message de remerciement</Text>
                    <Text style={styles.ticketSettingSubtitle}>Afficher le message personnalisé</Text>
                  </View>
                </View>
                <Switch
                  value={settings.ticketSettings?.showThankYouMessage || false}
                  onValueChange={() => handleTicketSettingToggle('showThankYouMessage')}
                  trackColor={{ false: colors.border, true: colors.error + '40' }}
                  thumbColor={settings.ticketSettings?.showThankYouMessage ? colors.error : colors.textLight}
                />
              </View>

              <View style={styles.ticketSettingItem}>
                <View style={styles.ticketSettingLeft}>
                  <Icon name="receipt-outline" size={24} color={colors.textLight} />
                  <View style={styles.ticketSettingInfo}>
                    <Text style={styles.ticketSettingTitle}>Numéro de ticket</Text>
                    <Text style={styles.ticketSettingSubtitle}>Afficher le numéro de reçu</Text>
                  </View>
                </View>
                <Switch
                  value={settings.ticketSettings?.showReceiptNumber || false}
                  onValueChange={() => handleTicketSettingToggle('showReceiptNumber')}
                  trackColor={{ false: colors.border, true: colors.textLight + '40' }}
                  thumbColor={settings.ticketSettings?.showReceiptNumber ? colors.textLight : colors.textLight}
                />
              </View>

              <View style={styles.ticketSettingItem}>
                <View style={styles.ticketSettingLeft}>
                  <Icon name="time-outline" size={24} color={colors.textLight} />
                  <View style={styles.ticketSettingInfo}>
                    <Text style={styles.ticketSettingTitle}>Date et heure</Text>
                    <Text style={styles.ticketSettingSubtitle}>Afficher la date et l'heure de vente</Text>
                  </View>
                </View>
                <Switch
                  value={settings.ticketSettings?.showDateTime || false}
                  onValueChange={() => handleTicketSettingToggle('showDateTime')}
                  trackColor={{ false: colors.border, true: colors.textLight + '40' }}
                  thumbColor={settings.ticketSettings?.showDateTime ? colors.textLight : colors.textLight}
                />
              </View>

              <View style={styles.ticketSettingItem}>
                <View style={styles.ticketSettingLeft}>
                  <Icon name="person-outline" size={24} color={colors.textLight} />
                  <View style={styles.ticketSettingInfo}>
                    <Text style={styles.ticketSettingTitle}>Nom de l'employé</Text>
                    <Text style={styles.ticketSettingSubtitle}>Afficher qui a effectué la vente</Text>
                  </View>
                </View>
                <Switch
                  value={settings.ticketSettings?.showEmployeeName || false}
                  onValueChange={() => handleTicketSettingToggle('showEmployeeName')}
                  trackColor={{ false: colors.border, true: colors.textLight + '40' }}
                  thumbColor={settings.ticketSettings?.showEmployeeName ? colors.textLight : colors.textLight}
                />
              </View>

              <View style={styles.ticketSettingItem}>
                <View style={styles.ticketSettingLeft}>
                  <Icon name="calculator-outline" size={24} color={colors.textLight} />
                  <View style={styles.ticketSettingInfo}>
                    <Text style={styles.ticketSettingTitle}>TVA</Text>
                    <Text style={styles.ticketSettingSubtitle}>Afficher le montant de la TVA</Text>
                  </View>
                </View>
                <Switch
                  value={settings.ticketSettings?.showTax || false}
                  onValueChange={() => handleTicketSettingToggle('showTax')}
                  trackColor={{ false: colors.border, true: colors.textLight + '40' }}
                  thumbColor={settings.ticketSettings?.showTax ? colors.textLight : colors.textLight}
                />
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Language Modal */}
      <Modal
        visible={languageModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setLanguageModalVisible(false)}
      >
        <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setLanguageModalVisible(false)}>
              <Text style={[commonStyles.text, { color: colors.error }]}>Annuler</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Choisir la langue</Text>
            <View style={{ width: 60 }} />
          </View>

          <View style={styles.optionsContainer}>
            {(Object.keys(LANGUAGES) as (keyof typeof LANGUAGES)[]).map((lang) => (
              <TouchableOpacity
                key={lang}
                onPress={() => handleLanguageChange(lang)}
                style={[
                  styles.optionItem,
                  settings.language === lang && styles.optionItemSelected
                ]}
              >
                <Text style={styles.optionFlag}>{LANGUAGES[lang].flag}</Text>
                <Text style={[
                  styles.optionText,
                  settings.language === lang && { color: colors.primary, fontWeight: '600' }
                ]}>
                  {LANGUAGES[lang].name}
                </Text>
                {settings.language === lang && (
                  <Icon name="checkmark" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </SafeAreaView>
      </Modal>

      {/* Currency Modal */}
      <Modal
        visible={currencyModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setCurrencyModalVisible(false)}
      >
        <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setCurrencyModalVisible(false)}>
              <Text style={[commonStyles.text, { color: colors.error }]}>Annuler</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Choisir la devise</Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView style={styles.optionsContainer} showsVerticalScrollIndicator={false}>
            {(Object.keys(CURRENCIES) as (keyof typeof CURRENCIES)[]).map((currency) => (
              <TouchableOpacity
                key={currency}
                onPress={() => handleCurrencyChange(currency)}
                style={[
                  styles.optionItem,
                  settings.currency === currency && styles.optionItemSelected
                ]}
              >
                <Text style={styles.optionSymbol}>{CURRENCIES[currency].symbol}</Text>
                <View style={styles.optionInfo}>
                  <Text style={[
                    styles.optionText,
                    settings.currency === currency && { color: colors.primary, fontWeight: '600' }
                  ]}>
                    {CURRENCIES[currency].name}
                  </Text>
                  <Text style={styles.optionSubtext}>{currency}</Text>
                </View>
                {settings.currency === currency && (
                  <Icon name="checkmark" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Company Info Modal */}
      <Modal
        visible={companyModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setCompanyModalVisible(false)}
      >
        <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setCompanyModalVisible(false)}>
              <Text style={[commonStyles.text, { color: colors.error }]}>Annuler</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Informations entreprise</Text>
            <TouchableOpacity onPress={handleCompanyInfoSave}>
              <Text style={[commonStyles.text, { color: colors.primary, fontWeight: '600' }]}>
                Sauvegarder
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Nom de l'entreprise *</Text>
              <TextInput
                style={styles.formInput}
                value={formData.companyName}
                onChangeText={(text) => setFormData({ ...formData, companyName: text })}
                placeholder="Nom de votre entreprise"
                placeholderTextColor={colors.textLight}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Adresse</Text>
              <TextInput
                style={[styles.formInput, { height: 80 }]}
                value={formData.companyAddress}
                onChangeText={(text) => setFormData({ ...formData, companyAddress: text })}
                placeholder="Adresse complète"
                placeholderTextColor={colors.textLight}
                multiline
                textAlignVertical="top"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Téléphone</Text>
              <TextInput
                style={styles.formInput}
                value={formData.companyPhone}
                onChangeText={(text) => setFormData({ ...formData, companyPhone: text })}
                placeholder="+225 XX XX XX XX"
                placeholderTextColor={colors.textLight}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Email</Text>
              <TextInput
                style={styles.formInput}
                value={formData.companyEmail}
                onChangeText={(text) => setFormData({ ...formData, companyEmail: text })}
                placeholder="contact@entreprise.com"
                placeholderTextColor={colors.textLight}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Taux de TVA (%)</Text>
              <TextInput
                style={styles.formInput}
                value={formData.taxRate.toString()}
                onChangeText={(text) => setFormData({ ...formData, taxRate: parseFloat(text) || 0 })}
                placeholder="0"
                placeholderTextColor={colors.textLight}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Pied de page des reçus</Text>
              <TextInput
                style={[styles.formInput, { height: 60 }]}
                value={formData.receiptFooter}
                onChangeText={(text) => setFormData({ ...formData, receiptFooter: text })}
                placeholder="Merci pour votre achat!"
                placeholderTextColor={colors.textLight}
                multiline
                textAlignVertical="top"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Message de remerciement personnalisé</Text>
              <TextInput
                style={[styles.formInput, { height: 80 }]}
                value={formData.customThankYouMessage}
                onChangeText={(text) => setFormData({ ...formData, customThankYouMessage: text })}
                placeholder="Message personnalisé pour les tickets"
                placeholderTextColor={colors.textLight}
                multiline
                textAlignVertical="top"
              />
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
  headerTitle: {
    fontSize: fontSizes.xl,
    fontWeight: '700' as const,
    color: colors.text,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSizes.lg,
    fontWeight: '600' as const,
    color: colors.text,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    flex: 1,
  },
  settingInfo: {
    marginLeft: spacing.md,
    flex: 1,
  },
  settingTitle: {
    fontSize: fontSizes.md,
    fontWeight: '500' as const,
    color: colors.text,
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: fontSizes.sm,
    color: colors.textLight,
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
  logoModalContent: {
    flex: 1,
    padding: spacing.lg,
  },
  currentLogo: {
    alignItems: 'center' as const,
    marginBottom: spacing.xl,
  },
  currentLogoTitle: {
    fontSize: fontSizes.md,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: spacing.md,
  },
  logoPreview: {
    width: 120,
    height: 120,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  logoActions: {
    flex: 1,
    justifyContent: 'center' as const,
  },
  ticketSettingsContent: {
    flex: 1,
    padding: spacing.lg,
  },
  ticketSettingsDescription: {
    fontSize: fontSizes.md,
    color: colors.textLight,
    textAlign: 'center' as const,
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  ticketSettingsList: {
    gap: spacing.sm,
  },
  ticketSettingItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ticketSettingLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    flex: 1,
  },
  ticketSettingInfo: {
    marginLeft: spacing.md,
    flex: 1,
  },
  ticketSettingTitle: {
    fontSize: fontSizes.md,
    fontWeight: '500' as const,
    color: colors.text,
    marginBottom: 2,
  },
  ticketSettingSubtitle: {
    fontSize: fontSizes.sm,
    color: colors.textLight,
  },
  optionsContainer: {
    flex: 1,
    padding: spacing.lg,
  },
  optionItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionItemSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  optionFlag: {
    fontSize: fontSizes.xl,
    marginRight: spacing.md,
  },
  optionSymbol: {
    fontSize: fontSizes.lg,
    fontWeight: '600' as const,
    color: colors.primary,
    marginRight: spacing.md,
    minWidth: 30,
  },
  optionInfo: {
    flex: 1,
  },
  optionText: {
    fontSize: fontSizes.md,
    color: colors.text,
  },
  optionSubtext: {
    fontSize: fontSizes.sm,
    color: colors.textLight,
    marginTop: 2,
  },
  formContainer: {
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
};
