
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { commonStyles, colors, buttonStyles, spacing, fontSizes } from '../styles/commonStyles';
import Icon from '../components/Icon';
import { getCustomers, getSettings } from '../utils/storage';
import { Customer, AppSettings } from '../types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function TransactionAmountScreen() {
  const { customerId, type } = useLocalSearchParams<{ customerId: string; type: 'gave' | 'took' }>();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const loadData = React.useCallback(async () => {
    try {
      console.log('Loading transaction amount data for:', customerId, type);
      const [customersData, settingsData] = await Promise.all([
        getCustomers(),
        getSettings(),
      ]);

      const foundCustomer = customersData.find(c => c.id === customerId);
      if (!foundCustomer) {
        Alert.alert('Erreur', 'Client non trouvé');
        router.back();
        return;
      }

      setCustomer(foundCustomer);
      setSettings(settingsData);
    } catch (error) {
      console.error('Error loading transaction amount data:', error);
      Alert.alert('Erreur', 'Erreur lors du chargement des données');
    }
  }, [customerId, type]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleNumberPress = (num: string) => {
    if (num === 'clear') {
      setAmount('');
    } else if (num === 'backspace') {
      setAmount(prev => prev.slice(0, -1));
    } else {
      setAmount(prev => prev + num);
    }
  };

  const handleValidate = () => {
    const numAmount = parseFloat(amount);
    if (!amount || numAmount <= 0) {
      Alert.alert('Erreur', 'Veuillez saisir un montant valide');
      return;
    }

    router.push({
      pathname: '/transaction-payment',
      params: {
        customerId,
        type,
        amount: amount,
        date: date.toISOString(),
        note: note,
      },
    });
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || date;
    setShowDatePicker(Platform.OS === 'ios');
    setDate(currentDate);
  };

  const getButtonStyle = (button: string) => {
    return {
      backgroundColor: '#FFFFFF', // White background for all buttons
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 12,
      padding: spacing.lg,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      minHeight: 60,
      shadowColor: colors.text,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    };
  };

  const getButtonTextStyle = (button: string) => {
    return {
      fontSize: fontSizes.lg, 
      fontWeight: 'bold' as const,
      color: '#000000' // Black text for better readability
    };
  };

  if (!customer) {
    return (
      <SafeAreaView style={commonStyles.container}>
        <View style={[commonStyles.content, { justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={commonStyles.text}>Chargement...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const formatCurrency = (amount: number): string => {
    const currency = settings?.currency || 'XOF';
    const currencySymbols = { XOF: 'F CFA', USD: '$', EUR: '€' };
    return `${amount.toLocaleString()} ${currencySymbols[currency]}`;
  };

  const numAmount = parseFloat(amount) || 0;

  return (
    <SafeAreaView style={commonStyles.container}>
      <KeyboardAvoidingView 
        style={commonStyles.content} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={[commonStyles.section, commonStyles.header]}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: spacing.md }}>
            <Icon name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[commonStyles.title, { color: colors.primary, textAlign: 'center' }]}>
              {type === 'gave' ? "J'AI DONNÉ" : "J'AI PRIS"}
            </Text>
          </View>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }}>
          {/* Customer Info */}
          <View style={[commonStyles.section, { backgroundColor: colors.background, padding: spacing.lg }]}>
            <Text style={[commonStyles.text, { color: colors.primary, fontSize: fontSizes.md, marginBottom: spacing.xs }]}>
              Client
            </Text>
            <Text style={[commonStyles.title, { fontSize: fontSizes.lg, fontWeight: 'bold' }]}>
              {customer.name}
            </Text>
          </View>

          {/* Amount Display */}
          <View style={[commonStyles.section, { alignItems: 'center', paddingVertical: spacing.xl }]}>
            <Text style={[commonStyles.textLight, { fontSize: fontSizes.md, marginBottom: spacing.sm }]}>
              Montant
            </Text>
            <Text style={[commonStyles.title, { 
              color: type === 'gave' ? colors.danger : colors.success,
              fontSize: 36,
              fontWeight: 'bold',
              marginBottom: spacing.md
            }]}>
              {numAmount > 0 ? formatCurrency(numAmount) : '0 F CFA'}
            </Text>
          </View>

          {/* Date Selection */}
          <View style={[commonStyles.section, { paddingHorizontal: spacing.lg, marginBottom: spacing.md }]}>
            <Text style={[commonStyles.text, { marginBottom: spacing.sm, fontWeight: '600' }]}>
              📅 Date et heure
            </Text>
            <TouchableOpacity
              style={[commonStyles.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={[commonStyles.text, { fontSize: fontSizes.md }]}>
                {format(date, 'dd/MM/yyyy à HH:mm', { locale: fr })}
              </Text>
              <Icon name="calendar" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Note Input */}
          <View style={[commonStyles.section, { paddingHorizontal: spacing.lg, marginBottom: spacing.lg }]}>
            <Text style={[commonStyles.text, { marginBottom: spacing.sm, fontWeight: '600' }]}>
              📝 Note (optionnel)
            </Text>
            <TextInput
              style={[commonStyles.input, { height: 80, textAlignVertical: 'top' }]}
              value={note}
              onChangeText={setNote}
              placeholder={`Ajoutez une note pour cette transaction ${type === 'gave' ? '"J\'ai donné"' : '"J\'ai pris"'}...`}
              multiline
            />
          </View>

          {/* Number Pad with improved styling */}
          <View style={[commonStyles.section, { paddingHorizontal: spacing.lg, flex: 1 }]}>
            <View style={{ 
              flexDirection: 'row', 
              flexWrap: 'wrap', 
              justifyContent: 'space-between',
              gap: spacing.sm
            }}>
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'backspace'].map((button) => (
                <TouchableOpacity
                  key={button}
                  style={[getButtonStyle(button), { width: '30%' }]}
                  onPress={() => handleNumberPress(button)}
                >
                  {button === 'clear' ? (
                    <Text style={getButtonTextStyle(button)}>C</Text>
                  ) : button === 'backspace' ? (
                    <Icon name="backspace" size={24} color="#000000" />
                  ) : (
                    <Text style={getButtonTextStyle(button)}>{button}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Validate Button */}
          <View style={[commonStyles.section, { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg }]}>
            <TouchableOpacity
              style={[buttonStyles.primary, { 
                backgroundColor: type === 'gave' ? colors.danger : colors.success,
                borderRadius: 15,
                paddingVertical: spacing.lg
              }]}
              onPress={handleValidate}
              disabled={!amount || parseFloat(amount) <= 0}
            >
              <Text style={[commonStyles.text, { 
                color: colors.secondary, 
                fontSize: fontSizes.md, 
                fontWeight: 'bold',
                textAlign: 'center'
              }]}>
                CONTINUER
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Date Picker Modal */}
        {showDatePicker && (
          <DateTimePicker
            testID="dateTimePicker"
            value={date}
            mode="datetime"
            is24Hour={true}
            display="default"
            onChange={onDateChange}
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
