import React from "react";
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  MessageSquare,
  FileText,
  Settings,
  Bell,
  Moon,
  Sun,
  ChefHat,
  LogOut,
} from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";
import logo from "../assets/logo.png";
import Loader from "./Loader";
import { useAuth } from "../contexts/AuthContext";
import axiosInstance from "../api/axiosInstance";

const Layout = ({ children, currentPage, onPageChange }) => {
  const { isDark, toggleTheme } = useTheme();
  const { isLoading, logout, user } = useAuth(); // Assuming useAuth is imported from AuthContext

  // Define all menu items
  const allMenuItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      adminOnly: true,
    },
    { id: "orders", label: "Orders", icon: ShoppingCart, adminOnly: false },
    { id: "dishes", label: "Dishes", icon: ChefHat, adminOnly: false },
    { id: "customers", label: "Users", icon: Users, adminOnly: true },
    { id: "queries", label: "Queries", icon: MessageSquare, adminOnly: false },
    // { id: "invoices", label: "Invoices", icon: FileText, adminOnly: false },
    { id: "settings", label: "Documents", icon: FileText, adminOnly: true },
  ];

  // Filter menu items based on user role
  const menuItems = allMenuItems.filter((item) => {
    if (item.adminOnly) {
      return user?.role === "admin";
    }
    return true;
  });

  const handleLogout = () => {
    if (logout) {
      logout();
    }
  };

  const handleSendRequest = async () => {
    try {
      const response = await axiosInstance.get("/orders/test-whatsapp");
      console.log(response.data);
    } catch (err) {
      console.error("Error fetching orders:", err);
    } finally {
    }
  };

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900 flex transition-all duration-300 overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 bg-white dark:bg-gray-800 shadow-xl flex-shrink-0 border-r border-gray-200 dark:border-gray-700 transition-all duration-300">
        <div className="py-2 px-2 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="   transform transition-transform duration-200 hover:scale-105">
              <img className="w-20 h-20 object-contain" src={logo} alt="Logo" />
            </div>

            <div>
              <h1 className="text-xl font-bold text-gray-800 dark:text-white transition-colors duration-200">
                Raza Catering
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 transition-colors duration-200">
                Bill Management
              </p>
            </div>
          </div>
        </div>

        <nav className="mt-6 overflow-y-auto flex-1 px-3">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onPageChange(item.id)}
                className={`w-full flex items-center px-4 py-3 mb-1 text-left rounded-xl transition-all duration-200 transform hover:scale-[1.02] group ${
                  currentPage === item.id
                    ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/25"
                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-white"
                }`}
                style={{
                  animationDelay: `${index * 50}ms`,
                }}
              >
                <Icon
                  className={`w-5 h-5 mr-3 transition-all duration-200 ${
                    currentPage === item.id
                      ? "text-white"
                      : "text-gray-500 dark:text-gray-400 group-hover:text-orange-500 dark:group-hover:text-orange-400"
                  }`}
                />
                <span className="font-medium">{item.label}</span>
                {currentPage === item.id && (
                  <div className="ml-auto w-1 h-4 bg-white rounded-full opacity-80"></div>
                )}
              </button>
            );
          })}
        </nav>
        {/* <button onClick={handleSendRequest}>
          Send Request to WhatsApp Test API
        </button> */}

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-center">
            <div className="w-8 h-1 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex-shrink-0 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white capitalize transition-colors duration-200">
                {currentPage}
              </h2>
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={toggleTheme}
                className="p-2.5 text-gray-500 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all duration-200 transform hover:scale-105"
                title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
              >
                <div className="relative">
                  {isDark ? (
                    <Sun className="w-5 h-5 animate-in spin-in-180 duration-300" />
                  ) : (
                    <Moon className="w-5 h-5 animate-in spin-in-180 duration-300" />
                  )}
                </div>
              </button>

              {/* <button className="relative p-2.5 text-gray-500 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all duration-200 transform hover:scale-105 group">
                <Bell className="w-5 h-5" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse">
                  <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-75"></div>
                </div>
              </button> */}

              <div className="flex items-center space-x-3 ml-4 pl-4 border-l border-gray-200 dark:border-gray-700">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center shadow-lg transform transition-all duration-200 hover:scale-105 cursor-pointer group">
                  <span className="text-white text-sm font-bold group-hover:scale-110 transition-transform duration-200">
                    {user?.fullName?.charAt(0) || "A"}
                  </span>
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-gray-800 dark:text-white">
                    {user?.fullName || "Admin User"}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {user?.role === "admin"
                      ? "Admin"
                      : user?.role === "user"
                      ? "Management Staff"
                      : "Unknown Role"}
                  </p>
                </div>

                {/* Beautiful Logout Button - Always visible now */}
                <button
                  onClick={handleLogout}
                  className="group flex items-center space-x-2 px-4 py-2 ml-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-sm font-medium rounded-lg shadow-lg shadow-red-500/25 transition-all duration-200 transform hover:scale-105 hover:shadow-red-500/40"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                  <span className="hidden lg:inline">Logout</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-y-auto bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {children}
          </div>
        </main>
      </div>
      <Loader loading={isLoading} />
    </div>
  );
};

export default Layout;
