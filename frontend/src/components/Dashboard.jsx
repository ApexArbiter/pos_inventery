import React, { useState, useEffect } from 'react';
import {
  ShoppingCart,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  TrendingUp,
  Package,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  RefreshCw,
  Users,
  AlertTriangle,
  Calendar,
  PieChart as PieChartIcon,
  BarChart3,
  Target
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  AreaChart, 
  Area,
  BarChart,
  Bar
} from 'recharts';
// FIXED: Use the same axios instance as OrderManagement
import axiosInstance from "../api/axiosInstance";
import toast from 'react-hot-toast';

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [orders, setOrders] = useState([]);
  const [statusCounts, setStatusCounts] = useState({
    pending: 0,
    confirmed: 0,
    preparing: 0,
    ready: 0,
    delivered: 0,
    cancelled: 0,
  });
  const [revenueData, setRevenueData] = useState([]);
  const [dailyOrdersData, setDailyOrdersData] = useState([]);

  // FIXED: Fetch orders using the same endpoint and structure as OrderManagement
  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use the same endpoint structure as OrderManagement
      const response = await axiosInstance.get('/orders', {
        params: {
          page: 1,
          limit: 1000, // Get all orders for accurate metrics
          sortBy: 'createdAt', // FIXED: Use createdAt instead of created_at
          sortOrder: 'desc'
        }
      });

      // FIXED: Use the same response structure as OrderManagement
      const ordersData = response.data.orders || [];
      setOrders(ordersData);
      
      // Use the status counts from the API response if available
      if (response.data.statusCounts) {
        setStatusCounts(response.data.statusCounts);
      } else {
        // Calculate status counts from actual data as fallback
        calculateStatusCounts(ordersData);
      }
      
      // Prepare chart data
      prepareChartData(ordersData);
      
      toast.success('Dashboard data updated successfully!');
      
    } catch (err) {
      console.error('Error fetching orders:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Failed to fetch dashboard data';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Calculate status counts from orders data
  const calculateStatusCounts = (ordersData) => {
    const counts = {
      pending: 0,
      confirmed: 0,
      preparing: 0,
      ready: 0,
      delivered: 0,
      cancelled: 0,
    };

    ordersData.forEach(order => {
      const status = order.status?.toLowerCase();
      if (counts.hasOwnProperty(status)) {
        counts[status]++;
      }
    });

    setStatusCounts(counts);
  };

  // FIXED: Prepare chart data using createdAt instead of created_at
  const prepareChartData = (ordersData) => {
    const last30Days = [];
    const today = new Date();
    
    // Generate last 30 days data
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayOrders = ordersData.filter(order => {
        // FIXED: Use createdAt instead of created_at
        const orderDate = new Date(order.createdAt || order.created_at).toISOString().split('T')[0];
        return orderDate === dateStr;
      });

      // Calculate revenue from confirmed and delivered orders only
      const confirmedOrders = dayOrders.filter(order => 
        ['confirmed', 'delivered'].includes(order.status?.toLowerCase())
      );
      
      const dayRevenue = confirmedOrders.reduce((sum, order) => {
        return sum + (order.finalAmount || order.totalAmount || 0);
      }, 0);

      const dayOrderCount = dayOrders.length;
      const confirmedOrderCount = confirmedOrders.length;

      last30Days.push({
        date: dateStr,
        day: date.getDate(),
        dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        revenue: dayRevenue,
        totalOrders: dayOrderCount,
        confirmedOrders: confirmedOrderCount
      });
    }

    setRevenueData(last30Days.slice(-7)); // Last 7 days for revenue chart
    setDailyOrdersData(last30Days.slice(-14)); // Last 14 days for orders chart
  };

  // Calculate comprehensive metrics
  const calculateMetrics = () => {
    const totalOrders = orders.length;
    const confirmedOrders = statusCounts.confirmed;
    const deliveredOrders = statusCounts.delivered;
    const pendingOrders = statusCounts.pending;
    const cancelledOrders = statusCounts.cancelled;
    const preparingOrders = statusCounts.preparing;
    const readyOrders = statusCounts.ready;
    
    // Calculate revenue from confirmed and delivered orders
    const revenueOrders = orders.filter(order => 
      ['confirmed', 'delivered'].includes(order.status?.toLowerCase())
    );
    
    const totalRevenue = revenueOrders.reduce((sum, order) => {
      return sum + (order.finalAmount || order.totalAmount || 0);
    }, 0);

    // Calculate average order value
    const avgOrderValue = revenueOrders.length > 0 ? totalRevenue / revenueOrders.length : 0;

    // Calculate percentages
    const confirmedPercentage = totalOrders > 0 ? (confirmedOrders / totalOrders * 100) : 0;
    const cancelledPercentage = totalOrders > 0 ? (cancelledOrders / totalOrders * 100) : 0;
    const pendingPercentage = totalOrders > 0 ? (pendingOrders / totalOrders * 100) : 0;
    const deliveredPercentage = totalOrders > 0 ? (deliveredOrders / totalOrders * 100) : 0;

    // FIXED: Calculate today's metrics using createdAt
    const today = new Date().toISOString().split('T')[0];
    const todayOrders = orders.filter(order => {
      const orderDate = new Date(order.createdAt || order.created_at).toISOString().split('T')[0];
      return orderDate === today;
    });
    
    const todayRevenue = todayOrders
      .filter(order => ['confirmed', 'delivered'].includes(order.status?.toLowerCase()))
      .reduce((sum, order) => sum + (order.finalAmount || order.totalAmount || 0), 0);

    return {
      totalOrders,
      confirmedOrders,
      deliveredOrders,
      pendingOrders,
      cancelledOrders,
      preparingOrders,
      readyOrders,
      totalRevenue,
      avgOrderValue,
      confirmedPercentage,
      cancelledPercentage,
      pendingPercentage,
      deliveredPercentage,
      todayOrders: todayOrders.length,
      todayRevenue
    };
  };

  const metrics = calculateMetrics();

  // Order status distribution for pie chart
  const orderStatusData = [
    { name: 'Confirmed', value: statusCounts.confirmed, color: '#10B981', percentage: metrics.confirmedPercentage },
    { name: 'Pending', value: statusCounts.pending, color: '#F59E0B', percentage: metrics.pendingPercentage },
    { name: 'Preparing', value: statusCounts.preparing, color: '#F97316', percentage: (statusCounts.preparing / metrics.totalOrders * 100) || 0 },
    { name: 'Ready', value: statusCounts.ready, color: '#06B6D4', percentage: (statusCounts.ready / metrics.totalOrders * 100) || 0 },
    { name: 'Delivered', value: statusCounts.delivered, color: '#8B5CF6', percentage: metrics.deliveredPercentage },
    { name: 'Cancelled', value: statusCounts.cancelled, color: '#EF4444', percentage: metrics.cancelledPercentage }
  ].filter(item => item.value > 0);

  // Load data on component mount
  useEffect(() => {
    fetchOrders();
  }, []);

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900 text-white p-3 rounded-lg shadow-lg border border-gray-700">
          <p className="font-medium">{`Date: ${label}`}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }}>
              {`${entry.dataKey}: ${entry.dataKey.includes('revenue') ? '£' : ''}${entry.value.toLocaleString()}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading && orders.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-blue-900 dark:to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-transparent border-t-orange-500 border-r-orange-400 mx-auto mb-4"></div>
          </div>
          <p className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">Loading Dashboard</p>
          <p className="text-gray-500 dark:text-gray-400">Fetching your restaurant data...</p>
        </div>
      </div>
    );
  }

  if (error && orders.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 dark:from-gray-900 dark:to-red-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-red-200 dark:border-red-800">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="font-bold text-lg mb-3 text-gray-900 dark:text-white">Connection Failed</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
            <button
              onClick={fetchOrders}
              className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-6 py-3 rounded-xl flex items-center mx-auto transition-all duration-300"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry Connection
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-blue-900 dark:to-indigo-900">
      <div className="max-w-7xl mx-auto space-y-6 p-6">
        
        {/* Header */}
        <div className="text-center mb-8">
         
          
          <button
            onClick={fetchOrders}
            disabled={loading}
            className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-6 py-3 rounded-xl flex items-center mx-auto font-semibold shadow-lg transition-all duration-300 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Refreshing...' : 'Refresh Data'}
          </button>
        </div>

        {/* Main Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Orders */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium mb-1">Total Orders</p>
                <p className="text-3xl font-bold">{metrics.totalOrders.toLocaleString()}</p>
                <p className="text-blue-200 text-xs">All orders</p>
              </div>
              <div className="bg-white/20 p-3 rounded-xl">
                <ShoppingCart className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Total Revenue */}
          <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium mb-1">Total Revenue</p>
                <p className="text-3xl font-bold">£{metrics.totalRevenue.toLocaleString()}</p>
                <p className="text-green-200 text-xs">Confirmed & delivered</p>
              </div>
              <div className="bg-white/20 p-3 rounded-xl">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Confirmed Orders */}
          <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-sm font-medium mb-1">Confirmed Orders</p>
                <p className="text-3xl font-bold">{metrics.confirmedOrders.toLocaleString()}</p>
                <p className="text-emerald-200 text-xs">{metrics.confirmedPercentage.toFixed(1)}% of total</p>
              </div>
              <div className="bg-white/20 p-3 rounded-xl">
                <CheckCircle className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Pending Orders */}
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium mb-1">Pending Orders</p>
                <p className="text-3xl font-bold">{metrics.pendingOrders.toLocaleString()}</p>
                <p className="text-orange-200 text-xs">{metrics.pendingPercentage.toFixed(1)}% of total</p>
              </div>
              <div className="bg-white/20 p-3 rounded-xl">
                <Clock className="w-6 h-6" />
              </div>
            </div>
          </div>
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Cancelled Orders */}
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 dark:border-gray-700/20">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-xl">
                <XCircle className="w-6 h-6 text-red-500" />
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{metrics.cancelledOrders}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Cancelled Orders</p>
              </div>
            </div>
            <div className="flex items-center">
              <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mr-3">
                <div 
                  className="bg-red-500 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${Math.min(metrics.cancelledPercentage, 100)}%` }}
                ></div>
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {metrics.cancelledPercentage.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Average Order Value */}
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 dark:border-gray-700/20">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-purple-100 dark:bg-purple-900/30 p-3 rounded-xl">
                <Target className="w-6 h-6 text-purple-500" />
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">£{metrics.avgOrderValue.toFixed(2)}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Avg Order Value</p>
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Based on paid orders</p>
          </div>

          {/* Today's Orders */}
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 dark:border-gray-700/20">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-indigo-100 dark:bg-indigo-900/30 p-3 rounded-xl">
                <Calendar className="w-6 h-6 text-indigo-500" />
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{metrics.todayOrders}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Today's Orders</p>
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">£{metrics.todayRevenue.toFixed(2)} revenue</p>
          </div>

          {/* Orders in Progress */}
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 dark:border-gray-700/20">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-yellow-100 dark:bg-yellow-900/30 p-3 rounded-xl">
                <Activity className="w-6 h-6 text-yellow-500" />
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {metrics.preparingOrders}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">In Progress</p>
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {metrics.preparingOrders} preparing
            </p>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
          
          {/* Revenue Chart */}
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 dark:border-gray-700/20">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Daily Revenue</h3>
                <p className="text-gray-500 dark:text-gray-400">Last 7 days</p>
              </div>
              <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-3 rounded-xl">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" opacity={0.3} />
                <XAxis 
                  dataKey="dayName" 
                  stroke="#6B7280" 
                  fontSize={12}
                />
                <YAxis 
                  stroke="#6B7280" 
                  fontSize={12}
                  tickFormatter={(value) => `£${value}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#10B981" 
                  strokeWidth={3}
                  fill="url(#revenueGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Order Status Distribution */}
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 dark:border-gray-700/20">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Order Status</h3>
                <p className="text-gray-500 dark:text-gray-400">Distribution by status</p>
              </div>
              <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-3 rounded-xl">
                <PieChartIcon className="w-6 h-6 text-white" />
              </div>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={orderStatusData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={40}
                  dataKey="value"
                  label={({name, percentage}) => `${name}: ${percentage.toFixed(1)}%`}
                  labelLine={false}
                  fontSize={12}
                >
                  {orderStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value, name) => [value, name]}
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: 'none',
                    borderRadius: '12px',
                    color: '#fff'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Daily Orders Bar Chart */}
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 dark:border-gray-700/20 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Daily Order Volume</h3>
              <p className="text-gray-500 dark:text-gray-400">Last 14 days</p>
            </div>
            <div className="bg-gradient-to-r from-indigo-500 to-purple-500 p-3 rounded-xl">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dailyOrdersData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" opacity={0.3} />
              <XAxis 
                dataKey="day" 
                stroke="#6B7280" 
                fontSize={12}
              />
              <YAxis 
                stroke="#6B7280" 
                fontSize={12}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="totalOrders" fill="#8B5CF6" radius={4} name="Total Orders" />
              <Bar dataKey="confirmedOrders" fill="#10B981" radius={4} name="Confirmed Orders" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Status Details Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Object.entries(statusCounts).map(([status, count]) => {
            const percentage = metrics.totalOrders > 0 ? (count / metrics.totalOrders * 100) : 0;
            const colors = {
              pending: 'bg-yellow-500',
              confirmed: 'bg-green-500',
              preparing: 'bg-orange-500',
              ready: 'bg-blue-500',
              delivered: 'bg-purple-500',
              cancelled: 'bg-red-500'
            };
            
            return (
              <div key={status} className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-white/20 dark:border-gray-700/20">
                <div className="text-center">
                  <div className={`w-3 h-3 ${colors[status]} rounded-full mx-auto mb-2`}></div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{count}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{status}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{percentage.toFixed(1)}%</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;