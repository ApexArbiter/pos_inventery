import React from "react";
import { useState } from "react";
import { ThemeProvider } from "./contexts/ThemeContext";
import Layout from "./components/Layout.jsx";
import Dashboard from "./components/Dashboard";
import Orders from "./components/Orders";
import Dishes from "./components/Dishes.jsx";
import Customers from "./components/Users.jsx";
import Queries from "./components/Queries";
import Invoices from "./components/Invoices";
import Settings from "./components/Settings.jsx";
import AuthPages from "./pages/AuthPages.jsx";
import { useAuth } from "./contexts/AuthContext.jsx";
import WhatsAppSettings from "./components/WhatsAppSettings.jsx";

function App() {
  const { user, logout, isAuthenticated, isLoading } = useAuth();

  // Fix: Add null check for user before accessing role
  const [currentPage, setCurrentPage] = useState(
    user?.role === "admin" ? "dashboard" : "orders"
  );

  // Simplified logout handler - let AuthContext handle the authentication state
  const handleLogout = () => {
    logout(); // This will handle all the cleanup in AuthContext
    setCurrentPage("orders"); // Reset to orders (safer default for all users)
  };

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        // Additional check: only render dashboard if user is admin
        return user?.role === "admin" ? <Dashboard /> : <Orders />;
      case "orders":
        return <Orders />;
      case "dishes":
        return <Dishes />;
      case "customers":
        return <Customers />;
      case "queries":
        return <Queries />;
      case "invoices":
        return <Invoices />;
      case "whatsapp":
        return <WhatsAppSettings />;
      case "settings":
        // Additional check: only render settings if user is admin
        return user?.role === "admin" ? <Settings /> : <Orders />;
      default:
        // Default to orders instead of dashboard for better compatibility
        return <Orders />;
    }
  };

  const handlePageChange = (page) => {
    // Check if the page requires admin access
    const adminOnlyPages = ["dashboard", "customers", "invoices", "settings"];

    if (adminOnlyPages.includes(page) && user?.role !== "admin") {
      // Don't change the page for non-admin users trying to access admin pages
      console.log(`Access denied: ${page} requires admin privileges`);
      return; // Early return prevents setCurrentPage from being called
    }

    // Allow navigation for valid pages
    setCurrentPage(page);
  };

  // Check if current user is on an admin page and redirect them
  React.useEffect(() => {
    const adminOnlyPages = ["dashboard", "customers", "invoices", "settings"];

    if (user?.role !== "admin" && adminOnlyPages.includes(currentPage)) {
      console.log(
        `Redirecting non-admin user from ${currentPage} to orders page`
      );
      setCurrentPage("orders");
    }
  }, [user, currentPage]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-500"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, show auth pages
  if (!isAuthenticated) {
    // Remove the onLogin prop - let AuthContext handle login state
    return <AuthPages />;
  }

  // If authenticated, show the main dashboard
  return (
    <Layout
      currentPage={currentPage}
      onPageChange={handlePageChange}
      user={user}
      onLogout={handleLogout}
    >
      {renderPage()}
    </Layout>
  );
}

export default App;
