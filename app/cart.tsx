
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TextInput, 
  TouchableOpacity, 
  Alert, 
  Modal, 
  StyleSheet, 
  Dimensions,
  Animated,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { commonStyles, colors, buttonStyles, spacing, fontSizes, isSmallScreen } from '../styles/commonStyles';
import { 
  getProducts, 
  getCustomers, 
  getSales, 
  storeSales, 
  storeProducts, 
  getNextReceiptNumber, 
  getSettings, 
  storeCustomers, 
  formatQuantityWithUnit, 
  getApplicablePrice,
  logActivity
} from '../utils/storage';
import { useCustomersSync, useCustomersUpdater, useDashboardUpdater } from '../hooks/useCustomersSync';
import { useAuthState } from '../hooks/useAuth';
import { cashierSyncService } from '../utils/cashierSyncService';
import Icon from '../components/Icon';
import uuid from 'react-native-uuid';
import AddCustomerModal from '../components/AddCustomerModal';
import { Product, Customer, CartItem, Sale, SaleItem, AppSettings, CustomerTransaction } from '../types';

const { height: screenHeight, width: screenWidth } = Dimensions.get('window');

type PaymentMethod = 'cash' | 'mobile_money' | 'credit' | 'card';

interface CartTotals {
  subtotal: number;
  discountAmount: number;
  total: number;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: fontSizes.sm,
    color: colors.textLight,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  section: {
    backgroundColor: colors.background,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: 16,
    padding: spacing.lg,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: fontSizes.lg,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  customerSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  customerSelectorActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  customerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  customerBalance: {
    fontSize: fontSizes.sm,
    fontWeight: '500',
    marginBottom: 2,
  },
  customerPhone: {
    fontSize: fontSizes.xs,
    color: colors.textLight,
  },
  customerPlaceholder: {
    fontSize: fontSizes.md,
    color: colors.textLight,
    fontWeight: '500',
  },
  customerRequiredBadge: {
    backgroundColor: colors.warning + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    marginTop: spacing.sm,
  },
  customerRequiredText: {
    fontSize: fontSizes.xs,
    color: colors.warning,
    fontWeight: '600',
    textAlign: 'center',
  },
  advanceCard: {
    backgroundColor: colors.success + '15',
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.success + '30',
  },
  advanceTitle: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: colors.success,
    marginBottom: spacing.xs,
  },
  advanceAmount: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: colors.success,
    marginBottom: spacing.sm,
  },
  advanceActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  advanceButton: {
    flex: 1,
    backgroundColor: colors.success,
    borderRadius: 8,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  advanceButtonText: {
    color: colors.secondary,
    fontSize: fontSizes.sm,
    fontWeight: '600',
  },
  cartItem: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  itemInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  itemName: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  itemPrice: {
    fontSize: fontSizes.sm,
    color: colors.textLight,
  },
  itemSubtotal: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: colors.primary,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  quantitySection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quantityButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  quantityText: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.text,
    minWidth: 40,
    textAlign: 'center',
    paddingHorizontal: spacing.sm,
  },
  removeButton: {
    backgroundColor: colors.error + '20',
    borderRadius: 8,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discountSection: {
    marginTop: spacing.md,
  },
  discountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  discountTitle: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.text,
    marginLeft: spacing.sm,
  },
  discountTypeSelector: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  discountTypeButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    borderRadius: 6,
  },
  discountTypeButtonActive: {
    backgroundColor: colors.primary,
  },
  discountTypeText: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: colors.textLight,
  },
  discountTypeTextActive: {
    color: colors.secondary,
  },
  discountInputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  discountInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: fontSizes.sm,
    color: colors.text,
  },
  discountApplyButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteInput: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: fontSizes.sm,
    color: colors.text,
    minHeight: 80,
    textAlignVertical: 'top',
    marginTop: spacing.md,
  },
  paymentMethods: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: colors.border,
    minWidth: '48%',
    flex: 1,
  },
  paymentMethodActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  paymentIcon: {
    marginRight: spacing.sm,
  },
  paymentText: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  summaryCard: {
    backgroundColor: colors.primary + '10',
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primary + '20',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  summaryLabel: {
    fontSize: fontSizes.sm,
    color: colors.text,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
    color: colors.text,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
    borderTopWidth: 2,
    borderTopColor: colors.primary + '30',
    marginTop: spacing.sm,
  },
  totalLabel: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: colors.text,
  },
  totalValue: {
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
    color: colors.primary,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: screenHeight * 0.85,
    minHeight: screenHeight * 0.5,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: colors.text,
  },
  modalSubtitle: {
    fontSize: fontSizes.sm,
    color: colors.textLight,
    marginTop: 2,
  },
  modalSearchContainer: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalSearchInput: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: fontSizes.sm,
    color: colors.text,
  },
  modalScrollView: {
    flex: 1,
  },
  customerListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  customerListItemSelected: {
    backgroundColor: colors.primary + '15',
  },
  customerListAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  customerListInfo: {
    flex: 1,
  },
  customerListName: {
    fontSize: fontSizes.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  customerListBalance: {
    fontSize: fontSizes.sm,
    fontWeight: '500',
    marginBottom: 2,
  },
  customerListPhone: {
    fontSize: fontSizes.xs,
    color: colors.textLight,
  },
  emptyState: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyStateIcon: {
    marginBottom: spacing.md,
  },
  emptyStateText: {
    fontSize: fontSizes.md,
    color: colors.textLight,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  emptyStateSubtext: {
    fontSize: fontSizes.sm,
    color: colors.textLight,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    fontSize: fontSizes.md,
    color: colors.textLight,
    marginTop: spacing.md,
  },
});

