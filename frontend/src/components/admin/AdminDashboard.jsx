import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Users,
  Package,
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  Calendar,
  Clock,
  Activity,
  Target,
  Award,
  Bell,
  Settings,
  Download,
  Filter,
  RefreshCw,
} from 'lucide-react';
import axiosInstance from '../../api/axiosInstance';
import toast from 'react-hot-toast';
import ProductManagement from './ProductManagement';
import CustomerManagement from './CustomerManagement';
import BillManagement from './TransactionManagement';
import Reports from './Reports';
import Profile from './Profile';
import StoreSettings from './StoreSettings';
import SystemSettings from './SystemSettings';
import ReturnManagement from './ReturnManagement';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  BarChart, 
  Bar,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
} from 'recharts';

const AdminDashboard = () => {
  // State management
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState('7d'); // 1d, 7d, 30d, 90d, 1y
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, products, customers, bills, reports, returns, profile, store, system
  const [dashboardData, setDashboardData] = useState({
    stats: {
      totalRevenue: 0,
      totalOrders: 0,
      totalCustomers: 0,
      totalProducts: 0,
      activeUsers: 0,
      lowStockItems: 0,
      todayRevenue: 0,
      todayOrders: 0,
    },
    charts: {
      salesTrend: [],
      ordersTrend: [],
      topProducts: [],
      categoryDistribution: [],
      paymentMethods: [],
      hourlyActivity: [],
    },
    recentActivity: [],
    alerts: [],
    performance: {
      conversionRate: 0,
      averageOrderValue: 0,
      customerRetention: 0,
      inventoryTurnover: 0,
    }
  });

  // Load dashboard data on component mount
  useEffect(() => {
    loadDashboardData();
  }, [dateRange]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Make parallel requests for different dashboard sections
      const [
        statsResponse,
        salesResponse,
        ordersResponse,
        productsResponse,
        customersResponse,
        activityResponse,
        alertsResponse,
        performanceResponse,
      ] = await Promise.all([
        axiosInstance.get(`/admin/stats?period=${dateRange}`),
        axiosInstance.get(`/admin/analytics/sales?period=${dateRange}`),
        axiosInstance.get(`/admin/analytics/orders?period=${dateRange}`),
        axiosInstance.get(`/admin/analytics/products?period=${dateRange}`),
        axiosInstance.get(`/admin/analytics/customers?period=${dateRange}`),
        axiosInstance.get(`/admin/activity/recent?limit=10`),
        axiosInstance.get(`/admin/alerts`),
        axiosInstance.get(`/admin/performance?period=${dateRange}`),
      ]);

      setDashboardData({
        stats: statsResponse.data.stats || {},
        charts: {
          salesTrend: salesResponse.data.trend || [],
          ordersTrend: ordersResponse.data.trend || [],
          topProducts: productsResponse.data.topProducts || [],
          categoryDistribution: productsResponse.data.categoryDistribution || [],
          paymentMethods: ordersResponse.data.paymentMethods || [],
          hourlyActivity: activityResponse.data.hourlyData || [],
        },
        recentActivity: activityResponse.data.activities || [],
        alerts: alertsResponse.data.alerts || [],
        performance: performanceResponse.data.performance || {},
      });
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
    toast.success('Dashboard data refreshed');
  };

  const exportReport = async () => {
    try {
      const response = await axiosInstance.get(`/admin/reports/export?period=${dateRange}&format=csv`, {
        responseType: 'blob',
      });
      
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `admin-report-${dateRange}-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
      
      toast.success('Report exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export report');
    }
  };

  // Format currency
  const formatCurrency = (amount) => `Rs.${parseFloat(amount).toLocaleString()}`;

  // Calculate percentage change
  const getPercentageChange = (current, previous) => {
    if (!previous) return 0;
    return ((current - previous) / previous) * 100;
  };

  // Stats cards configuration
  const statsCards = [
    {
      title: 'Total Revenue',
      value: formatCurrency(dashboardData.stats.totalRevenue || 0),
      icon: DollarSign,
      color: 'bg-green-500',
      change: getPercentageChange(dashboardData.stats.totalRevenue, dashboardData.stats.previousRevenue),
      subtext: `Today: ${formatCurrency(dashboardData.stats.todayRevenue || 0)}`,
    },
    {
      title: 'Total Orders',
      value: (dashboardData.stats.totalOrders || 0).toLocaleString(),
      icon: ShoppingCart,
      color: 'bg-blue-500',
      change: getPercentageChange(dashboardData.stats.totalOrders, dashboardData.stats.previousOrders),
      subtext: `Today: ${dashboardData.stats.todayOrders || 0}`,
    },
    {
      title: 'Total Customers',
      value: (dashboardData.stats.totalCustomers || 0).toLocaleString(),
      icon: Users,
      color: 'bg-purple-500',
      change: getPercentageChange(dashboardData.stats.totalCustomers, dashboardData.stats.previousCustomers),
      subtext: `Active: ${dashboardData.stats.activeCustomers || 0}`,
    },
    {
      title: 'Products',
      value: (dashboardData.stats.totalProducts || 0).toLocaleString(),
      icon: Package,
      color: 'bg-orange-500',
      change: getPercentageChange(dashboardData.stats.totalProducts, dashboardData.stats.previousProducts),
      subtext: `Low Stock: ${dashboardData.stats.lowStockItems || 0}`,
    },
    {
      title: 'Avg Order Value',
      value: formatCurrency(dashboardData.performance.averageOrderValue || 0),
      icon: Target,
      color: 'bg-indigo-500',
      change: getPercentageChange(dashboardData.performance.averageOrderValue, dashboardData.performance.previousAOV),
      subtext: 'Per transaction',
    },
    {
      title: 'Conversion Rate',
      value: `${(dashboardData.performance.conversionRate || 0).toFixed(1)}%`,
      icon: TrendingUp,
      color: 'bg-pink-500',
      change: getPercentageChange(dashboardData.performance.conversionRate, dashboardData.performance.previousConversion),
      subtext: 'Visitor to sale',
    },
    {
      title: 'Active Users',
      value: (dashboardData.stats.activeUsers || 0).toLocaleString(),
      icon: Activity,
      color: 'bg-cyan-500',
      change: getPercentageChange(dashboardData.stats.activeUsers, dashboardData.stats.previousActiveUsers),
      subtext: 'Last 30 days',
    },
    {
      title: 'Customer Retention',
      value: `${(dashboardData.performance.customerRetention || 0).toFixed(1)}%`,
      icon: Award,
      color: 'bg-emerald-500',
      change: getPercentageChange(dashboardData.performance.customerRetention, dashboardData.performance.previousRetention),
      subtext: 'Repeat customers',
    },
  ];

  // Chart colors
  const chartColors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#F97316', '#84CC16'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-blue-900 p-6">
      
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
              <BarChart3 className="w-8 h-8 mr-3 text-blue-600" />
              Admin Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Monitor your store performance and manage operations
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Date Range Selector */}
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 dark:bg-gray-700 dark:text-white"
            >
              <option value="1d">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="1y">Last Year</option>
            </select>
            
            <button
              onClick={exportReport}
              className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors flex items-center"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </button>
            
            <button
              onClick={refreshData}
              disabled={refreshing}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Alerts */}
        {dashboardData.alerts.length > 0 && (
          <div className="mb-6">
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-4 rounded-lg">
              <div className="flex items-center">
                <AlertTriangle className="w-5 h-5 text-yellow-400 mr-2" />
                <p className="text-yellow-700 dark:text-yellow-300 font-medium">
                  {dashboardData.alerts.length} alert{dashboardData.alerts.length > 1 ? 's' : ''} require attention
                </p>
              </div>
              <ul className="mt-2 text-sm text-yellow-600 dark:text-yellow-400 space-y-1">
                {dashboardData.alerts.slice(0, 3).map((alert, index) => (
                  <li key={index}>• {alert.message}</li>
                ))}
                {dashboardData.alerts.length > 3 && (
                  <li>• And {dashboardData.alerts.length - 3} more...</li>
                )}
              </ul>
            </div>
          </div>
        )}
      </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-2 sm:space-x-8 overflow-x-auto scrollbar-hide">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`py-2 px-2 sm:px-4 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap flex items-center ${
                  activeTab === 'dashboard'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Dashboard</span>
                <span className="sm:hidden">Home</span>
              </button>
              <button
                onClick={() => setActiveTab('products')}
                className={`py-2 px-2 sm:px-4 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap flex items-center ${
                  activeTab === 'products'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <Package className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                Products
              </button>
              <button
                onClick={() => setActiveTab('customers')}
                className={`py-2 px-2 sm:px-4 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap flex items-center ${
                  activeTab === 'customers'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <Users className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                Customers
              </button>
              <button
                onClick={() => setActiveTab('bills')}
                className={`py-2 px-2 sm:px-4 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap flex items-center ${
                  activeTab === 'bills'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <ShoppingCart className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Bill Management</span>
                <span className="sm:hidden">Bills</span>
              </button>
              <button
                onClick={() => setActiveTab('returns')}
                className={`py-2 px-2 sm:px-4 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap flex items-center ${
                  activeTab === 'returns'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Returns</span>
                <span className="sm:hidden">Returns</span>
              </button>
              <button
                onClick={() => setActiveTab('reports')}
                className={`py-2 px-2 sm:px-4 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap flex items-center ${
                  activeTab === 'reports'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                Reports
              </button>
              <button
                onClick={() => setActiveTab('profile')}
                className={`py-2 px-2 sm:px-4 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap flex items-center ${
                  activeTab === 'profile'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <Users className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                Profile
              </button>
              <button
                onClick={() => setActiveTab('store')}
                className={`py-2 px-2 sm:px-4 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap flex items-center ${
                  activeTab === 'store'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <Settings className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Store Settings</span>
                <span className="sm:hidden">Store</span>
              </button>
              <button
                onClick={() => setActiveTab('system')}
                className={`py-2 px-2 sm:px-4 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap flex items-center ${
                  activeTab === 'system'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <Settings className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">System Settings</span>
                <span className="sm:hidden">System</span>
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'products' ? (
          <ProductManagement />
        ) : activeTab === 'customers' ? (
          <CustomerManagement />
        ) : activeTab === 'bills' ? (
          <BillManagement />
        ) : activeTab === 'returns' ? (
          <ReturnManagement />
        ) : activeTab === 'reports' ? (
          <Reports />
        ) : activeTab === 'profile' ? (
          <Profile />
        ) : activeTab === 'store' ? (
          <StoreSettings />
        ) : activeTab === 'system' ? (
          <SystemSettings />
        ) : (
        <>
          {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statsCards.map((stat, index) => {
          const Icon = stat.icon;
          const isPositive = stat.change >= 0;
          
          return (
            <div key={index} className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className={`${stat.color} p-3 rounded-xl`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                {stat.change !== undefined && (
                  <div className={`flex items-center ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                    {isPositive ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
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
                <p className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {stat.value}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {stat.subtext}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        
        {/* Sales Trend */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Sales Trend
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={dashboardData.charts.salesTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12, fill: '#6B7280' }}
                tickFormatter={(value) => new Date(value).toLocaleDateString()}
              />
              <YAxis tick={{ fontSize: 12, fill: '#6B7280' }} />
              <Tooltip 
                formatter={(value) => [formatCurrency(value), 'Revenue']}
                labelFormatter={(label) => new Date(label).toLocaleDateString()}
                contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }}
              />
              <Area 
                type="monotone" 
                dataKey="revenue" 
                stroke="#3B82F6" 
                fill="#3B82F6" 
                fillOpacity={0.3}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Orders Trend */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Orders Trend
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dashboardData.charts.ordersTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12, fill: '#6B7280' }}
                tickFormatter={(value) => new Date(value).toLocaleDateString()}
              />
              <YAxis tick={{ fontSize: 12, fill: '#6B7280' }} />
              <Tooltip 
                formatter={(value) => [value, 'Orders']}
                labelFormatter={(label) => new Date(label).toLocaleDateString()}
                contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }}
              />
              <Line 
                type="monotone" 
                dataKey="orders" 
                stroke="#10B981" 
                strokeWidth={3}
                dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#10B981', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Top Products */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Top Products
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dashboardData.charts.topProducts} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
              <XAxis type="number" tick={{ fontSize: 12, fill: '#6B7280' }} />
              <YAxis 
                dataKey="name" 
                type="category" 
                tick={{ fontSize: 12, fill: '#6B7280' }}
                width={100}
              />
              <Tooltip 
                formatter={(value) => [value, 'Sales']}
                contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }}
              />
              <Bar 
                dataKey="sales" 
                fill="#F59E0B"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Payment Methods Distribution */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Payment Methods
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={dashboardData.charts.paymentMethods}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {dashboardData.charts.paymentMethods.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value) => [value, 'Bills']}
                contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activity & Category Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <Activity className="w-5 h-5 mr-2" />
            Recent Activity
          </h3>
          
          {dashboardData.recentActivity.length > 0 ? (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {dashboardData.recentActivity.map((activity, index) => (
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
                    {activity.type === 'system' && <Settings className="w-4 h-4" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {activity.description}
                    </p>
                    <div className="flex items-center space-x-4 mt-1">
                      <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {new Date(activity.timestamp).toLocaleTimeString()}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                        <User className="w-3 h-3 mr-1" />
                        {activity.user}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Activity className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">No recent activity</p>
            </div>
          )}
        </div>

        {/* Category Distribution */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Category Sales
          </h3>
          
          {dashboardData.charts.categoryDistribution.length > 0 ? (
            <div className="space-y-3">
              {dashboardData.charts.categoryDistribution.map((category, index) => {
                const percentage = (category.value / dashboardData.charts.categoryDistribution.reduce((sum, cat) => sum + cat.value, 0)) * 100;
                
                return (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {category.name}
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {formatCurrency(category.value)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: chartColors[index % chartColors.length],
                        }}
                      />
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {percentage.toFixed(1)}% of total sales
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">No category data</p>
            </div>
          )}
        </div>
      </div>
        </>
      )}
    </div>
  );
};

export default AdminDashboard;
