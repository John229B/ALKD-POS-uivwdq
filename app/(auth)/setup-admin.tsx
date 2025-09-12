
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { commonStyles, colors, buttonStyles, spacing, fontSizes } from '../../styles/commonStyles';
import { useAuthState } from '../../hooks/useAuth';
import { CreateAccountData } from '../../types/auth';
import Icon from '../../components/Icon';

export default function SetupAdminScreen() {
  const [formData, setFormData] = useState<CreateAccountData>({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    companyName: '',
    companyPhone: '',
    companyAddress: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { createAdminAccount } = useAuthState();

  const handleInputChange = (field: keyof CreateAccountData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = (): string | null => {
    if (!formData.username.trim()) return 'Le nom d\'utilisateur est requis';
    if (!formData.email.trim()) return 'L\'email est requis';
    if (!formData.password) return 'Le mot de passe est requis';
    if (!formData.confirmPassword) return 'La confirmation du mot de passe est requise';
    if (!formData.companyName.trim()) return 'Le nom de l\'entreprise est requis';
    
    if (formData.username.length < 3) return 'Le nom d\'utilisateur doit contenir au moins 3 caractères';
    if (formData.password.length < 6) return 'Le mot de passe doit contenir au moins 6 caractères';
    if (formData.password !== formData.confirmPassword) return 'Les mots de passe ne correspondent pas';
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) return 'Format d\'email invalide';

    return null;
  };

  const handleCreateAccount = async () => {
    const validationError = validateForm();
    if (validationError) {
      Alert.alert('Erreur de validation', validationError);
      return;
    }

    setIsLoading(true);
    try {
      await createAdminAccount(formData);
      Alert.alert(
        'Compte créé avec succès',
        'Votre compte administrateur a été créé. Vous pouvez maintenant accéder à votre application.',
        [
          {
            text: 'Continuer',
            onPress: () => router.replace('/(tabs)/dashboard'),
          },
        ]
      );
    } catch (error) {
      console.error('Error creating admin account:', error);
      Alert.alert('Erreur', error instanceof Error ? error.message : 'Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={commonStyles.container}>
      <KeyboardAvoidingView 
        style={commonStyles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={commonStyles.content} showsVerticalScrollIndicator={false}>
          <View style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.xl }}>
            {/* Header */}
            <View style={[commonStyles.center, { marginBottom: spacing.xl }]}>
              <View style={{
                width: 80,
                height: 80,
                backgroundColor: colors.primary,
                borderRadius: 40,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: spacing.lg,
              }}>
                <Icon name="storefront" size={40} color={colors.secondary} />
              </View>
              <Text style={[commonStyles.title, { textAlign: 'center' }]}>
                Bienvenue dans ALKD-POS
              </Text>
              <Text style={[commonStyles.textLight, { textAlign: 'center', marginTop: spacing.sm }]}>
                Créez votre compte administrateur pour commencer
              </Text>
            </View>

            {/* Form */}
            <View style={commonStyles.card}>
              <Text style={[commonStyles.subtitle, { marginBottom: spacing.lg, textAlign: 'center' }]}>
                Configuration initiale
              </Text>

              {/* Company Information */}
              <Text style={[commonStyles.text, { marginBottom: spacing.md, fontWeight: '600' }]}>
                Informations de l'entreprise
              </Text>

              <View style={{ marginBottom: spacing.md }}>
                <Text style={[commonStyles.textLight, { marginBottom: spacing.xs }]}>
                  Nom de l'entreprise *
                </Text>
                <TextInput
                  style={commonStyles.input}
                  value={formData.companyName}
                  onChangeText={(value) => handleInputChange('companyName', value)}
                  placeholder="Ex: Mon Magasin"
                  autoCapitalize="words"
                />
              </View>

              <View style={{ marginBottom: spacing.md }}>
                <Text style={[commonStyles.textLight, { marginBottom: spacing.xs }]}>
                  Téléphone de l'entreprise
                </Text>
                <TextInput
                  style={commonStyles.input}
                  value={formData.companyPhone}
                  onChangeText={(value) => handleInputChange('companyPhone', value)}
                  placeholder="Ex: +225 01 02 03 04 05"
                  keyboardType="phone-pad"
                />
              </View>

              <View style={{ marginBottom: spacing.lg }}>
                <Text style={[commonStyles.textLight, { marginBottom: spacing.xs }]}>
                  Adresse de l'entreprise
                </Text>
                <TextInput
                  style={[commonStyles.input, { height: 80 }]}
                  value={formData.companyAddress}
                  onChangeText={(value) => handleInputChange('companyAddress', value)}
                  placeholder="Ex: Abidjan, Cocody, Riviera"
                  multiline
                  textAlignVertical="top"
                />
              </View>

              {/* Admin Account */}
              <Text style={[commonStyles.text, { marginBottom: spacing.md, fontWeight: '600' }]}>
                Compte administrateur
              </Text>

              <View style={{ marginBottom: spacing.md }}>
                <Text style={[commonStyles.textLight, { marginBottom: spacing.xs }]}>
                  Nom d'utilisateur *
                </Text>
                <TextInput
                  style={commonStyles.input}
                  value={formData.username}
                  onChangeText={(value) => handleInputChange('username', value)}
                  placeholder="Ex: admin"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={{ marginBottom: spacing.md }}>
                <Text style={[commonStyles.textLight, { marginBottom: spacing.xs }]}>
                  Email *
                </Text>
                <TextInput
                  style={commonStyles.input}
                  value={formData.email}
                  onChangeText={(value) => handleInputChange('email', value)}
                  placeholder="Ex: admin@monmagasin.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={{ marginBottom: spacing.md }}>
                <Text style={[commonStyles.textLight, { marginBottom: spacing.xs }]}>
                  Mot de passe *
                </Text>
                <View style={{ position: 'relative' }}>
                  <TextInput
                    style={[commonStyles.input, { paddingRight: 50 }]}
                    value={formData.password}
                    onChangeText={(value) => handleInputChange('password', value)}
                    placeholder="Minimum 6 caractères"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    style={{
                      position: 'absolute',
                      right: 15,
                      top: 15,
                      padding: 5,
                    }}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Icon 
                      name={showPassword ? 'eye-off' : 'eye'} 
                      size={20} 
                      color={colors.textLight} 
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={{ marginBottom: spacing.lg }}>
                <Text style={[commonStyles.textLight, { marginBottom: spacing.xs }]}>
                  Confirmer le mot de passe *
                </Text>
                <View style={{ position: 'relative' }}>
                  <TextInput
                    style={[commonStyles.input, { paddingRight: 50 }]}
                    value={formData.confirmPassword}
                    onChangeText={(value) => handleInputChange('confirmPassword', value)}
                    placeholder="Retapez votre mot de passe"
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    style={{
                      position: 'absolute',
                      right: 15,
                      top: 15,
                      padding: 5,
                    }}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    <Icon 
                      name={showConfirmPassword ? 'eye-off' : 'eye'} 
                      size={20} 
                      color={colors.textLight} 
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={[buttonStyles.primary, { opacity: isLoading ? 0.7 : 1 }]}
                onPress={handleCreateAccount}
                disabled={isLoading}
              >
                <Text style={{ color: colors.secondary, fontSize: fontSizes.md, fontWeight: '600' }}>
                  {isLoading ? 'Création en cours...' : 'Créer le compte administrateur'}
                </Text>
              </TouchableOpacity>

              <View style={{ 
                marginTop: spacing.lg, 
                padding: spacing.md, 
                backgroundColor: colors.backgroundAlt, 
                borderRadius: 8 
              }}>
                <Text style={[commonStyles.textLight, { textAlign: 'center', fontSize: fontSizes.sm }]}>
                  Ce compte aura tous les droits d'administration.{'\n'}
                  Vous pourrez ensuite ajouter des employés avec des permissions spécifiques.
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
