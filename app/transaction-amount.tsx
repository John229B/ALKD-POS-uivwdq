
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
  const params = useLocalSearchParams();
  const customerId = Array.isArray(params.customerId) ? params.customerId[0] : params.customerId;
  const type = Array.isArray(params.type) ? params.type[0] : params.type;
  
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date());
  const [note, setNote] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const loadData = async () => {
    try {
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
      console.error('Error loading data:', error);
      Alert.alert('Erreur', 'Erreur lors du chargement des données');
    }
  };

  useEffect(() => {
    loadData();
  }, [customerId, loadData]);

  const handleNumberPress = (num: string) => {
    if (num === '.') {
      if (amount.includes('.')) return;
      setAmount(amount + '.');
    } else if (num === 'AC') {
      setAmount('');
    } else if (num === 'M+') {
      // Memory add - could implement later
      console.log('Memory add pressed');
    } else if (num === 'M-') {
      // Memory subtract - could implement later
      console.log('Memory subtract pressed');
    } else if (num === '⌫') {
      setAmount(amount.slice(0, -1));
    } else if (num === '×') {
      // Multiply - could implement calculator functionality
      console.log('Multiply pressed');
    } else if (num === '÷') {
      // Divide - could implement calculator functionality
      console.log('Divide pressed');
    } else if (num === '%') {
      // Percentage - could implement calculator functionality
      console.log('Percentage pressed');
    } else if (num === '=') {
      // Equals - could implement calculator functionality
      console.log('Equals pressed');
    } else if (num === '+') {
      // Add - could implement calculator functionality
      console.log('Add pressed');
    } else if (num === '-') {
      // Subtract - could implement calculator functionality
      console.log('Subtract pressed');
    } else {
      setAmount(amount + num);
    }
  };

  const handleValidate = () => {
    if (!amount.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir un montant');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Erreur', 'Veuillez saisir un montant valide');
      return;
    }

    // Navigate to payment method selection
    router.push({
      pathname: '/transaction-payment',
      params: {
        customerId: encodeURIComponent(customerId || ''),
        type: encodeURIComponent(type || ''),
        amount: encodeURIComponent(numAmount.toString()),
        date: encodeURIComponent(date.toISOString()),
        note: encodeURIComponent(note || ''),
      },
    });
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDate(selectedDate);
    }
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

  const numpadButtons = [
    ['AC', 'M+', 'M-', '⌫'],
    ['7', '8', '9', '÷'],
    ['4', '5', '6', '×'],
    ['1', '2', '3', '-'],
    ['0', '.', '=', '+'],
  ];

  const getButtonStyle = (button: string) => {
    const isNumber = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '.'].includes(button);
    const isSpecial = ['AC', 'M+', 'M-', '⌫', '%'].includes(button);
    
    return {
      backgroundColor: isNumber ? '#FFFFFF' : isSpecial ? colors.primary : '#FFFFFF',
      borderRadius: 15,
      height: 60,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      margin: 4,
      flex: 1,
      borderWidth: 1,
      borderColor: '#E5E5E5',
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    };
  };

  const getButtonTextStyle = (button: string) => {
    const isNumber = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '.'].includes(button);
    const isSpecial = ['AC', 'M+', 'M-', '⌫', '%'].includes(button);
    
    return {
      fontSize: fontSizes.lg,
      fontWeight: '600' as const,
      color: isNumber ? '#000000' : isSpecial ? '#000000' : '#000000',
    };
  };

  return (
    <SafeAreaView style={commonStyles.container}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView 
          style={{ flex: 1 }} 
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={commonStyles.content}>
            {/* Header */}
            <View style={[commonStyles.section, commonStyles.header]}>
              <TouchableOpacity onPress={() => router.back()} style={{ marginRight: spacing.md }}>
                <Icon name="close" size={24} color={colors.text} />
              </TouchableOpacity>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={[commonStyles.title, { color: colors.primary, fontSize: fontSizes.lg }]}>
                  {customer.name.toUpperCase()}
                </Text>
              </View>
              <TouchableOpacity>
                <View style={{
                  backgroundColor: colors.background,
                  borderRadius: 8,
                  padding: spacing.sm,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}>
                  <Icon name="image-outline" size={20} color={colors.primary} />
                </View>
              </TouchableOpacity>
            </View>

            {/* Amount Display */}
            <View style={[commonStyles.section, { alignItems: 'flex-start', paddingHorizontal: spacing.lg }]}>
              <Text style={[commonStyles.text, { 
                color: type === 'gave' ? colors.danger : colors.success,
                fontSize: fontSizes.md,
                marginBottom: spacing.xs
              }]}>
                {type === 'gave' ? "J'ai donné" : "J'ai pris"}
              </Text>
              <Text style={[commonStyles.title, { 
                color: type === 'gave' ? colors.success : colors.success,
                fontSize: 48,
                fontWeight: 'bold',
                marginBottom: spacing.lg
              }]}>
                {amount || '0'}
              </Text>
            </View>

            {/* Date */}
            <View style={[commonStyles.section, { paddingHorizontal: spacing.lg, marginBottom: spacing.md }]}>
              <TouchableOpacity
                style={{
                  backgroundColor: colors.background,
                  borderRadius: 12,
                  padding: spacing.md,
                  borderWidth: 1,
                  borderColor: colors.border,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
                onPress={() => setShowDatePicker(true)}
              >
                <Icon name="calendar-outline" size={20} color={colors.primary} style={{ marginRight: spacing.sm }} />
                <Text style={[commonStyles.text, { color: colors.text }]}>
                  {format(date, 'dd/MM/yyyy', { locale: fr })}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Note */}
            <View style={[commonStyles.section, { paddingHorizontal: spacing.lg, marginBottom: spacing.md }]}>
              <TextInput
                style={[commonStyles.input, { 
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  borderRadius: 12,
                  minHeight: 50,
                  color: colors.text,
                }]}
                value={note}
                onChangeText={setNote}
                placeholder="Note (nom de l'article, quantité ...)"
                placeholderTextColor={colors.textLight}
                multiline
              />
            </View>

            {/* Validate Button */}
            <View style={[commonStyles.section, { paddingHorizontal: spacing.lg, marginBottom: spacing.md }]}>
              <TouchableOpacity
                style={[buttonStyles.primary, { 
                  backgroundColor: colors.success,
                  borderRadius: 15,
                  paddingVertical: spacing.lg
                }]}
                onPress={handleValidate}
              >
                <Text style={[commonStyles.text, { 
                  color: '#FFFFFF', 
                  fontSize: fontSizes.md, 
                  fontWeight: 'bold',
                  textAlign: 'center'
                }]}>
                  VALIDER
                </Text>
              </TouchableOpacity>
            </View>

            {/* Numeric Keypad */}
            <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xl }}>
              {numpadButtons.map((row, rowIndex) => (
                <View key={rowIndex} style={{ flexDirection: 'row', marginBottom: 8 }}>
                  {row.map((button) => (
                    <TouchableOpacity
                      key={button}
                      style={getButtonStyle(button)}
                      onPress={() => handleNumberPress(button)}
                      activeOpacity={0.7}
                    >
                      <Text style={getButtonTextStyle(button)}>
                        {button}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={date}
          mode="date"
          display="default"
          onChange={onDateChange}
        />
      )}
    </SafeAreaView>
  );
}
