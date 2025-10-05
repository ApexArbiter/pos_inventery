import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { api, setAuthToken, setStoreId, clearAuthData } from '../api/axiosInstance';
import toast from 'react-hot-toast';

// Auth states
const authStates = {
  IDLE: 'idle',
  LOADING: 'loading',
  AUTHENTICATED: 'authenticated',
  UNAUTHENTICATED: 'unauthenticated',
  ERROR: 'error',
};

// Initial auth state
const initialState = {
  status: authStates.IDLE,
  user: null,
  store: null,
  permissions: [],
  token: null,
  error: null,
  loading: false,
};

// Auth action types
const actionTypes = {
  SET_LOADING: 'SET_LOADING',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',
  LOGOUT: 'LOGOUT',
  REFRESH_USER: 'REFRESH_USER',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  UPDATE_USER: 'UPDATE_USER',
  UPDATE_STORE: 'UPDATE_STORE',
};

// Auth reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case actionTypes.SET_LOADING:
      return {
        ...state,
        loading: action.payload,
        error: null,
      };

    case actionTypes.LOGIN_SUCCESS:
      return {
        ...state,
        status: authStates.AUTHENTICATED,
        user: action.payload?.user,
        store: action.payload?.store,
        permissions: action.payload?.user?.permissions || [],
        token: action.payload?.token,
        loading: false,
        error: null,
      };

    case actionTypes.LOGIN_FAILURE:
      return {
        ...state,
        status: authStates.UNAUTHENTICATED,
        user: null,
        store: null,
        permissions: [],
        token: null,
        loading: false,
        error: action.payload,
      };

    case actionTypes.LOGOUT:
      return {
        ...initialState,
        status: authStates.UNAUTHENTICATED,
      };

    case actionTypes.REFRESH_USER:
      return {
        ...state,
        user: action.payload?.user,
        store: action.payload?.store,
        permissions: action.payload?.user?.permissions || [],
      };

    case actionTypes.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        loading: false,
      };

    case actionTypes.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };

    case actionTypes.UPDATE_USER:
      return {
        ...state,
        user: { ...state.user, ...action.payload },
      };

    case actionTypes.UPDATE_STORE:
      return {
        ...state,
        store: { ...state.store, ...action.payload },
      };

    default:
      return state;
  }
};

// Create auth context
const AuthContext = createContext();

