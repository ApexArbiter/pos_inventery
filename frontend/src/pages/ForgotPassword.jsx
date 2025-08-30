import React, { useState } from "react";
import { Mail, ArrowLeft, ChefHat } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";
import toast from "react-hot-toast";

const ForgotPasswordPage = ({ onNavigate }) => {
  const [loading, setLoading] = useState(false);
  const [forgotForm, setForgotForm] = useState({ email: "" });

  const { isDark, toggleTheme } = useTheme();

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Simulate API call - replace with your actual forgot password logic
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Here you would typically call your forgot password API
      // const response = await forgotPasswordAPI(forgotForm.email);

      toast.success("Password reset instructions sent to your email!");
      
      // Reset form
      setForgotForm({ email: "" });
      
      // Navigate back to login
      onNavigate("login");
    } catch (error) {
      console.error("Forgot password error:", error);
      toast.error("Failed to send reset instructions. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4 transition-colors duration-300">
      <div className="max-w-md w-full">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg transform transition-transform duration-200 hover:scale-105">
            <ChefHat className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
            Reset Password
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Enter your email to receive reset instructions
          </p>
        </div>

        {/* Forgot Password Form */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700 transition-all duration-300">
          <form onSubmit={handleForgotPassword} className="space-y-6">
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
                  value={forgotForm.email}
                  onChange={(e) =>
                    setForgotForm({ ...forgotForm, email: e.target.value })
                  }
                  className="w-full pl-11 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-200"
                  placeholder="Enter your email"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Send Reset Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-3 px-4 rounded-xl font-medium hover:from-orange-600 hover:to-orange-700 focus:ring-4 focus:ring-orange-500/25 transform transition-all duration-200 hover:scale-[1.02] shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? "Sending..." : "Send Reset Instructions"}
            </button>
          </form>

          {/* Back to Login */}
          <div className="mt-6 text-center">
            <button
              onClick={() => onNavigate("login")}
              className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 font-medium transition-colors duration-200"
              disabled={loading}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Sign In
            </button>
          </div>
        </div>

        {/* Theme Toggle for Forgot Password Page */}
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

export default ForgotPasswordPage;