import axios from 'axios';
import toast from 'react-hot-toast';

// Base URL configuration
const BASE_URL =  'https://pos-inventery.onrender.com/api';
// const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance
const axiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30000, // 30 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    // Add auth token to requests
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add store ID to requests if available
    const storeId = localStorage.getItem('storeId');
    if (storeId) {
      config.headers['X-Store-ID'] = storeId;
    }

    // Log request in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`📤 ${config.method?.toUpperCase()} ${config.url}`, config.data || config.params);
    }

    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
axiosInstance.interceptors.response.use(
  (response) => {
    // Log response in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`📥 ${response.config.method?.toUpperCase()} ${response.config.url}`, response.data);
    }

    return response;
  },
  (error) => {
    const { response, request, message } = error;

    // Handle different error scenarios
    if (response) {
      // Server responded with error status
      const { status, data } = response;
      
      switch (status) {
        case 401:
          // Unauthorized - clear auth data and redirect to login
          localStorage.removeItem('authToken');
          localStorage.removeItem('user');
          localStorage.removeItem('storeId');
          
          // Only show toast if not already on login page
          if (!window.location.pathname.includes('/login')) {
            toast.error('Session expired. Please login again.');
            window.location.href = '/login';
          }
          break;
          
        case 403:
          // Forbidden - insufficient permissions
          toast.error(data.message || 'You don\'t have permission to perform this action');
          break;
          
        case 404:
          // Not found
          if (!data.message?.includes('favicon')) { // Ignore favicon 404s
            toast.error(data.message || 'Resource not found');
          }
          break;
          
        case 422:
          // Validation error
          if (data.errors && Array.isArray(data.errors)) {
            data.errors.forEach(err => toast.error(err.message || err));
          } else {
            toast.error(data.message || 'Validation failed');
          }
          break;
          
        case 429:
          // Rate limit exceeded
          toast.error('Too many requests. Please wait a moment and try again.');
          break;
          
        case 500:
          // Internal server error
          toast.error('Server error. Please try again later.');
          break;
          
        case 502:
        case 503:
        case 504:
          // Service unavailable
          toast.error('Service temporarily unavailable. Please try again later.');
          break;
          
        default:
          // Other errors
          toast.error(data.message || `Request failed with status ${status}`);
      }
      
      // Log error in development
      if (process.env.NODE_ENV === 'development') {
        console.error(`❌ ${response.config.method?.toUpperCase()} ${response.config.url}`, {
          status,
          data,
          headers: response.headers,
        });
      }
      
    } else if (request) {
      // Network error
      if (message.includes('timeout')) {
        toast.error('Request timeout. Please check your connection and try again.');
      } else if (message.includes('Network Error')) {
        toast.error('Network error. Please check your internet connection.');
      } else {
        toast.error('Unable to connect to server. Please try again.');
      }
      
      console.error('Network error:', message);
      
    } else {
      // Request setup error
      toast.error('Request configuration error');
      console.error('Request setup error:', message);
    }

    return Promise.reject(error);
  }
);

