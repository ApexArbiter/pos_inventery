import React, { useState, useEffect } from 'react';
import {
  Store,
  MapPin,
  Phone,
  Mail,
  Globe,
  Clock,
  CreditCard,
  Save,
  Edit,
  X,
  Camera,
  Upload,
  Settings,
  DollarSign,
  Calendar,
} from 'lucide-react';
import axiosInstance from '../../api/axiosInstance';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';

const StoreSettings = () => {
  const { user, store } = useAuth();
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [storeData, setStoreData] = useState({
    storeName: '',
    storeId: '',
    description: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    country: 'Pakistan',
    phone: '',
    email: '',
    website: '',
    logo: '',
    currency: 'PKR',
    timezone: 'Asia/Karachi',
    gstNumber: '',
    businessHours: {
      monday: { open: '09:00', close: '21:00', closed: false },
      tuesday: { open: '09:00', close: '21:00', closed: false },
      wednesday: { open: '09:00', close: '21:00', closed: false },
      thursday: { open: '09:00', close: '21:00', closed: false },
      friday: { open: '09:00', close: '21:00', closed: false },
      saturday: { open: '09:00', close: '21:00', closed: false },
      sunday: { open: '10:00', close: '20:00', closed: false },
    },
    taxSettings: {
      gstNumber: '',
      gstRate: 18,
      taxInclusive: true,
    },
    paymentSettings: {
      acceptCash: true,
      acceptCard: true,
      acceptUPI: true,
      acceptWallet: false,
    },
  });

  useEffect(() => {
    if (store) {
      setStoreData({
        storeName: store.storeName || '',
        storeId: store.storeId || '',
        description: store.description || '',
        address: store.address || '',
        city: store.city || '',
        state: store.state || '',
        pincode: store.pincode || '',
        country: store.country || 'Pakistan',
        phone: store.contact?.phone || '',
        email: store.contact?.email || '',
        website: store.website || '',
        logo: store.logo || '',
        currency: store.currency || 'INR',
        timezone: store.timezone || 'Asia/Kolkata',
        businessHours: store.businessHours || storeData.businessHours,
        taxSettings: store.taxSettings || storeData.taxSettings,
        paymentSettings: store.paymentSettings || storeData.paymentSettings,
      });
    }
  }, [store]);

  const handleSave = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.put('/admin/store-settings', storeData);
      if (response.data.success) {
        toast.success('Store settings updated successfully');
        setEditing(false);
      }
    } catch (error) {
      console.error('Failed to update store settings:', error);
      toast.error('Failed to update store settings');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (store) {
      setStoreData({
        storeName: store.storeName || '',
        storeId: store.storeId || '',
        description: store.description || '',
        address: store.address || '',
        city: store.city || '',
        state: store.state || '',
        pincode: store.pincode || '',
        country: store.country || 'India',
        phone: store.contact?.phone || '',
        email: store.contact?.email || '',
        website: store.website || '',
        logo: store.logo || '',
        currency: store.currency || 'INR',
        timezone: store.timezone || 'Asia/Kolkata',
        businessHours: store.businessHours || storeData.businessHours,
        taxSettings: store.taxSettings || storeData.taxSettings,
        paymentSettings: store.paymentSettings || storeData.paymentSettings,
      });
    }
    setEditing(false);
  };

  const handleBusinessHoursChange = (day, field, value) => {
    setStoreData({
      ...storeData,
      businessHours: {
        ...storeData.businessHours,
        [day]: {
          ...storeData.businessHours[day],
          [field]: value,
        },
      },
    });
  };

  const days = [
    { key: 'monday', label: 'Monday' },
    { key: 'tuesday', label: 'Tuesday' },
    { key: 'wednesday', label: 'Wednesday' },
    { key: 'thursday', label: 'Thursday' },
    { key: 'friday', label: 'Friday' },
    { key: 'saturday', label: 'Saturday' },
    { key: 'sunday', label: 'Sunday' },
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
              <Store className="w-8 h-8 mr-3 text-blue-600" />
              Store Settings
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage your store information and business settings
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {editing ? (
              <>
                <button
                  onClick={handleCancel}
                  className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center disabled:opacity-50"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </>
            ) : (
              <button
                onClick={() => setEditing(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Settings
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Store Information */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
            <Store className="w-5 h-5 mr-2" />
            Store Information
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Store Name *
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={storeData.storeName}
                onChange={(e) => setStoreData({...storeData, storeName: e.target.value})}
                disabled={!editing}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Store ID
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={storeData.storeId}
                onChange={(e) => setStoreData({...storeData, storeId: e.target.value})}
                disabled={!editing}
              />
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Store Description
            </label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              value={storeData.description}
              onChange={(e) => setStoreData({...storeData, description: e.target.value})}
              disabled={!editing}
              placeholder="Describe your store"
            />
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
            <Phone className="w-5 h-5 mr-2" />
            Contact Information
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={storeData.phone}
                onChange={(e) => setStoreData({...storeData, phone: e.target.value})}
                disabled={!editing}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email Address
              </label>
              <input
                type="email"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={storeData.email}
                onChange={(e) => setStoreData({...storeData, email: e.target.value})}
                disabled={!editing}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Website
              </label>
              <input
                type="url"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={storeData.website}
                onChange={(e) => setStoreData({...storeData, website: e.target.value})}
                disabled={!editing}
                placeholder="https://yourstore.com"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                GST Number
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={storeData.gstNumber}
                onChange={(e) => setStoreData({...storeData, gstNumber: e.target.value})}
                disabled={!editing}
                placeholder="GST123456789"
              />
            </div>
          </div>
        </div>

        {/* Address Information */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
            <MapPin className="w-5 h-5 mr-2" />
            Address Information
          </h3>
          
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Address
            </label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              value={storeData.address}
              onChange={(e) => setStoreData({...storeData, address: e.target.value})}
              disabled={!editing}
              placeholder="Enter your store address"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                City
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={storeData.city}
                onChange={(e) => setStoreData({...storeData, city: e.target.value})}
                disabled={!editing}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                State
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={storeData.state}
                onChange={(e) => setStoreData({...storeData, state: e.target.value})}
                disabled={!editing}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Pincode
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={storeData.pincode}
                onChange={(e) => setStoreData({...storeData, pincode: e.target.value})}
                disabled={!editing}
              />
            </div>
          </div>
        </div>

        {/* Business Hours */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
            <Clock className="w-5 h-5 mr-2" />
            Business Hours
          </h3>
          
          <div className="space-y-4">
            {days.map((day) => (
              <div key={day.key} className="flex items-center space-x-4">
                <div className="w-24">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {day.label}
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={!storeData.businessHours[day.key]?.closed}
                    onChange={(e) => handleBusinessHoursChange(day.key, 'closed', !e.target.checked)}
                    disabled={!editing}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Open</span>
                </div>
                {!storeData.businessHours[day.key]?.closed && (
                  <>
                    <input
                      type="time"
                      value={storeData.businessHours[day.key]?.open || '09:00'}
                      onChange={(e) => handleBusinessHoursChange(day.key, 'open', e.target.value)}
                      disabled={!editing}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-gray-500">to</span>
                    <input
                      type="time"
                      value={storeData.businessHours[day.key]?.close || '21:00'}
                      onChange={(e) => handleBusinessHoursChange(day.key, 'close', e.target.value)}
                      disabled={!editing}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Tax Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
            <DollarSign className="w-5 h-5 mr-2" />
            Tax Settings
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                GST Number
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={storeData.taxSettings.gstNumber}
                onChange={(e) => setStoreData({
                  ...storeData,
                  taxSettings: {...storeData.taxSettings, gstNumber: e.target.value}
                })}
                disabled={!editing}
                placeholder="22AAAAA0000A1Z5"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                GST Rate (%)
              </label>
              <input
                type="number"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={storeData.taxSettings.gstRate}
                onChange={(e) => setStoreData({
                  ...storeData,
                  taxSettings: {...storeData.taxSettings, gstRate: parseFloat(e.target.value)}
                })}
                disabled={!editing}
                min="0"
                max="100"
                step="0.01"
              />
            </div>
          </div>
          
          <div className="mt-6">
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={storeData.taxSettings.taxInclusive}
                onChange={(e) => setStoreData({
                  ...storeData,
                  taxSettings: {...storeData.taxSettings, taxInclusive: e.target.checked}
                })}
                disabled={!editing}
                className="rounded border-gray-300"
              />
              <label className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                Prices include tax
              </label>
            </div>
          </div>
        </div>

        {/* Payment Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
            <CreditCard className="w-5 h-5 mr-2" />
            Payment Methods
          </h3>
          
          <div className="space-y-4">
            {Object.entries(storeData.paymentSettings).map(([method, enabled]) => (
              <div key={method} className="flex items-center justify-between">
                <div className="flex items-center">
                  <CreditCard className="w-5 h-5 text-gray-400 mr-3" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                    {method.replace('accept', '').toLowerCase()}
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setStoreData({
                    ...storeData,
                    paymentSettings: {...storeData.paymentSettings, [method]: e.target.checked}
                  })}
                  disabled={!editing}
                  className="rounded border-gray-300"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoreSettings;