export default function CartScreen() {
  console.log('🛒 Cart: Component initialized');
  
  const params = useLocalSearchParams();
  const cartData = params.cartData ? JSON.parse(params.cartData as string) : [];
  
  // State management
  const [cart, setCart] = useState<CartItem[]>(cartData);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedClient, setSelectedClient] = useState<Customer | null>(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [useAdvanceAmount, setUseAdvanceAmount] = useState(0);
  const [discountType, setDiscountType] = useState<'fixed' | 'percentage'>('fixed');
  const [discountValue, setDiscountValue] = useState('');
  const [note, setNote] = useState('');
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Hooks
  const { user } = useAuthState();
  const { triggerCustomersUpdate } = useCustomersUpdater();
  const { triggerDashboardUpdate } = useDashboardUpdater();
  const { customers: syncedCustomers } = useCustomersSync();

  console.log('🔄 Cart: Synced customers count:', syncedCustomers?.length || 0);

  // Secure formatCurrency function
  const formatCurrency = useCallback((amount: number | undefined | null): string => {
    if (amount === undefined || amount === null || isNaN(amount)) {
      console.log('⚠️ Cart: formatCurrency received invalid amount, defaulting to 0');
      amount = 0;
    }
    
    if (!settings) return amount.toString();
    
    const currency = settings.currency === 'XOF' ? 'FCFA' : settings.currency;
    return `${amount.toLocaleString()} ${currency}`;
  }, [settings]);

  // Load initial data
  const loadData = useCallback(async () => {
    try {
      console.log('🔄 Cart: Loading initial data...');
      setLoading(true);
      
      const [productsData, settingsData] = await Promise.all([
        getProducts(),
        getSettings(),
      ]);

      console.log(`✅ Cart: Loaded ${productsData.length} products`);
      setProducts(productsData);
      setSettings(settingsData);
      
    } catch (error) {
      console.error('❌ Cart: Error loading data:', error);
      Alert.alert('Erreur', 'Impossible de charger les données du panier');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Update selected customer when sync data changes
  useEffect(() => {
    if (syncedCustomers && syncedCustomers.length > 0 && selectedClient) {
      const updatedSelectedCustomer = syncedCustomers.find(c => c.id === selectedClient.id);
      if (updatedSelectedCustomer) {
        setSelectedClient(updatedSelectedCustomer);
        console.log(`✅ Cart: Updated selected customer balance: ${formatCurrency(updatedSelectedCustomer.balance || 0)}`);
      }
    }
  }, [syncedCustomers, selectedClient, formatCurrency]);

  // Calculate cart totals with discounts
  const cartTotals: CartTotals = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
    
    let discountAmount = 0;
    if (discountValue) {
      const value = parseFloat(discountValue);
      if (!isNaN(value) && value > 0) {
        if (discountType === 'percentage') {
          discountAmount = Math.min((subtotal * value) / 100, subtotal);
        } else {
          discountAmount = Math.min(value, subtotal);
        }
      }
    }
    
    const total = Math.max(0, subtotal - discountAmount);
    
    return { subtotal, discountAmount, total };
  }, [cart, discountValue, discountType]);

  // Calculate remaining amount after advance usage
  const remainingAmount = useMemo(() => {
    return Math.max(0, cartTotals.total - useAdvanceAmount);
  }, [cartTotals.total, useAdvanceAmount]);

  // Cart item management
  const updateCartItemQuantity = useCallback((productId: string, quantity: number) => {
    console.log(`🔄 Cart: Updating quantity for product ${productId}: ${quantity}`);
    
    if (quantity <= 0) {
      setCart(prevCart => prevCart.filter(item => item.productId !== productId));
    } else {
      setCart(prevCart =>
        prevCart.map(item =>
          item.productId === productId 
            ? { 
                ...item, 
                quantity,
                subtotal: item.price * quantity
              } 
            : item
        )
      );
    }
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    console.log(`🗑️ Cart: Removing product ${productId} from cart`);
    setCart(prevCart => prevCart.filter(item => item.productId !== productId));
  }, []);

  const clearCart = useCallback(() => {
    Alert.alert(
      'Vider le panier',
      'Êtes-vous sûr de vouloir vider le panier ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Vider', 
          style: 'destructive',
          onPress: () => {
            console.log('🧹 Cart: Clearing cart');
            setCart([]);
            setSelectedClient(null);
            setPaymentMethod('cash');
            setUseAdvanceAmount(0);
            setDiscountValue('');
            setNote('');
          }
        },
      ]
    );
  }, []);

  // Customer management
  const selectCustomer = useCallback((customer: Customer) => {
    console.log(`👤 Cart: Selected customer: ${customer.name} (Balance: ${formatCurrency(customer.balance || 0)})`);
    setSelectedClient(customer);
    setShowCustomerModal(false);
    setUseAdvanceAmount(0);
    setCustomerSearchQuery('');
  }, [formatCurrency]);

  const handleAddCustomer = useCallback(async (customerData: Omit<Customer, 'id' | 'balance' | 'transactions' | 'totalPurchases' | 'createdAt' | 'updatedAt'>) => {
    try {
      console.log('➕ Cart: Adding new customer:', customerData.name);
      
      const newCustomer: Customer = {
        ...customerData,
        id: uuid.v4() as string,
        balance: 0,
        totalPurchases: 0,
        transactions: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const currentCustomers = await getCustomers();
      const updatedCustomers = [...currentCustomers, newCustomer];
      await storeCustomers(updatedCustomers);
      
      setSelectedClient(newCustomer);
      setShowAddCustomerModal(false);
      
      await logActivity(user?.id || 'system', 'customers', 'Customer added from cart', { customerId: newCustomer.id, name: newCustomer.name });
      await triggerCustomersUpdate();
      
      console.log('✅ Cart: New customer added successfully');
    } catch (error) {
      console.error('❌ Cart: Error adding customer:', error);
      Alert.alert('Erreur', 'Impossible d\'ajouter le client');
    }
  }, [triggerCustomersUpdate, user]);

  // Discount management
  const applyDiscount = useCallback(() => {
    if (!discountValue) {
      Alert.alert('Erreur', 'Veuillez saisir un montant de réduction');
      return;
    }
    
    const value = parseFloat(discountValue);
    if (isNaN(value) || value < 0) {
      Alert.alert('Erreur', 'Veuillez saisir un montant valide');
      return;
    }
    
    if (discountType === 'percentage' && value > 100) {
      Alert.alert('Erreur', 'Le pourcentage ne peut pas dépasser 100%');
      return;
    }
    
    const discountText = discountType === 'percentage' ? `${value}%` : formatCurrency(value);
    Alert.alert('Réduction appliquée', `Réduction de ${discountText} appliquée avec succès`);
  }, [discountValue, discountType, formatCurrency]);

  // MAIN SALE PROCESSING FUNCTION - COMPLETELY REWRITTEN
  const processSale = useCallback(async () => {
    if (processing) return;
    
    try {
      console.log('🚀 Cart: Starting sale processing...');
      setProcessing(true);
      
      // Basic validation
      if (cart.length === 0) {
        Alert.alert("Erreur", "Le panier est vide");
        return;
      }

      console.log(`🔍 Cart: Payment method: ${paymentMethod}, Selected client: ${selectedClient ? selectedClient.name : 'None'}`);

      // CORRECTED: Client validation logic - exactly as requested
      if (paymentMethod === "credit") {
        if (!selectedClient || !selectedClient.id) {
          Alert.alert("Erreur", "Veuillez sélectionner un client pour une vente à crédit");
          return;
        }
        console.log('✅ Cart: Credit sale - client validation passed');
      } else {
        console.log('✅ Cart: Non-credit sale - client is optional');
      }

      // Validate advance usage
      if (useAdvanceAmount > 0 && (!selectedClient || (selectedClient.balance || 0) < useAdvanceAmount)) {
        Alert.alert("Erreur", "Montant d'avance invalide");
        return;
      }

      // Generate receipt number and prepare sale data
      const receiptNumber = await getNextReceiptNumber();
      const saleItems: SaleItem[] = cart.map(item => ({
        id: uuid.v4() as string,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.price,
        discount: 0,
        subtotal: item.subtotal,
      }));

      // CORRECTED: Sale data structure with proper client handling
      const saleData: Sale = {
        id: uuid.v4() as string,
        receiptNumber,
        createdAt: new Date(),
        customerId: selectedClient ? selectedClient.id : null, // CORRECTED: Explicitly nullable
        customer: selectedClient || undefined,
        items: saleItems,
        subtotal: cartTotals.subtotal,
        discount: cartTotals.discountAmount,
        tax: 0,
        total: cartTotals.total,
        paymentMethod,
        paymentStatus: paymentMethod === 'credit' ? 'credit' : 'paid',
        amountPaid: paymentMethod === 'credit' ? useAdvanceAmount : cartTotals.total,
        change: 0,
        notes: note || (useAdvanceAmount > 0 ? `Avance utilisée: ${formatCurrency(useAdvanceAmount)}` : '') || (!selectedClient ? 'Vente sans client' : ''),
        cashierId: user?.id || '',
        cashier: user,
      };

      console.log(`✅ Cart: Sale data prepared - Customer ID: ${saleData.customerId || 'null'}, Total: ${formatCurrency(cartTotals.total)}`);

      // Save sale to storage
      const currentSales = await getSales();
      await storeSales([...currentSales, saleData]);
      console.log('✅ Cart: Sale saved to storage');

      // Update product stock
      const updatedProducts = products.map(product => {
        const cartItem = cart.find(item => item.productId === product.id);
        if (cartItem) {
          return {
            ...product,
            stock: Math.max(0, product.stock - cartItem.quantity),
          };
        }
        return product;
      });
      await storeProducts(updatedProducts);
      console.log('✅ Cart: Product stock updated');

      // CORRECTED: Customer balance updates - simplified and robust logic
      if (selectedClient) {
        const currentCustomers = await getCustomers();
        const updatedCustomers = currentCustomers.map(customer => {
          if (customer.id === selectedClient.id) {
            let newBalance = customer.balance || 0;
            let transactionAmount = cartTotals.total;
            let transactionType: 'gave' | 'took' = 'took';
            let transactionDescription = `Vente - Reçu #${receiptNumber}`;
            
            // Handle advance usage first
            if (useAdvanceAmount > 0) {
              newBalance -= useAdvanceAmount;
              transactionAmount -= useAdvanceAmount;
              transactionDescription += ` (Avance utilisée: ${formatCurrency(useAdvanceAmount)})`;
              console.log(`💰 Cart: Customer ${customer.name}: Used advance ${formatCurrency(useAdvanceAmount)}, new balance: ${formatCurrency(newBalance)}`);
            }
            
            // Handle credit sale
            if (paymentMethod === 'credit' && transactionAmount > 0) {
              newBalance -= transactionAmount; // Debt = negative balance
              transactionType = 'gave'; // "j'ai donné" = crédit accordé
              transactionDescription = `Vente à crédit - Reçu #${receiptNumber}`;
              if (useAdvanceAmount > 0) {
                transactionDescription += ` (Avance utilisée: ${formatCurrency(useAdvanceAmount)})`;
              }
              console.log(`💳 Cart: Customer ${customer.name}: Added credit debt ${formatCurrency(transactionAmount)}, final balance: ${formatCurrency(newBalance)}`);
            }

            // Create transaction record
            const newTransaction: CustomerTransaction = {
              id: uuid.v4() as string,
              date: new Date(),
              amount: cartTotals.total,
              type: transactionType,
              paymentMethod,
              description: transactionDescription,
              balance: newBalance,
              saleId: saleData.id,
            };

            return {
              ...customer,
              balance: newBalance,
              totalPurchases: customer.totalPurchases + cartTotals.total,
              transactions: [...(customer.transactions || []), newTransaction],
              updatedAt: new Date(),
            };
          }
          return customer;
        });
        
        await storeCustomers(updatedCustomers);
        console.log(`✅ Cart: Customer ${selectedClient.name} balance updated successfully`);
        
        // Update selected customer with new balance
        const updatedSelectedCustomer = updatedCustomers.find(c => c.id === selectedClient.id);
        if (updatedSelectedCustomer) {
          setSelectedClient(updatedSelectedCustomer);
        }
      }

      // Sync cashier sale if user is cashier
      if (user?.role === 'cashier') {
        await cashierSyncService.addCashierSale(saleData, user);
        console.log('📤 Cart: Cashier sale added to sync queue');
      }

      // Log activity
      await logActivity(
        user?.id || 'system', 
        'pos', 
        'Sale processed', 
        { 
          saleId: saleData.id, 
          receiptNumber: saleData.receiptNumber, 
          total: saleData.total,
          customerId: saleData.customerId,
          paymentMethod: saleData.paymentMethod
        }
      );

      // Update state
      setProducts(updatedProducts);
      
      // Trigger updates
      console.log('📡 Cart: Triggering customers and dashboard updates...');
      if (typeof triggerCustomersUpdate === 'function') {
        await triggerCustomersUpdate();
      }
      
      if (typeof triggerDashboardUpdate === 'function') {
        triggerDashboardUpdate();
      }

      // Clear cart state
      setCart([]);
      setSelectedClient(null);
      setPaymentMethod('cash');
      setUseAdvanceAmount(0);
      setDiscountValue('');
      setNote('');

      Alert.alert("Succès", "Vente enregistrée avec succès ✅");
      console.log('🎉 Cart: Sale processed successfully:', saleData.id);

      // Navigate to success page
      router.push({
        pathname: '/transaction-success',
        params: {
          saleId: saleData.id,
          amount: saleData.total.toString(),
          receiptNumber: saleData.receiptNumber,
        },
      });

    } catch (error) {
      console.error("❌ Cart: Error processing sale:", error);
      Alert.alert("Erreur", "Impossible de traiter la vente. Veuillez réessayer.");
    } finally {
      setProcessing(false);
    }
  }, [
    processing,
    cart, 
    cartTotals, 
    paymentMethod, 
    selectedClient, 
    useAdvanceAmount, 
    products, 
    user, 
    triggerCustomersUpdate, 
    triggerDashboardUpdate, 
    note, 
    formatCurrency
  ]);

  // Payment method helpers
  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'cash': return 'cash';
      case 'mobile_money': return 'call';
      case 'card': return 'card';
      case 'credit': return 'time';
      default: return 'cash';
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'cash': return 'Espèces';
      case 'mobile_money': return 'Mobile Money';
      case 'card': return 'Carte bancaire';
      case 'credit': return 'Crédit';
      default: return method;
    }
  };

  // Customer filtering
  const availableCustomers = syncedCustomers || [];
  
  const filteredCustomers = useMemo(() => {
    if (!customerSearchQuery) return availableCustomers;
    
    return availableCustomers.filter(customer =>
      customer.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
      (customer.phone && customer.phone.includes(customerSearchQuery))
    );
  }, [availableCustomers, customerSearchQuery]);

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Icon name="cart" size={48} color={colors.primary} />
          <Text style={styles.loadingText}>Chargement du panier...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Panier</Text>
          <Text style={styles.headerSubtitle}>
            {cart.length} {cart.length === 1 ? 'article' : 'articles'} • {formatCurrency(cartTotals.total)}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.headerButton} 
            onPress={clearCart}
            disabled={cart.length === 0}
          >
            <Icon name="trash" size={20} color={cart.length === 0 ? colors.textLight : colors.error} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
            <Icon name="close" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}>
        {/* Customer Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Client</Text>
          <TouchableOpacity
            style={[
              styles.customerSelector,
              selectedClient && styles.customerSelectorActive
            ]}
            onPress={() => setShowCustomerModal(true)}
          >
            <View style={[
              styles.customerAvatar,
              { 
                backgroundColor: selectedClient 
                  ? ((selectedClient.balance || 0) >= 0 ? colors.success : colors.error)
                  : colors.textLight 
              }
            ]}>
              <Icon 
                name={selectedClient ? "person" : "person-add"} 
                size={20} 
                color={colors.secondary} 
              />
            </View>
            <View style={styles.customerInfo}>
              {selectedClient ? (
                <>
                  <Text style={styles.customerName}>{selectedClient.name}</Text>
                  <Text style={[
                    styles.customerBalance,
                    { color: (selectedClient.balance || 0) >= 0 ? colors.success : colors.error }
                  ]}>
                    {(selectedClient.balance || 0) >= 0 
                      ? `Avance: ${formatCurrency(Math.abs(selectedClient.balance || 0))}` 
                      : `Dette: ${formatCurrency(Math.abs(selectedClient.balance || 0))}`
                    }
                  </Text>
                  {selectedClient.phone && (
                    <Text style={styles.customerPhone}>📞 {selectedClient.phone}</Text>
                  )}
                </>
              ) : (
                <Text style={styles.customerPlaceholder}>
                  {paymentMethod === 'credit' ? 'Sélectionner un client (obligatoire)' : 'Sélectionner un client (facultatif)'}
                </Text>
              )}
            </View>
            <Icon name="chevron-down" size={20} color={colors.textLight} />
          </TouchableOpacity>

          {paymentMethod === 'credit' && !selectedClient && (
            <View style={styles.customerRequiredBadge}>
              <Text style={styles.customerRequiredText}>
                ⚠️ Client obligatoire pour les ventes à crédit
              </Text>
            </View>
          )}

          {selectedClient && (selectedClient.balance || 0) > 0 && (
            <View style={styles.advanceCard}>
              <Text style={styles.advanceTitle}>Avance disponible</Text>
              <Text style={styles.advanceAmount}>
                {formatCurrency(selectedClient.balance || 0)}
              </Text>
              <View style={styles.advanceActions}>
                <TouchableOpacity
                  style={styles.advanceButton}
                  onPress={() => {
                    const maxUsable = Math.min(selectedClient.balance || 0, cartTotals.total);
                    setUseAdvanceAmount(useAdvanceAmount > 0 ? 0 : maxUsable);
                  }}
                >
                  <Text style={styles.advanceButtonText}>
                    {useAdvanceAmount > 0 ? `Utilisé: ${formatCurrency(useAdvanceAmount)}` : 'Utiliser l\'avance'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Cart Items */}
        {cart.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Articles ({cart.length})</Text>
            {cart.map((item, index) => (
              <View key={`${item.productId}-${index}`} style={styles.cartItem}>
                <View style={styles.itemHeader}>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemPrice}>
                      {formatCurrency(item.price)} × {formatQuantityWithUnit(item.quantity, item.unit)}
                    </Text>
                  </View>
                  <Text style={styles.itemSubtotal}>
                    {formatCurrency(item.subtotal)}
                  </Text>
                </View>
                
                <View style={styles.quantityControls}>
                  <View style={styles.quantitySection}>
                    <TouchableOpacity
                      style={[styles.quantityButton, { backgroundColor: colors.error }]}
                      onPress={() => updateCartItemQuantity(item.productId, item.quantity - 1)}
                    >
                      <Icon name="remove" size={16} color={colors.secondary} />
                    </TouchableOpacity>
                    <Text style={styles.quantityText}>{item.quantity}</Text>
                    <TouchableOpacity
                      style={[styles.quantityButton, { backgroundColor: colors.success }]}
                      onPress={() => updateCartItemQuantity(item.productId, item.quantity + 1)}
                    >
                      <Icon name="add" size={16} color={colors.secondary} />
                    </TouchableOpacity>
                  </View>
                  
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeFromCart(item.productId)}
                  >
                    <Icon name="trash" size={16} color={colors.error} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Discount & Notes */}
        <View style={styles.section}>
          <View style={styles.discountHeader}>
            <Icon name="pricetag" size={20} color={colors.primary} />
            <Text style={styles.discountTitle}>Réductions & Notes</Text>
          </View>
          
          <View style={styles.discountTypeSelector}>
            <TouchableOpacity
              style={[
                styles.discountTypeButton,
                discountType === 'fixed' && styles.discountTypeButtonActive,
              ]}
              onPress={() => setDiscountType('fixed')}
            >
              <Text style={[
                styles.discountTypeText,
                discountType === 'fixed' && styles.discountTypeTextActive,
              ]}>
                Montant fixe
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.discountTypeButton,
                discountType === 'percentage' && styles.discountTypeButtonActive,
              ]}
              onPress={() => setDiscountType('percentage')}
            >
              <Text style={[
                styles.discountTypeText,
                discountType === 'percentage' && styles.discountTypeTextActive,
              ]}>
                Pourcentage
              </Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.discountInputRow}>
            <TextInput
              style={styles.discountInput}
              placeholder={discountType === 'fixed' ? 'ex: 500' : 'ex: 10'}
              value={discountValue}
              onChangeText={setDiscountValue}
              keyboardType="numeric"
              placeholderTextColor={colors.textLight}
            />
            <TouchableOpacity style={styles.discountApplyButton} onPress={applyDiscount}>
              <Text style={{ color: colors.secondary, fontSize: fontSizes.sm, fontWeight: '600' }}>
                Appliquer
              </Text>
            </TouchableOpacity>
          </View>
          
          <TextInput
            style={styles.noteInput}
            placeholder="Note optionnelle pour cette vente..."
            value={note}
            onChangeText={setNote}
            multiline
            placeholderTextColor={colors.textLight}
          />
        </View>

        {/* Payment Methods */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mode de paiement</Text>
          
          <View style={styles.paymentMethods}>
            {(['cash', 'mobile_money', 'card', 'credit'] as const).map((method) => (
              <TouchableOpacity
                key={method}
                style={[
                  styles.paymentMethod,
                  paymentMethod === method && styles.paymentMethodActive,
                ]}
                onPress={() => setPaymentMethod(method)}
              >
                <Icon 
                  name={getPaymentMethodIcon(method)} 
                  size={20} 
                  color={paymentMethod === method ? colors.primary : colors.textLight}
                  style={styles.paymentIcon}
                />
                <Text style={[
                  styles.paymentText,
                  { color: paymentMethod === method ? colors.primary : colors.text }
                ]}>
                  {getPaymentMethodLabel(method)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Summary & Totals */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Sous-total</Text>
          <Text style={styles.summaryValue}>{formatCurrency(cartTotals.subtotal)}</Text>
        </View>
        
        {cartTotals.discountAmount > 0 && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Réduction</Text>
            <Text style={[styles.summaryValue, { color: colors.error }]}>
              -{formatCurrency(cartTotals.discountAmount)}
            </Text>
          </View>
        )}
        
        {useAdvanceAmount > 0 && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Avance utilisée</Text>
            <Text style={[styles.summaryValue, { color: colors.success }]}>
              -{formatCurrency(useAdvanceAmount)}
            </Text>
          </View>
        )}
        
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total à payer</Text>
          <Text style={styles.totalValue}>{formatCurrency(remainingAmount)}</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[buttonStyles.secondary, { flex: 1 }]}
          onPress={() => router.back()}
        >
          <Icon name="cart" size={20} color={colors.primary} />
          <Text style={[buttonStyles.secondaryText, { marginLeft: spacing.xs }]}>
            Continuer
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            buttonStyles.primary, 
            { flex: 2, opacity: (cart.length === 0 || processing) ? 0.5 : 1 }
          ]}
          onPress={processSale}
          disabled={cart.length === 0 || processing}
        >
          <Icon name="checkmark" size={20} color={colors.secondary} />
          <Text style={[buttonStyles.primaryText, { marginLeft: spacing.xs }]}>
            {processing ? 'Traitement...' : 'Finaliser la vente'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Customer Selection Modal */}
      <Modal
        visible={showCustomerModal}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setShowCustomerModal(false);
          setCustomerSearchQuery('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Sélectionner un client</Text>
                <Text style={styles.modalSubtitle}>
                  {availableCustomers.length} client{availableCustomers.length !== 1 ? 's' : ''} disponible{availableCustomers.length !== 1 ? 's' : ''}
                </Text>
              </View>
              <TouchableOpacity onPress={() => {
                setShowCustomerModal(false);
                setCustomerSearchQuery('');
              }}>
                <Icon name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalSearchContainer}>
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Rechercher un client..."
                value={customerSearchQuery}
                onChangeText={setCustomerSearchQuery}
                placeholderTextColor={colors.textLight}
              />
            </View>

            <ScrollView style={styles.modalScrollView}>
              {/* No customer option for non-credit payments */}
              {paymentMethod !== 'credit' && (
                <TouchableOpacity
                  style={[
                    styles.customerListItem,
                    !selectedClient && styles.customerListItemSelected,
                  ]}
                  onPress={() => {
                    setSelectedClient(null);
                    setUseAdvanceAmount(0);
                    setShowCustomerModal(false);
                    setCustomerSearchQuery('');
                  }}
                >
                  <View style={[styles.customerListAvatar, { backgroundColor: colors.textLight }]}>
                    <Icon name="person-remove" size={20} color={colors.secondary} />
                  </View>
                  <View style={styles.customerListInfo}>
                    <Text style={styles.customerListName}>Vente sans client</Text>
                    <Text style={styles.customerListPhone}>Recommandé pour les paiements comptants</Text>
                  </View>
                  {!selectedClient && (
                    <Icon name="checkmark-circle" size={20} color={colors.success} />
                  )}
                </TouchableOpacity>
              )}
              
              {/* Add new customer option */}
              <TouchableOpacity
                style={styles.customerListItem}
                onPress={() => {
                  setShowCustomerModal(false);
                  setShowAddCustomerModal(true);
                }}
              >
                <View style={[styles.customerListAvatar, { backgroundColor: colors.primary }]}>
                  <Icon name="add" size={20} color={colors.secondary} />
                </View>
                <View style={styles.customerListInfo}>
                  <Text style={styles.customerListName}>Ajouter un nouveau client</Text>
                </View>
                <Icon name="chevron-forward" size={16} color={colors.textLight} />
              </TouchableOpacity>
              
              {/* Customer list */}
              {filteredCustomers.length === 0 ? (
                <View style={styles.emptyState}>
                  <Icon name="person-add" size={48} color={colors.textLight} style={styles.emptyStateIcon} />
                  <Text style={styles.emptyStateText}>
                    {customerSearchQuery ? 'Aucun client trouvé' : 'Aucun client disponible'}
                  </Text>
                  <Text style={styles.emptyStateSubtext}>
                    {customerSearchQuery ? 'Essayez un autre terme de recherche' : 'Ajoutez votre premier client'}
                  </Text>
                </View>
              ) : (
                filteredCustomers.map(customer => (
                  <TouchableOpacity
                    key={customer.id}
                    style={[
                      styles.customerListItem,
                      selectedClient?.id === customer.id && styles.customerListItemSelected,
                    ]}
                    onPress={() => selectCustomer(customer)}
                  >
                    <View style={[
                      styles.customerListAvatar,
                      { backgroundColor: (customer.balance || 0) >= 0 ? colors.success : colors.error }
                    ]}>
                      <Icon name="person" size={20} color={colors.secondary} />
                    </View>
                    <View style={styles.customerListInfo}>
                      <Text style={styles.customerListName}>{customer.name}</Text>
                      <Text style={[
                        styles.customerListBalance,
                        { color: (customer.balance || 0) >= 0 ? colors.success : colors.error }
                      ]}>
                        {(customer.balance || 0) >= 0 
                          ? `Avance: ${formatCurrency(Math.abs(customer.balance || 0))}` 
                          : `Dette: ${formatCurrency(Math.abs(customer.balance || 0))}`
                        }
                      </Text>
                      {customer.phone && (
                        <Text style={styles.customerListPhone}>📞 {customer.phone}</Text>
                      )}
                    </View>
                    <Icon name="chevron-forward" size={16} color={colors.textLight} />
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Add Customer Modal */}
      <AddCustomerModal
        visible={showAddCustomerModal}
        onClose={() => setShowAddCustomerModal(false)}
        onCustomerAdded={handleAddCustomer}
      />
    </SafeAreaView>
  );
}
