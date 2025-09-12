
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { commonStyles, colors, buttonStyles, spacing, fontSizes } from '../../styles/commonStyles';
import { useAuthState } from '../../hooks/useAuth';
import { LoginCredentials } from '../../types/auth';
import Icon from '../../components/Icon';

export default function LoginScreen() {
  const [credentials, setCredentials] = useState<LoginCredentials>({
    username: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { login } = useAuthState();

  const handleInputChange = (field: keyof LoginCredentials, value: string) => {
    setCredentials(prev => ({ ...prev, [field]: value }));
  };

  const handleLogin = async () => {
    if (!credentials.username.trim() || !credentials.password.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir votre nom d\'utilisateur et mot de passe');
      return;
    }

    setIsLoading(true);
    try {
      const user = await login(credentials);
      
      // Check if it's first login and redirect accordingly
      if (user.isFirstLogin) {
        Alert.alert(
          'Première connexion',
          'Veuillez changer votre mot de passe pour sécuriser votre compte.',
          [
            {
              text: 'Changer maintenant',
              onPress: () => router.replace('/change-password'),
            },
            {
              text: 'Plus tard',
              onPress: () => router.replace('/(tabs)/dashboard'),
            },
          ]
        );
      } else {
        router.replace('/(tabs)/dashboard');
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Erreur de connexion', error instanceof Error ? error.message : 'Une erreur est survenue');
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
        <View style={[commonStyles.content, { justifyContent: 'center', paddingHorizontal: spacing.lg }]}>
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
            <Text style={[commonStyles.title, { textAlign: 'center' }]}>ALKD-POS</Text>
            <Text style={[commonStyles.textLight, { textAlign: 'center' }]}>
              Système de Point de Vente
            </Text>
          </View>

          <View style={commonStyles.card}>
            <Text style={[commonStyles.subtitle, { marginBottom: spacing.lg, textAlign: 'center' }]}>
              Connexion
            </Text>

            <View style={{ marginBottom: spacing.md }}>
              <Text style={[commonStyles.textLight, { marginBottom: spacing.xs }]}>
                Nom d'utilisateur
              </Text>
              <TextInput
                style={commonStyles.input}
                value={credentials.username}
                onChangeText={(value) => handleInputChange('username', value)}
                placeholder="Saisissez votre nom d'utilisateur"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
            </View>

            <View style={{ marginBottom: spacing.lg }}>
              <Text style={[commonStyles.textLight, { marginBottom: spacing.xs }]}>
                Mot de passe
              </Text>
              <View style={{ position: 'relative' }}>
                <TextInput
                  style={[commonStyles.input, { paddingRight: 50 }]}
                  value={credentials.password}
                  onChangeText={(value) => handleInputChange('password', value)}
                  placeholder="Saisissez votre mot de passe"
                  secureTextEntry={!showPassword}
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
                  onPress={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  <Icon 
                    name={showPassword ? 'eye-off' : 'eye'} 
                    size={20} 
                    color={colors.textLight} 
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[buttonStyles.primary, { opacity: isLoading ? 0.7 : 1 }]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              <Text style={{ color: colors.secondary, fontSize: fontSizes.md, fontWeight: '600' }}>
                {isLoading ? 'Connexion...' : 'Se connecter'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ marginTop: spacing.md, alignItems: 'center' }}
              onPress={() => {
                Alert.alert(
                  'Mot de passe oublié',
                  'Contactez votre administrateur pour réinitialiser votre mot de passe.',
                  [{ text: 'OK' }]
                );
              }}
              disabled={isLoading}
            >
              <Text style={[commonStyles.textLight, { fontSize: fontSizes.sm }]}>
                Mot de passe oublié ?
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
