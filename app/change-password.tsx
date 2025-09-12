
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { commonStyles, colors, buttonStyles, spacing, fontSizes } from '../styles/commonStyles';
import { useAuthState } from '../hooks/useAuth';
import Icon from '../components/Icon';

export default function ChangePasswordScreen() {
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const { changePassword, user } = useAuthState();

  const handleInputChange = (field: string, value: string) => {
    setPasswords(prev => ({ ...prev, [field]: value }));
  };

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const validateForm = (): string | null => {
    if (!passwords.currentPassword) return 'Le mot de passe actuel est requis';
    if (!passwords.newPassword) return 'Le nouveau mot de passe est requis';
    if (!passwords.confirmPassword) return 'La confirmation du mot de passe est requise';
    
    if (passwords.newPassword.length < 6) return 'Le nouveau mot de passe doit contenir au moins 6 caractères';
    if (passwords.newPassword !== passwords.confirmPassword) return 'Les nouveaux mots de passe ne correspondent pas';
    if (passwords.currentPassword === passwords.newPassword) return 'Le nouveau mot de passe doit être différent de l\'ancien';

    return null;
  };

  const handleChangePassword = async () => {
    const validationError = validateForm();
    if (validationError) {
      Alert.alert('Erreur de validation', validationError);
      return;
    }

    setIsLoading(true);
    try {
      await changePassword(passwords.currentPassword, passwords.newPassword);
      
      Alert.alert(
        'Mot de passe modifié',
        'Votre mot de passe a été modifié avec succès.',
        [
          {
            text: 'Continuer',
            onPress: () => router.replace('/(tabs)/dashboard'),
          },
        ]
      );
    } catch (error) {
      console.error('Change password error:', error);
      Alert.alert('Erreur', error instanceof Error ? error.message : 'Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    Alert.alert(
      'Ignorer le changement de mot de passe',
      'Il est recommandé de changer votre mot de passe pour sécuriser votre compte. Êtes-vous sûr de vouloir ignorer cette étape ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Ignorer',
          style: 'destructive',
          onPress: () => router.replace('/(tabs)/dashboard'),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={commonStyles.container}>
      <KeyboardAvoidingView 
        style={commonStyles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[commonStyles.content, { justifyContent: 'center', paddingHorizontal: spacing.lg }]}>
          {/* Header */}
          <View style={[commonStyles.center, { marginBottom: spacing.xl }]}>
            <View style={{
              width: 60,
              height: 60,
              backgroundColor: colors.primary,
              borderRadius: 30,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: spacing.lg,
            }}>
              <Icon name="lock-closed" size={30} color={colors.secondary} />
            </View>
            <Text style={[commonStyles.title, { textAlign: 'center' }]}>
              Changer le mot de passe
            </Text>
            <Text style={[commonStyles.textLight, { textAlign: 'center', marginTop: spacing.sm }]}>
              Sécurisez votre compte avec un nouveau mot de passe
            </Text>
          </View>

          <View style={commonStyles.card}>
            <Text style={[commonStyles.subtitle, { marginBottom: spacing.lg, textAlign: 'center' }]}>
              Nouveau mot de passe
            </Text>

            {/* Current Password */}
            <View style={{ marginBottom: spacing.md }}>
              <Text style={[commonStyles.textLight, { marginBottom: spacing.xs }]}>
                Mot de passe actuel
              </Text>
              <View style={{ position: 'relative' }}>
                <TextInput
                  style={[commonStyles.input, { paddingRight: 50 }]}
                  value={passwords.currentPassword}
                  onChangeText={(value) => handleInputChange('currentPassword', value)}
                  placeholder="Saisissez votre mot de passe actuel"
                  secureTextEntry={!showPasswords.current}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                />
                <TouchableOpacity
                  style={{
                    position: 'absolute',
                    right: 15,
                    top: 15,
                    padding: 5,
                  }}
                  onPress={() => togglePasswordVisibility('current')}
                  disabled={isLoading}
                >
                  <Icon 
                    name={showPasswords.current ? 'eye-off' : 'eye'} 
                    size={20} 
                    color={colors.textLight} 
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* New Password */}
            <View style={{ marginBottom: spacing.md }}>
              <Text style={[commonStyles.textLight, { marginBottom: spacing.xs }]}>
                Nouveau mot de passe
              </Text>
              <View style={{ position: 'relative' }}>
                <TextInput
                  style={[commonStyles.input, { paddingRight: 50 }]}
                  value={passwords.newPassword}
                  onChangeText={(value) => handleInputChange('newPassword', value)}
                  placeholder="Minimum 6 caractères"
                  secureTextEntry={!showPasswords.new}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                />
                <TouchableOpacity
                  style={{
                    position: 'absolute',
                    right: 15,
                    top: 15,
                    padding: 5,
                  }}
                  onPress={() => togglePasswordVisibility('new')}
                  disabled={isLoading}
                >
                  <Icon 
                    name={showPasswords.new ? 'eye-off' : 'eye'} 
                    size={20} 
                    color={colors.textLight} 
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm Password */}
            <View style={{ marginBottom: spacing.lg }}>
              <Text style={[commonStyles.textLight, { marginBottom: spacing.xs }]}>
                Confirmer le nouveau mot de passe
              </Text>
              <View style={{ position: 'relative' }}>
                <TextInput
                  style={[commonStyles.input, { paddingRight: 50 }]}
                  value={passwords.confirmPassword}
                  onChangeText={(value) => handleInputChange('confirmPassword', value)}
                  placeholder="Retapez votre nouveau mot de passe"
                  secureTextEntry={!showPasswords.confirm}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                />
                <TouchableOpacity
                  style={{
                    position: 'absolute',
                    right: 15,
                    top: 15,
                    padding: 5,
                  }}
                  onPress={() => togglePasswordVisibility('confirm')}
                  disabled={isLoading}
                >
                  <Icon 
                    name={showPasswords.confirm ? 'eye-off' : 'eye'} 
                    size={20} 
                    color={colors.textLight} 
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[buttonStyles.primary, { opacity: isLoading ? 0.7 : 1 }]}
              onPress={handleChangePassword}
              disabled={isLoading}
            >
              <Text style={{ color: colors.secondary, fontSize: fontSizes.md, fontWeight: '600' }}>
                {isLoading ? 'Modification...' : 'Changer le mot de passe'}
              </Text>
            </TouchableOpacity>

            {user?.isFirstLogin && (
              <TouchableOpacity
                style={{ marginTop: spacing.md, alignItems: 'center' }}
                onPress={handleSkip}
                disabled={isLoading}
              >
                <Text style={[commonStyles.textLight, { fontSize: fontSizes.sm }]}>
                  Ignorer pour le moment
                </Text>
              </TouchableOpacity>
            )}

            <View style={{ 
              marginTop: spacing.lg, 
              padding: spacing.md, 
              backgroundColor: colors.backgroundAlt, 
              borderRadius: 8 
            }}>
              <Text style={[commonStyles.textLight, { textAlign: 'center', fontSize: fontSizes.sm }]}>
                💡 Conseils pour un mot de passe sécurisé :{'\n'}
                • Au moins 6 caractères{'\n'}
                • Mélangez lettres, chiffres et symboles{'\n'}
                • Évitez les informations personnelles
              </Text>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
