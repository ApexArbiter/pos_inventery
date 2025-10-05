import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Download,
  Calendar,
  Filter,
  RefreshCw,
  DollarSign,
  ShoppingCart,
  Users,
  Package,
} from 'lucide-react';
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
import axiosInstance from '../../api/axiosInstance';
import toast from 'react-hot-toast';

const Reports = () => {
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState('7d');
  const [reportType, setReportType] = useState('sales');
  const [reportData, setReportData] = useState({
    sales: [
      { date: '2024-01-01', sales: 12000 },
      { date: '2024-01-02', sales: 15000 },
      { date: '2024-01-03', sales: 18000 },
      { date: '2024-01-04', sales: 14000 },
      { date: '2024-01-05', sales: 16000 },
    ],
    products: [
      { name: 'Product A', sales: 5000 },
      { name: 'Product B', sales: 4000 },
      { name: 'Product C', sales: 3000 },
      { name: 'Product D', sales: 2000 },
    ],
    customers: [],
    summary: {
      totalSales: 0,
      totalOrders: 0,
      totalCustomers: 0,
      averageOrderValue: 0,
    }
  });

  useEffect(() => {
    loadReportData();
  }, [dateRange, reportType]);

  const loadReportData = async () => {
    try {
      setLoading(true);
      
      // Load different reports based on type
      const promises = [];
      
      if (reportType === 'sales') {
        promises.push(
          axiosInstance.get('/admin/analytics/sales', { params: { period: dateRange } }),
          axiosInstance.get('/admin/analytics/orders', { params: { period: dateRange } })
        );
      } else if (reportType === 'products') {
        promises.push(
          axiosInstance.get('/admin/analytics/products', { params: { period: dateRange } }),
          axiosInstance.get('/inventory/reports/top-products')
        );
      } else if (reportType === 'customers') {
        promises.push(
          axiosInstance.get('/admin/analytics/customers', { params: { period: dateRange } }),
          axiosInstance.get('/customers')
        );
      }

      const responses = await Promise.allSettled(promises);
      
      // Process responses based on report type
      if (reportType === 'sales') {
        const salesResponse = responses[0];
        const ordersResponse = responses[1];
        
        setReportData({
          sales: Array.isArray(salesResponse?.value?.data) ? salesResponse.value.data : [],
          products: [],
          customers: [],
          summary: {
            totalSales: 125000,
            totalOrders: 45,
            totalCustomers: 3,
            averageOrderValue: 2777.78,
          }
        });
      } else if (reportType === 'products') {
        const productsResponse = responses[0];
        const topProductsResponse = responses[1];
        
        setReportData({
          sales: [],
          products: Array.isArray(productsResponse?.value?.data) ? productsResponse.value.data : [],
          customers: [],
          summary: {
            totalSales: 125000,
            totalOrders: 45,
            totalCustomers: 3,
            averageOrderValue: 2777.78,
          }
        });
      } else if (reportType === 'customers') {
        const customersResponse = responses[0];
        const allCustomersResponse = responses[1];
        
        setReportData({
          sales: [],
          products: [],
          customers: Array.isArray(customersResponse?.value?.data) ? customersResponse.value.data : [],
          summary: {
            totalSales: 125000,
            totalOrders: 45,
            totalCustomers: 3,
            averageOrderValue: 2777.78,
          }
        });
      }
    } catch (error) {
      console.error('Failed to load report data:', error);
      toast.error('Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    toast.info('Export feature coming soon');
  };

  const chartColors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00'];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
              <BarChart3 className="w-8 h-8 mr-3 text-blue-600" />
              Reports & Analytics
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Generate detailed reports and analytics for your business
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={loadReportData}
              className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </button>
            <button
              onClick={handleExport}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Report Type
            </label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
            >
              <option value="sales">Sales Reports</option>
              <option value="products">Product Reports</option>
              <option value="customers">Customer Reports</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Date Range
            </label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
            >
              <option value="1d">Today</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="1y">Last Year</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={loadReportData}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center"
            >
              <Filter className="w-4 h-4 mr-2" />
              Generate Report
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-600 dark:text-green-300" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Sales</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                Rs.{reportData.summary.totalSales.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <ShoppingCart className="w-6 h-6 text-blue-600 dark:text-blue-300" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {reportData.summary.totalOrders}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <Users className="w-6 h-6 text-purple-600 dark:text-purple-300" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Customers</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {reportData.summary.totalCustomers}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-lg">
              <TrendingUp className="w-6 h-6 text-orange-600 dark:text-orange-300" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Order Value</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                Rs.{reportData.summary.averageOrderValue.toFixed(0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Sales Trend Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Sales Trend
          </h3>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={reportData.sales}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="sales" stroke="#8884d8" fillOpacity={1} fill="url(#colorSales)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top Products Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Top Products
          </h3>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={reportData.products}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="sales" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Report Tables */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {reportType === 'sales' && 'Sales Report'}
            {reportType === 'products' && 'Product Performance'}
            {reportType === 'customers' && 'Customer Analytics'}
          </h3>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mr-3"></div>
              Loading report data...
            </div>
          ) : (
            <div className="text-center py-8">
              <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">
                {reportType === 'sales' && 'Sales report data will appear here'}
                {reportType === 'products' && 'Product performance data will appear here'}
                {reportType === 'customers' && 'Customer analytics data will appear here'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;


