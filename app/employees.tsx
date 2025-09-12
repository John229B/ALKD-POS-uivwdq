
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Modal, TextInput, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { commonStyles, colors, buttonStyles, spacing, fontSizes } from '../styles/commonStyles';
import { useAuthState } from '../hooks/useAuth';
import { AuthUser, CreateEmployeeData, DEFAULT_PERMISSIONS } from '../types/auth';
import Icon from '../components/Icon';

export default function EmployeesScreen() {
  const [employees, setEmployees] = useState<AuthUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<AuthUser | null>(null);
  const [formData, setFormData] = useState<CreateEmployeeData>({
    name: '',
    username: '',
    email: '',
    password: '',
    role: 'cashier',
    permissions: [],
    phone: '',
  });

  const { 
    user, 
    getEmployees, 
    createEmployee, 
    updateEmployee, 
    deleteEmployee, 
    resetPassword,
    hasPermission 
  } = useAuthState();

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = useCallback(async () => {
    try {
      setIsLoading(true);
      const employeesList = await getEmployees();
      setEmployees(employeesList);
    } catch (error) {
      console.error('Error loading employees:', error);
      Alert.alert('Erreur', 'Impossible de charger la liste des employés');
    } finally {
      setIsLoading(false);
    }
  }, [getEmployees]);

  const resetForm = () => {
    setFormData({
      name: '',
      username: '',
      email: '',
      password: '',
      role: 'cashier',
      permissions: [],
      phone: '',
    });
    setEditingEmployee(null);
  };

  const openAddModal = () => {
    resetForm();
    setFormData(prev => ({ ...prev, permissions: DEFAULT_PERMISSIONS.cashier }));
    setModalVisible(true);
  };

  const openEditModal = (employee: AuthUser) => {
    setEditingEmployee(employee);
    setFormData({
      name: employee.username, // Using username as name for now
      username: employee.username,
      email: employee.email,
      password: '', // Don't pre-fill password
      role: employee.role as any,
      permissions: employee.permissions,
      phone: '', // Add phone field if needed
    });
    setModalVisible(true);
  };

  const handleRoleChange = (role: 'manager' | 'cashier' | 'inventory') => {
    setFormData(prev => ({
      ...prev,
      role,
      permissions: DEFAULT_PERMISSIONS[role] || [],
    }));
  };

  const saveEmployee = async () => {
    try {
      if (!formData.name.trim() || !formData.username.trim() || !formData.email.trim()) {
        Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
        return;
      }

      if (!editingEmployee && !formData.password.trim()) {
        Alert.alert('Erreur', 'Le mot de passe est requis pour un nouvel employé');
        return;
      }

      if (editingEmployee) {
        // Update existing employee
        const updates: Partial<AuthUser> = {
          username: formData.username,
          email: formData.email,
          role: formData.role,
          permissions: formData.permissions,
        };

        await updateEmployee(editingEmployee.id, updates);
        Alert.alert('Succès', 'Employé modifié avec succès');
      } else {
        // Create new employee
        await createEmployee(formData);
        Alert.alert('Succès', 'Employé créé avec succès');
      }

      setModalVisible(false);
      resetForm();
      await loadEmployees();
    } catch (error) {
      console.error('Error saving employee:', error);
      Alert.alert('Erreur', error instanceof Error ? error.message : 'Une erreur est survenue');
    }
  };

  const handleDeleteEmployee = (employee: AuthUser) => {
    Alert.alert(
      'Supprimer l\'employé',
      `Êtes-vous sûr de vouloir supprimer ${employee.username} ? Cette action est irréversible.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteEmployee(employee.id);
              Alert.alert('Succès', 'Employé supprimé avec succès');
              await loadEmployees();
            } catch (error) {
              console.error('Error deleting employee:', error);
              Alert.alert('Erreur', error instanceof Error ? error.message : 'Une erreur est survenue');
            }
          },
        },
      ]
    );
  };

  const handleResetPassword = (employee: AuthUser) => {
    Alert.prompt(
      'Réinitialiser le mot de passe',
      `Entrez un nouveau mot de passe pour ${employee.username}`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Réinitialiser',
          onPress: async (newPassword) => {
            if (!newPassword || newPassword.length < 6) {
              Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 6 caractères');
              return;
            }

            try {
              await resetPassword(employee.id, newPassword);
              Alert.alert(
                'Succès', 
                'Mot de passe réinitialisé avec succès. L\'employé devra changer son mot de passe à la prochaine connexion.'
              );
            } catch (error) {
              console.error('Error resetting password:', error);
              Alert.alert('Erreur', error instanceof Error ? error.message : 'Une erreur est survenue');
            }
          },
        },
      ],
      'secure-text'
    );
  };

  const toggleEmployeeStatus = async (employee: AuthUser) => {
    try {
      await updateEmployee(employee.id, { isActive: !employee.isActive });
      Alert.alert('Succès', `Employé ${employee.isActive ? 'désactivé' : 'activé'} avec succès`);
      await loadEmployees();
    } catch (error) {
      console.error('Error toggling employee status:', error);
      Alert.alert('Erreur', error instanceof Error ? error.message : 'Une erreur est survenue');
    }
  };

  const getRoleLabel = (role: string): string => {
    const labels = {
      admin: 'Administrateur',
      manager: 'Gestionnaire',
      cashier: 'Caissier',
      inventory: 'Inventaire',
    };
    return labels[role as keyof typeof labels] || role;
  };

  const getRoleColor = (role: string): string => {
    const colors = {
      admin: '#e74c3c',
      manager: '#3498db',
      cashier: '#2ecc71',
      inventory: '#f39c12',
    };
    return colors[role as keyof typeof colors] || '#95a5a6';
  };

  // Check permissions
  if (!hasPermission('employees', 'view')) {
    return (
      <SafeAreaView style={commonStyles.container}>
        <View style={[commonStyles.content, commonStyles.center]}>
          <Icon name="lock-closed" size={60} color={colors.textLight} />
          <Text style={[commonStyles.title, { marginTop: spacing.lg, textAlign: 'center' }]}>
            Accès refusé
          </Text>
          <Text style={[commonStyles.textLight, { textAlign: 'center', marginTop: spacing.sm }]}>
            Vous n'avez pas les permissions nécessaires pour accéder à cette section.
          </Text>
          <TouchableOpacity
            style={[buttonStyles.secondary, { marginTop: spacing.lg }]}
            onPress={() => router.back()}
          >
            <Text style={{ color: colors.text, fontSize: fontSizes.md }}>
              Retour
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={commonStyles.container}>
      {/* Header */}
      <View style={[commonStyles.header, { backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Icon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={commonStyles.headerTitle}>Employés</Text>
        {hasPermission('employees', 'create') && (
          <TouchableOpacity onPress={openAddModal}>
            <Icon name="add" size={24} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      <ScrollView style={commonStyles.content}>
        {isLoading ? (
          <View style={[commonStyles.center, { marginTop: spacing.xl }]}>
            <Text style={commonStyles.textLight}>Chargement...</Text>
          </View>
        ) : employees.length === 0 ? (
          <View style={[commonStyles.center, { marginTop: spacing.xl }]}>
            <Icon name="people" size={60} color={colors.textLight} />
            <Text style={[commonStyles.title, { marginTop: spacing.lg, textAlign: 'center' }]}>
              Aucun employé
            </Text>
            <Text style={[commonStyles.textLight, { textAlign: 'center', marginTop: spacing.sm }]}>
              Ajoutez des employés pour gérer votre équipe
            </Text>
            {hasPermission('employees', 'create') && (
              <TouchableOpacity
                style={[buttonStyles.primary, { marginTop: spacing.lg }]}
                onPress={openAddModal}
              >
                <Text style={{ color: colors.secondary, fontSize: fontSizes.md }}>
                  Ajouter un employé
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={{ padding: spacing.lg }}>
            {employees.map((employee) => (
              <View key={employee.id} style={[commonStyles.card, { marginBottom: spacing.md }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs }}>
                      <Text style={[commonStyles.subtitle, { flex: 1 }]}>
                        {employee.username}
                      </Text>
                      <View style={{
                        backgroundColor: getRoleColor(employee.role),
                        paddingHorizontal: spacing.sm,
                        paddingVertical: 4,
                        borderRadius: 12,
                      }}>
                        <Text style={{ color: colors.secondary, fontSize: fontSizes.xs, fontWeight: '600' }}>
                          {getRoleLabel(employee.role)}
                        </Text>
                      </View>
                    </View>
                    
                    <Text style={[commonStyles.textLight, { marginBottom: spacing.xs }]}>
                      {employee.email}
                    </Text>
                    
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
                      <View style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: employee.isActive ? colors.success : colors.error,
                        marginRight: spacing.xs,
                      }} />
                      <Text style={[commonStyles.textLight, { fontSize: fontSizes.sm }]}>
                        {employee.isActive ? 'Actif' : 'Inactif'}
                      </Text>
                      {employee.lastLogin && (
                        <Text style={[commonStyles.textLight, { fontSize: fontSizes.sm, marginLeft: spacing.sm }]}>
                          • Dernière connexion: {new Date(employee.lastLogin).toLocaleDateString()}
                        </Text>
                      )}
                    </View>

                    <Text style={[commonStyles.textLight, { fontSize: fontSizes.sm }]}>
                      Permissions: {employee.permissions.length} module(s)
                    </Text>
                  </View>

                  {hasPermission('employees', 'edit') && (
                    <View style={{ flexDirection: 'row', marginLeft: spacing.md }}>
                      <TouchableOpacity
                        style={{ padding: spacing.sm, marginRight: spacing.xs }}
                        onPress={() => openEditModal(employee)}
                      >
                        <Icon name="create" size={20} color={colors.primary} />
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        style={{ padding: spacing.sm, marginRight: spacing.xs }}
                        onPress={() => handleResetPassword(employee)}
                      >
                        <Icon name="key" size={20} color={colors.warning} />
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        style={{ padding: spacing.sm, marginRight: spacing.xs }}
                        onPress={() => toggleEmployeeStatus(employee)}
                      >
                        <Icon 
                          name={employee.isActive ? 'pause' : 'play'} 
                          size={20} 
                          color={employee.isActive ? colors.warning : colors.success} 
                        />
                      </TouchableOpacity>
                      
                      {hasPermission('employees', 'delete') && (
                        <TouchableOpacity
                          style={{ padding: spacing.sm }}
                          onPress={() => handleDeleteEmployee(employee)}
                        >
                          <Icon name="trash" size={20} color={colors.error} />
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Add/Edit Employee Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={commonStyles.container}>
          <View style={[commonStyles.header, { backgroundColor: colors.background }]}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Icon name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={commonStyles.headerTitle}>
              {editingEmployee ? 'Modifier l\'employé' : 'Nouvel employé'}
            </Text>
            <TouchableOpacity onPress={saveEmployee}>
              <Text style={{ color: colors.primary, fontSize: fontSizes.md, fontWeight: '600' }}>
                Sauvegarder
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={commonStyles.content}>
            <View style={{ padding: spacing.lg }}>
              <View style={commonStyles.card}>
                <Text style={[commonStyles.subtitle, { marginBottom: spacing.lg }]}>
                  Informations de base
                </Text>

                <View style={{ marginBottom: spacing.md }}>
                  <Text style={[commonStyles.textLight, { marginBottom: spacing.xs }]}>
                    Nom d'utilisateur *
                  </Text>
                  <TextInput
                    style={commonStyles.input}
                    value={formData.username}
                    onChangeText={(value) => setFormData(prev => ({ ...prev, username: value }))}
                    placeholder="Ex: jdupont"
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
                    onChangeText={(value) => setFormData(prev => ({ ...prev, email: value }))}
                    placeholder="Ex: j.dupont@entreprise.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                {!editingEmployee && (
                  <View style={{ marginBottom: spacing.md }}>
                    <Text style={[commonStyles.textLight, { marginBottom: spacing.xs }]}>
                      Mot de passe *
                    </Text>
                    <TextInput
                      style={commonStyles.input}
                      value={formData.password}
                      onChangeText={(value) => setFormData(prev => ({ ...prev, password: value }))}
                      placeholder="Minimum 6 caractères"
                      secureTextEntry
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                )}

                <View style={{ marginBottom: spacing.lg }}>
                  <Text style={[commonStyles.textLight, { marginBottom: spacing.xs }]}>
                    Téléphone
                  </Text>
                  <TextInput
                    style={commonStyles.input}
                    value={formData.phone}
                    onChangeText={(value) => setFormData(prev => ({ ...prev, phone: value }))}
                    placeholder="Ex: +225 01 02 03 04 05"
                    keyboardType="phone-pad"
                  />
                </View>

                <Text style={[commonStyles.subtitle, { marginBottom: spacing.md }]}>
                  Rôle et permissions
                </Text>

                <View style={{ marginBottom: spacing.lg }}>
                  <Text style={[commonStyles.textLight, { marginBottom: spacing.md }]}>
                    Rôle
                  </Text>
                  
                  {(['manager', 'cashier', 'inventory'] as const).map((role) => (
                    <TouchableOpacity
                      key={role}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingVertical: spacing.sm,
                        paddingHorizontal: spacing.md,
                        backgroundColor: formData.role === role ? colors.primaryLight : colors.backgroundAlt,
                        borderRadius: 8,
                        marginBottom: spacing.xs,
                      }}
                      onPress={() => handleRoleChange(role)}
                    >
                      <View style={{
                        width: 20,
                        height: 20,
                        borderRadius: 10,
                        borderWidth: 2,
                        borderColor: formData.role === role ? colors.primary : colors.textLight,
                        backgroundColor: formData.role === role ? colors.primary : 'transparent',
                        marginRight: spacing.md,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        {formData.role === role && (
                          <View style={{
                            width: 8,
                            height: 8,
                            borderRadius: 4,
                            backgroundColor: colors.secondary,
                          }} />
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[commonStyles.text, { fontWeight: formData.role === role ? '600' : 'normal' }]}>
                          {getRoleLabel(role)}
                        </Text>
                        <Text style={[commonStyles.textLight, { fontSize: fontSizes.sm }]}>
                          {DEFAULT_PERMISSIONS[role]?.length || 0} permission(s)
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={{
                  padding: spacing.md,
                  backgroundColor: colors.backgroundAlt,
                  borderRadius: 8,
                }}>
                  <Text style={[commonStyles.textLight, { fontSize: fontSizes.sm, textAlign: 'center' }]}>
                    Les permissions sont automatiquement assignées selon le rôle sélectionné.
                    Vous pouvez les personnaliser après la création de l'employé.
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
