import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  DollarSign,
  Smartphone,
  Wallet,
  Building,
  FileText,
  X,
  User,
  Phone,
  MapPin,
  Calculator,
  Check,
} from 'lucide-react';
import toast from 'react-hot-toast';

const PaymentModal = ({ total, cartItems, customer, onPayment, onClose, loading }) => {
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amountPaid, setAmountPaid] = useState(total);
  const [customerInfo, setCustomerInfo] = useState({
    name: customer?.name || '',
    phone: customer?.phone || '',
    email: customer?.email || '',
    address: customer?.address?.street || '',
  });
  const [paymentReference, setPaymentReference] = useState('');
  const [notes, setNotes] = useState('');
  const [showCalculator, setShowCalculator] = useState(false);

  // Calculate change
  const change = Math.max(0, amountPaid - total);
  const isValidPayment = amountPaid >= total;

  // Payment methods configuration
  const paymentMethods = [
    {
      id: 'cash',
      name: 'Cash',
      icon: DollarSign,
      color: 'bg-green-500',
      description: 'Cash payment',
    },
    {
      id: 'card',
      name: 'Card',
      icon: CreditCard,
      color: 'bg-blue-500',
      description: 'Credit/Debit card',
    },
    {
      id: 'upi',
      name: 'UPI',
      icon: Smartphone,
      color: 'bg-purple-500',
      description: 'UPI payment',
    },
    {
      id: 'wallet',
      name: 'Wallet',
      icon: Wallet,
      color: 'bg-orange-500',
      description: 'Digital wallet',
    },
    {
      id: 'net_banking',
      name: 'Net Banking',
      icon: Building,
      color: 'bg-indigo-500',
      description: 'Online banking',
    },
  ];

  // Calculator component
  const Calculator = () => {
    const [display, setDisplay] = useState(amountPaid.toString());
    
    const handleCalculatorInput = (value) => {
      if (value === 'clear') {
        setDisplay('0');
      } else if (value === 'backspace') {
        setDisplay(display.length > 1 ? display.slice(0, -1) : '0');
      } else if (value === 'enter') {
        const amount = parseFloat(display) || 0;
        setAmountPaid(amount);
        setShowCalculator(false);
      } else {
        setDisplay(display === '0' ? value : display + value);
      }
    };

    const buttons = [
      ['7', '8', '9', 'clear'],
      ['4', '5', '6', 'backspace'],
      ['1', '2', '3', '+'],
      ['0', '.', '00', 'enter'],
    ];

    return (
      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mt-4">
        <div className="mb-4">
          <div className="bg-black text-green-400 p-3 rounded font-mono text-right text-xl">
            Rs.{display}
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {buttons.flat().map((btn) => (
            <button
              key={btn}
              onClick={() => handleCalculatorInput(btn)}
              className={`p-3 rounded font-medium transition-colors ${
                btn === 'enter'
                  ? 'bg-green-500 text-white hover:bg-green-600'
                  : btn === 'clear'
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : btn === 'backspace'
                  ? 'bg-orange-500 text-white hover:bg-orange-600'
                  : 'bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-500'
              }`}
            >
              {btn === 'backspace' ? '⌫' : btn === 'enter' ? '✓' : btn === 'clear' ? 'C' : btn}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const handlePayment = () => {
    // Validation
    if (!isValidPayment) {
      toast.error('Amount paid must be at least the total amount');
      return;
    }

    if (!customer && (!customerInfo.name || !customerInfo.phone)) {
      toast.error('Customer name and phone are required');
      return;
    }

    if (paymentMethod !== 'cash' && !paymentReference.trim()) {
      toast.error(`${paymentMethods.find(m => m.id === paymentMethod)?.name} reference is required`);
      return;
    }

    // Prepare payment data
    const paymentData = {
      paymentMethod,
      amount: amountPaid,
      reference: paymentReference,
      notes,
      customerInfo: customer ? undefined : customerInfo,
    };

    onPayment(paymentData);
  };

  // Auto-focus amount input for cash payments
  useEffect(() => {
    if (paymentMethod === 'cash') {
      setAmountPaid(total);
    }
  }, [paymentMethod, total]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
            <CreditCard className="w-5 h-5 mr-2" />
            Process Payment
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          
          {/* Order Summary */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Order Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Items ({cartItems.reduce((sum, item) => sum + item.quantity, 0)}):</span>
                <span>Rs.{cartItems.reduce((sum, item) => sum + (item.sellingPrice * item.quantity), 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t border-gray-300 dark:border-gray-600 pt-2">
                <span>Total Amount:</span>
                <span className="text-green-600 dark:text-green-400">Rs.{total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Customer Information */}
          {!customer && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center">
                <User className="w-4 h-4 mr-2" />
                Customer Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={customerInfo.name}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 dark:bg-gray-700 dark:text-white"
                    placeholder="Customer name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Phone *
                  </label>
                  <input
                    type="tel"
                    value={customerInfo.phone}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 dark:bg-gray-700 dark:text-white"
                    placeholder="Phone number"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={customerInfo.email}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 dark:bg-gray-700 dark:text-white"
                    placeholder="Email address"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    value={customerInfo.address}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, address: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 dark:bg-gray-700 dark:text-white"
                    placeholder="Customer address"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Payment Method Selection */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">Payment Method</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {paymentMethods.map((method) => {
                const Icon = method.icon;
                return (
                  <button
                    key={method.id}
                    onClick={() => setPaymentMethod(method.id)}
                    className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                      paymentMethod === method.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="text-center">
                      <div className={`${method.color} text-white w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="font-medium text-gray-900 dark:text-white text-sm">
                        {method.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {method.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Amount Input */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-white">Amount</h3>
              {paymentMethod === 'cash' && (
                <button
                  onClick={() => setShowCalculator(!showCalculator)}
                  className="text-blue-500 hover:text-blue-700 transition-colors flex items-center text-sm"
                >
                  <Calculator className="w-4 h-4 mr-1" />
                  Calculator
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Amount Paid
                </label>
                <input
                  type="number"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                  className={`w-full border rounded-lg px-3 py-2 text-lg font-medium dark:bg-gray-700 dark:text-white ${
                    isValidPayment
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                      : 'border-red-500 bg-red-50 dark:bg-red-900/20'
                  }`}
                  min={total}
                  step="0.01"
                />
              </div>
              
              {paymentMethod === 'cash' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Change
                  </label>
                  <div className={`w-full border rounded-lg px-3 py-2 text-lg font-medium ${
                    change >= 0
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                      : 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                  }`}>
                    Rs.{change.toFixed(2)}
                  </div>
                </div>
              )}
            </div>

            {/* Calculator */}
            {showCalculator && paymentMethod === 'cash' && <Calculator />}
          </div>

          {/* Payment Reference */}
          {paymentMethod !== 'cash' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Payment Reference *
              </label>
              <input
                type="text"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 dark:bg-gray-700 dark:text-white"
                placeholder={`${paymentMethods.find(m => m.id === paymentMethod)?.name} reference/transaction ID`}
                required
              />
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 dark:bg-gray-700 dark:text-white"
              rows={2}
              placeholder="Additional notes for this transaction"
            />
          </div>

          {/* Quick Amount Buttons for Cash */}
          {paymentMethod === 'cash' && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Quick Amount
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[total, Math.ceil(total / 100) * 100, Math.ceil(total / 500) * 500, Math.ceil(total / 1000) * 1000].map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setAmountPaid(amount)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      amountPaid === amount
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    Rs.{amount.toFixed(0)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Payment Status */}
          <div className={`p-4 rounded-lg ${
            isValidPayment
              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
          }`}>
            <div className="flex items-center">
              {isValidPayment ? (
                <>
                  <Check className="w-5 h-5 text-green-600 dark:text-green-400 mr-2" />
                  <span className="text-green-700 dark:text-green-300 font-medium">
                    Payment amount is valid
                  </span>
                </>
              ) : (
                <>
                  <X className="w-5 h-5 text-red-600 dark:text-red-400 mr-2" />
                  <span className="text-red-700 dark:text-red-300 font-medium">
                    Amount paid must be at least Rs.{total.toFixed(2)}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <button
              onClick={onClose}
              className="bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            
            <button
              onClick={handlePayment}
              disabled={!isValidPayment || loading || (!customer && (!customerInfo.name || !customerInfo.phone))}
              className="bg-green-500 text-white px-8 py-3 rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Processing...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5 mr-2" />
                  Complete Payment
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
