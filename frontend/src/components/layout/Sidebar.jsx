import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  BarChart3,
  ShoppingCart,
  Package,
  Users,
  FileText,
  Settings,
  CreditCard,
  Store,
  UserCheck,
  PieChart,
  Boxes,
  TrendingUp,
  Shield,
  X,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { PermissionGuard, RoleGuard } from '../common/ProtectedRoute';

const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { hasPermission, hasRole } = useAuth();

  // Navigation items configuration
  const navigationItems = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: BarChart3,
      permission: 'view_dashboard',
    },
    {
      name: 'POS Terminal',
      href: '/pos',
      icon: CreditCard,
      permission: 'process_bills',
    },
    {
      name: 'Inventory',
      href: '/inventory',
      icon: Boxes,
      permission: 'manage_inventory',
    },
    {
      name: 'Products',
      href: '/products',
      icon: Package,
      permission: 'manage_products',
    },
    // {
    //   name: 'Customers',
    //   href: '/customers',
    //   icon: Users,
    //   permission: 'manage_customers',
    // },
    {
      name: 'Bill Management',
      href: '/transactions',
      icon: ShoppingCart,
      permissions: ['process_bills', 'view_reports'],
      requireAll: false,
    },
    {
      name: 'Reports',
      href: '/reports',
      icon: TrendingUp,
      permission: 'view_reports',
    },
    {
      name: 'Admin Panel',
      href: '/admin',
      icon: Shield,
      roles: ['super_admin', 'store_admin'],
    },
  ];

  const settingsItems = [
    {
      name: 'Profile',
      href: '/settings/profile',
      icon: UserCheck,
    },
    {
      name: 'Store Settings',
      href: '/settings/store',
      icon: Store,
      roles: ['super_admin', 'store_admin'],
    },
    {
      name: 'System Settings',
      href: '/settings/system',
      icon: Settings,
      roles: ['super_admin'],
    },
  ];

  const isActiveLink = (href) => {
    return location.pathname === href || location.pathname.startsWith(href + '/');
  };

  const renderNavItem = (item) => {
    const isActive = isActiveLink(item.href);
    const Icon = item.icon;

    return (
      <Link
        key={item.name}
        to={item.href}
        onClick={onClose}
        className={`group flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
          isActive
            ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200'
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
        }`}
      >
        <Icon
          className={`mr-3 h-5 w-5 flex-shrink-0 ${
            isActive
              ? 'text-blue-500 dark:text-blue-300'
              : 'text-gray-400 group-hover:text-gray-500 dark:group-hover:text-gray-300'
          }`}
        />
        {item.name}
      </Link>
    );
  };

  const shouldShowItem = (item) => {
    // Check single permission
    if (item.permission && !hasPermission(item.permission)) {
      return false;
    }

    // Check multiple permissions
    if (item.permissions) {
      const hasRequiredPermissions = item.requireAll
        ? item.permissions.every(perm => hasPermission(perm))
        : item.permissions.some(perm => hasPermission(perm));
      
      if (!hasRequiredPermissions) {
        return false;
      }
    }

    // Check roles
    if (item.roles && !item.roles.some(role => hasRole(role))) {
      return false;
    }

    return true;
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <div className="flex flex-col w-64">
          <div className="flex flex-col flex-grow bg-white dark:bg-gray-800 pt-5 pb-4 overflow-y-auto border-r border-gray-200 dark:border-gray-700">
            {/* Logo */}
            <div className="flex items-center flex-shrink-0 px-4 mb-8">
              <div className="flex items-center">
                <div className="bg-blue-600 rounded-lg p-2">
                  <Store className="h-6 w-6 text-white" />
                </div>
                <div className="ml-3">
                  <h1 className="text-lg font-bold text-gray-900 dark:text-white">
                    SuperMarket POS
                  </h1>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Inventory Management
                  </p>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 space-y-1">
              {navigationItems.filter(shouldShowItem).map(renderNavItem)}
              
              {/* Settings Section */}
              <div className="pt-6">
                <h3 className="px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                  Settings
                </h3>
                <div className="space-y-1">
                  {settingsItems.filter(shouldShowItem).map(renderNavItem)}
                </div>
              </div>
            </nav>
          </div>
        </div>
      </div>

      {/* Mobile Sidebar */}
      <div className={`lg:hidden fixed inset-0 z-50 ${isOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={onClose} />
        
        <div className="fixed inset-y-0 left-0 flex flex-col w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
          {/* Mobile Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="bg-blue-600 rounded-lg p-2">
                <Store className="h-6 w-6 text-white" />
              </div>
              <div className="ml-3">
                <h1 className="text-lg font-bold text-gray-900 dark:text-white">
                  SuperMarket POS
                </h1>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Mobile Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
            {navigationItems.filter(shouldShowItem).map(renderNavItem)}
            
            {/* Settings Section */}
            <div className="pt-6">
              <h3 className="px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                Settings
              </h3>
              <div className="space-y-1">
                {settingsItems.filter(shouldShowItem).map(renderNavItem)}
              </div>
            </div>
          </nav>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
