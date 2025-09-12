
import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { AuthUser, AuthState, LoginCredentials, CreateAccountData, CreateEmployeeData } from '../types/auth';
import { authService } from '../utils/authService';

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<AuthUser>;
  logout: () => Promise<void>;
  createAdminAccount: (data: CreateAccountData) => Promise<AuthUser>;
  createEmployee: (data: CreateEmployeeData) => Promise<AuthUser>;
  updateEmployee: (employeeId: string, updates: Partial<AuthUser>) => Promise<AuthUser>;
  deleteEmployee: (employeeId: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  resetPassword: (employeeId: string, newPassword: string) => Promise<void>;
  getEmployees: () => Promise<AuthUser[]>;
  hasPermission: (module: string, action: string) => boolean;
  getAccessibleModules: () => string[];
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const useAuthState = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isFirstLaunch: false,
    isAuthenticated: false,
  });

  // Initialize auth state
  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      console.log('Initializing auth state...');
      
      const [currentUser, isFirstLaunch, isAdminSetupComplete] = await Promise.all([
        authService.getCurrentUser(),
        authService.isFirstLaunch(),
        authService.isAdminSetupComplete(),
      ]);

      setAuthState({
        user: currentUser,
        isLoading: false,
        isFirstLaunch: isFirstLaunch || !isAdminSetupComplete,
        isAuthenticated: currentUser !== null,
      });

      console.log('Auth state initialized:', {
        hasUser: !!currentUser,
        isFirstLaunch: isFirstLaunch || !isAdminSetupComplete,
        username: currentUser?.username,
      });
    } catch (error) {
      console.error('Error initializing auth:', error);
      setAuthState({
        user: null,
        isLoading: false,
        isFirstLaunch: true,
        isAuthenticated: false,
      });
    }
  };

  const login = useCallback(async (credentials: LoginCredentials): Promise<AuthUser> => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));
      
      const user = await authService.login(credentials);
      
      setAuthState({
        user,
        isLoading: false,
        isFirstLaunch: false,
        isAuthenticated: true,
      });

      return user;
    } catch (error) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    try {
      await authService.logout();
      
      setAuthState({
        user: null,
        isLoading: false,
        isFirstLaunch: false,
        isAuthenticated: false,
      });
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }, []);

  const createAdminAccount = useCallback(async (data: CreateAccountData): Promise<AuthUser> => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));
      
      const user = await authService.createAdminAccount(data);
      
      setAuthState({
        user,
        isLoading: false,
        isFirstLaunch: false,
        isAuthenticated: true,
      });

      return user;
    } catch (error) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, []);

  const createEmployee = useCallback(async (data: CreateEmployeeData): Promise<AuthUser> => {
    if (!authState.user) {
      throw new Error('Vous devez être connecté pour créer un employé');
    }

    return await authService.createEmployee(data, authState.user.id);
  }, [authState.user]);

  const updateEmployee = useCallback(async (employeeId: string, updates: Partial<AuthUser>): Promise<AuthUser> => {
    if (!authState.user) {
      throw new Error('Vous devez être connecté pour modifier un employé');
    }

    return await authService.updateEmployee(employeeId, updates, authState.user.id);
  }, [authState.user]);

  const deleteEmployee = useCallback(async (employeeId: string): Promise<void> => {
    if (!authState.user) {
      throw new Error('Vous devez être connecté pour supprimer un employé');
    }

    await authService.deleteEmployee(employeeId, authState.user.id);
  }, [authState.user]);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string): Promise<void> => {
    if (!authState.user) {
      throw new Error('Vous devez être connecté pour changer le mot de passe');
    }

    await authService.changePassword(authState.user.id, currentPassword, newPassword);
    
    // Update user state to mark first login as false
    setAuthState(prev => ({
      ...prev,
      user: prev.user ? { ...prev.user, isFirstLogin: false } : null,
    }));
  }, [authState.user]);

  const resetPassword = useCallback(async (employeeId: string, newPassword: string): Promise<void> => {
    if (!authState.user) {
      throw new Error('Vous devez être connecté pour réinitialiser un mot de passe');
    }

    await authService.resetPassword(employeeId, newPassword, authState.user.id);
  }, [authState.user]);

  const getEmployees = useCallback(async (): Promise<AuthUser[]> => {
    return await authService.getEmployees();
  }, []);

  const hasPermission = useCallback((module: string, action: string): boolean => {
    return authService.hasPermission(authState.user, module, action);
  }, [authState.user]);

  const getAccessibleModules = useCallback((): string[] => {
    return authService.getAccessibleModules(authState.user);
  }, [authState.user]);

  const refreshAuth = useCallback(async (): Promise<void> => {
    await initializeAuth();
  }, []);

  return {
    ...authState,
    login,
    logout,
    createAdminAccount,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    changePassword,
    resetPassword,
    getEmployees,
    hasPermission,
    getAccessibleModules,
    refreshAuth,
  };
};

export { AuthContext };
export type { AuthContextType };