// Auth provider component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Initialize auth state on app load
  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    const token = localStorage.getItem('authToken');
    const userData = localStorage.getItem('user');
    const storeId = localStorage.getItem('storeId');

    if (token && userData) {
      try {
        dispatch({ type: actionTypes.SET_LOADING, payload: true });
        
        // Set token in axios defaults
        setAuthToken(token);
        if (storeId) {
          setStoreId(storeId);
        }

        // Verify token and get fresh user data
        const response = await api.auth.getMe();
        
        if (response.data.success) {
          const { user, store } = response.data.data;
          
          // Update local storage with fresh data
          localStorage.setItem('user', JSON.stringify(user));
          if (store) {
            localStorage.setItem('storeId', store._id);
            setStoreId(store._id);
          }

          dispatch({
            type: actionTypes.LOGIN_SUCCESS,
            payload: { user, store, token },
          });
        } else {
          throw new Error('Token verification failed');
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        clearAuthData();
        dispatch({ type: actionTypes.LOGOUT });
      } finally {
        dispatch({ type: actionTypes.SET_LOADING, payload: false });
      }
    } else {
      dispatch({ type: actionTypes.LOGOUT });
    }
  };

  // Login function
  const login = async (credentials) => {
    try {
      dispatch({ type: actionTypes.SET_LOADING, payload: true });
      dispatch({ type: actionTypes.CLEAR_ERROR });

      const response = await api.auth.login(credentials);
      
      if (response.data.success) {
        const { user, store, token } = response.data.data;

        // Store auth data
        localStorage.setItem('authToken', token);
        localStorage.setItem('user', JSON.stringify(user));
        
        if (store) {
          localStorage.setItem('storeId', store._id);
          setStoreId(store._id);
        }

        setAuthToken(token);

        dispatch({
          type: actionTypes.LOGIN_SUCCESS,
          payload: { user, store, token },
        });

        toast.success(`Welcome back, ${user?.fullName || user?.name || 'User'}!`);
        return { success: true, user, store };
      } else {
        throw new Error(response.data.message || 'Login failed');
      }
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Login failed';
      dispatch({ type: actionTypes.LOGIN_FAILURE, payload: message });
      toast.error(message);
      return { success: false, error: message };
    }
  };

  // Register function
  const register = async (userData) => {
    try {
      dispatch({ type: actionTypes.SET_LOADING, payload: true });
      dispatch({ type: actionTypes.CLEAR_ERROR });

      const response = await api.auth.register(userData);
      
      if (response.data.success) {
        toast.success('Registration successful! Please verify your email.');
        return { success: true, data: response.data };
      } else {
        throw new Error(response.data.message || 'Registration failed');
      }
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Registration failed';
      dispatch({ type: actionTypes.SET_ERROR, payload: message });
      toast.error(message);
      return { success: false, error: message };
    } finally {
      dispatch({ type: actionTypes.SET_LOADING, payload: false });
    }
  };

  // Logout function
  const logout = async () => {
    try {
      // Call logout API (don't wait for response)
      api.auth.logout().catch(() => {});
      
      // Clear local data immediately
      clearAuthData();
      dispatch({ type: actionTypes.LOGOUT });
      
      toast.success('Logged out successfully');
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear local data even if API call fails
      clearAuthData();
      dispatch({ type: actionTypes.LOGOUT });
      return { success: true };
    }
  };

  // Refresh user data
  const refreshUser = async () => {
    try {
      const response = await api.auth.getMe();
      
      if (response.data.success) {
        const { user, store } = response.data.data;
        
        // Update local storage
        localStorage.setItem('user', JSON.stringify(user));
        if (store) {
          localStorage.setItem('storeId', store._id);
          setStoreId(store._id);
        }

        dispatch({
          type: actionTypes.REFRESH_USER,
          payload: { user, store },
        });

        return { success: true, user, store };
      } else {
        throw new Error('Failed to refresh user data');
      }
    } catch (error) {
      console.error('Refresh user error:', error);
      // If refresh fails, might be invalid token
      if (error.response?.status === 401) {
        logout();
      }
      return { success: false, error: error.message };
    }
  };

  // Update user profile
  const updateProfile = async (profileData) => {
    try {
      dispatch({ type: actionTypes.SET_LOADING, payload: true });

      const response = await api.auth.updateProfile(profileData);
      
      if (response.data.success) {
        const updatedUser = response.data.user;
        
        // Update local storage
        localStorage.setItem('user', JSON.stringify(updatedUser));

        dispatch({
          type: actionTypes.UPDATE_USER,
          payload: updatedUser,
        });

        toast.success('Profile updated successfully');
        return { success: true, user: updatedUser };
      } else {
        throw new Error(response.data.message || 'Failed to update profile');
      }
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Failed to update profile';
      toast.error(message);
      return { success: false, error: message };
    } finally {
      dispatch({ type: actionTypes.SET_LOADING, payload: false });
    }
  };

  // Change password
  const changePassword = async (passwordData) => {
    try {
      dispatch({ type: actionTypes.SET_LOADING, payload: true });

      const response = await api.auth.changePassword(passwordData);
      
      if (response.data.success) {
        toast.success('Password changed successfully');
        return { success: true };
      } else {
        throw new Error(response.data.message || 'Failed to change password');
      }
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Failed to change password';
      toast.error(message);
      return { success: false, error: message };
    } finally {
      dispatch({ type: actionTypes.SET_LOADING, payload: false });
    }
  };

  // Forgot password
  const forgotPassword = async (email) => {
    try {
      dispatch({ type: actionTypes.SET_LOADING, payload: true });

      const response = await api.auth.forgotPassword(email);
      
      if (response.data.success) {
        toast.success('Password reset email sent. Please check your inbox.');
        return { success: true };
      } else {
        throw new Error(response.data.message || 'Failed to send reset email');
      }
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Failed to send reset email';
      toast.error(message);
      return { success: false, error: message };
    } finally {
      dispatch({ type: actionTypes.SET_LOADING, payload: false });
    }
  };

  // Reset password
  const resetPassword = async (token, password) => {
    try {
      dispatch({ type: actionTypes.SET_LOADING, payload: true });

      const response = await api.auth.resetPassword(token, password);
      
      if (response.data.success) {
        toast.success('Password reset successful. Please login with your new password.');
        return { success: true };
      } else {
        throw new Error(response.data.message || 'Failed to reset password');
      }
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Failed to reset password';
      toast.error(message);
      return { success: false, error: message };
    } finally {
      dispatch({ type: actionTypes.SET_LOADING, payload: false });
    }
  };

  // Check if user has permission
  const hasPermission = (permission) => {
    if (!state.user) return false;
    
    // Super admin has all permissions
    if (state.user.role === 'super_admin') return true;
    
    // Check if user has specific permission
    return state.permissions.includes(permission);
  };

  // Check if user has role
  const hasRole = (role) => {
    if (!state.user) return false;
    
    // Handle array of roles
    if (Array.isArray(role)) {
      return role.includes(state.user.role);
    }
    
    return state.user.role === role;
  };

  // Check if user can access store
  const canAccessStore = (storeId) => {
    if (!state.user) return false;
    
    // Super admin can access all stores
    if (state.user.role === 'super_admin') return true;
    
    // Check if user belongs to the store
    return state.user.storeId === storeId;
  };

  // Get user's accessible features based on role and permissions
  const getAccessibleFeatures = () => {
    if (!state.user) return [];
    
    const features = [];
    
    // Add features based on permissions
    if (hasPermission('view_dashboard')) features.push('dashboard');
    if (hasPermission('manage_products')) features.push('products');
    if (hasPermission('manage_inventory')) features.push('inventory');
    if (hasPermission('process_bills')) features.push('pos');
    if (hasPermission('manage_customers')) features.push('customers');
    if (hasPermission('view_reports')) features.push('reports');
    if (hasPermission('manage_users')) features.push('users');
    if (hasPermission('manage_store')) features.push('store');
    if (hasPermission('manage_subscription')) features.push('subscription');
    if (hasPermission('view_analytics')) features.push('analytics');
    
    return features;
  };

  // Auth context value
  const value = {
    // State
    ...state,
    isAuthenticated: state.status === authStates.AUTHENTICATED,
    isLoading: state.loading || state.status === authStates.LOADING,
    
    // Actions
    login,
    register,
    logout,
    refreshUser,
    updateProfile,
    changePassword,
    forgotPassword,
    resetPassword,
    
    // Utilities
    hasPermission,
    hasRole,
    canAccessStore,
    getAccessibleFeatures,
    
    // State management
    clearError: () => dispatch({ type: actionTypes.CLEAR_ERROR }),
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;