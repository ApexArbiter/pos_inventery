import React, { useState } from "react";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";
import logo from "../assets/logo.png";
import { useTheme } from "../contexts/ThemeContext";
import toast from "react-hot-toast";
import { loginUser } from "../utils/functions";
import { useAuth } from "../contexts/AuthContext";

const LoginPage = ({ onLogin, onNavigate }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });

  const { isDark, toggleTheme } = useTheme();
  const { login } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate input
      if (!loginForm.email || !loginForm.password) {
        toast.error("Please enter both email and password.");
        setLoading(false);
        return;
      }

      const userData = {
        email: loginForm.email.trim(),
        password: loginForm.password,
      };

      // Call login API
      const response = await loginUser(userData);
      console.log("Login response:", response);

      // Handle successful response (only authenticated users reach here)
      if (response.success && response.user) {
        localStorage.setItem("user", JSON.stringify(response.user));
        localStorage.setItem("token", response.token);
        // User is authenticated and can access dashboard
        login(response.user); // Pass user data to AuthContext
        toast.success("Login successful! Welcome back.");
        // onLogin will be called by AuthContext or routing logic
      } else {
        // This shouldn't happen with the new backend logic, but just in case
        toast.error(response.message || "Login failed. Please try again.");
      }
    } catch (error) {
      console.error("Login error:", error);

      // Handle different types of errors
      if (error.response) {
        // Server responded with error status
        const errorMessage = error.response.data?.message;

        if (error.response.status === 404) {
          // User not found
          toast.error(
            errorMessage ||
              "User not found. Please check your email or create an account."
          );
        } else if (error.response.status === 401) {
          // Invalid credentials
          toast.error(
            errorMessage || "Invalid credentials. Please check your password."
          );
        } else if (error.response.status === 403) {
          // User not authenticated by admin
          toast.error(
            errorMessage ||
              "You need permission from the admin to access the dashboard."
          );
        } else if (error.response.status === 500) {
          // Server error
          toast.error("Server error. Please try again later.");
        } else {
          // Other errors
          toast.error(errorMessage || "Login failed. Please try again.");
        }
      } else if (error.request) {
        // Network error
        toast.error(
          "Network error. Please check your connection and try again."
        );
      } else {
        // Other errors
        toast.error("An unexpected error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4 transition-colors duration-300">
      <div className="max-w-md w-full">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="w-40 h-28 flex items-center justify-center mx-auto mb-4 transform transition-transform duration-200 hover:scale-105">
            <img src={logo} alt="POS Logo" className="h-40 w-40 rounded-2xl" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
            Welcome Back
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Sign in to POS Dashboard
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700 transition-all duration-300">
          <form onSubmit={handleLogin} className="space-y-6">
            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="email"
                  required
                  value={loginForm.email}
                  onChange={(e) =>
                    setLoginForm({ ...loginForm, email: e.target.value })
                  }
                  className="w-full pl-11 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-200"
                  placeholder="Enter your email"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={loginForm.password}
                  onChange={(e) =>
                    setLoginForm({ ...loginForm, password: e.target.value })
                  }
                  className="w-full pl-11 pr-12 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-200"
                  placeholder="Enter your password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200"
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-3 px-4 rounded-xl font-medium hover:from-orange-600 hover:to-orange-700 focus:ring-4 focus:ring-orange-500/25 transform transition-all duration-200 hover:scale-[1.02] shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? "Signing In..." : "Sign In"}
            </button>
          </form>

          {/* Register Link */}
          <div className="mt-6 text-center">
            <p className="text-gray-600 dark:text-gray-400">
              Don't have an account?{" "}
              <button
                onClick={() => onNavigate("register")}
                className="text-orange-600 hover:text-orange-500 dark:text-orange-400 dark:hover:text-orange-300 font-medium transition-colors duration-200"
                disabled={loading}
              >
                Create Account
              </button>
            </p>
          </div>
        </div>

        {/* Theme Toggle */}
        <div className="text-center mt-6">
          <button
            onClick={toggleTheme}
            className="text-gray-500 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors duration-200"
            disabled={loading}
          >
            Switch to {isDark ? "Light" : "Dark"} Mode
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
