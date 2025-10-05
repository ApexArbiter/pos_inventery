import React, { useState, useEffect } from 'react';
import {
  Package,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  BarChart3,
  Boxes,
  ShoppingCart,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Eye,
  Edit,
  Trash2,
  Minus,
  Clock,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import axiosInstance from '../../api/axiosInstance';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

const InventoryDashboard = () => {
  // State management
  const [inventoryData, setInventoryData] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, low_stock, out_of_stock, good
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalValue: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
    recentMovements: [],
    topProducts: [],
  });
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [showStockModal, setShowStockModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [stockAction, setStockAction] = useState('add'); // 'add' or 'remove'
  const [stockQuantity, setStockQuantity] = useState('');
  const [stockReason, setStockReason] = useState('');
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [stockHistory, setStockHistory] = useState([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editStock, setEditStock] = useState('');
  const [editReason, setEditReason] = useState('');

  // Load data on component mount
  useEffect(() => {
    loadInventoryData();
    loadStats();
  }, []);

  // Search and filter
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      filterInventory();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, filterStatus]);

  const loadInventoryData = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/inventory/levels');
      
      if (response.data.success) {
        setInventoryData(response.data.data || []);
      }
    } catch (error) {
      console.error('Failed to load inventory:', error);
      toast.error('Failed to load inventory data');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const [valueResponse, movementsResponse, topProductsResponse] = await Promise.all([
        axiosInstance.get('/inventory/value'),
        axiosInstance.get('/inventory/movements/recent'),
        axiosInstance.get('/inventory/reports/top-products'),
      ]);

      setStats({
        totalProducts: inventoryData?.length || 0,
        totalValue: valueResponse.data.totalValue || 0,
        lowStockItems: inventoryData?.filter(item => item.isLowStock).length || 0,
        outOfStockItems: inventoryData?.filter(item => item.isOutOfStock).length || 0,
        recentMovements: movementsResponse.data.movements || [],
        topProducts: topProductsResponse.data.products || [],
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const filterInventory = async () => {
    try {
      setLoading(true);
      
      const params = {};
      
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }
      
      if (filterStatus !== 'all') {
        params.status = filterStatus;
      }

      const response = await axiosInstance.get('/inventory/levels', { params });
      
      if (response.data.success) {
        setInventoryData(response.data.data || []);
      }
    } catch (error) {
      console.error('Filter error:', error);
      toast.error('Failed to filter inventory');
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await Promise.all([loadInventoryData(), loadStats()]);
    setRefreshing(false);
    toast.success('Data refreshed');
  };

  const getStockStatus = (item) => {
    if (item.isOutOfStock) {
      return { 
        status: 'Out of Stock', 
        color: 'text-red-600 bg-red-100', 
        icon: AlertTriangle 
      };
    } else if (item.isLowStock) {
      return { 
        status: 'Low Stock', 
        color: 'text-orange-600 bg-orange-100', 
        icon: AlertTriangle 
      };
    } else {
      return { 
        status: 'In Stock', 
        color: 'text-green-600 bg-green-100', 
        icon: Package 
      };
    }
  };

  const getMovementIcon = (type) => {
    switch (type) {
      case 'purchase':
      case 'adjustment_increase':
        return <ArrowUpRight className="w-4 h-4 text-green-600" />;
      case 'sale':
      case 'adjustment_decrease':
        return <ArrowDownRight className="w-4 h-4 text-red-600" />;
      case 'transfer_in':
        return <ArrowUpRight className="w-4 h-4 text-blue-600" />;
      case 'transfer_out':
        return <ArrowDownRight className="w-4 h-4 text-blue-600" />;
      default:
        return <RefreshCw className="w-4 h-4 text-gray-600" />;
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedItems.length === 0) {
      toast.error('Please select items first');
      return;
    }

    // Handle different bulk actions
    switch (action) {
      case 'export':
        exportSelectedItems();
        break;
      case 'update_reorder':
        // Open bulk reorder point update modal
        break;
      case 'mark_counted':
        // Mark as counted in inventory
        break;
      default:
        toast.error('Action not implemented yet');
    }
  };

  const exportSelectedItems = () => {
    const selectedData = inventoryData?.filter(item => selectedItems.includes(item._id)) || [];
    const csvContent = [
      ['Product Name', 'Barcode', 'Current Stock', 'Reorder Point', 'Value', 'Status'],
      ...selectedData.map(item => [
        item.productDetails?.productName || 'N/A',
        item.productDetails?.barcode || 'N/A',
        item.currentStock,
        item.reorderPoint,
        `Rs.${(item.currentStock * (item.productDetails?.costPrice || 0)).toFixed(2)}`,
        getStockStatus(item).status,
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `inventory-export-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
    
    toast.success('Inventory data exported');
  };

  const toggleItemSelection = (itemId) => {
    setSelectedItems(prev => 
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const selectAllItems = () => {
    if (selectedItems.length === inventoryData?.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(inventoryData?.map(item => item._id) || []);
    }
  };

  const handleViewProduct = (productId) => {
    // Navigate to product details or show modal
    console.log('View product:', productId);
    toast.info('View product functionality - coming soon');
  };

  const handleEditInventory = (inventoryItem) => {
    setSelectedProduct(inventoryItem);
    setEditStock(inventoryItem.currentStock.toString());
    setEditReason('');
    setShowEditModal(true);
  };

  const handleEditStock = async () => {
    if (!editStock || isNaN(editStock) || editStock < 0) {
      toast.error('Please enter a valid stock level');
      return;
    }

    if (!editReason.trim()) {
      toast.error('Please enter a reason for this adjustment');
      return;
    }

    try {
      const newStock = parseInt(editStock);
      const adjustment = newStock - selectedProduct.currentStock;
      
      await axiosInstance.post('/inventory/adjust', {
        productId: selectedProduct.productId,
        adjustment: adjustment,
        reason: editReason,
        reference: 'Manual edit'
      });

      toast.success('Stock updated successfully');
      setShowEditModal(false);
      loadInventoryData(); // Refresh data
    } catch (error) {
      console.error('Error updating stock:', error);
      toast.error('Failed to update stock');
    }
  };

  // Stock management functions
  const openStockModal = (product, action = 'add') => {
    setSelectedProduct(product);
    setStockAction(action);
    setStockQuantity('');
    setStockReason('');
    setShowStockModal(true);
  };

  const handleStockAdjustment = async () => {
    if (!stockQuantity || isNaN(stockQuantity) || stockQuantity <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }

    if (!stockReason.trim()) {
      toast.error('Please enter a reason for this adjustment');
      return;
    }

    try {
      const adjustment = stockAction === 'add' ? parseInt(stockQuantity) : -parseInt(stockQuantity);
      
      await axiosInstance.post('/inventory/adjust', {
        productId: selectedProduct.productId,
        adjustment: adjustment,
        reason: stockReason,
        reference: `Manual ${stockAction}`
      });

      toast.success(`Stock ${stockAction === 'add' ? 'added' : 'removed'} successfully`);
      setShowStockModal(false);
      loadInventoryData(); // Refresh data
    } catch (error) {
      console.error('Error adjusting stock:', error);
      toast.error('Failed to adjust stock');
    }
  };

  const loadStockHistory = async (productId) => {
    try {
      const response = await axiosInstance.get(`/inventory/history/${productId}`);
      setStockHistory(response.data.data || []);
      setShowHistoryModal(true);
    } catch (error) {
      console.error('Error loading stock history:', error);
      toast.error('Failed to load stock history');
    }
  };

  const handleViewInventory = (inventoryItem) => {
    // Show inventory details
    const details = `
Product: ${inventoryItem.productDetails?.productName}
Current Stock: ${inventoryItem.currentStock}
Available Stock: ${inventoryItem.availableStock}
Reorder Point: ${inventoryItem.reorderPoint}
Last Modified: ${new Date(inventoryItem.updatedAt).toLocaleString()}
Total Value: Rs.${inventoryItem.totalValue || 0}
    `;
    alert(details);
  };

  const handleDeleteInventory = async (inventoryItem) => {
    // Show confirmation and delete inventory record
    if (window.confirm(`Are you sure you want to delete inventory for ${inventoryItem.productDetails?.productName}?\n\nThis will remove all stock tracking for this product.`)) {
      try {
        await axiosInstance.delete(`/inventory/${inventoryItem._id}`);
        toast.success(`Inventory deleted for ${inventoryItem.productDetails?.productName}`);
        loadInventoryData();
      } catch (error) {
        console.error('Error deleting inventory:', error);
        toast.error('Failed to delete inventory');
      }
    }
  };

  const handleAddStock = (inventoryItem) => {
    // Open add stock modal
    const quantity = prompt(`Add stock for ${inventoryItem.productDetails?.productName}\nCurrent stock: ${inventoryItem.currentStock}\nEnter quantity to add:`, '1');
    if (quantity !== null && !isNaN(quantity) && parseInt(quantity) > 0) {
      adjustStock(inventoryItem._id, parseInt(quantity), 'purchase', 'Stock added manually');
    }
  };

  const adjustStock = async (inventoryId, adjustment, reason, reference) => {
    try {
      await axiosInstance.post('/inventory/adjust', {
        productId: inventoryId,
        adjustment: adjustment,
        reason: reason,
        reference: reference
      });
      toast.success(`Stock ${adjustment > 0 ? 'added' : 'removed'} successfully`);
      loadInventoryData();
    } catch (error) {
      console.error('Error adjusting stock:', error);
      toast.error('Failed to adjust stock');
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (window.confirm('Are you sure you want to delete this inventory item?')) {
      try {
        // Here you would call the delete API
        console.log('Delete product:', productId);
        toast.success('Product deleted successfully');
        loadInventoryData();
      } catch (error) {
        console.error('Error deleting product:', error);
        toast.error('Failed to delete product');
      }
    }
  };

  // Stats cards data
  const statsCards = [
    {
      title: 'Total Products',
      value: stats?.totalProducts || 0,
      icon: Package,
      color: 'bg-blue-500',
      change: null,
    },
    {
      title: 'Inventory Value',
      value: `Rs.${(stats?.totalValue || 0).toLocaleString()}`,
      icon: BarChart3,
      color: 'bg-green-500',
      change: null,
    },
    {
      title: 'Low Stock Items',
      value: stats?.lowStockItems || 0,
      icon: AlertTriangle,
      color: 'bg-orange-500',
      change: null,
    },
    {
      title: 'Out of Stock',
      value: stats?.outOfStockItems || 0,
      icon: Boxes,
      color: 'bg-red-500',
      change: null,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-blue-900 p-6">
      
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
              <Package className="w-8 h-8 mr-3 text-blue-600" />
              Inventory Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Monitor stock levels, track movements, and manage inventory
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={refreshData}
              disabled={refreshing}
              className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors flex items-center disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            
            <button
              onClick={() => setShowBulkActions(!showBulkActions)}
              className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition-colors flex items-center"
            >
              <Filter className="w-4 h-4 mr-2" />
              Bulk Actions
            </button>
            
            <button 
              onClick={() => toast.info('Add new product to inventory - coming soon')}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Product to Inventory
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statsCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {stat.title}
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                      {stat.value}
                    </p>
                  </div>
                  <div className={`${stat.color} p-3 rounded-xl`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        
        {/* Recent Stock Movements */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Recent Stock Movements
          </h3>
          
          {stats?.recentMovements?.length > 0 ? (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {stats?.recentMovements?.map((movement, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getMovementIcon(movement.type)}
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white text-sm">
                        {movement.productName}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {movement.type.replace('_', ' ').toUpperCase()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {movement.type.includes('increase') || movement.type === 'purchase' || movement.type === 'transfer_in' ? '+' : '-'}
                      {movement.quantity}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(movement.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">No recent movements</p>
            </div>
          )}
        </div>

        {/* Top Products by Value */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Top Products by Value
          </h3>
          
          {stats?.topProducts?.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stats?.topProducts || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="productName" 
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  formatter={(value) => [`Rs.${value.toLocaleString()}`, 'Value']}
                  labelStyle={{ color: '#374151' }}
                />
                <Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-8">
              <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">No data available</p>
            </div>
          )}
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          
          {/* Search */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center space-x-4">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All Status</option>
              <option value="good">In Stock</option>
              <option value="low_stock">Low Stock</option>
              <option value="out_of_stock">Out of Stock</option>
            </select>
            
            <button
              onClick={() => handleBulkAction('export')}
              className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors flex items-center"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </button>
          </div>
        </div>

        {/* Bulk Actions */}
        {showBulkActions && (
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={selectAllItems}
                  className="text-blue-500 hover:text-blue-700 transition-colors text-sm"
                >
                  {selectedItems.length === inventoryData?.length ? 'Deselect All' : 'Select All'}
                </button>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedItems.length} items selected
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleBulkAction('export')}
                  disabled={selectedItems.length === 0}
                  className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 transition-colors disabled:opacity-50"
                >
                  Export Selected
                </button>
                <button
                  onClick={() => handleBulkAction('update_reorder')}
                  disabled={selectedItems.length === 0}
                  className="bg-orange-500 text-white px-3 py-1 rounded text-sm hover:bg-orange-600 transition-colors disabled:opacity-50"
                >
                  Update Reorder Points
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Inventory Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                {showBulkActions && (
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedItems.length === inventoryData?.length && inventoryData?.length > 0}
                      onChange={selectAllItems}
                      className="rounded border-gray-300"
                    />
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Current Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                        {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Reorder Point
                        </th> */}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Last Modified
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={showBulkActions ? 8 : 7} className="px-6 py-8 text-center">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mr-2"></div>
                      Loading inventory...
                    </div>
                  </td>
                </tr>
              ) : inventoryData?.length === 0 ? (
                <tr>
                  <td colSpan={showBulkActions ? 8 : 7} className="px-6 py-8 text-center">
                    <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400">No inventory data found</p>
                  </td>
                </tr>
              ) : (
                inventoryData?.map((item) => {
                  const stockStatus = getStockStatus(item);
                  const StatusIcon = stockStatus.icon;
                  const itemValue = item.productDetails?.sellingPrice || 0;
                  
                  return (
                    <tr key={item._id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      {showBulkActions && (
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            checked={selectedItems.includes(item._id)}
                            onChange={() => toggleItemSelection(item._id)}
                            className="rounded border-gray-300"
                          />
                        </td>
                      )}
                      
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            {item.productDetails?.images?.[0]?.url ? (
                              <img
                                className="h-10 w-10 rounded-lg object-cover"
                                src={item.productDetails.images[0].url}
                                alt={item.productDetails.productName}
                              />
                            ) : (
                              <div className="h-10 w-10 bg-gray-100 dark:bg-gray-600 rounded-lg flex items-center justify-center">
                                <Package className="h-5 w-5 text-gray-400" />
                              </div>
                            )}
                          </div>
                          <div className="ml-4 flex-1">
                            <div className="flex items-center space-x-2">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {item.productDetails?.productName || 'Unknown Product'}
                              </div>
                              <button
                                onClick={() => loadStockHistory(item.productId)}
                                className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                                title="View Stock History"
                              >
                                <Clock className="h-4 w-4" />
                              </button>
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {item.productDetails?.barcode || 'No barcode'}
                            </div>
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {item.currentStock} {item.productDetails?.unit || 'pcs'}
                        </div>
                        {item.reservedStock > 0 && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            Reserved: {item.reservedStock}
                          </div>
                        )}
                      </td>
                      
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${stockStatus.color}`}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {stockStatus.status}
                        </span>
                      </td>
                      
                      {/* <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        {item.reorderPoint} {item.productDetails?.unit || 'pcs'}
                      </td> */}
                      
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                        Rs.{itemValue.toFixed(2)}
                      </td>
                      
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {item.updatedAt ? new Date(item.updatedAt).toLocaleString() : 'Never'}
                      </td>
                      
                      <td className="px-6 py-4 text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => loadStockHistory(item.productId)}
                            className="text-blue-600 hover:text-blue-900 transition-colors"
                            title="View Stock History"
                          >
                            <Clock className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openStockModal(item, 'add')}
                            className="text-green-600 hover:text-green-900 transition-colors"
                            title="Add Stock"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openStockModal(item, 'remove')}
                            className="text-orange-600 hover:text-orange-900 transition-colors"
                            title="Remove Stock"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEditInventory(item)}
                            className="text-purple-600 hover:text-purple-900 transition-colors"
                            title="Edit Inventory"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stock Management Modal */}
      {showStockModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {stockAction === 'add' ? 'Add Stock' : 'Remove Stock'}
            </h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Product: {selectedProduct?.productDetails?.productName}
              </label>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Current Stock: {selectedProduct?.currentStock}
              </label>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Quantity
              </label>
              <input
                type="number"
                value={stockQuantity}
                onChange={(e) => setStockQuantity(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Enter quantity"
                min="1"
              />
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Reason
              </label>
              <textarea
                value={stockReason}
                onChange={(e) => setStockReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Enter reason for this adjustment"
                rows="3"
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowStockModal(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleStockAdjustment}
                className={`px-4 py-2 text-white rounded-md transition-colors ${
                  stockAction === 'add' 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {stockAction === 'add' ? 'Add Stock' : 'Remove Stock'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stock History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-4/5 max-w-4xl mx-4 max-h-[80vh] overflow-hidden">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Stock History
              </h3>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>
            
            <div className="overflow-y-auto max-h-96">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left text-gray-600 dark:text-gray-300">Date</th>
                    <th className="px-4 py-2 text-left text-gray-600 dark:text-gray-300">Type</th>
                    <th className="px-4 py-2 text-left text-gray-600 dark:text-gray-300">Quantity</th>
                    <th className="px-4 py-2 text-left text-gray-600 dark:text-gray-300">Reason</th>
                    <th className="px-4 py-2 text-left text-gray-600 dark:text-gray-300">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {stockHistory.map((movement, index) => (
                    <tr key={index} className="border-b border-gray-200 dark:border-gray-600">
                      <td className="px-4 py-2 text-gray-900 dark:text-white">
                        {new Date(movement.timestamp).toLocaleString()}
                      </td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          movement.type === 'adjustment' 
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                            : movement.type === 'sale'
                            ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                        }`}>
                          {movement.type}
                        </span>
                      </td>
                      <td
  className={`px-4 py-2 font-medium flex items-center ${
    movement.notes?.toLowerCase().includes("added")
      ? "text-green-600 dark:text-green-400"
      : movement.notes?.toLowerCase().includes("removed")
      ? "text-red-600 dark:text-red-400"
      : "text-gray-600 dark:text-gray-300"
  }`}
>
  {/* {movement.notes?.toLowerCase().includes("added") ? (
    <Plus className="w-4 h-4 mr-1" />
  ) : movement.notes?.toLowerCase().includes("removed") ? (
    <Minus className="w-4 h-4 mr-1" />
  ) : null} */}
  {movement.notes?.toLowerCase().includes("added") ? "+" : "-"}
  {movement.quantity}
</td>

                      <td className="px-4 py-2 text-gray-700 dark:text-gray-300">
                        {movement.reason}
                      </td>
                      <td className="px-4 py-2 text-gray-700 dark:text-gray-300">
                        {movement.notes}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {stockHistory.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No stock movements found
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Stock Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Edit Stock Level
            </h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Product: {selectedProduct?.productDetails?.productName}
              </label>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Current Stock: {selectedProduct?.currentStock}
              </label>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                New Stock Level
              </label>
              <input
                type="number"
                value={editStock}
                onChange={(e) => setEditStock(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Enter new stock level"
                min="0"
              />
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Reason for Change
              </label>
              <textarea
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Enter reason for this stock change"
                rows="3"
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEditStock}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Update Stock
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryDashboard;
