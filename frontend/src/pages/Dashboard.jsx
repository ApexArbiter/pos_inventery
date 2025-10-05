import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart3,
  ShoppingCart,
  Package,
  Users,
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  CreditCard,
  Boxes,
  ArrowRight,
  Activity,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api/axiosInstance';
import { CardLoader } from '../components/common/LoadingSpinner';
import { PermissionGuard, RoleGuard } from '../components/common/ProtectedRoute';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const { user, hasPermission } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    stats: {
      todayRevenue: 0,
      todayOrders: 0,
      totalCustomers: 0,
      totalProducts: 0,
      lowStockItems: 0,
      outOfStockItems: 0,
    },
    recentActivity: [],
    quickActions: [],
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load dashboard stats based on user permissions
      const promises = [];
      
      if (hasPermission('view_dashboard')) {
        promises.push(api.admin.getStats({ period: '1d' }));
        promises.push(api.revenue.getTodayRevenue());
      }
      
      if (hasPermission('view_reports')) {
        promises.push(api.admin.getRecentActivity({ limit: 5 }));
      }

      const responses = await Promise.allSettled(promises);
      
      // Process responses
      const statsResponse = responses[0];
      const revenueResponse = responses[1];
      const activityResponse = responses[2];
      
      // Merge stats with revenue data
      const stats = statsResponse?.status === 'fulfilled' ? statsResponse.value.data : {};
      const revenue = revenueResponse?.status === 'fulfilled' ? revenueResponse.value.data : {};
      
      setDashboardData({
        stats: {
          ...stats,
          totalRevenue: revenue.totalRevenue || 0,
          totalTransactions: revenue.totalTransactions || 0,
          averageOrderValue: revenue.averageOrderValue || 0,
        },
        recentActivity: activityResponse?.status === 'fulfilled' ? activityResponse.value.data : [],
        quickActions: getQuickActions(),
      });
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getQuickActions = () => {
    const actions = [];
    
    if (hasPermission('process_bills')) {
      actions.push({
        name: 'POS Terminal',
        description: 'Process new sale',
        href: '/pos',
        icon: CreditCard,
        color: 'bg-green-500',
      });
    }
    
    if (hasPermission('manage_inventory')) {
      actions.push({
        name: 'Inventory',
        description: 'Manage stock',
        href: '/inventory',
        icon: Boxes,
        color: 'bg-blue-500',
      });
    }
    
    if (hasPermission('manage_products')) {
      actions.push({
        name: 'Products',
        description: 'Add/edit products',
        href: '/products',
        icon: Package,
        color: 'bg-purple-500',
      });
    }
    
    if (hasPermission('manage_customers')) {
      actions.push({
        name: 'Customers',
        description: 'Manage customers',
        href: '/customers',
        icon: Users,
        color: 'bg-orange-500',
      });
    }

    return actions;
  };

  const statsCards = [
    {
      title: "Total Revenue",
      value: `Rs.${(dashboardData.stats?.totalRevenue || 0).toLocaleString()}`,
      icon: DollarSign,
      color: 'bg-green-500',
      change: null,
      permission: 'view_dashboard',
    },
    {
      title: "Total Orders",
      value: (dashboardData.stats?.totalOrders || 0).toString(),
      icon: ShoppingCart,
      color: 'bg-blue-500',
      change: null,
      permission: 'view_dashboard',
    },
    {
      title: 'Total Customers',
      value: (dashboardData.stats?.totalCustomers || 0).toLocaleString(),
      icon: Users,
      color: 'bg-purple-500',
      change: null,
      permission: 'manage_customers',
    },
    {
      title: 'Total Products',
      value: (dashboardData.stats?.totalProducts || 0).toLocaleString(),
      icon: Package,
      color: 'bg-indigo-500',
      change: null,
      permission: 'manage_products',
    },
    {
      title: 'Low Stock Items',
      value: (dashboardData.stats?.lowStockItems || 0).toString(),
      icon: AlertTriangle,
      color: 'bg-orange-500',
      change: null,
      permission: 'manage_inventory',
    },
    {
      title: 'Out of Stock',
      value: (dashboardData.stats?.outOfStockItems || 0).toString(),
      icon: AlertTriangle,
      color: 'bg-red-500',
      change: null,
      permission: 'manage_inventory',
    },
  ];

  const visibleStatsCards = statsCards.filter(card => 
    !card.permission || hasPermission(card.permission)
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Welcome back, {user?.fullName?.split(' ')[0] || user?.name?.split(' ')[0] || 'User'}! 👋
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Here's what's happening with your store today.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
        {loading ? (
          <CardLoader count={4} />
        ) : (
          visibleStatsCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className={`${stat.color} p-3 rounded-xl`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  {stat.change !== null && (
                    <div className={`flex items-center ${stat.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {stat.change >= 0 ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
                      <span className="text-sm font-medium">
                        {Math.abs(stat.change).toFixed(1)}%
                      </span>
                    </div>
                  )}
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stat.value}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Quick Actions and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Quick Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
            <Activity className="w-5 h-5 mr-2" />
            Quick Actions
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {dashboardData.quickActions?.map((action, index) => {
              const Icon = action.icon;
              return (
                <Link
                  key={index}
                  to={action.href}
                  className="group p-4 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`${action.color} p-2 rounded-lg group-hover:scale-110 transition-transform`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {action.name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {action.description}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                  </div>
                </Link>
              );
            })}
          </div>
          
          {dashboardData.quickActions?.length === 0 && (
            <div className="text-center py-8">
              <Activity className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">
                No quick actions available based on your permissions
              </p>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <PermissionGuard permission="view_reports" fallback={
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
            <div className="text-center py-8">
              <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">
                You don't have permission to view recent activity
              </p>
            </div>
          </div>
        }>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                <BarChart3 className="w-5 h-5 mr-2" />
                Recent Activity
              </h2>
              <Link
                to="/admin"
                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium flex items-center"
              >
                View All
                <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </div>
            
            {loading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-3 animate-pulse">
                    <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : dashboardData.recentActivity?.length > 0 ? (
              <div className="space-y-4">
                {dashboardData.recentActivity?.map((activity, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className={`p-2 rounded-full ${
                      activity.type === 'sale' ? 'bg-green-100 text-green-600' :
                      activity.type === 'inventory' ? 'bg-blue-100 text-blue-600' :
                      activity.type === 'user' ? 'bg-purple-100 text-purple-600' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {activity.type === 'sale' && <ShoppingCart className="w-4 h-4" />}
                      {activity.type === 'inventory' && <Package className="w-4 h-4" />}
                      {activity.type === 'user' && <Users className="w-4 h-4" />}
                      {activity.type === 'system' && <Activity className="w-4 h-4" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {activity.description}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {activity.user} • {new Date(activity.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Activity className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">
                  No recent activity to display
                </p>
              </div>
            )}
          </div>
        </PermissionGuard>
      </div>

      {/* Role-specific sections */}
      <RoleGuard roles={['super_admin', 'store_admin']}>
        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-6 border border-blue-200 dark:border-blue-800">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-200 mb-2">
            Admin Tools
          </h3>
          <p className="text-blue-700 dark:text-blue-300 mb-4">
            Access advanced analytics and system management tools.
          </p>
          <div className="flex space-x-4">
            <Link
              to="/admin"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Admin Dashboard
            </Link>
            <Link
              to="/settings/store"
              className="bg-white text-blue-600 px-4 py-2 rounded-lg border border-blue-300 hover:bg-blue-50 transition-colors"
            >
              Store Settings
            </Link>
          </div>
        </div>
      </RoleGuard>
    </div>
  );
};

export default Dashboard;
