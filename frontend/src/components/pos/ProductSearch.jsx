import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  X, 
  Package, 
  ShoppingCart, 
  AlertTriangle,
  CheckCircle,
  Filter,
  Grid,
  List
} from 'lucide-react';
import axiosInstance from '../../api/axiosInstance';
import toast from 'react-hot-toast';

const ProductSearch = ({ onSelect, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedBrand, setSelectedBrand] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // grid or list
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  const searchInputRef = useRef(null);

  // Focus search input on mount
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  // Load initial data
  useEffect(() => {
    loadCategories();
    loadBrands();
    searchProducts(''); // Load all products initially
  }, []);

  // Search products when query changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchProducts(searchQuery);
    }, 300); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [searchQuery, selectedCategory, selectedBrand]);

  const loadCategories = async () => {
    try {
      const response = await axiosInstance.get('/products/categories');
      if (response.data.success) {
        setCategories(response.data.categories);
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const loadBrands = async () => {
    try {
      const response = await axiosInstance.get('/products/brands');
      if (response.data.success) {
        setBrands(response.data.brands);
      }
    } catch (error) {
      console.error('Failed to load brands:', error);
    }
  };

  const searchProducts = async (query) => {
    try {
      setLoading(true);
      
      const params = {
        page: 1,
        limit: 50,
        isActive: true,
      };
      
      if (query.trim()) {
        params.search = query.trim();
      }
      
      if (selectedCategory !== 'all') {
        params.category = selectedCategory;
      }
      
      if (selectedBrand !== 'all') {
        params.brand = selectedBrand;
      }

      const response = await axiosInstance.get('/products', { params });
      
      if (response.data.success) {
        setProducts(response.data.products);
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Failed to search products');
    } finally {
      setLoading(false);
    }
  };

  const handleProductSelect = (product) => {
    if (product.inventory && product.inventory.availableStock <= 0) {
      toast.error(`${product.productName} is out of stock`);
      return;
    }
    
    onSelect(product);
    toast.success(`${product.productName} added to cart`);
  };

  const clearFilters = () => {
    setSelectedCategory('all');
    setSelectedBrand('all');
    setSearchQuery('');
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [onClose]);

  const getStockStatus = (product) => {
    const stock = product.inventory?.availableStock || 0;
    const reorderPoint = product.reorderPoint || 10;
    
    if (stock <= 0) {
      return { status: 'out', color: 'text-red-500', icon: AlertTriangle };
    } else if (stock <= reorderPoint) {
      return { status: 'low', color: 'text-orange-500', icon: AlertTriangle };
    } else {
      return { status: 'good', color: 'text-green-500', icon: CheckCircle };
    }
  };

  const renderProductCard = (product) => {
    const stockInfo = getStockStatus(product);
    const StockIcon = stockInfo.icon;
    
    return (
      <div
        key={product._id}
        className={`bg-white dark:bg-gray-800 rounded-lg border-2 transition-all duration-200 cursor-pointer ${
          product.inventory?.availableStock <= 0
            ? 'border-red-200 opacity-60 cursor-not-allowed'
            : 'border-gray-200 dark:border-gray-700 hover:border-blue-500 hover:shadow-lg'
        }`}
        onClick={() => handleProductSelect(product)}
      >
        <div className="p-4">
          {/* Product Image */}
          <div className="relative mb-3">
            {product.images && product.images.length > 0 ? (
              <img
                src={product.images[0].url}
                alt={product.productName}
                className="w-full h-32 object-cover rounded-lg"
              />
            ) : (
              <div className="w-full h-32 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                <Package className="w-8 h-8 text-gray-400" />
              </div>
            )}
            
            {/* Stock Status Badge */}
            <div className={`absolute top-2 right-2 ${stockInfo.color}`}>
              <StockIcon className="w-5 h-5" />
            </div>
          </div>

          {/* Product Info */}
          <div className="space-y-2">
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm line-clamp-2">
              {product.productName}
            </h3>
            
            <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
              <p>Code: {product.barcode}</p>
              <p>Brand: {product.brand || 'N/A'}</p>
              <p>Category: {product.categoryName || product.category?.name || 'N/A'}</p>
            </div>

            {/* Pricing */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-green-600 dark:text-green-400">
                  Rs.{product.sellingPrice}
                </span>
                <span className="text-xs text-gray-500">/ {product.unit}</span>
              </div>
              
              {product.mrp > product.sellingPrice && (
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500 line-through">
                    MRP: Rs.{product.mrp}
                  </span>
                  <span className="text-xs text-green-600 font-medium">
                    {Math.round(((product.mrp - product.sellingPrice) / product.mrp) * 100)}% OFF
                  </span>
                </div>
              )}
            </div>

            {/* Stock Info */}
            <div className="flex items-center justify-between text-xs">
              <span className={`flex items-center ${stockInfo.color}`}>
                <StockIcon className="w-3 h-3 mr-1" />
                Stock: {product.inventory?.availableStock || 0}
              </span>
              
              {product.inventory?.availableStock <= 0 ? (
                <span className="text-red-500 font-medium">Out of Stock</span>
              ) : (
                <button
                  className="bg-blue-500 text-white px-3 py-1 rounded-full hover:bg-blue-600 transition-colors flex items-center"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleProductSelect(product);
                  }}
                >
                  <ShoppingCart className="w-3 h-3 mr-1" />
                  Add
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderProductRow = (product) => {
    const stockInfo = getStockStatus(product);
    const StockIcon = stockInfo.icon;
    
    return (
      <div
        key={product._id}
        className={`bg-white dark:bg-gray-800 rounded-lg border p-4 transition-all duration-200 cursor-pointer ${
          product.inventory?.availableStock <= 0
            ? 'border-red-200 opacity-60 cursor-not-allowed'
            : 'border-gray-200 dark:border-gray-700 hover:border-blue-500 hover:shadow-md'
        }`}
        onClick={() => handleProductSelect(product)}
      >
        <div className="flex items-center space-x-4">
          {/* Product Image */}
          <div className="flex-shrink-0">
            {product.images && product.images.length > 0 ? (
              <img
                src={product.images[0].url}
                alt={product.productName}
                className="w-16 h-16 object-cover rounded-lg"
              />
            ) : (
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                <Package className="w-6 h-6 text-gray-400" />
              </div>
            )}
          </div>

          {/* Product Details */}
          <div className="flex-1 min-w-0">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Name and Code */}
              <div className="md:col-span-2">
                <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                  {product.productName}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {product.barcode} • {product.brand || 'No Brand'}
                </p>
                <p className="text-xs text-gray-400">
                  {product.categoryName || product.category?.name || 'Uncategorized'}
                </p>
              </div>

              {/* Pricing */}
              <div className="text-center">
                <div className="text-lg font-bold text-green-600 dark:text-green-400">
                  Rs.{product.sellingPrice}
                </div>
                <div className="text-xs text-gray-500">per {product.unit}</div>
                {product.mrp > product.sellingPrice && (
                  <div className="text-xs text-gray-500 line-through">
                    MRP: Rs.{product.mrp}
                  </div>
                )}
              </div>

              {/* Stock and Action */}
              <div className="text-center">
                <div className={`flex items-center justify-center mb-2 ${stockInfo.color}`}>
                  <StockIcon className="w-4 h-4 mr-1" />
                  <span className="text-sm font-medium">
                    {product.inventory?.availableStock || 0}
                  </span>
                </div>
                
                {product.inventory?.availableStock <= 0 ? (
                  <span className="text-red-500 text-sm font-medium">Out of Stock</span>
                ) : (
                  <button
                    className="bg-blue-500 text-white px-4 py-1 rounded-lg hover:bg-blue-600 transition-colors flex items-center mx-auto"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleProductSelect(product);
                    }}
                  >
                    <ShoppingCart className="w-4 h-4 mr-1" />
                    Add to Cart
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-6xl w-full max-h-[90vh] mx-4 flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
              <Search className="w-5 h-5 mr-2" />
              Search Products
            </h2>
            
            {/* View Mode Toggle */}
            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-gray-600 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-gray-600 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-lg transition-colors ${
                showFilters
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <Filter className="w-5 h-5" />
            </button>
            
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search by name, barcode, or brand..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 pl-12 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 dark:bg-gray-700 dark:text-white"
                >
                  <option value="all">All Categories</option>
                  {categories.map((category) => (
                    <option key={category._id} value={category._id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Brand
                </label>
                <select
                  value={selectedBrand}
                  onChange={(e) => setSelectedBrand(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 dark:bg-gray-700 dark:text-white"
                >
                  <option value="all">All Brands</option>
                  {brands.map((brand) => (
                    <option key={brand} value={brand}>
                      {brand}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={clearFilters}
                  className="w-full bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          )}

          {/* Results Summary */}
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>
              {loading ? 'Searching...' : `${products.length} products found`}
            </span>
            {(selectedCategory !== 'all' || selectedBrand !== 'all' || searchQuery.trim()) && (
              <button
                onClick={clearFilters}
                className="text-blue-500 hover:text-blue-700 transition-colors"
              >
                Clear all filters
              </button>
            )}
          </div>
        </div>

        {/* Products List */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <span className="ml-2 text-gray-600 dark:text-gray-400">Searching products...</span>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400 text-lg">No products found</p>
              <p className="text-gray-400 dark:text-gray-500 text-sm">
                Try adjusting your search criteria
              </p>
            </div>
          ) : (
            <div className={`space-y-4 ${
              viewMode === 'grid' 
                ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4' 
                : 'space-y-3'
            }`}>
              {products.map((product) => 
                viewMode === 'grid' ? renderProductCard(product) : renderProductRow(product)
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>Press ESC to close</span>
            <span>Click on any product to add to cart</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductSearch;
