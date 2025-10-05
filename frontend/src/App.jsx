import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute, { AdminRoute, BillingStaffRoute, InventoryStaffRoute } from './components/common/ProtectedRoute';
import { PageLoader } from './components/common/LoadingSpinner';
import Layout from './components/layout/Layout';
import ErrorBoundary from './components/common/ErrorBoundary';

// Lazy load components
const Login = React.lazy(() => import('./pages/auth/Login'));
const Signup = React.lazy(() => import('./pages/auth/Signup'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const PosTerminal = React.lazy(() => import('./components/pos/POSMain'));
const InventoryDashboard = React.lazy(() => import('./components/inventory/InventoryDashboard'));
const AdminDashboard = React.lazy(() => import('./components/admin/AdminDashboard'));
const ProductManagement = React.lazy(() => import('./components/admin/ProductManagement'));
const CustomerManagement = React.lazy(() => import('./components/admin/CustomerManagement'));
const TransactionManagement = React.lazy(() => import('./components/admin/TransactionManagement'));
const Reports = React.lazy(() => import('./components/admin/Reports'));
const Profile = React.lazy(() => import('./components/admin/Profile'));
const StoreSettings = React.lazy(() => import('./components/admin/StoreSettings'));
const SystemSettings = React.lazy(() => import('./components/admin/SystemSettings'));
const TestAPI = React.lazy(() => import('./components/TestAPI'));

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <div className="App min-h-screen bg-gray-50 dark:bg-gray-900">
            <Suspense fallback={<PageLoader />}>
              <Routes>
                  {/* Public Routes */}
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route path="/test" element={<TestAPI />} />
                
                {/* Protected Routes with Layout */}
                <Route 
                  path="/" 
                  element={
                    <ProtectedRoute>
                      <Layout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route path="dashboard" element={<Dashboard />} />
                  
                  <Route 
                    path="pos" 
                    element={
                      <BillingStaffRoute>
                        <PosTerminal />
                      </BillingStaffRoute>
                    } 
                  />
                  
                  <Route 
                    path="inventory" 
                    element={
                      <InventoryStaffRoute>
                        <InventoryDashboard />
                      </InventoryStaffRoute>
                    } 
                  />
                  
                  <Route 
                    path="admin" 
                    element={
                      <AdminRoute>
                        <AdminDashboard />
                      </AdminRoute>
                    } 
                  />
                  
                  <Route 
                    path="products" 
                    element={
                      <ProtectedRoute>
                        <ProductManagement />
                      </ProtectedRoute>
                    } 
                  />
                  
                  <Route 
                    path="customers" 
                    element={
                      <ProtectedRoute>
                        <CustomerManagement />
                      </ProtectedRoute>
                    } 
                  />
                  
                  <Route 
                    path="transactions" 
                    element={
                      <ProtectedRoute>
                        <TransactionManagement />
                      </ProtectedRoute>
                    } 
                  />
                  
                  <Route 
                    path="reports" 
                    element={
                      <ProtectedRoute>
                        <Reports />
                      </ProtectedRoute>
                    } 
                  />
                  
                  <Route 
                    path="settings/profile" 
                    element={
                      <ProtectedRoute>
                        <Profile />
                      </ProtectedRoute>
                    } 
                  />
                  
                  <Route 
                    path="settings/store" 
                    element={
                      <AdminRoute>
                        <StoreSettings />
                      </AdminRoute>
                    } 
                  />
                  
                  <Route 
                    path="settings/system" 
                    element={
                      <AdminRoute>
                        <SystemSettings />
                      </AdminRoute>
                    } 
                  />
                </Route>
                
                {/* Catch all route */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Suspense>
            
            {/* Toast Notifications */}
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#363636',
                  color: '#fff',
                  borderRadius: '8px',
                  padding: '12px 16px',
                },
                success: {
                  style: { background: '#10B981' },
                },
                error: {
                  style: { background: '#EF4444' },
                },
              }}
            />
          </div>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;