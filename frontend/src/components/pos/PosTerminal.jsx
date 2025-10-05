import React, { useState, useEffect, useRef } from 'react';
import {
  ShoppingCart,
  Scan,
  Search,
  User,
  CreditCard,
  Trash2,
  Plus,
  Minus,
  RotateCcw,
  Receipt,
  MessageCircle,
  AlertTriangle,
  CheckCircle,
  Calculator,
  Percent,
} from 'lucide-react';
import toast from 'react-hot-toast';
import axiosInstance from '../../api/axiosInstance';
import BarcodeScanner from './BarcodeScanner';
import ProductSearch from './ProductSearch';
import PaymentModal from './PaymentModal';
import CustomerModal from './CustomerModal';
import BillPreview from './BillPreview';

const PosTerminal = () => {
  // State management
  const [cartItems, setCartItems] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showCustomer, setShowCustomer] = useState(false);
  const [showBillPreview, setShowBillPreview] = useState(false);
  const [discount, setDiscount] = useState({ amount: 0, type: 'amount' });
  const [loading, setLoading] = useState(false);
  const [currentTransaction, setCurrentTransaction] = useState(null);

  // Refs
  const barcodeInputRef = useRef(null);

  // Calculate totals
  const calculateTotals = () => {
    const subtotal = cartItems.reduce((sum, item) => sum + (item.sellingPrice * item.quantity), 0);
    
    let discountAmount = 0;
    if (discount.type === 'percentage') {
      discountAmount = (subtotal * discount.amount) / 100;
    } else {
      discountAmount = discount.amount;
    }
    
    const afterDiscount = subtotal - discountAmount;
    const gstAmount = cartItems.reduce((sum, item) => {
      const itemTotal = (item.sellingPrice * item.quantity) - 
        (discount.type === 'percentage' ? (item.sellingPrice * item.quantity * discount.amount) / 100 : 0);
      return sum + ((itemTotal * item.gstRate) / 100);
    }, 0);
    
    const finalAmount = afterDiscount + gstAmount;

    return {
      subtotal,
      discountAmount,
      gstAmount,
      finalAmount: Math.max(0, finalAmount),
      itemCount: cartItems.reduce((sum, item) => sum + item.quantity, 0),
    };
  };

  const totals = calculateTotals();

  // Add item to cart
  const addToCart = (product, quantity = 1) => {
    const existingItemIndex = cartItems.findIndex(item => item._id === product._id);
    
    if (existingItemIndex >= 0) {
      // Update existing item
      const updatedCart = [...cartItems];
      updatedCart[existingItemIndex].quantity += quantity;
      setCartItems(updatedCart);
    } else {
      // Add new item
      const cartItem = {
        _id: product._id,
        productName: product.productName,
        barcode: product.barcode,
        sellingPrice: product.sellingPrice,
        mrp: product.mrp,
        gstRate: product.gstRate || 0,
        unit: product.unit,
        quantity,
        category: product.category?.name || 'General',
        images: product.images || [],
        availableStock: product.inventory?.availableStock || 0,
      };
      setCartItems([...cartItems, cartItem]);
    }
    
    toast.success(`${product.productName} added to cart`);
  };

  // Update item quantity
  const updateQuantity = (itemId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(itemId);
      return;
    }

    const updatedCart = cartItems.map(item =>
      item._id === itemId ? { ...item, quantity: newQuantity } : item
    );
    setCartItems(updatedCart);
  };

  // Remove item from cart
  const removeFromCart = (itemId) => {
    setCartItems(cartItems.filter(item => item._id !== itemId));
    toast.success('Item removed from cart');
  };

  // Clear cart
  const clearCart = () => {
    setCartItems([]);
    setSelectedCustomer(null);
    setDiscount({ amount: 0, type: 'amount' });
    setCurrentTransaction(null);
    toast.success('Cart cleared');
  };

  // Handle barcode scan
  const handleBarcodeScan = async (barcode) => {
    try {
      setLoading(true);
      const response = await axiosInstance.get(`/products/barcode/${barcode}`);
      
      if (response.data.success) {
        const product = response.data.product;
        
        // Check stock availability
        if (product.inventory && product.inventory.availableStock <= 0) {
          toast.error(`${product.productName} is out of stock`);
          return;
        }
        
        addToCart({ ...product, inventory: response.data.inventory });
      } else {
        toast.error('Product not found');
      }
    } catch (error) {
      console.error('Barcode scan error:', error);
      toast.error('Failed to find product with this barcode');
    } finally {
      setLoading(false);
    }
  };

  // Handle manual barcode input
  const handleBarcodeInput = (e) => {
    if (e.key === 'Enter') {
      const barcode = e.target.value.trim();
      if (barcode) {
        handleBarcodeScan(barcode);
        e.target.value = '';
      }
    }
  };

  // Process payment
  const processPayment = async (paymentData) => {
    try {
      setLoading(true);

      const transactionData = {
        customerInfo: selectedCustomer ? undefined : paymentData.customerInfo,
        customerId: selectedCustomer?._id,
        items: cartItems.map(item => ({
          productId: item._id,
          barcode: item.barcode,
          quantity: item.quantity,
          discount: 0, // Item-level discount can be added later
          discountType: 'amount',
        })),
        paymentMethod: paymentData.paymentMethod,
        payments: [{
          method: paymentData.paymentMethod,
          amount: totals.finalAmount,
          reference: paymentData.reference,
          status: 'completed',
        }],
        notes: paymentData.notes || '',
        discounts: discount.amount > 0 ? [discount] : [],
      };

      const response = await axiosInstance.post('/billing/transactions', transactionData);

      if (response.data.success) {
        setCurrentTransaction(response.data.transaction);
        setShowPayment(false);
        setShowBillPreview(true);
        toast.success('Transaction completed successfully!');
      } else {
        toast.error('Failed to process transaction');
      }
    } catch (error) {
      console.error('Payment processing error:', error);
      toast.error(error.response?.data?.message || 'Failed to process payment');
    } finally {
      setLoading(false);
    }
  };

  // Send bill via WhatsApp
  const sendBillViaWhatsApp = async (imageData) => {
    if (!currentTransaction) return;

    try {
      setLoading(true);
      const response = await axiosInstance.post(
        `/billing/transactions/${currentTransaction._id}/whatsapp`,
        { imageData }
      );

      if (response.data.success) {
        toast.success('Bill sent via WhatsApp successfully!');
      } else {
        toast.error('Failed to send bill via WhatsApp');
      }
    } catch (error) {
      console.error('WhatsApp send error:', error);
      toast.error('Failed to send bill via WhatsApp');
    } finally {
      setLoading(false);
    }
  };

  // Focus on barcode input when component mounts
  useEffect(() => {
    if (barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      // F1 - Toggle scanner
      if (e.key === 'F1') {
        e.preventDefault();
        setIsScanning(!isScanning);
      }
      // F2 - Search products
      if (e.key === 'F2') {
        e.preventDefault();
        setIsSearching(true);
      }
      // F3 - Add customer
      if (e.key === 'F3') {
        e.preventDefault();
        setShowCustomer(true);
      }
      // F4 - Process payment
      if (e.key === 'F4') {
        e.preventDefault();
        if (cartItems.length > 0) {
          setShowPayment(true);
        }
      }
      // Escape - Clear cart
      if (e.key === 'Escape') {
        e.preventDefault();
        clearCart();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isScanning, cartItems.length]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-blue-900">
      <div className="grid grid-cols-1 lg:grid-cols-3 h-screen">
        
        {/* Left Panel - Scanning & Search */}
        <div className="lg:col-span-2 p-6 space-y-6">
          
          {/* Header */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                POS Terminal
              </h1>
              <div className="flex items-center space-x-3">
                {selectedCustomer && (
                  <div className="bg-green-100 dark:bg-green-900 px-3 py-1 rounded-full">
                    <span className="text-sm font-medium text-green-800 dark:text-green-200">
                      {selectedCustomer.name}
                    </span>
                  </div>
                )}
                <button
                  onClick={() => setShowCustomer(true)}
                  className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center"
                  title="Add Customer (F3)"
                >
                  <User className="w-4 h-4 mr-2" />
                  Customer
                </button>
              </div>
            </div>

            {/* Barcode Input */}
            <div className="relative">
              <input
                ref={barcodeInputRef}
                type="text"
                placeholder="Scan or enter barcode..."
                onKeyPress={handleBarcodeInput}
                className="w-full px-4 py-3 pl-12 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-lg"
                disabled={loading}
              />
              <Scan className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
              <button
                onClick={() => setIsScanning(!isScanning)}
                className={`flex items-center justify-center p-3 rounded-lg transition-colors ${
                  isScanning 
                    ? 'bg-green-500 text-white' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
                title="Camera Scanner (F1)"
              >
                <Scan className="w-5 h-5 mr-2" />
                {isScanning ? 'Stop Scan' : 'Scan'}
              </button>

              <button
                onClick={() => setIsSearching(true)}
                className="flex items-center justify-center p-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                title="Search Products (F2)"
              >
                <Search className="w-5 h-5 mr-2" />
                Search
              </button>

              <button
                onClick={clearCart}
                className="flex items-center justify-center p-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
                title="Clear Cart (Esc)"
                disabled={cartItems.length === 0}
              >
                <RotateCcw className="w-5 h-5 mr-2" />
                Clear
              </button>

              <button
                onClick={() => cartItems.length > 0 && setShowPayment(true)}
                className={`flex items-center justify-center p-3 rounded-lg transition-colors ${
                  cartItems.length > 0
                    ? 'bg-green-500 text-white hover:bg-green-600'
                    : 'bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed'
                }`}
                title="Process Payment (F4)"
                disabled={cartItems.length === 0}
              >
                <CreditCard className="w-5 h-5 mr-2" />
                Pay
              </button>
            </div>
          </div>

          {/* Camera Scanner */}
          {isScanning && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
              <BarcodeScanner
                onScan={handleBarcodeScan}
                onClose={() => setIsScanning(false)}
              />
            </div>
          )}

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {totals.itemCount}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Items</div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  Rs.{totals.subtotal.toFixed(2)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Subtotal</div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  Rs.{totals.finalAmount.toFixed(2)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total</div>
              </div>
            </div>
          </div>

          {/* Keyboard Shortcuts */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Keyboard Shortcuts</h3>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 text-xs">
              <div className="flex items-center">
                <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">F1</kbd>
                <span className="ml-2 text-gray-600 dark:text-gray-400">Scanner</span>
              </div>
              <div className="flex items-center">
                <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">F2</kbd>
                <span className="ml-2 text-gray-600 dark:text-gray-400">Search</span>
              </div>
              <div className="flex items-center">
                <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">F3</kbd>
                <span className="ml-2 text-gray-600 dark:text-gray-400">Customer</span>
              </div>
              <div className="flex items-center">
                <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">F4</kbd>
                <span className="ml-2 text-gray-600 dark:text-gray-400">Payment</span>
              </div>
              <div className="flex items-center">
                <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">Esc</kbd>
                <span className="ml-2 text-gray-600 dark:text-gray-400">Clear</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Cart */}
        <div className="bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 p-6 space-y-4">
          
          {/* Cart Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
              <ShoppingCart className="w-5 h-5 mr-2" />
              Cart ({totals.itemCount})
            </h2>
            {cartItems.length > 0 && (
              <button
                onClick={clearCart}
                className="text-red-500 hover:text-red-700 transition-colors"
                title="Clear Cart"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto space-y-3 max-h-96">
            {cartItems.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">Cart is empty</p>
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  Scan or search products to add them
                </p>
              </div>
            ) : (
              cartItems.map((item) => (
                <div key={item._id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                        {item.productName}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {item.barcode} • {item.category}
                      </p>
                      <p className="text-sm font-medium text-green-600 dark:text-green-400">
                        Rs.{item.sellingPrice} / {item.unit}
                      </p>
                    </div>
                    <button
                      onClick={() => removeFromCart(item._id)}
                      className="text-red-500 hover:text-red-700 transition-colors ml-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => updateQuantity(item._id, item.quantity - 1)}
                        className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-12 text-center font-medium">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item._id, item.quantity + 1)}
                        className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        disabled={item.quantity >= item.availableStock}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-gray-900 dark:text-white">
                        Rs.{(item.sellingPrice * item.quantity).toFixed(2)}
                      </div>
                      {item.availableStock <= 5 && (
                        <div className="text-xs text-orange-500 flex items-center">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Low stock: {item.availableStock}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Discount Section */}
          {cartItems.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Discount
                </label>
                <div className="flex items-center space-x-2">
                  <select
                    value={discount.type}
                    onChange={(e) => setDiscount({ ...discount, type: e.target.value })}
                    className="text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="amount">Rs.</option>
                    <option value="percentage">%</option>
                  </select>
                  <input
                    type="number"
                    value={discount.amount}
                    onChange={(e) => setDiscount({ ...discount, amount: Math.max(0, parseFloat(e.target.value) || 0) })}
                    className="w-20 text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 dark:bg-gray-700 dark:text-white"
                    placeholder="0"
                    min="0"
                    max={discount.type === 'percentage' ? 100 : totals.subtotal}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Cart Summary */}
          {cartItems.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                <span className="font-medium">Rs.{totals.subtotal.toFixed(2)}</span>
              </div>
              
              {totals.discountAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Discount:</span>
                  <span className="font-medium text-red-600">-Rs.{totals.discountAmount.toFixed(2)}</span>
                </div>
              )}
              
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">GST:</span>
                <span className="font-medium">Rs.{totals.gstAmount.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between text-lg font-bold border-t border-gray-200 dark:border-gray-700 pt-2">
                <span>Total:</span>
                <span className="text-green-600 dark:text-green-400">Rs.{totals.finalAmount.toFixed(2)}</span>
              </div>

              <button
                onClick={() => setShowPayment(true)}
                className="w-full bg-green-500 text-white py-3 rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center font-medium"
                disabled={loading}
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                ) : (
                  <CreditCard className="w-5 h-5 mr-2" />
                )}
                Process Payment
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {isSearching && (
        <ProductSearch
          onSelect={addToCart}
          onClose={() => setIsSearching(false)}
        />
      )}

      {showCustomer && (
        <CustomerModal
          selectedCustomer={selectedCustomer}
          onSelect={setSelectedCustomer}
          onClose={() => setShowCustomer(false)}
        />
      )}

      {showPayment && (
        <PaymentModal
          total={totals.finalAmount}
          cartItems={cartItems}
          customer={selectedCustomer}
          onPayment={processPayment}
          onClose={() => setShowPayment(false)}
          loading={loading}
        />
      )}

      {showBillPreview && currentTransaction && (
        <BillPreview
          transaction={currentTransaction}
          onClose={() => {
            setShowBillPreview(false);
            clearCart();
          }}
          onWhatsAppSend={sendBillViaWhatsApp}
          loading={loading}
        />
      )}
    </div>
  );
};

export default PosTerminal;
