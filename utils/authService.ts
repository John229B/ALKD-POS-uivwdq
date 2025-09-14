
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthUser, LoginCredentials, CreateAccountData, CreateEmployeeData, DEFAULT_PERMISSIONS } from '../types/auth';
import { AppSettings } from '../types';
import { storeSettings, getSettings, logActivity, addToSyncQueue, isOnline } from './storage';

const STORAGE_KEYS = {
  AUTH_USERS: 'alkd_pos_auth_users',
  CURRENT_AUTH_USER: 'alkd_pos_current_auth_user',
  FIRST_LAUNCH: 'alkd_pos_first_launch',
  ADMIN_SETUP_COMPLETE: 'alkd_pos_admin_setup_complete',
  OFFLINE_EMPLOYEES: 'alkd_pos_offline_employees',
  PENDING_SYNC: 'alkd_pos_pending_sync',
};

export class AuthService {
  // Hash password using SHA-256
  private async hashPassword(password: string): Promise<string> {
    try {
      const hash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        password + 'ALKD_POS_SALT', // Add salt for security
        { encoding: Crypto.CryptoEncoding.HEX }
      );
      return hash;
    } catch (error) {
      console.error('Error hashing password:', error);
      throw new Error('Erreur lors du chiffrement du mot de passe');
    }
  }

  // Verify password
  private async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    try {
      const hash = await this.hashPassword(password);
      return hash === hashedPassword;
    } catch (error) {
      console.error('Error verifying password:', error);
      return false;
    }
  }

  // Check if this is the first launch
  async isFirstLaunch(): Promise<boolean> {
    try {
      const firstLaunch = await AsyncStorage.getItem(STORAGE_KEYS.FIRST_LAUNCH);
      const adminSetupComplete = await AsyncStorage.getItem(STORAGE_KEYS.ADMIN_SETUP_COMPLETE);
      return firstLaunch === null && adminSetupComplete === null;
    } catch (error) {
      console.error('Error checking first launch:', error);
      return true; // Default to first launch if error
    }
  }

  // Mark first launch as complete
  async markFirstLaunchComplete(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.FIRST_LAUNCH, 'false');
    } catch (error) {
      console.error('Error marking first launch complete:', error);
    }
  }

  // Check if admin setup is complete
  async isAdminSetupComplete(): Promise<boolean> {
    try {
      const adminSetupComplete = await AsyncStorage.getItem(STORAGE_KEYS.ADMIN_SETUP_COMPLETE);
      return adminSetupComplete === 'true';
    } catch (error) {
      console.error('Error checking admin setup:', error);
      return false;
    }
  }

  // Get all users
  async getUsers(): Promise<AuthUser[]> {
    try {
      const usersJson = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_USERS);
      if (usersJson) {
        const users = JSON.parse(usersJson);
        // Convert date strings back to Date objects
        return users.map((user: any) => ({
          ...user,
          createdAt: new Date(user.createdAt),
          updatedAt: new Date(user.updatedAt),
          lastLogin: user.lastLogin ? new Date(user.lastLogin) : undefined,
        }));
      }
      return [];
    } catch (error) {
      console.error('Error getting users:', error);
      return [];
    }
  }

  // Store users
  private async storeUsers(users: AuthUser[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.AUTH_USERS, JSON.stringify(users));
    } catch (error) {
      console.error('Error storing users:', error);
      throw new Error('Erreur lors de la sauvegarde des utilisateurs');
    }
  }

  // Store offline employee data for sync
  private async storeOfflineEmployee(employee: AuthUser): Promise<void> {
    try {
      const offlineEmployees = await this.getOfflineEmployees();
      offlineEmployees.push({
        ...employee,
        isOfflineCreated: true,
        createdOfflineAt: new Date(),
      });
      await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_EMPLOYEES, JSON.stringify(offlineEmployees));
      console.log('Employee stored offline for sync:', employee.username);
    } catch (error) {
      console.error('Error storing offline employee:', error);
    }
  }

  // Get offline employees
  private async getOfflineEmployees(): Promise<any[]> {
    try {
      const offlineJson = await AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_EMPLOYEES);
      return offlineJson ? JSON.parse(offlineJson) : [];
    } catch (error) {
      console.error('Error getting offline employees:', error);
      return [];
    }
  }

  // Sync offline data when online
  async syncOfflineData(): Promise<void> {
    try {
      const online = await isOnline();
      if (!online) {
        console.log('Still offline, skipping sync');
        return;
      }

      const offlineEmployees = await this.getOfflineEmployees();
      if (offlineEmployees.length === 0) {
        console.log('No offline employees to sync');
        return;
      }

      console.log(`Syncing ${offlineEmployees.length} offline employees...`);
      
      // Add to sync queue for each offline employee
      for (const employee of offlineEmployees) {
        await addToSyncQueue({
          type: 'employee_create',
          data: employee,
          priority: 'high',
        });
      }

      // Clear offline employees after adding to sync queue
      await AsyncStorage.removeItem(STORAGE_KEYS.OFFLINE_EMPLOYEES);
      console.log('Offline employees added to sync queue');
    } catch (error) {
      console.error('Error syncing offline data:', error);
    }
  }

  // Create admin account (first launch)
  async createAdminAccount(data: CreateAccountData): Promise<AuthUser> {
    try {
      console.log('Creating admin account...');
      
      // Validate input
      if (!data.username || !data.email || !data.password) {
        throw new Error('Tous les champs obligatoires doivent être remplis');
      }

      if (data.password !== data.confirmPassword) {
        throw new Error('Les mots de passe ne correspondent pas');
      }

      if (data.password.length < 6) {
        throw new Error('Le mot de passe doit contenir au moins 6 caractères');
      }

      // Check if admin already exists
      const users = await this.getUsers();
      const existingAdmin = users.find(u => u.role === 'admin');
      if (existingAdmin) {
        throw new Error('Un compte administrateur existe déjà');
      }

      // Hash password
      const hashedPassword = await this.hashPassword(data.password);

      // Create admin user
      const adminUser: AuthUser = {
        id: `admin-${Date.now()}`,
        username: data.username,
        email: data.email,
        password: hashedPassword,
        role: 'admin',
        permissions: DEFAULT_PERMISSIONS.admin,
        isActive: true,
        isFirstLogin: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Store user
      await this.storeUsers([adminUser]);

      // Update app settings with company info
      const currentSettings = await getSettings();
      const updatedSettings: AppSettings = {
        ...currentSettings,
        companyName: data.companyName,
        companyPhone: data.companyPhone || '',
        companyAddress: data.companyAddress || '',
      };
      await storeSettings(updatedSettings);

      // Mark admin setup as complete
      await AsyncStorage.setItem(STORAGE_KEYS.ADMIN_SETUP_COMPLETE, 'true');
      await this.markFirstLaunchComplete();

      console.log('Admin account created successfully');
      return adminUser;
    } catch (error) {
      console.error('Error creating admin account:', error);
      throw error;
    }
  }

  // Login user (with offline support)
  async login(credentials: LoginCredentials): Promise<AuthUser> {
    try {
      console.log('Attempting login for:', credentials.username);

      if (!credentials.username || !credentials.password) {
        throw new Error('Nom d\'utilisateur et mot de passe requis');
      }

      const users = await this.getUsers();
      const user = users.find(u => 
        u.username === credentials.username && u.isActive
      );

      if (!user) {
        throw new Error('Nom d\'utilisateur ou mot de passe incorrect');
      }

      // Verify password
      const isPasswordValid = await this.verifyPassword(credentials.password, user.password);
      if (!isPasswordValid) {
        throw new Error('Nom d\'utilisateur ou mot de passe incorrect');
      }

      // Update last login
      user.lastLogin = new Date();
      user.isFirstLogin = false;
      user.updatedAt = new Date();

      // Update user in storage
      const updatedUsers = users.map(u => u.id === user.id ? user : u);
      await this.storeUsers(updatedUsers);

      // Store current user
      await this.setCurrentUser(user);

      // Log activity
      await logActivity(user.id, 'auth', 'User logged in', { username: user.username });

      // Try to sync offline data if online
      try {
        await this.syncOfflineData();
      } catch (syncError) {
        console.log('Sync failed, will retry later:', syncError);
      }

      console.log('Login successful for:', user.username);
      return user;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  // Logout user
  async logout(): Promise<void> {
    try {
      const currentUser = await this.getCurrentUser();
      if (currentUser) {
        await logActivity(currentUser.id, 'auth', 'User logged out', { username: currentUser.username });
      }
      
      await AsyncStorage.removeItem(STORAGE_KEYS.CURRENT_AUTH_USER);
      console.log('User logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }

  // Get current user
  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const userJson = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_AUTH_USER);
      if (userJson) {
        const user = JSON.parse(userJson);
        return {
          ...user,
          createdAt: new Date(user.createdAt),
          updatedAt: new Date(user.updatedAt),
          lastLogin: user.lastLogin ? new Date(user.lastLogin) : undefined,
        };
      }
      return null;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  // Set current user
  private async setCurrentUser(user: AuthUser): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_AUTH_USER, JSON.stringify(user));
    } catch (error) {
      console.error('Error setting current user:', error);
      throw error;
    }
  }

  // Create employee (admin only) with offline support
  async createEmployee(data: CreateEmployeeData, adminId: string): Promise<AuthUser> {
    try {
      console.log('Creating employee account...', data);

      // Validate input
      if (!data.username || !data.email || !data.password) {
        throw new Error('Tous les champs obligatoires doivent être remplis');
      }

      if (data.password.length < 6) {
        throw new Error('Le mot de passe doit contenir au moins 6 caractères');
      }

      // Check if username already exists
      const users = await this.getUsers();
      const existingUser = users.find(u => u.username === data.username);
      if (existingUser) {
        throw new Error('Ce nom d\'utilisateur existe déjà');
      }

      // Hash password
      const hashedPassword = await this.hashPassword(data.password);

      // Get default permissions for role
      const defaultPermissions = DEFAULT_PERMISSIONS[data.role] || [];

      // Create employee user
      const employee: AuthUser = {
        id: `emp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        username: data.username,
        email: data.email,
        password: hashedPassword,
        role: data.role,
        permissions: data.permissions.length > 0 ? data.permissions : defaultPermissions,
        isActive: true,
        isFirstLogin: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: adminId,
      };

      // Add to users list
      const updatedUsers = [...users, employee];
      await this.storeUsers(updatedUsers);

      // Check if online for sync
      const online = await isOnline();
      if (online) {
        // Add to sync queue for server sync
        await addToSyncQueue({
          type: 'employee_create',
          data: employee,
          priority: 'high',
        });
        console.log('Employee added to sync queue for server sync');
      } else {
        // Store offline for later sync
        await this.storeOfflineEmployee(employee);
        console.log('Employee stored offline, will sync when online');
      }

      // Log activity
      await logActivity(adminId, 'employees', 'Employee created', { 
        employeeId: employee.id, 
        username: employee.username,
        role: employee.role,
        offline: !online
      });

      console.log('Employee account created successfully');
      return employee;
    } catch (error) {
      console.error('Error creating employee:', error);
      throw error;
    }
  }

  // Update employee (admin only)
  async updateEmployee(employeeId: string, updates: Partial<AuthUser>, adminId: string): Promise<AuthUser> {
    try {
      const users = await this.getUsers();
      const employeeIndex = users.findIndex(u => u.id === employeeId);
      
      if (employeeIndex === -1) {
        throw new Error('Employé non trouvé');
      }

      const employee = users[employeeIndex];
      
      // Don't allow updating admin users by non-admin
      if (employee.role === 'admin' && adminId !== employee.id) {
        throw new Error('Impossible de modifier un compte administrateur');
      }

      // Hash password if provided
      if (updates.password) {
        updates.password = await this.hashPassword(updates.password);
      }

      // Update permissions based on role if role is changed
      if (updates.role && updates.role !== employee.role) {
        updates.permissions = DEFAULT_PERMISSIONS[updates.role] || employee.permissions;
      }

      // Update employee
      const updatedEmployee: AuthUser = {
        ...employee,
        ...updates,
        updatedAt: new Date(),
      };

      users[employeeIndex] = updatedEmployee;
      await this.storeUsers(users);

      // Add to sync queue if online
      const online = await isOnline();
      if (online) {
        await addToSyncQueue({
          type: 'employee_update',
          data: { id: employeeId, updates },
          priority: 'medium',
        });
      }

      // Log activity
      await logActivity(adminId, 'employees', 'Employee updated', { 
        employeeId: updatedEmployee.id, 
        username: updatedEmployee.username,
        offline: !online
      });

      return updatedEmployee;
    } catch (error) {
      console.error('Error updating employee:', error);
      throw error;
    }
  }

  // Delete employee (admin only)
  async deleteEmployee(employeeId: string, adminId: string): Promise<void> {
    try {
      const users = await this.getUsers();
      const employee = users.find(u => u.id === employeeId);
      
      if (!employee) {
        throw new Error('Employé non trouvé');
      }

      // Don't allow deleting admin users
      if (employee.role === 'admin') {
        throw new Error('Impossible de supprimer un compte administrateur');
      }

      // Remove employee
      const updatedUsers = users.filter(u => u.id !== employeeId);
      await this.storeUsers(updatedUsers);

      // Add to sync queue if online
      const online = await isOnline();
      if (online) {
        await addToSyncQueue({
          type: 'employee_delete',
          data: { id: employeeId },
          priority: 'medium',
        });
      }

      // Log activity
      await logActivity(adminId, 'employees', 'Employee deleted', { 
        employeeId: employee.id, 
        username: employee.username,
        offline: !online
      });

      console.log('Employee deleted successfully');
    } catch (error) {
      console.error('Error deleting employee:', error);
      throw error;
    }
  }

  // Change password
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    try {
      if (newPassword.length < 6) {
        throw new Error('Le nouveau mot de passe doit contenir au moins 6 caractères');
      }

      const users = await this.getUsers();
      const userIndex = users.findIndex(u => u.id === userId);
      
      if (userIndex === -1) {
        throw new Error('Utilisateur non trouvé');
      }

      const user = users[userIndex];

      // Verify current password
      const isCurrentPasswordValid = await this.verifyPassword(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        throw new Error('Mot de passe actuel incorrect');
      }

      // Hash new password
      const hashedNewPassword = await this.hashPassword(newPassword);

      // Update password
      user.password = hashedNewPassword;
      user.updatedAt = new Date();
      user.isFirstLogin = false;

      users[userIndex] = user;
      await this.storeUsers(users);

      // Add to sync queue if online
      const online = await isOnline();
      if (online) {
        await addToSyncQueue({
          type: 'password_change',
          data: { userId, hashedPassword: hashedNewPassword },
          priority: 'high',
        });
      }

      // Log activity
      await logActivity(userId, 'auth', 'Password changed', { 
        username: user.username,
        offline: !online
      });

      console.log('Password changed successfully');
    } catch (error) {
      console.error('Error changing password:', error);
      throw error;
    }
  }

  // Reset password (admin only)
  async resetPassword(employeeId: string, newPassword: string, adminId: string): Promise<void> {
    try {
      if (newPassword.length < 6) {
        throw new Error('Le nouveau mot de passe doit contenir au moins 6 caractères');
      }

      const users = await this.getUsers();
      const userIndex = users.findIndex(u => u.id === employeeId);
      
      if (userIndex === -1) {
        throw new Error('Utilisateur non trouvé');
      }

      const user = users[userIndex];

      // Hash new password
      const hashedNewPassword = await this.hashPassword(newPassword);

      // Update password
      user.password = hashedNewPassword;
      user.updatedAt = new Date();
      user.isFirstLogin = true; // Force user to change password on next login

      users[userIndex] = user;
      await this.storeUsers(users);

      // Add to sync queue if online
      const online = await isOnline();
      if (online) {
        await addToSyncQueue({
          type: 'password_reset',
          data: { employeeId, hashedPassword: hashedNewPassword },
          priority: 'high',
        });
      }

      // Log activity
      await logActivity(adminId, 'employees', 'Password reset', { 
        employeeId: user.id, 
        username: user.username,
        offline: !online
      });

      console.log('Password reset successfully');
    } catch (error) {
      console.error('Error resetting password:', error);
      throw error;
    }
  }

  // Get employees (admin only)
  async getEmployees(): Promise<AuthUser[]> {
    try {
      const users = await this.getUsers();
      return users.filter(u => u.role !== 'admin');
    } catch (error) {
      console.error('Error getting employees:', error);
      return [];
    }
  }

  // Check if user has permission
  hasPermission(user: AuthUser | null, module: string, action: string): boolean {
    if (!user || !user.isActive) return false;
    
    // Admin has all permissions
    if (user.role === 'admin') return true;
    
    // Special handling for cashier reports - they can only view their own
    if (user.role === 'cashier' && module === 'reports' && action === 'view') {
      return user.permissions.some(permission => 
        permission.id === 'reports_own' && permission.actions.includes('view')
      );
    }
    
    // Special handling for inventory role - strict access control
    if (user.role === 'inventory') {
      const allowedModules = ['inventory', 'products'];
      if (!allowedModules.includes(module)) return false;
    }
    
    // Check specific permissions
    return user.permissions.some(permission => 
      permission.module === module && permission.actions.includes(action as any)
    );
  }

  // Get accessible modules for user
  getAccessibleModules(user: AuthUser | null): string[] {
    if (!user || !user.isActive) return [];
    
    if (user.role === 'admin') {
      return ['dashboard', 'pos', 'products', 'customers', 'reports', 'settings', 'employees', 'printers', 'tickets', 'inventory'];
    }
    
    // Special handling for inventory role
    if (user.role === 'inventory') {
      return ['inventory', 'products'];
    }
    
    const modules = new Set<string>();
    user.permissions.forEach(permission => {
      modules.add(permission.module);
    });
    
    return Array.from(modules);
  }
}

// Export singleton instance
export const authService = new AuthService();
