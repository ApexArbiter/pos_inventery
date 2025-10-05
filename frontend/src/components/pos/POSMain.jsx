import React, { useState, useEffect, useRef } from 'react';
import { ShoppingCart, Search, User, Barcode, Plus, Minus, Trash2, Receipt, QrCode, DollarSign, Grid3X3, List, Sun, Moon } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from '../../api/axiosInstance';
import DynamicBill from './DynamicBill';

const POSMain = () => {
  const [cart, setCart] = useState([]);
  const [products, setProducts] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [productsWithStock, setProductsWithStock] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categories, setCategories] = useState([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amountReceived, setAmountReceived] = useState('');
  const [loading, setLoading] = useState(false);
  const [showBillPreview, setShowBillPreview] = useState(false);
  const [currentTransaction, setCurrentTransaction] = useState(null);
  const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'table'
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [barcodeBuffer, setBarcodeBuffer] = useState('');
  const [barcodeTimeout, setBarcodeTimeout] = useState(null);

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const total = subtotal; // No tax calculation
  const change = Math.max(0, parseFloat(amountReceived) - total);

  useEffect(() => {
    loadProducts();
    loadInventory();
    loadCategories();
    loadCustomers();
    loadUserPreferences();
  }, []);

  // Automatic barcode detection
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Only process if not typing in input fields
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return;
      }

      // Clear timeout if it exists
      if (barcodeTimeout) {
        clearTimeout(barcodeTimeout);
      }

      // Add character to buffer
      setBarcodeBuffer(prev => prev + event.key);

      // Set timeout to process barcode after 200ms of no input
      const timeout = setTimeout(() => {
        if (barcodeBuffer.length >= 8) { // Minimum barcode length
          handleBarcodeScan(barcodeBuffer);
          // toast.success(`Barcode detected: ${barcodeBuffer}`);
        }
        setBarcodeBuffer('');
      }, 200);

      setBarcodeTimeout(timeout);
    };

    // Add event listener
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (barcodeTimeout) {
        clearTimeout(barcodeTimeout);
      }
    };
  }, [barcodeBuffer, barcodeTimeout]);

  // Load user preferences from localStorage
  const loadUserPreferences = () => {
    const savedViewMode = localStorage.getItem('posViewMode');
    const savedTheme = localStorage.getItem('posTheme');
    
    if (savedViewMode) {
      setViewMode(savedViewMode);
    }
    if (savedTheme) {
      setIsDarkMode(savedTheme === 'dark');
    }
  };

  // Save view mode preference
  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    localStorage.setItem('posViewMode', mode);
  };

  // Save theme preference
  const handleThemeToggle = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    localStorage.setItem('posTheme', newTheme ? 'dark' : 'light');
  };

  // Merge products with inventory data when both are loaded
  useEffect(() => {
    if (products.length > 0 && inventory.length > 0) {
      const merged = products.map(product => {
        const inventoryItem = inventory.find(inv => inv.productId === product._id);
        return {
          ...product,
          currentStock: inventoryItem?.currentStock || 0,
          availableStock: inventoryItem?.availableStock || 0
        };
      });
      setProductsWithStock(merged);
    }
  }, [products, inventory]);

  const loadProducts = async () => {
    try {
      const response = await axios.get('/products');
      setProducts(response.data.data || []);
    } catch (error) {
      console.error('Failed to load products:', error);
      toast.error('Failed to load products');
    }
  };

  const loadInventory = async () => {
    try {
      const response = await axios.get('/inventory/levels');
      setInventory(response.data.data || []);
    } catch (error) {
      console.error('Failed to load inventory:', error);
      toast.error('Failed to load inventory');
    }
  };

  const loadCategories = async () => {
    try {
      const response = await axios.get('/categories');
      setCategories(response.data.data || []);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const loadCustomers = async () => {
    try {
      const response = await axios.get('/customers');
      setCustomers(response.data.data || []);
    } catch (error) {
      console.error('Failed to load customers:', error);
    }
  };

  const addToCart = (product) => {
    // Check stock availability
    const currentStock = product.currentStock || 0;
    console.log('Adding to cart:', product.productName, 'Current stock:', currentStock);
    
    const existingItem = cart.find(item => item.id === product._id);
    const currentQuantity = existingItem ? existingItem.quantity : 0;
    const requestedQuantity = currentQuantity + 1;

    if (requestedQuantity > currentStock) {
      toast.error(`Only ${currentStock} units available in stock!`);
      return;
    }

    if (currentStock === 0) {
      toast.error('Product is out of stock!');
      return;
    }

    setCart(prevCart => {
      if (existingItem) {
        return prevCart.map(item =>
          item.id === product._id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        return [...prevCart, {
          id: product._id,
          name: product.productName || product.name,
          price: product.sellingPrice || product.price,
          quantity: 1,
          barcode: product.barcode,
          category: product.category,
          currentStock: currentStock
        }];
      }
    });
    // toast.success(`${product.productName || product.name} added to cart (${currentStock - requestedQuantity} left)`);
  };

  const updateQuantity = (id, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(id);
      return;
    }

    // Check stock availability
    const cartItem = cart.find(item => item.id === id);
    if (cartItem && cartItem.currentStock && newQuantity > cartItem.currentStock) {
      toast.error(`Only ${cartItem.currentStock} units available in stock!`);
      return;
    }

    setCart(prevCart =>
      prevCart.map(item =>
        item.id === id ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const removeFromCart = (id) => {
    setCart(prevCart => prevCart.filter(item => item.id !== id));
  };

  const clearCart = () => {
    setCart([]);
    setSelectedCustomer(null);
    // toast.success('Cart cleared');
  };

  const handleBarcodeScan = (barcode) => {
    console.log('Scanning barcode:', barcode);
    console.log('Available products with stock:', productsWithStock.length);
    
    const product = productsWithStock.find(p => p.barcode === barcode);
    if (product) {
      console.log('Product found:', product.productName, 'Stock:', product.currentStock);
      addToCart(product);
    } else {
      console.log('Product not found for barcode:', barcode);
      toast.error('Product not found');
    }
  };

  const generateBill = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    if (paymentMethod === 'cash' && parseFloat(amountReceived) < total) {
      toast.error('Insufficient amount received');
      return;
    }

    setLoading(true);
    try {
      // Generate bill data and save to database
      const billData = {
        billNumber: `BILL-${Date.now()}`,
        items: cart.map(item => ({
          productId: item.id,
          barcode: item.barcode || `BAR-${item.id}`,
          productName: item.name,
          category: item.category || 'General',
          brand: item.brand || '',
          quantity: item.quantity,
          unit: item.unit || 'pcs',
          mrp: item.mrp || item.price,
          sellingPrice: item.price,
          discount: 0,
          discountType: 'amount',
          discountAmount: 0,
          gstRate: 0,
          gstAmount: 0,
          totalAmount: item.price * item.quantity,
          isReturned: false,
          returnQuantity: 0,
          returnReason: '',
          returnDate: null
        })),
        customerId: selectedCustomer?.id,
        customerInfo: selectedCustomer ? {
          name: selectedCustomer.name,
          email: selectedCustomer.email,
          phone: selectedCustomer.phone
        } : null,
        subtotal,
        totalDiscount: 0,
        finalAmount: total,
        paymentMethod,
        paymentStatus: paymentMethod === 'cash' ? 'completed' : 'pending',
        cashierId: '68d9b88797f4b497a5f255b8', // Demo cashier ID
        cashierName: 'POS User',
        storeId: '68d9b866b68fb44566d71515',
        billType: 'sale',
        createdAt: new Date().toISOString()
      };

      // Save transaction to database
      const response = await axios.post('/transactions', billData);
      
      if (response.data.success) {
        // Update inventory stock for each item
        for (const item of cart) {
          try {
            await axios.post('/inventory/adjust', {
              productId: item.id,
              adjustment: -item.quantity, // Deduct stock
              reason: 'sale',
              reference: `Bill: ${billData.billNumber}`
            });
          } catch (inventoryError) {
            console.error('Failed to update inventory for product:', item.name, inventoryError);
          }
        }
        
        // toast.success('Bill generated and stock updated successfully!');
        // Refresh inventory to show updated stock levels
        await loadInventory();
        // Show bill preview
        setCurrentTransaction(response.data.data);
        setShowBillPreview(true);
        // Clear cart
        clearCart();
        setShowPaymentModal(false);
        setAmountReceived('');
      } else {
        throw new Error(response.data.message || 'Failed to save transaction');
      }
    } catch (error) {
      console.error('Bill generation error:', error);
      toast.error('Failed to generate bill: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };


  const filteredProducts = productsWithStock.filter(product => {
    const matchesSearch = product.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.barcode?.includes(searchTerm);
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });


  return (
    <div className={`flex h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
      {/* Left Panel - Products */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm border-b p-4`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>POS Terminal</h1>
              {/* Barcode Scanner Status */}
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className={`text-sm ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                  Scanner Active
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {/* View Mode Toggle */}
              <div className="flex items-center bg-gray-200 dark:bg-gray-700 rounded-lg p-1">
                <button
                  onClick={() => handleViewModeChange('cards')}
                  className={`flex items-center px-3 py-1 rounded-md text-sm ${
                    viewMode === 'cards' 
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' 
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <Grid3X3 className="w-4 h-4 mr-1" />
                  Cards
                </button>
                <button
                  onClick={() => handleViewModeChange('table')}
                  className={`flex items-center px-3 py-1 rounded-md text-sm ${
                    viewMode === 'table' 
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' 
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <List className="w-4 h-4 mr-1" />
                  Table
                </button>
              </div>
              
              {/* Theme Toggle */}
              <button
                onClick={handleThemeToggle}
                className={`flex items-center px-3 py-2 rounded-lg ${
                  isDarkMode 
                    ? 'bg-gray-700 text-white hover:bg-gray-600' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              
              <button
                onClick={() => setShowBarcodeScanner(true)}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Barcode className="w-4 h-4 mr-2" />
                Scan Barcode
              </button>
              <button
                onClick={() => setShowCustomerModal(true)}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <User className="w-4 h-4 mr-2" />
                Customer
              </button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex space-x-4">
            <div className="flex-1 relative">
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-400'}`} />
              <input
                type="text"
                placeholder="Search products or scan barcode..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className={`px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category._id} value={category.name}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Products Display */}
        <div className={`flex-1 p-4 overflow-y-auto ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
          {viewMode === 'cards' ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredProducts.map(product => {
              const isOutOfStock = (product.currentStock || 0) === 0;
              const isLowStock = (product.currentStock || 0) > 0 && (product.currentStock || 0) <= 5;
              
              return (
                <div
                  key={product._id}
                  onClick={() => addToCart(product)}
                  className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-sm border p-4 cursor-pointer hover:shadow-md transition-shadow ${
                    isOutOfStock 
                      ? 'border-red-300 bg-red-50 opacity-60' 
                      : isLowStock 
                        ? 'border-yellow-300 bg-yellow-50' 
                        : isDarkMode 
                          ? 'border-gray-600' 
                          : 'border-gray-200'
                  }`}
                >
                <div className="aspect-square bg-gray-100 rounded-lg mb-3 flex items-center justify-center">
                  {product.images?.[0]?.url ? (
                    <img
                      src={product.images[0].url}
                      alt={product.productName}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <div className="text-gray-400 text-center">
                      <div className="text-2xl mb-1">📦</div>
                      <div className="text-xs">No Image</div>
                    </div>
                  )}
                </div>
                <h3 className={`font-medium text-sm mb-1 line-clamp-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {product.productName || product.name}
                </h3>
                <p className={`text-xs mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {product.barcode}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-green-600">
                    Rs.{product.sellingPrice || product.price}
                  </span>
                  <span className={`text-xs font-medium ${
                    isOutOfStock 
                      ? 'text-red-600' 
                      : isLowStock 
                        ? 'text-yellow-600' 
                        : 'text-green-600'
                  }`}>
                    Stock: {product.currentStock || 0}
                    {isOutOfStock && ' (Out of Stock)'}
                    {isLowStock && ' (Low Stock)'}
                  </span>
                </div>
              </div>
              );
            })}
            </div>
          ) : (
            /* Table View */
            <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-sm border ${isDarkMode ? 'border-gray-600' : 'border-gray-200'} overflow-hidden`}>
              <table className="w-full">
                <thead className={`${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <tr>
                    <th className={`px-4 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                      Product
                    </th>
                    <th className={`px-4 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                      Price
                    </th>
                    <th className={`px-4 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                      Stock
                    </th>
                    <th className={`px-4 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                      Status
                    </th>
                    <th className={`px-4 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                  {filteredProducts.map(product => {
                    const isOutOfStock = (product.currentStock || 0) === 0;
                    const isLowStock = (product.currentStock || 0) > 0 && (product.currentStock || 0) <= 5;
                    
                    return (
                      <tr key={product._id} className={`hover:${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'} transition-colors`}>
                        <td className="px-4 py-4">
                          <div className="flex items-center">
                            <div className="h-10 w-10 flex-shrink-0">
                              {product.images?.[0]?.url ? (
                                <img
                                  src={product.images[0].url}
                                  alt={product.productName}
                                  className="h-10 w-10 rounded-lg object-cover"
                                />
                              ) : (
                                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                                  <span className="text-lg">📦</span>
                                </div>
                              )}
                            </div>
                            <div className="ml-4">
                              <div className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                {product.productName || product.name}
                              </div>
                              <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                {product.barcode}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className={`px-4 py-4 text-sm font-bold text-green-600`}>
                          Rs.{product.sellingPrice || product.price}
                        </td>
                        <td className={`px-4 py-4 text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {product.currentStock || 0}
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            isOutOfStock 
                              ? 'bg-red-100 text-red-800' 
                              : isLowStock 
                                ? 'bg-yellow-100 text-yellow-800' 
                                : 'bg-green-100 text-green-800'
                          }`}>
                            {isOutOfStock ? 'Out of Stock' : isLowStock ? 'Low Stock' : 'In Stock'}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <button
                            onClick={() => addToCart(product)}
                            disabled={isOutOfStock}
                            className={`px-3 py-1 text-sm rounded-md ${
                              isOutOfStock 
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                                : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                          >
                            {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Cart */}
      <div className={`w-96 shadow-lg flex flex-col ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
        {/* Cart Header */}
        <div className={`p-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <h2 className={`text-lg font-semibold flex items-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              <ShoppingCart className="w-5 h-5 mr-2" />
              Cart ({cart.length})
            </h2>
            <button
              onClick={clearCart}
              className="text-red-600 hover:text-red-700 text-sm"
            >
              Clear All
            </button>
          </div>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4">
          {cart.length === 0 ? (
            <div className="text-center text-gray-500 mt-8">
              <ShoppingCart className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Cart is empty</p>
              <p className="text-sm">Add products to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map(item => (
                <div key={item.id} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-sm">{item.name}</h4>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-8 text-center font-medium">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <span className="font-bold text-green-600">
                      Rs.{(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cart Summary */}
        {cart.length > 0 && (
          <div className="border-t p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span>Rs.{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>Total:</span>
              <span>Rs.{total.toFixed(2)}</span>
            </div>
            
            {selectedCustomer && (
              <div className="bg-blue-50 p-2 rounded-lg">
                <p className="text-sm text-blue-800">
                  Customer: {selectedCustomer.name}
                </p>
              </div>
            )}

            <button
              onClick={() => setShowPaymentModal(true)}
              className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 flex items-center justify-center"
            >
              <Receipt className="w-5 h-5 mr-2" />
              Generate Bill
            </button>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Generate Bill</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="cash">Cash</option>
                  <option value="online">Online</option>
                </select>
              </div>

              {paymentMethod === 'cash' && (
                <div>
                  <label className="block text-sm font-medium mb-2">Amount Received</label>
                  <input
                    type="number"
                    value={amountReceived}
                    onChange={(e) => setAmountReceived(e.target.value)}
                    placeholder="Enter amount received"
                    className="w-full p-2 border border-gray-300 rounded-lg"
                  />
                  {change > 0 && (
                    <p className="text-sm text-green-600 mt-1">
                      Change: Rs.{change.toFixed(2)}
                    </p>
                  )}
                </div>
              )}

              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="flex justify-between text-sm mb-1">
                  <span>Subtotal:</span>
                  <span>Rs.{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Total:</span>
                  <span>Rs.{total.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 py-2 px-4 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={generateBill}
                  disabled={loading || (paymentMethod === 'cash' && parseFloat(amountReceived) < total)}
                  className="flex-1 py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? 'Generating...' : 'Generate Bill'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Customer Modal */}
      {showCustomerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Select Customer</h3>
            
            <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
              <button
                onClick={() => {
                  setSelectedCustomer(null);
                  setShowCustomerModal(false);
                }}
                className={`w-full p-3 text-left rounded-lg border ${
                  !selectedCustomer ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
              >
                <div className="font-medium">Walk-in Customer</div>
                <div className="text-sm text-gray-500">No customer selected</div>
              </button>
              
              {customers.map(customer => (
                <button
                  key={customer.id}
                  onClick={() => {
                    setSelectedCustomer(customer);
                    setShowCustomerModal(false);
                  }}
                  className={`w-full p-3 text-left rounded-lg border ${
                    selectedCustomer?.id === customer.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  <div className="font-medium">{customer.name}</div>
                  <div className="text-sm text-gray-500">{customer.email}</div>
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowCustomerModal(false)}
              className="w-full py-2 px-4 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Barcode Scanner Modal */}
      {showBarcodeScanner && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Barcode Scanner</h3>
            
            <div className="text-center">
              <QrCode className="w-24 h-24 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600 mb-4">
                Camera access required for barcode scanning
              </p>
              <p className="text-sm text-gray-500 mb-4">
                Or manually enter barcode:
              </p>
              <input
                type="text"
                placeholder="Enter barcode manually"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleBarcodeScan(e.target.value);
                    e.target.value = '';
                  }
                }}
                className="w-full p-2 border border-gray-300 rounded-lg mb-4"
              />
            </div>

            <button
              onClick={() => setShowBarcodeScanner(false)}
              className="w-full py-2 px-4 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Dynamic Bill Preview */}
      {showBillPreview && currentTransaction && (
        <DynamicBill
          transaction={currentTransaction}
          onClose={() => setShowBillPreview(false)}
          loading={loading}
        />
      )}
    </div>
  );
};

export default POSMain;
