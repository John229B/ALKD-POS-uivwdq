
import { useState, useEffect } from 'react';
import { Employee, Permission } from '../types';
import { getCurrentEmployee } from '../utils/storage';

export const usePermissions = () => {
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCurrentEmployee();
  }, []);

  const loadCurrentEmployee = async () => {
    try {
      setLoading(true);
      const employee = await getCurrentEmployee();
      setCurrentEmployee(employee);
      setPermissions(employee?.permissions || []);
    } catch (error) {
      console.error('Error loading current employee:', error);
    } finally {
      setLoading(false);
    }
  };

  const hasPermission = (module: string, action: string): boolean => {
    if (!currentEmployee) return false;
    
    // Admin has all permissions
    if (currentEmployee.role === 'admin') return true;
    
    // Check specific permissions
    return permissions.some(permission => 
      permission.module === module && permission.actions.includes(action as any)
    );
  };

  const canView = (module: string): boolean => hasPermission(module, 'view');
  const canCreate = (module: string): boolean => hasPermission(module, 'create');
  const canEdit = (module: string): boolean => hasPermission(module, 'edit');
  const canDelete = (module: string): boolean => hasPermission(module, 'delete');

  const canAccessModule = (module: string): boolean => {
    return hasPermission(module, 'view') || 
           hasPermission(module, 'create') || 
           hasPermission(module, 'edit') || 
           hasPermission(module, 'delete');
  };

  const getAccessibleModules = (): string[] => {
    if (!currentEmployee) return [];
    
    if (currentEmployee.role === 'admin') {
      return ['dashboard', 'pos', 'products', 'customers', 'reports', 'settings', 'employees', 'printers', 'tickets'];
    }
    
    const modules = new Set<string>();
    permissions.forEach(permission => {
      modules.add(permission.module);
    });
    
    return Array.from(modules);
  };

  return {
    currentEmployee,
    permissions,
    loading,
    hasPermission,
    canView,
    canCreate,
    canEdit,
    canDelete,
    canAccessModule,
    getAccessibleModules,
    refreshPermissions: loadCurrentEmployee,
  };
};
