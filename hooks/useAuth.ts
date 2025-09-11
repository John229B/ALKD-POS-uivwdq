
import { useState, useEffect, createContext, useContext } from 'react';
import { User } from '../types';
import { getCurrentUser, storeCurrentUser, clearCurrentUser, getUsers } from '../utils/storage';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
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
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      // For demo purposes, we'll use simple authentication
      // In a real app, you'd hash passwords and use proper authentication
      const users = await getUsers();
      const foundUser = users.find(u => 
        u.username === username && 
        u.isActive &&
        (username === 'admin' || password === 'password') // Simple demo auth
      );

      if (foundUser) {
        await storeCurrentUser(foundUser);
        setUser(foundUser);
        console.log('User logged in successfully:', foundUser.username);
        return true;
      }
      
      console.log('Invalid credentials');
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await clearCurrentUser();
      setUser(null);
      console.log('User logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return {
    user,
    isLoading,
    login,
    logout,
    isAuthenticated: !!user,
  };
};

export { AuthContext };
