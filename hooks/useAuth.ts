
import { useState, useEffect, createContext, useContext, useCallback, useMemo } from 'react';
import { User } from '../types';
import { getCurrentUser, storeCurrentUser, clearCurrentUser, getUsers, storeUsers } from '../utils/storage';

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
    let isMounted = true;
    
    const loadUser = async () => {
      try {
        console.log('Loading current user...');
        let currentUser = await getCurrentUser().catch(error => {
          console.error('Error getting current user from storage:', error);
          return null;
        });
        
        // If no current user, try to get or create default admin
        if (!currentUser) {
          console.log('No current user found, checking for default admin...');
          const users = await getUsers().catch(() => []);
          let adminUser = users.find(u => u.username === 'admin' && u.isActive);
          
          if (!adminUser) {
            console.log('Creating default admin user...');
            adminUser = {
              id: 'admin-001',
              username: 'admin',
              email: 'admin@alkd-pos.com',
              role: 'admin',
              createdAt: new Date(),
              isActive: true,
            };
            await storeCurrentUser(adminUser);
            await storeUsers([...users, adminUser]);
          } else {
            await storeCurrentUser(adminUser);
          }
          currentUser = adminUser;
        }
        
        if (isMounted) {
          setUser(currentUser);
          setIsLoading(false);
          console.log('Current user loaded:', currentUser?.username || 'No user');
        }
      } catch (error) {
        console.error('Error loading user:', error);
        if (isMounted) {
          setUser(null);
          setIsLoading(false);
        }
      }
    };

    loadUser();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      console.log('Attempting login for username:', username);
      
      const users = await getUsers();
      console.log('Available users:', users.map(u => ({ username: u.username, isActive: u.isActive })));
      
      const foundUser = users.find(u => 
        u.username === username && 
        u.isActive &&
        (username === 'admin' || password === 'password')
      );
      
      console.log('Found user:', foundUser ? foundUser.username : 'None');

      if (foundUser) {
        await storeCurrentUser(foundUser);
        setUser(foundUser);
        console.log('User logged in successfully:', foundUser.username);
        return true;
      }
      
      console.log('Invalid credentials for username:', username);
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    try {
      console.log('Logging out user...');
      await clearCurrentUser();
      setUser(null);
      console.log('User logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, []);

  const isAuthenticated = user !== null;

  return {
    user,
    isLoading,
    login,
    logout,
    isAuthenticated,
  };
};

export { AuthContext };
export type { AuthContextType };
