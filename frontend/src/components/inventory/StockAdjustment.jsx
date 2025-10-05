import React, { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Minus,
  RotateCcw,
  Search,
  Save,
  X,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  FileText,
  Camera,
  Calendar,
  User,
} from 'lucide-react';
import axiosInstance from '../../api/axiosInstance';
import toast from 'react-hot-toast';

const StockAdjustment = ({ isOpen, onClose, productId = null }) => {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [adjustmentType, setAdjustmentType] = useState('increase'); // increase, decrease, set
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  // Predefined reasons for stock adjustments
  const adjustmentReasons = {
    increase: [
      'New stock received',
      'Purchase return from supplier',
      'Found missing stock',
      'Correction from previous count',
      'Transfer from another location',
      'Production/Manufacturing',
      'Promotional stock received',
      'Other',
    ],
    decrease: [
      'Stock damaged/expired',
      'Theft/Loss',
      'Customer return (non-sellable)',
      'Sample/Demo usage',
      'Transfer to another location',
      'Wastage/Spillage',
      'Quality issue',
      'Other',
    ],
    set: [
      'Physical count correction',
      'System error correction',
      'Opening stock entry',
      'Annual stock verification',
      'Audit adjustment',
      'Other',
    ],
  };

  // Load product details if productId is provided
  useEffect(() => {
    if (productId) {
      loadProductDetails(productId);
    }
  }, [productId]);

  // Search products
  useEffect(() => {
    if (searchQuery.trim() && !selectedProduct) {
      const timeoutId = setTimeout(() => {
        searchProducts(searchQuery);
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [searchQuery, selectedProduct]);

  const loadProductDetails = async (id) => {
    try {
      setLoading(true);
      const response = await axiosInstance.get(`/products/${id}`);
      
      if (response.data.success) {
        setSelectedProduct(response.data.product);
      }
    } catch (error) {
      console.error('Failed to load product:', error);
      toast.error('Failed to load product details');
    } finally {
      setLoading(false);
    }
  };

  const searchProducts = async (query) => {
    try {
      setSearchLoading(true);
      const response = await axiosInstance.get('/products/search', {
        params: { q: query, limit: 10 }
      });
      
      if (response.data.success) {
        setProducts(response.data.products);
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Failed to search products');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleProductSelect = (product) => {
    setSelectedProduct(product);
    setProducts([]);
    setSearchQuery('');
  };

  const handleAttachmentChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('File size must be less than 5MB');
        return;
      }
      setAttachment(file);
    }
  };

  const validateForm = () => {
    if (!selectedProduct) {
      toast.error('Please select a product');
      return false;
    }
    
    if (!quantity || quantity <= 0) {
      toast.error('Please enter a valid quantity');
      return false;
    }
    
    if (!reason.trim()) {
      toast.error('Please select or enter a reason');
      return false;
    }
    
    const currentStock = selectedProduct.inventory?.currentStock || 0;
    if (adjustmentType === 'decrease' && quantity > currentStock) {
      toast.error(`Cannot decrease by ${quantity}. Current stock is only ${currentStock}`);
      return false;
    }
    
    if (adjustmentType === 'set' && quantity < 0) {
      toast.error('Stock level cannot be negative');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      setLoading(true);
      
      const formData = new FormData();
      formData.append('productId', selectedProduct._id);
      formData.append('type', adjustmentType === 'increase' ? 'adjustment_increase' : 
                      adjustmentType === 'decrease' ? 'adjustment_decrease' : 'adjustment_set');
      formData.append('quantity', parseFloat(quantity));
      formData.append('reason', reason);
      formData.append('notes', notes);
      
      if (attachment) {
        formData.append('attachment', attachment);
      }

      const response = await axiosInstance.post('/inventory/adjust', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      if (response.data.success) {
        toast.success('Stock adjustment completed successfully');
        resetForm();
        onClose();
      }
    } catch (error) {
      console.error('Stock adjustment error:', error);
      toast.error(error.response?.data?.message || 'Failed to adjust stock');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedProduct(null);
    setProducts([]);
    setSearchQuery('');
    setAdjustmentType('increase');
    setQuantity('');
    setReason('');
    setNotes('');
    setAttachment(null);
  };

  const calculateNewStock = () => {
    if (!selectedProduct || !quantity) return null;
    
    const currentStock = selectedProduct.inventory?.currentStock || 0;
    const adjustmentQty = parseFloat(quantity) || 0;
    
    switch (adjustmentType) {
      case 'increase':
        return currentStock + adjustmentQty;
      case 'decrease':
        return Math.max(0, currentStock - adjustmentQty);
      case 'set':
        return adjustmentQty;
      default:
        return currentStock;
    }
  };

  if (!isOpen) return null;

  const newStock = calculateNewStock();
  const currentStock = selectedProduct?.inventory?.currentStock || 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
            <Package className="w-5 h-5 mr-2" />
            Stock Adjustment
          </h2>
          <button
            onClick={() => {
              resetForm();
              onClose();
            }}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {/* Product Selection */}
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Select Product *
            </label>
            
            {selectedProduct ? (
              <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {selectedProduct.images?.[0]?.url ? (
                      <img
                        src={selectedProduct.images[0].url}
                        alt={selectedProduct.productName}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-200 dark:bg-gray-600 rounded-lg flex items-center justify-center">
                        <Package className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {selectedProduct.productName}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {selectedProduct.barcode} • Current Stock: {currentStock} {selectedProduct.unit}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedProduct(null)}
                    className="text-red-500 hover:text-red-700 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search product by name or barcode..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                
                {/* Search Results */}
                {products.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {products.map((product) => (
                      <button
                        key={product._id}
                        type="button"
                        onClick={() => handleProductSelect(product)}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors border-b border-gray-200 dark:border-gray-600 last:border-b-0"
                      >
                        <div className="flex items-center space-x-3">
                          {product.images?.[0]?.url ? (
                            <img
                              src={product.images[0].url}
                              alt={product.productName}
                              className="w-8 h-8 rounded object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 bg-gray-200 dark:bg-gray-600 rounded flex items-center justify-center">
                              <Package className="w-4 h-4 text-gray-400" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white text-sm">
                              {product.productName}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {product.barcode} • Stock: {product.inventory?.currentStock || 0}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                
                {searchLoading && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                  </div>
                )}
              </div>
            )}
          </div>

          {selectedProduct && (
            <>
              {/* Adjustment Type */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Adjustment Type *
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setAdjustmentType('increase')}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      adjustmentType === 'increase'
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="text-center">
                      <TrendingUp className="w-6 h-6 mx-auto mb-2 text-green-600" />
                      <span className="text-sm font-medium">Increase</span>
                    </div>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setAdjustmentType('decrease')}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      adjustmentType === 'decrease'
                        ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="text-center">
                      <TrendingDown className="w-6 h-6 mx-auto mb-2 text-red-600" />
                      <span className="text-sm font-medium">Decrease</span>
                    </div>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setAdjustmentType('set')}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      adjustmentType === 'set'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="text-center">
                      <RotateCcw className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                      <span className="text-sm font-medium">Set Value</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Quantity Input */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {adjustmentType === 'set' ? 'New Stock Level' : 'Quantity'} *
                  </label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 dark:bg-gray-700 dark:text-white"
                    placeholder={adjustmentType === 'set' ? 'Enter new stock level' : 'Enter quantity'}
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                
                {newStock !== null && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      New Stock Level
                    </label>
                    <div className={`w-full border rounded-lg px-3 py-2 font-medium ${
                      newStock >= currentStock
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                        : 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                    }`}>
                      {newStock} {selectedProduct.unit}
                      <span className="text-sm ml-2">
                        ({newStock >= currentStock ? '+' : ''}{(newStock - currentStock).toFixed(2)})
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Reason *
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 dark:bg-gray-700 dark:text-white"
                  required
                >
                  <option value="">Select a reason</option>
                  {adjustmentReasons[adjustmentType]?.map((reasonOption) => (
                    <option key={reasonOption} value={reasonOption}>
                      {reasonOption}
                    </option>
                  ))}
                </select>
                
                {reason === 'Other' && (
                  <input
                    type="text"
                    placeholder="Enter custom reason"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full mt-2 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 dark:bg-gray-700 dark:text-white"
                    required
                  />
                )}
              </div>

              {/* Notes */}
              {reason !== 'Other' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Additional Notes
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 dark:bg-gray-700 dark:text-white"
                    rows={3}
                    placeholder="Enter any additional notes or comments"
                  />
                </div>
              )}

              {/* Attachment */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Attachment (Optional)
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="file"
                    onChange={handleAttachmentChange}
                    accept="image/*,.pdf,.doc,.docx"
                    className="hidden"
                    id="attachment-upload"
                  />
                  <label
                    htmlFor="attachment-upload"
                    className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors cursor-pointer flex items-center"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Choose File
                  </label>
                  {attachment && (
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {attachment.name}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Supported: Images, PDF, DOC (Max 5MB)
                </p>
              </div>

              {/* Summary */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                  <FileText className="w-4 h-4 mr-2" />
                  Adjustment Summary
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Product:</span>
                    <span className="font-medium">{selectedProduct.productName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Current Stock:</span>
                    <span>{currentStock} {selectedProduct.unit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Adjustment:</span>
                    <span className={adjustmentType === 'increase' ? 'text-green-600' : 'text-red-600'}>
                      {adjustmentType === 'set' ? 'Set to' : adjustmentType === 'increase' ? '+' : '-'}
                      {quantity || 0} {selectedProduct.unit}
                    </span>
                  </div>
                  {newStock !== null && (
                    <div className="flex justify-between border-t border-gray-200 dark:border-gray-600 pt-2">
                      <span className="text-gray-600 dark:text-gray-400">New Stock:</span>
                      <span className="font-medium">{newStock} {selectedProduct.unit}</span>
                    </div>
                  )}
                  {reason && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Reason:</span>
                      <span>{reason}</span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => {
                resetForm();
                onClose();
              }}
              className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            
            <button
              type="submit"
              disabled={loading || !selectedProduct}
              className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Adjusting...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Adjust Stock
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StockAdjustment;