// API helper methods
export const api = {
  // Authentication
  auth: {
    login: (credentials) => axiosInstance.post('/auth/login', credentials),
    register: (userData) => axiosInstance.post('/auth/register', userData),
    logout: () => axiosInstance.post('/auth/logout'),
    getMe: () => axiosInstance.get('/auth/me'),
    refreshToken: () => axiosInstance.post('/auth/refresh'),
    forgotPassword: (email) => axiosInstance.post('/auth/forgot-password', { email }),
    resetPassword: (token, password) => axiosInstance.post('/auth/reset-password', { token, password }),
    changePassword: (data) => axiosInstance.put('/auth/change-password', data),
    verifyEmail: (token) => axiosInstance.post('/auth/verify-email', { token }),
  },

  // User management
  users: {
    getAll: (params) => axiosInstance.get('/users', { params }),
    getById: (id) => axiosInstance.get(`/users/${id}`),
    create: (userData) => axiosInstance.post('/users', userData),
    update: (id, userData) => axiosInstance.put(`/users/${id}`, userData),
    delete: (id) => axiosInstance.delete(`/users/${id}`),
    updateStatus: (id, status) => axiosInstance.patch(`/users/${id}/status`, { status }),
    updateRole: (id, role, permissions) => axiosInstance.patch(`/users/${id}/role`, { role, permissions }),
  },

  // Store management
  stores: {
    getAll: () => axiosInstance.get('/stores'),
    getById: (id) => axiosInstance.get(`/stores/${id}`),
    create: (storeData) => axiosInstance.post('/stores', storeData),
    update: (id, storeData) => axiosInstance.put(`/stores/${id}`, storeData),
    delete: (id) => axiosInstance.delete(`/stores/${id}`),
    getSettings: (id) => axiosInstance.get(`/stores/${id}/settings`),
    updateSettings: (id, settings) => axiosInstance.put(`/stores/${id}/settings`, settings),
    getBranding: (id) => axiosInstance.get(`/stores/${id}/branding`),
    updateBranding: (id, branding) => axiosInstance.put(`/stores/${id}/branding`, branding),
    getAnalytics: (id, params) => axiosInstance.get(`/stores/${id}/analytics`, { params }),
  },

  // Product management
  products: {
    getAll: (params) => axiosInstance.get('/products', { params }),
    getById: (id) => axiosInstance.get(`/products/${id}`),
    create: (productData) => axiosInstance.post('/products', productData),
    update: (id, productData) => axiosInstance.put(`/products/${id}`, productData),
    delete: (id) => axiosInstance.delete(`/products/${id}`),
    search: (params) => axiosInstance.get('/products/search', { params }),
    getByBarcode: (barcode) => axiosInstance.get(`/products/barcode/${barcode}`),
    uploadImages: (id, formData) => axiosInstance.post(`/products/${id}/images`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
    removeImage: (id, imageId) => axiosInstance.delete(`/products/${id}/images/${imageId}`),
    bulkUpload: (formData) => axiosInstance.post('/products/bulk-upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
    getCategories: () => axiosInstance.get('/products/categories'),
    getBrands: () => axiosInstance.get('/products/brands'),
  },

  // Inventory management
  inventory: {
    getLevels: (params) => axiosInstance.get('/inventory/levels', { params }),
    getByProduct: (productId) => axiosInstance.get(`/inventory/product/${productId}`),
    adjust: (adjustmentData) => axiosInstance.post('/inventory/adjust', adjustmentData),
    getMovements: (params) => axiosInstance.get('/inventory/movements', { params }),
    getLowStock: (params) => axiosInstance.get('/inventory/low-stock', { params }),
    getOutOfStock: (params) => axiosInstance.get('/inventory/out-of-stock', { params }),
    transferStock: (transferData) => axiosInstance.post('/inventory/transfer', transferData),
    getReports: (params) => axiosInstance.get('/inventory/reports', { params }),
    updateReorderPoint: (productId, reorderPoint) => axiosInstance.patch(`/inventory/reorder-point/${productId}`, { reorderPoint }),
    getValue: () => axiosInstance.get('/inventory/value'),
  },

  // Billing and transactions
  billing: {
    createTransaction: (transactionData) => axiosInstance.post('/billing/transactions', transactionData),
    getTransaction: (id) => axiosInstance.get(`/billing/transactions/${id}`),
    updateTransaction: (id, transactionData) => axiosInstance.put(`/billing/transactions/${id}`, transactionData),
    deleteTransaction: (id) => axiosInstance.delete(`/billing/transactions/${id}`),
    getAllTransactions: (params) => axiosInstance.get('/billing/transactions', { params }),
    getTransactionsByDateRange: (params) => axiosInstance.get('/billing/transactions/date-range', { params }),
    getSalesReports: (params) => axiosInstance.get('/billing/reports/sales', { params }),
    sendBillViaWhatsApp: (id, imageData) => axiosInstance.post(`/billing/transactions/${id}/whatsapp`, { imageData }),
    processReturn: (id, returnData) => axiosInstance.post(`/billing/transactions/${id}/return`, returnData),
    getDailySummary: (date) => axiosInstance.get(`/billing/daily-summary/${date}`),
  },

  // Customer management
  customers: {
    getAll: (params) => axiosInstance.get('/customers', { params }),
    getById: (id) => axiosInstance.get(`/customers/${id}`),
    create: (customerData) => axiosInstance.post('/customers', customerData),
    update: (id, customerData) => axiosInstance.put(`/customers/${id}`, customerData),
    delete: (id) => axiosInstance.delete(`/customers/${id}`),
    search: (params) => axiosInstance.get('/customers/search', { params }),
    getLoyaltyPoints: (id) => axiosInstance.get(`/customers/${id}/loyalty`),
    updateLoyaltyPoints: (id, points) => axiosInstance.patch(`/customers/${id}/loyalty`, { points }),
    getPurchaseHistory: (id, params) => axiosInstance.get(`/customers/${id}/purchases`, { params }),
  },

  // Categories
  categories: {
    getAll: (params) => axiosInstance.get('/categories', { params }),
    getById: (id) => axiosInstance.get(`/categories/${id}`),
    create: (categoryData) => axiosInstance.post('/categories', categoryData),
    update: (id, categoryData) => axiosInstance.put(`/categories/${id}`, categoryData),
    delete: (id) => axiosInstance.delete(`/categories/${id}`),
    getHierarchy: () => axiosInstance.get('/categories/hierarchy'),
  },

  // Subscriptions
  subscriptions: {
    getPlans: () => axiosInstance.get('/subscriptions/plans'),
    getStoreSubscription: (storeId) => axiosInstance.get(`/subscriptions/store/${storeId}`),
    assignToStore: (storeId, planId) => axiosInstance.post(`/subscriptions/assign`, { storeId, planId }),
    renewSubscription: (subscriptionId) => axiosInstance.post(`/subscriptions/${subscriptionId}/renew`),
    upgradeSubscription: (subscriptionId, newPlanId) => axiosInstance.post(`/subscriptions/${subscriptionId}/upgrade`, { planId: newPlanId }),
    checkFeatureAccess: (feature) => axiosInstance.get(`/subscriptions/feature/${feature}`),
    getUsageStats: (storeId) => axiosInstance.get(`/subscriptions/usage/${storeId}`),
  },

  // Admin analytics
  admin: {
    getStats: (params) => axiosInstance.get('/admin/stats', { params }),
    getSalesAnalytics: (params) => axiosInstance.get('/admin/analytics/sales', { params }),
    getOrdersAnalytics: (params) => axiosInstance.get('/admin/analytics/orders', { params }),
    getProductsAnalytics: (params) => axiosInstance.get('/admin/analytics/products', { params }),
    getCustomersAnalytics: (params) => axiosInstance.get('/admin/analytics/customers', { params }),
    getRecentActivity: (params) => axiosInstance.get('/admin/activity/recent', { params }),
    getAlerts: () => axiosInstance.get('/admin/alerts'),
    getPerformance: (params) => axiosInstance.get('/admin/performance', { params }),
    exportReport: (params) => axiosInstance.get('/admin/reports/export', { 
      params,
      responseType: 'blob'
    }),
  },

  // Revenue tracking
  revenue: {
    getRevenue: (params) => axiosInstance.get('/revenue', { params }),
    getTodayRevenue: () => axiosInstance.get('/revenue?period=today'),
    getWeekRevenue: () => axiosInstance.get('/revenue?period=week'),
    getMonthRevenue: () => axiosInstance.get('/revenue?period=month'),
  },

  // File uploads
  uploads: {
    uploadImage: (file, folder = 'general') => {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('folder', folder);
      return axiosInstance.post('/uploads/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    },
    uploadFile: (file, folder = 'documents') => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folder);
      return axiosInstance.post('/uploads/file', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    },
    deleteFile: (fileUrl) => axiosInstance.delete('/uploads/delete', { data: { fileUrl } }),
  },
};

// Utility functions
export const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem('authToken', token);
    axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    localStorage.removeItem('authToken');
    delete axiosInstance.defaults.headers.common['Authorization'];
  }
};

export const setStoreId = (storeId) => {
  if (storeId) {
    localStorage.setItem('storeId', storeId);
    axiosInstance.defaults.headers.common['X-Store-ID'] = storeId;
  } else {
    localStorage.removeItem('storeId');
    delete axiosInstance.defaults.headers.common['X-Store-ID'];
  }
};

export const clearAuthData = () => {
  localStorage.removeItem('authToken');
  localStorage.removeItem('user');
  localStorage.removeItem('storeId');
  delete axiosInstance.defaults.headers.common['Authorization'];
  delete axiosInstance.defaults.headers.common['X-Store-ID'];
};

export default axiosInstance;