import React, { useState, useEffect } from 'react';
import { ArrowLeft, Search, RefreshCw, Package, DollarSign, User, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from '../../api/axiosInstance';

const ReturnManagement = () => {
  const [transactions, setTransactions] = useState([]);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnItems, setReturnItems] = useState([]);
  const [returnReason, setReturnReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/transactions');
      setTransactions(response.data.data || []);
    } catch (error) {
      console.error('Failed to load transactions:', error);
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const handleReturnTransaction = (transaction) => {
    setSelectedTransaction(transaction);
    setReturnItems(transaction.items.map(item => ({
      ...item,
      returnQuantity: 0,
      returnReason: ''
    })));
    setShowReturnModal(true);
  };

  const updateReturnQuantity = (index, quantity) => {
    const updatedItems = [...returnItems];
    updatedItems[index].returnQuantity = Math.min(quantity, updatedItems[index].quantity);
    setReturnItems(updatedItems);
  };

  const processReturn = async () => {
    const itemsToReturn = returnItems.filter(item => item.returnQuantity > 0);
    
    if (itemsToReturn.length === 0) {
      toast.error('Please select items to return');
      return;
    }

    if (!returnReason.trim()) {
      toast.error('Please provide a return reason');
      return;
    }

    try {
      setLoading(true);
      
      const returnData = {
        originalTransactionId: selectedTransaction._id,
        items: itemsToReturn.map(item => ({
          product: item.product,
          productName: item.productName,
          quantity: item.returnQuantity,
          unitPrice: item.unitPrice,
          totalPrice: item.unitPrice * item.returnQuantity,
          category: item.category,
          mrp: item.mrp,
          sellingPrice: item.sellingPrice,
          costPrice: item.costPrice,
          gstRate: item.gstRate,
          hsnCode: item.hsnCode,
          unit: item.unit,
          discount: 0,
          finalPrice: item.unitPrice * item.returnQuantity
        })),
        customer: selectedTransaction.customer,
        customerInfo: selectedTransaction.customerInfo,
        subtotal: itemsToReturn.reduce((sum, item) => sum + (item.unitPrice * item.returnQuantity), 0),
        totalDiscount: 0,
        gstAmount: itemsToReturn.reduce((sum, item) => sum + (item.unitPrice * item.returnQuantity * 0.18), 0),
        finalAmount: itemsToReturn.reduce((sum, item) => sum + (item.unitPrice * item.returnQuantity * 1.18), 0),
        paymentMethod: 'cash',
        paymentStatus: 'refunded',
        cashierName: 'Return Staff',
        storeId: selectedTransaction.storeId,
        type: 'return',
        reason: returnReason
      };

      const response = await axios.post('/returns', returnData);
      
      if (response.data.success) {
        toast.success('Return processed successfully!');
        setShowReturnModal(false);
        setSelectedTransaction(null);
        setReturnItems([]);
        setReturnReason('');
        loadTransactions();
      }
    } catch (error) {
      console.error('Return processing error:', error);
      toast.error('Failed to process return');
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = transactions.filter(transaction =>
    transaction.billNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    transaction.customerInfo?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Return Management
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Process returns and refunds for customers
        </p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by bill number or customer name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>
      </div>

      {/* Transactions List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Bill Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Items
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredTransactions.map((transaction) => (
                <tr key={transaction._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {transaction.billNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {transaction.customerInfo?.name || 'Walk-in Customer'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {new Date(transaction.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    Rs.{transaction.finalAmount?.toFixed(2) || '0.00'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {transaction.items?.length || 0} items
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    <button
                      onClick={() => handleReturnTransaction(transaction)}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      Process Return
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Return Modal */}
      {showReturnModal && selectedTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Process Return - {selectedTransaction.billNumber}
              </h3>
              <button
                onClick={() => setShowReturnModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ×
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Return Reason *
              </label>
              <textarea
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Enter reason for return..."
              />
            </div>

            <div className="space-y-4 mb-6">
              <h4 className="font-medium text-gray-900 dark:text-white">Select Items to Return:</h4>
              {returnItems.map((item, index) => (
                <div key={index} className="flex items-center space-x-4 p-3 border border-gray-200 dark:border-gray-600 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">{item.productName}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Rs.{item.unitPrice} × {item.quantity} = Rs.{item.totalPrice}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <label className="text-sm text-gray-700 dark:text-gray-300">Qty:</label>
                    <input
                      type="number"
                      min="0"
                      max={item.quantity}
                      value={item.returnQuantity}
                      onChange={(e) => updateReturnQuantity(index, parseInt(e.target.value) || 0)}
                      className="w-20 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                    <span className="text-sm text-gray-500">/ {item.quantity}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowReturnModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700 dark:text-white"
              >
                Cancel
              </button>
              <button
                onClick={processReturn}
                disabled={loading || returnItems.every(item => item.returnQuantity === 0) || !returnReason.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Process Return'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReturnManagement;
