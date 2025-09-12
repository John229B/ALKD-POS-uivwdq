
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Modal, TextInput, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Icon from '../components/Icon';
import { commonStyles, colors, buttonStyles, spacing, fontSizes } from '../styles/commonStyles';
import { Employee, Permission, DEFAULT_PERMISSIONS } from '../types';
import { getEmployees, storeEmployees, deleteEmployee, logActivity } from '../utils/storage';
import uuid from 'react-native-uuid';

export default function EmployeesScreen() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [permissionsModalVisible, setPermissionsModalVisible] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    role: 'cashier' as 'admin' | 'manager' | 'cashier' | 'inventory',
    permissions: [] as Permission[],
    isActive: true,
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const employeesData = await getEmployees();
      setEmployees(employeesData);
    } catch (error) {
      console.error('Error loading employees:', error);
      Alert.alert('Erreur', 'Impossible de charger les employés');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      password: '',
      role: 'cashier',
      permissions: DEFAULT_PERMISSIONS.cashier,
      isActive: true,
    });
    setEditingEmployee(null);
  };

  const openAddModal = () => {
    resetForm();
    setModalVisible(true);
  };

  const openEditModal = (employee: Employee) => {
    setFormData({
      name: employee.name,
      phone: employee.phone || '',
      email: employee.email,
      password: '', // Don't show existing password
      role: employee.role,
      permissions: employee.permissions,
      isActive: employee.isActive,
    });
    setEditingEmployee(employee);
    setModalVisible(true);
  };

  const handleRoleChange = (role: 'admin' | 'manager' | 'cashier' | 'inventory') => {
    setFormData({
      ...formData,
      role,
      permissions: DEFAULT_PERMISSIONS[role] || [],
    });
  };

  const saveEmployee = async () => {
    if (!formData.name.trim() || !formData.email.trim()) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (!editingEmployee && !formData.password.trim()) {
      Alert.alert('Erreur', 'Le mot de passe est obligatoire pour un nouvel employé');
      return;
    }

    try {
      const currentEmployees = await getEmployees();
      
      // Check for duplicate email
      const existingEmployee = currentEmployees.find(e => 
        e.email === formData.email && e.id !== editingEmployee?.id
      );
      
      if (existingEmployee) {
        Alert.alert('Erreur', 'Un employé avec cet email existe déjà');
        return;
      }

      let updatedEmployees;
      
      if (editingEmployee) {
        // Update existing employee
        updatedEmployees = currentEmployees.map(emp =>
          emp.id === editingEmployee.id
            ? {
                ...emp,
                name: formData.name,
                phone: formData.phone,
                email: formData.email,
                role: formData.role,
                permissions: formData.permissions,
                isActive: formData.isActive,
                updatedAt: new Date(),
                ...(formData.password.trim() && { password: formData.password }),
              }
            : emp
        );
        await logActivity('admin', 'employees', 'Employee updated', { employeeId: editingEmployee.id, name: formData.name });
      } else {
        // Add new employee
        const newEmployee: Employee = {
          id: uuid.v4() as string,
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
          password: formData.password,
          role: formData.role,
          permissions: formData.permissions,
          isActive: formData.isActive,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        updatedEmployees = [...currentEmployees, newEmployee];
        await logActivity('admin', 'employees', 'Employee created', { employeeId: newEmployee.id, name: formData.name });
      }

      await storeEmployees(updatedEmployees);
      setEmployees(updatedEmployees);
      setModalVisible(false);
      resetForm();
      
      Alert.alert(
        'Succès',
        editingEmployee ? 'Employé modifié avec succès' : 'Employé ajouté avec succès'
      );
    } catch (error) {
      console.error('Error saving employee:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder l\'employé');
    }
  };

  const handleDeleteEmployee = (employee: Employee) => {
    Alert.alert(
      'Confirmer la suppression',
      `Êtes-vous sûr de vouloir supprimer l'employé "${employee.name}" ? Cette action est irréversible.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteEmployee(employee.id);
              await loadData();
              Alert.alert('Succès', 'Employé supprimé avec succès');
            } catch (error) {
              console.error('Error deleting employee:', error);
              Alert.alert('Erreur', 'Impossible de supprimer l\'employé');
            }
          },
        },
      ]
    );
  };

  const toggleEmployeeStatus = async (employee: Employee) => {
    try {
      const currentEmployees = await getEmployees();
      const updatedEmployees = currentEmployees.map(emp =>
        emp.id === employee.id
          ? { ...emp, isActive: !emp.isActive, updatedAt: new Date() }
          : emp
      );
      
      await storeEmployees(updatedEmployees);
      setEmployees(updatedEmployees);
      
      await logActivity('admin', 'employees', employee.isActive ? 'Employee deactivated' : 'Employee activated', { 
        employeeId: employee.id, 
        name: employee.name 
      });
      
      Alert.alert(
        'Succès',
        `Employé ${employee.isActive ? 'désactivé' : 'activé'} avec succès`
      );
    } catch (error) {
      console.error('Error toggling employee status:', error);
      Alert.alert('Erreur', 'Impossible de modifier le statut de l\'employé');
    }
  };

  const getRoleLabel = (role: string) => {
    const labels = {
      admin: 'Administrateur',
      manager: 'Gestionnaire',
      cashier: 'Caissier',
      inventory: 'Inventaire',
    };
    return labels[role as keyof typeof labels] || role;
  };

  const getRoleColor = (role: string) => {
    const colors_map = {
      admin: colors.error,
      manager: colors.warning,
      cashier: colors.info,
      inventory: colors.success,
    };
    return colors_map[role as keyof typeof colors_map] || colors.textLight;
  };

  if (loading) {
    return (
      <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]}>
        <View style={commonStyles.centerContainer}>
          <Text style={[commonStyles.text, { color: colors.textLight }]}>Chargement...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Gestion des employés</Text>
          <Text style={styles.headerSubtitle}>{employees.length} employé(s)</Text>
        </View>
        <TouchableOpacity onPress={openAddModal} style={styles.addButton}>
          <Icon name="add" size={24} color={colors.background} />
        </TouchableOpacity>
      </View>

      {/* Employee List */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {employees.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="people-outline" size={64} color={colors.textLight} />
            <Text style={styles.emptyStateTitle}>Aucun employé</Text>
            <Text style={styles.emptyStateText}>Ajoutez votre premier employé pour commencer</Text>
            <TouchableOpacity onPress={openAddModal} style={[buttonStyles.primary, { marginTop: spacing.lg }]}>
              <Icon name="add" size={20} color={colors.background} />
              <Text style={[buttonStyles.primaryText, { marginLeft: spacing.sm }]}>Ajouter un employé</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.employeeList}>
            {employees.map((employee) => (
              <View key={employee.id} style={[styles.employeeCard, !employee.isActive && styles.inactiveCard]}>
                <View style={styles.employeeHeader}>
                  <View style={styles.employeeInfo}>
                    <Text style={[styles.employeeName, !employee.isActive && styles.inactiveText]}>
                      {employee.name}
                    </Text>
                    <Text style={[styles.employeeEmail, !employee.isActive && styles.inactiveText]}>
                      {employee.email}
                    </Text>
                    {employee.phone && (
                      <Text style={[styles.employeePhone, !employee.isActive && styles.inactiveText]}>
                        {employee.phone}
                      </Text>
                    )}
                  </View>
                  <View style={[styles.roleBadge, { backgroundColor: getRoleColor(employee.role) + '20' }]}>
                    <Text style={[styles.roleText, { color: getRoleColor(employee.role) }]}>
                      {getRoleLabel(employee.role)}
                    </Text>
                  </View>
                </View>

                <View style={styles.employeeStats}>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Permissions</Text>
                    <Text style={styles.statValue}>{employee.permissions.length}</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Statut</Text>
                    <Text style={[styles.statValue, { color: employee.isActive ? colors.success : colors.error }]}>
                      {employee.isActive ? 'Actif' : 'Inactif'}
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Dernière connexion</Text>
                    <Text style={styles.statValue}>
                      {employee.lastLogin ? new Date(employee.lastLogin).toLocaleDateString() : 'Jamais'}
                    </Text>
                  </View>
                </View>

                <View style={styles.employeeActions}>
                  <TouchableOpacity
                    onPress={() => openEditModal(employee)}
                    style={[styles.actionButton, { backgroundColor: colors.info + '20' }]}
                  >
                    <Icon name="create-outline" size={18} color={colors.info} />
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    onPress={() => toggleEmployeeStatus(employee)}
                    style={[styles.actionButton, { backgroundColor: (employee.isActive ? colors.warning : colors.success) + '20' }]}
                  >
                    <Icon 
                      name={employee.isActive ? "pause-outline" : "play-outline"} 
                      size={18} 
                      color={employee.isActive ? colors.warning : colors.success} 
                    />
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    onPress={() => handleDeleteEmployee(employee)}
                    style={[styles.actionButton, { backgroundColor: colors.error + '20' }]}
                  >
                    <Icon name="trash-outline" size={18} color={colors.error} />
                  </TouchableOpacity>
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
        <SafeAreaView style={[commonStyles.container, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={[commonStyles.text, { color: colors.error }]}>Annuler</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingEmployee ? 'Modifier employé' : 'Nouvel employé'}
            </Text>
            <TouchableOpacity onPress={saveEmployee}>
              <Text style={[commonStyles.text, { color: colors.primary, fontWeight: '600' }]}>
                Sauvegarder
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Nom complet *</Text>
              <TextInput
                style={styles.formInput}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder="Nom et prénom"
                placeholderTextColor={colors.textLight}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Email *</Text>
              <TextInput
                style={styles.formInput}
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text })}
                placeholder="email@exemple.com"
                placeholderTextColor={colors.textLight}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Téléphone</Text>
              <TextInput
                style={styles.formInput}
                value={formData.phone}
                onChangeText={(text) => setFormData({ ...formData, phone: text })}
                placeholder="+225 XX XX XX XX"
                placeholderTextColor={colors.textLight}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>
                Mot de passe {editingEmployee ? '(laisser vide pour ne pas changer)' : '*'}
              </Text>
              <TextInput
                style={styles.formInput}
                value={formData.password}
                onChangeText={(text) => setFormData({ ...formData, password: text })}
                placeholder="Mot de passe"
                placeholderTextColor={colors.textLight}
                secureTextEntry
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Rôle</Text>
              <View style={styles.roleSelector}>
                {(['admin', 'manager', 'cashier', 'inventory'] as const).map((role) => (
                  <TouchableOpacity
                    key={role}
                    onPress={() => handleRoleChange(role)}
                    style={[
                      styles.roleOption,
                      formData.role === role && styles.roleOptionSelected,
                      { borderColor: getRoleColor(role) }
                    ]}
                  >
                    <Text style={[
                      styles.roleOptionText,
                      formData.role === role && { color: getRoleColor(role) }
                    ]}>
                      {getRoleLabel(role)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <View style={styles.switchRow}>
                <Text style={styles.formLabel}>Employé actif</Text>
                <Switch
                  value={formData.isActive}
                  onValueChange={(value) => setFormData({ ...formData, isActive: value })}
                  trackColor={{ false: colors.border, true: colors.primary + '40' }}
                  thumbColor={formData.isActive ? colors.primary : colors.textLight}
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Permissions ({formData.permissions.length})</Text>
              <TouchableOpacity
                onPress={() => setPermissionsModalVisible(true)}
                style={styles.permissionsButton}
              >
                <Text style={styles.permissionsButtonText}>Gérer les permissions</Text>
                <Icon name="chevron-forward" size={20} color={colors.textLight} />
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = {
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  backButton: {
    padding: spacing.sm,
    marginRight: spacing.sm,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: fontSizes.xl,
    fontWeight: '700' as const,
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: fontSizes.sm,
    color: colors.textLight,
    marginTop: 2,
  },
  addButton: {
    backgroundColor: colors.primary,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  scrollView: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl * 2,
  },
  emptyStateTitle: {
    fontSize: fontSizes.xl,
    fontWeight: '600' as const,
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptyStateText: {
    fontSize: fontSizes.md,
    color: colors.textLight,
    textAlign: 'center' as const,
    lineHeight: 22,
  },
  employeeList: {
    padding: spacing.lg,
  },
  employeeCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  inactiveCard: {
    opacity: 0.6,
  },
  employeeHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
    marginBottom: spacing.md,
  },
  employeeInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  employeeName: {
    fontSize: fontSizes.lg,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  employeeEmail: {
    fontSize: fontSizes.sm,
    color: colors.textLight,
    marginBottom: spacing.xs,
  },
  employeePhone: {
    fontSize: fontSizes.sm,
    color: colors.textLight,
  },
  inactiveText: {
    opacity: 0.7,
  },
  roleBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  roleText: {
    fontSize: fontSizes.xs,
    fontWeight: '600' as const,
  },
  employeeStats: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    marginBottom: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  statItem: {
    alignItems: 'center' as const,
  },
  statLabel: {
    fontSize: fontSizes.xs,
    color: colors.textLight,
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: fontSizes.sm,
    fontWeight: '600' as const,
    color: colors.text,
  },
  employeeActions: {
    flexDirection: 'row' as const,
    justifyContent: 'flex-end' as const,
    gap: spacing.sm,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  modalHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: fontSizes.lg,
    fontWeight: '600' as const,
    color: colors.text,
  },
  modalContent: {
    flex: 1,
    padding: spacing.lg,
  },
  formGroup: {
    marginBottom: spacing.lg,
  },
  formLabel: {
    fontSize: fontSizes.md,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  formInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSizes.md,
    color: colors.text,
    backgroundColor: colors.background,
  },
  roleSelector: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: spacing.sm,
  },
  roleOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  roleOptionSelected: {
    borderWidth: 2,
  },
  roleOptionText: {
    fontSize: fontSizes.sm,
    color: colors.textLight,
  },
  switchRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  permissionsButton: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.background,
  },
  permissionsButtonText: {
    fontSize: fontSizes.md,
    color: colors.textLight,
  },
};
