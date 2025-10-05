import React, { useState, useEffect, useRef } from 'react';
import {
  User,
  Search,
  Plus,
  X,
  Phone,
  Mail,
  MapPin,
  Edit3,
  Trash2,
  Star,
  Gift,
  Calendar,
  ShoppingBag,
} from 'lucide-react';
import axiosInstance from '../../api/axiosInstance';
import toast from 'react-hot-toast';

const CustomerModal = ({ selectedCustomer, onSelect, onClose }) => {
  const [customers, setCustomers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    fullName: '',
    phone: '',
    email: '',
    address: {
      street: '',
      city: '',
      state: '',
      pincode: '',
    },
    notes: '',
  });

  const searchInputRef = useRef(null);

  // Focus search input on mount
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  // Load customers
  useEffect(() => {
    loadCustomers();
  }, []);

  // Search customers
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchCustomers(searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/customers');
      
      if (response.data.success) {
        setCustomers(response.data.customers);
      }
    } catch (error) {
      console.error('Failed to load customers:', error);
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  const searchCustomers = async (query) => {
    if (!query.trim()) {
      loadCustomers();
      return;
    }

    try {
      setLoading(true);
      const response = await axiosInstance.get('/customers/search', {
        params: { q: query.trim() }
      });
      
      if (response.data.success) {
        setCustomers(response.data.customers);
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Failed to search customers');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCustomer = async (e) => {
    e.preventDefault();
    
    if (!newCustomer.fullName.trim() || !newCustomer.phone.trim()) {
      toast.error('Name and phone are required');
      return;
    }

    try {
      setLoading(true);
      const response = await axiosInstance.post('/customers', newCustomer);
      
      if (response.data.success) {
        toast.success('Customer added successfully');
        setCustomers([response.data.customer, ...customers]);
        setNewCustomer({
          fullName: '',
          phone: '',
          email: '',
          address: { street: '', city: '', state: '', pincode: '' },
          notes: '',
        });
        setShowAddForm(false);
      }
    } catch (error) {
      console.error('Failed to add customer:', error);
      toast.error(error.response?.data?.message || 'Failed to add customer');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCustomer = async (e) => {
    e.preventDefault();
    
    if (!editingCustomer) return;

    try {
      setLoading(true);
      const response = await axiosInstance.put(`/customers/${editingCustomer._id}`, editingCustomer);
      
      if (response.data.success) {
        toast.success('Customer updated successfully');
        setCustomers(customers.map(c => 
          c._id === editingCustomer._id ? response.data.customer : c
        ));
        setEditingCustomer(null);
      }
    } catch (error) {
      console.error('Failed to update customer:', error);
      toast.error(error.response?.data?.message || 'Failed to update customer');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCustomer = async (customerId) => {
    if (!window.confirm('Are you sure you want to delete this customer?')) {
      return;
    }

    try {
      setLoading(true);
      await axiosInstance.delete(`/customers/${customerId}`);
      
      toast.success('Customer deleted successfully');
      setCustomers(customers.filter(c => c._id !== customerId));
      
      if (selectedCustomer?._id === customerId) {
        onSelect(null);
      }
    } catch (error) {
      console.error('Failed to delete customer:', error);
      toast.error(error.response?.data?.message || 'Failed to delete customer');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCustomer = (customer) => {
    onSelect(customer);
    toast.success(`Selected customer: ${customer.fullName}`);
    onClose();
  };

  const formatCustomerStats = (customer) => {
    return {
      totalPurchases: customer.totalPurchases || 0,
      loyaltyPoints: customer.loyaltyPoints || 0,
      lastPurchase: customer.lastPurchaseDate ? new Date(customer.lastPurchaseDate).toLocaleDateString() : 'Never',
    };
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'Escape') {
        if (showAddForm || editingCustomer) {
          setShowAddForm(false);
          setEditingCustomer(null);
        } else {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showAddForm, editingCustomer, onClose]);

  const CustomerForm = ({ customer, onChange, onSubmit, isEditing = false }) => (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Full Name *
          </label>
          <input
            type="text"
            value={customer.fullName}
            onChange={(e) => onChange({ ...customer, fullName: e.target.value })}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 dark:bg-gray-700 dark:text-white"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Phone *
          </label>
          <input
            type="tel"
            value={customer.phone}
            onChange={(e) => onChange({ ...customer, phone: e.target.value })}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 dark:bg-gray-700 dark:text-white"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Email
          </label>
          <input
            type="email"
            value={customer.email}
            onChange={(e) => onChange({ ...customer, email: e.target.value })}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 dark:bg-gray-700 dark:text-white"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Street Address
          </label>
          <input
            type="text"
            value={customer.address?.street || ''}
            onChange={(e) => onChange({ 
              ...customer, 
              address: { ...customer.address, street: e.target.value }
            })}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 dark:bg-gray-700 dark:text-white"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            City
          </label>
          <input
            type="text"
            value={customer.address?.city || ''}
            onChange={(e) => onChange({ 
              ...customer, 
              address: { ...customer.address, city: e.target.value }
            })}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 dark:bg-gray-700 dark:text-white"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            State
          </label>
          <input
            type="text"
            value={customer.address?.state || ''}
            onChange={(e) => onChange({ 
              ...customer, 
              address: { ...customer.address, state: e.target.value }
            })}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 dark:bg-gray-700 dark:text-white"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Pincode
          </label>
          <input
            type="text"
            value={customer.address?.pincode || ''}
            onChange={(e) => onChange({ 
              ...customer, 
              address: { ...customer.address, pincode: e.target.value }
            })}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 dark:bg-gray-700 dark:text-white"
          />
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Notes
        </label>
        <textarea
          value={customer.notes || ''}
          onChange={(e) => onChange({ ...customer, notes: e.target.value })}
          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 dark:bg-gray-700 dark:text-white"
          rows={2}
        />
      </div>
      
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={() => {
            setShowAddForm(false);
            setEditingCustomer(null);
          }}
          className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
        >
          {loading ? 'Saving...' : isEditing ? 'Update' : 'Add'} Customer
        </button>
      </div>
    </form>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
            <User className="w-5 h-5 mr-2" />
            {showAddForm ? 'Add Customer' : editingCustomer ? 'Edit Customer' : 'Select Customer'}
          </h2>
          
          <div className="flex items-center space-x-3">
            {!showAddForm && !editingCustomer && (
              <button
                onClick={() => setShowAddForm(true)}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Customer
              </button>
            )}
            
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          {showAddForm ? (
            <div className="p-6">
              <CustomerForm
                customer={newCustomer}
                onChange={setNewCustomer}
                onSubmit={handleAddCustomer}
              />
            </div>
          ) : editingCustomer ? (
            <div className="p-6">
              <CustomerForm
                customer={editingCustomer}
                onChange={setEditingCustomer}
                onSubmit={handleUpdateCustomer}
                isEditing={true}
              />
            </div>
          ) : (
            <>
              {/* Search Bar */}
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="relative">
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search by name, phone, or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-3 pl-12 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                </div>
              </div>

              {/* Customers List */}
              <div className="flex-1 overflow-y-auto p-6">
                {loading ? (
                  <div className="flex items-center justify-center h-40">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    <span className="ml-2 text-gray-600 dark:text-gray-400">Loading customers...</span>
                  </div>
                ) : customers.length === 0 ? (
                  <div className="text-center py-12">
                    <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400 text-lg">No customers found</p>
                    <p className="text-gray-400 dark:text-gray-500 text-sm">
                      Add a new customer to get started
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {customers.map((customer) => {
                      const stats = formatCustomerStats(customer);
                      const isSelected = selectedCustomer?._id === customer._id;
                      
                      return (
                        <div
                          key={customer._id}
                          className={`border rounded-lg p-4 transition-all duration-200 cursor-pointer ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md'
                          }`}
                          onClick={() => handleSelectCustomer(customer)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <h3 className="font-semibold text-gray-900 dark:text-white">
                                  {customer.fullName}
                                </h3>
                                {customer.isVip && (
                                  <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full flex items-center">
                                    <Star className="w-3 h-3 mr-1" />
                                    VIP
                                  </span>
                                )}
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-600 dark:text-gray-400">
                                <div className="flex items-center">
                                  <Phone className="w-4 h-4 mr-2" />
                                  {customer.phone}
                                </div>
                                
                                {customer.email && (
                                  <div className="flex items-center">
                                    <Mail className="w-4 h-4 mr-2" />
                                    {customer.email}
                                  </div>
                                )}
                                
                                {customer.address?.city && (
                                  <div className="flex items-center">
                                    <MapPin className="w-4 h-4 mr-2" />
                                    {customer.address.city}
                                  </div>
                                )}
                              </div>
                              
                              {/* Customer Stats */}
                              <div className="grid grid-cols-3 gap-4 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                                <div className="text-center">
                                  <div className="text-sm font-semibold text-green-600 dark:text-green-400">
                                    Rs.{stats.totalPurchases.toFixed(2)}
                                  </div>
                                  <div className="text-xs text-gray-500">Total Purchases</div>
                                </div>
                                
                                <div className="text-center">
                                  <div className="text-sm font-semibold text-purple-600 dark:text-purple-400 flex items-center justify-center">
                                    <Gift className="w-3 h-3 mr-1" />
                                    {stats.loyaltyPoints}
                                  </div>
                                  <div className="text-xs text-gray-500">Loyalty Points</div>
                                </div>
                                
                                <div className="text-center">
                                  <div className="text-sm font-semibold text-blue-600 dark:text-blue-400 flex items-center justify-center">
                                    <Calendar className="w-3 h-3 mr-1" />
                                    {stats.lastPurchase}
                                  </div>
                                  <div className="text-xs text-gray-500">Last Purchase</div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Action Buttons */}
                            <div className="flex space-x-2 ml-4">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingCustomer(customer);
                                }}
                                className="text-blue-500 hover:text-blue-700 transition-colors"
                                title="Edit Customer"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteCustomer(customer._id);
                                }}
                                className="text-red-500 hover:text-red-700 transition-colors"
                                title="Delete Customer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!showAddForm && !editingCustomer && (
          <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>Press ESC to close</span>
              <div className="flex items-center space-x-4">
                {selectedCustomer && (
                  <button
                    onClick={() => onSelect(null)}
                    className="text-red-500 hover:text-red-700 transition-colors"
                  >
                    Clear Selection
                  </button>
                )}
                <span>Click on any customer to select</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerModal;
