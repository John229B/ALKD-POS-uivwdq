
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { SafeAreaView } from 'react-native-safe-area-context';
import { commonStyles, colors, buttonStyles, spacing, fontSizes } from '../styles/commonStyles';
import { Customer } from '../types';
import { getCustomers, storeCustomers } from '../utils/storage';
import { useCustomersUpdater } from '../hooks/useCustomersSync';
import Icon from './Icon';
import uuid from 'react-native-uuid';

interface AddCustomerModalProps {
  visible: boolean;
  onClose: () => void;
  onCustomerAdded: (customer: Customer) => void;
}

export default function AddCustomerModal({ visible, onClose, onCustomerAdded }: AddCustomerModalProps) {
  const { triggerCustomersUpdate } = useCustomersUpdater();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      address: '',
    });
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const saveCustomer = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Erreur', 'Le nom du client est obligatoire');
      return;
    }

    setIsLoading(true);

    try {
      console.log('AddCustomerModal: Adding new customer:', formData.name);
      
      const customers = await getCustomers();
      
      const newCustomer: Customer = {
        id: uuid.v4() as string,
        name: formData.name.trim(),
        phone: formData.phone.trim() || undefined,
        email: formData.email.trim() || undefined,
        address: formData.address.trim() || undefined,
        balance: 0,
        totalPurchases: 0,
        transactions: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedCustomers = [...customers, newCustomer];
      
      // Save to storage
      await storeCustomers(updatedCustomers);
      
      // Trigger real-time sync across all screens
      triggerCustomersUpdate(updatedCustomers);
      
      console.log('AddCustomerModal: Customer added successfully:', newCustomer.name);
      
      // Call the callback with the new customer
      onCustomerAdded(newCustomer);
      
      // Close modal and reset form
      handleClose();
      
      Alert.alert('Succès', 'Client ajouté avec succès');
    } catch (error) {
      console.error('AddCustomerModal: Error saving customer:', error);
      Alert.alert('Erreur', 'Erreur lors de la sauvegarde du client');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={commonStyles.modalOverlay}>
          <View style={[commonStyles.modalContent, { maxHeight: '90%' }]}>
            <SafeAreaView style={{ flex: 1 }}>
              {/* Header */}
              <View style={[commonStyles.row, { marginBottom: spacing.lg, paddingHorizontal: spacing.lg, paddingTop: spacing.md }]}>
                <Text style={[commonStyles.subtitle, { flex: 1 }]}>
                  👤 Ajouter un nouveau client
                </Text>
                <TouchableOpacity onPress={handleClose} disabled={isLoading}>
                  <Icon name="close" size={24} color={colors.textLight} />
                </TouchableOpacity>
              </View>

              {/* Form */}
              <KeyboardAwareScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xl }}
                enableOnAndroid={true}
                keyboardShouldPersistTaps="handled"
                extraScrollHeight={20}
                showsVerticalScrollIndicator={false}
              >
                <View style={{ marginBottom: spacing.md }}>
                  <Text style={[commonStyles.text, { marginBottom: spacing.xs, fontWeight: '600' }]}>
                    👤 Nom complet *
                  </Text>
                  <TextInput
                    style={commonStyles.input}
                    value={formData.name}
                    onChangeText={(text) => setFormData({ ...formData, name: text })}
                    placeholder="Ex: Jean Dupont"
                    editable={!isLoading}
                  />
                </View>

                <View style={{ marginBottom: spacing.md }}>
                  <Text style={[commonStyles.text, { marginBottom: spacing.xs, fontWeight: '600' }]}>
                    📞 Téléphone
                  </Text>
                  <TextInput
                    style={commonStyles.input}
                    value={formData.phone}
                    onChangeText={(text) => setFormData({ ...formData, phone: text })}
                    placeholder="Ex: +225 01 02 03 04 05"
                    keyboardType="phone-pad"
                    editable={!isLoading}
                  />
                </View>

                <View style={{ marginBottom: spacing.md }}>
                  <Text style={[commonStyles.text, { marginBottom: spacing.xs, fontWeight: '600' }]}>
                    ✉️ Email
                  </Text>
                  <TextInput
                    style={commonStyles.input}
                    value={formData.email}
                    onChangeText={(text) => setFormData({ ...formData, email: text })}
                    placeholder="Ex: jean.dupont@email.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    editable={!isLoading}
                  />
                </View>

                <View style={{ marginBottom: spacing.lg }}>
                  <Text style={[commonStyles.text, { marginBottom: spacing.xs, fontWeight: '600' }]}>
                    📍 Adresse
                  </Text>
                  <TextInput
                    style={[commonStyles.input, { height: 80, textAlignVertical: 'top' }]}
                    value={formData.address}
                    onChangeText={(text) => setFormData({ ...formData, address: text })}
                    placeholder="Adresse complète du client..."
                    multiline
                    editable={!isLoading}
                  />
                </View>

                {/* Buttons */}
                <TouchableOpacity
                  style={[
                    buttonStyles.primary, 
                    { marginBottom: spacing.sm },
                    isLoading && { opacity: 0.6 }
                  ]}
                  onPress={saveCustomer}
                  disabled={isLoading}
                >
                  <Text style={{ color: colors.secondary, fontSize: fontSizes.md, fontWeight: '600' }}>
                    {isLoading ? '⏳ Ajout en cours...' : '➕ Ajouter le client'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[buttonStyles.outline, isLoading && { opacity: 0.6 }]}
                  onPress={handleClose}
                  disabled={isLoading}
                >
                  <Text style={{ color: colors.primary, fontSize: fontSizes.md, fontWeight: '600' }}>
                    ❌ Annuler
                  </Text>
                </TouchableOpacity>
              </KeyboardAwareScrollView>
            </SafeAreaView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
