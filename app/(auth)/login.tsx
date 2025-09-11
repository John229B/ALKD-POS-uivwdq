
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { commonStyles, colors, buttonStyles } from '../../styles/commonStyles';
import { useAuthState } from '../../hooks/useAuth';
import Icon from '../../components/Icon';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuthState();

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir votre nom d\'utilisateur et mot de passe');
      return;
    }

    setIsLoading(true);
    try {
      const success = await login(username.trim(), password);
      if (success) {
        router.replace('/(tabs)/dashboard');
      } else {
        Alert.alert('Erreur', 'Nom d\'utilisateur ou mot de passe incorrect');
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors de la connexion');
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
        <View style={[commonStyles.content, { justifyContent: 'center', paddingHorizontal: 20 }]}>
          <View style={[commonStyles.center, { marginBottom: 40 }]}>
            <View style={{
              width: 80,
              height: 80,
              backgroundColor: colors.primary,
              borderRadius: 40,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20,
            }}>
              <Icon name="storefront" size={40} color={colors.secondary} />
            </View>
            <Text style={[commonStyles.title, { textAlign: 'center' }]}>ALKD-POS</Text>
            <Text style={[commonStyles.textLight, { textAlign: 'center' }]}>
              Système de Point de Vente
            </Text>
          </View>

          <View style={commonStyles.card}>
            <Text style={[commonStyles.subtitle, { marginBottom: 20, textAlign: 'center' }]}>
              Connexion
            </Text>

            <View style={{ marginBottom: 16 }}>
              <Text style={[commonStyles.text, { marginBottom: 8 }]}>
                Nom d'utilisateur
              </Text>
              <TextInput
                style={commonStyles.input}
                value={username}
                onChangeText={setUsername}
                placeholder="Saisissez votre nom d'utilisateur"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={{ marginBottom: 24 }}>
              <Text style={[commonStyles.text, { marginBottom: 8 }]}>
                Mot de passe
              </Text>
              <TextInput
                style={commonStyles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Saisissez votre mot de passe"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <TouchableOpacity
              style={[buttonStyles.primary, { opacity: isLoading ? 0.7 : 1 }]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              <Text style={{ color: colors.secondary, fontSize: 16, fontWeight: '600' }}>
                {isLoading ? 'Connexion...' : 'Se connecter'}
              </Text>
            </TouchableOpacity>

            <View style={{ marginTop: 20, padding: 16, backgroundColor: colors.backgroundAlt, borderRadius: 8 }}>
              <Text style={[commonStyles.textLight, { textAlign: 'center', marginBottom: 8 }]}>
                Compte de démonstration:
              </Text>
              <Text style={[commonStyles.textLight, { textAlign: 'center' }]}>
                Utilisateur: admin | Mot de passe: password
              </Text>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
