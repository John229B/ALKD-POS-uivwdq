
import { useAuthState } from './useAuth';

export const usePermissions = () => {
  const { user, hasPermission, getAccessibleModules } = useAuthState();

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

  return {
    currentUser: user,
    permissions: user?.permissions || [],
    loading: false,
    hasPermission,
    canView,
    canCreate,
    canEdit,
    canDelete,
    canAccessModule,
    getAccessibleModules,
    refreshPermissions: () => Promise.resolve(), // No-op since auth state handles this
  };
};
