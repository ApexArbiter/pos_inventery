import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';
import toast from 'react-hot-toast';

const ProtectedRoute = ({ 
  children, 
  requiredRole = null, 
  requiredPermission = null, 
  requiredPermissions = [], 
  requireAllPermissions = false,
  fallbackPath = '/login',
  showUnauthorizedMessage = true 
}) => {
  const { isAuthenticated, isLoading, user, hasRole, hasPermission } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to={fallbackPath} state={{ from: location }} replace />;
  }

  // Check role requirement
  if (requiredRole && !hasRole(requiredRole)) {
    if (showUnauthorizedMessage) {
      toast.error(`Access denied. Required role: ${Array.isArray(requiredRole) ? requiredRole.join(' or ') : requiredRole}`);
    }
    return <Navigate to="/unauthorized" replace />;
  }

  // Check single permission requirement
  if (requiredPermission && !hasPermission(requiredPermission)) {
    if (showUnauthorizedMessage) {
      toast.error(`Access denied. Required permission: ${requiredPermission}`);
    }
    return <Navigate to="/unauthorized" replace />;
  }

  // Check multiple permissions requirement
  if (requiredPermissions.length > 0) {
    const hasRequiredPermissions = requireAllPermissions
      ? requiredPermissions.every(permission => hasPermission(permission))
      : requiredPermissions.some(permission => hasPermission(permission));

    if (!hasRequiredPermissions) {
      if (showUnauthorizedMessage) {
        const operator = requireAllPermissions ? 'all of' : 'one of';
        toast.error(`Access denied. Required ${operator}: ${requiredPermissions.join(', ')}`);
      }
      return <Navigate to="/unauthorized" replace />;
    }
  }

  // If all checks pass, render the protected component
  return children;
};

// Higher-order component for role-based protection
export const withRoleProtection = (Component, requiredRole) => {
  return (props) => (
    <ProtectedRoute requiredRole={requiredRole}>
      <Component {...props} />
    </ProtectedRoute>
  );
};

// Higher-order component for permission-based protection
export const withPermissionProtection = (Component, requiredPermission) => {
  return (props) => (
    <ProtectedRoute requiredPermission={requiredPermission}>
      <Component {...props} />
    </ProtectedRoute>
  );
};

// Specific route protection components
export const AdminRoute = ({ children }) => (
  <ProtectedRoute requiredRole={['super_admin', 'store_admin']}>
    {children}
  </ProtectedRoute>
);

export const SuperAdminRoute = ({ children }) => (
  <ProtectedRoute requiredRole="super_admin">
    {children}
  </ProtectedRoute>
);

export const StoreAdminRoute = ({ children }) => (
  <ProtectedRoute requiredRole={['super_admin', 'store_admin']}>
    {children}
  </ProtectedRoute>
);

export const BillingStaffRoute = ({ children }) => (
  <ProtectedRoute 
    requiredRole={['super_admin', 'store_admin', 'billing_staff']}
    requiredPermission="process_bills"
  >
    {children}
  </ProtectedRoute>
);

export const InventoryStaffRoute = ({ children }) => (
  <ProtectedRoute 
    requiredRole={['super_admin', 'store_admin', 'inventory_staff']}
    requiredPermission="manage_inventory"
  >
    {children}
  </ProtectedRoute>
);

// Component to conditionally render content based on permissions
export const PermissionGuard = ({ 
  permission, 
  permissions = [], 
  requireAll = false, 
  role = null, 
  fallback = null, 
  children 
}) => {
  const { hasPermission, hasRole } = useAuth();

  // Check role if specified
  if (role && !hasRole(role)) {
    return fallback;
  }

  // Check single permission
  if (permission && !hasPermission(permission)) {
    return fallback;
  }

  // Check multiple permissions
  if (permissions.length > 0) {
    const hasRequiredPermissions = requireAll
      ? permissions.every(perm => hasPermission(perm))
      : permissions.some(perm => hasPermission(perm));

    if (!hasRequiredPermissions) {
      return fallback;
    }
  }

  return children;
};

// Component to conditionally render content based on roles
export const RoleGuard = ({ role, roles = [], fallback = null, children }) => {
  const { hasRole } = useAuth();

  // Check single role
  if (role && !hasRole(role)) {
    return fallback;
  }

  // Check multiple roles
  if (roles.length > 0 && !roles.some(r => hasRole(r))) {
    return fallback;
  }

  return children;
};

export default ProtectedRoute;
