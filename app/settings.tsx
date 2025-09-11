
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Alert, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { commonStyles, colors, buttonStyles } from '../styles/commonStyles';
import { getSettings, storeSettings } from '../utils/storage';
import { AppSettings } from '../types';
import Icon from '../components/Icon';

export default function SettingsScreen() {
  const [settings, setSettings] = useState<AppSettings>({
    companyName: 'ALKD-POS',
    companyAddress: '',
    companyPhone: '',
    companyEmail: '',
    currency: 'XOF',
    language: 'fr',
    taxRate: 0,
    receiptFooter: 'Merci pour votre achat!',
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const currentSettings = await getSettings();
      setSettings(currentSettings);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettings = async () => {
    if (!settings.companyName.trim()) {
      Alert.alert('Erreur', 'Le nom de l\'entreprise est obligatoire');
      return;
    }

    setIsLoading(true);
    try {
      await storeSettings(settings);
      Alert.alert('Succès', 'Paramètres sauvegardés avec succès');
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Erreur', 'Erreur lors de la sauvegarde des paramètres');
    } finally {
      setIsLoading(false);
    }
  };

  const updateSetting = (key: keyof AppSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <SafeAreaView style={commonStyles.container}>
      <View style={commonStyles.content}>
        {/* Header */}
        <View style={[commonStyles.section, commonStyles.row]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Icon name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[commonStyles.title, { flex: 1, textAlign: 'center', marginRight: 24 }]}>
            Paramètres
          </Text>
        </View>

        <ScrollView style={{ flex: 1, paddingHorizontal: 20 }}>
          {/* Company Information */}
          <View style={[commonStyles.card, { marginBottom: 16 }]}>
            <Text style={[commonStyles.subtitle, { marginBottom: 16 }]}>
              Informations de l'entreprise
            </Text>

            <View style={{ marginBottom: 16 }}>
              <Text style={[commonStyles.text, { marginBottom: 8 }]}>Nom de l'entreprise *</Text>
              <TextInput
                style={commonStyles.input}
                value={settings.companyName}
                onChangeText={(text) => updateSetting('companyName', text)}
                placeholder="Nom de votre entreprise"
              />
            </View>

            <View style={{ marginBottom: 16 }}>
              <Text style={[commonStyles.text, { marginBottom: 8 }]}>Adresse</Text>
              <TextInput
                style={[commonStyles.input, { height: 80, textAlignVertical: 'top' }]}
                value={settings.companyAddress}
                onChangeText={(text) => updateSetting('companyAddress', text)}
                placeholder="Adresse complète de l'entreprise"
                multiline
              />
            </View>

            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
              <View style={{ flex: 1 }}>
                <Text style={[commonStyles.text, { marginBottom: 8 }]}>Téléphone</Text>
                <TextInput
                  style={commonStyles.input}
                  value={settings.companyPhone}
                  onChangeText={(text) => updateSetting('companyPhone', text)}
                  placeholder="Numéro de téléphone"
                  keyboardType="phone-pad"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[commonStyles.text, { marginBottom: 8 }]}>Email</Text>
                <TextInput
                  style={commonStyles.input}
                  value={settings.companyEmail}
                  onChangeText={(text) => updateSetting('companyEmail', text)}
                  placeholder="Adresse email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>
          </View>

          {/* Currency and Language */}
          <View style={[commonStyles.card, { marginBottom: 16 }]}>
            <Text style={[commonStyles.subtitle, { marginBottom: 16 }]}>
              Devise et langue
            </Text>

            <View style={{ marginBottom: 16 }}>
              <Text style={[commonStyles.text, { marginBottom: 8 }]}>Devise</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {[
                  { key: 'XOF', label: 'FCFA (XOF)' },
                  { key: 'USD', label: 'Dollar ($)' },
                  { key: 'EUR', label: 'Euro (€)' },
                ].map(currency => (
                  <TouchableOpacity
                    key={currency.key}
                    style={[
                      buttonStyles.outline,
                      { flex: 1, paddingVertical: 8 },
                      settings.currency === currency.key && { 
                        backgroundColor: colors.primary, 
                        borderColor: colors.primary 
                      }
                    ]}
                    onPress={() => updateSetting('currency', currency.key)}
                  >
                    <Text style={{
                      color: settings.currency === currency.key ? colors.secondary : colors.primary,
                      fontSize: 12,
                      fontWeight: '600',
                      textAlign: 'center'
                    }}>
                      {currency.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={{ marginBottom: 16 }}>
              <Text style={[commonStyles.text, { marginBottom: 8 }]}>Langue</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {[
                  { key: 'fr', label: 'Français' },
                  { key: 'en', label: 'English' },
                ].map(language => (
                  <TouchableOpacity
                    key={language.key}
                    style={[
                      buttonStyles.outline,
                      { flex: 1, paddingVertical: 8 },
                      settings.language === language.key && { 
                        backgroundColor: colors.primary, 
                        borderColor: colors.primary 
                      }
                    ]}
                    onPress={() => updateSetting('language', language.key)}
                  >
                    <Text style={{
                      color: settings.language === language.key ? colors.secondary : colors.primary,
                      fontSize: 14,
                      fontWeight: '600',
                      textAlign: 'center'
                    }}>
                      {language.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Tax and Receipt */}
          <View style={[commonStyles.card, { marginBottom: 16 }]}>
            <Text style={[commonStyles.subtitle, { marginBottom: 16 }]}>
              Taxes et reçus
            </Text>

            <View style={{ marginBottom: 16 }}>
              <Text style={[commonStyles.text, { marginBottom: 8 }]}>Taux de taxe (%)</Text>
              <TextInput
                style={commonStyles.input}
                value={settings.taxRate.toString()}
                onChangeText={(text) => updateSetting('taxRate', parseFloat(text) || 0)}
                placeholder="0"
                keyboardType="numeric"
              />
            </View>

            <View style={{ marginBottom: 16 }}>
              <Text style={[commonStyles.text, { marginBottom: 8 }]}>Message de fin de reçu</Text>
              <TextInput
                style={[commonStyles.input, { height: 60, textAlignVertical: 'top' }]}
                value={settings.receiptFooter || ''}
                onChangeText={(text) => updateSetting('receiptFooter', text)}
                placeholder="Message à afficher en bas du reçu"
                multiline
              />
            </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[buttonStyles.primary, { marginBottom: 20, opacity: isLoading ? 0.7 : 1 }]}
            onPress={saveSettings}
            disabled={isLoading}
          >
            <Text style={{ color: colors.secondary, fontSize: 16, fontWeight: '600' }}>
              {isLoading ? 'Sauvegarde...' : 'Sauvegarder les paramètres'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
