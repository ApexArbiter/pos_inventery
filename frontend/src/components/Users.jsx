import React, { useState, useEffect } from "react";
import {
  Plus,
  Search,
  Edit,
  User,
  X,
  MapPin,
  Mail,
  Shield,
  ShieldOff,
} from "lucide-react";
import axiosInstance from "../api/axiosInstance";
import toast from "react-hot-toast";
import { RefreshCcw } from "lucide-react";

const Users = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fixed useEffect - removed the async wrapper issue
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);

        // Check if user is authenticated first
        const token = localStorage.getItem("token");
        if (!token) {
          toast.error("Authentication token not found. Please login again.");
          return;
        }

        const response = await axiosInstance.get("/user/all");
        console.log("Users response:", response);

        if (response.data) {
          setUsers(response.data);
        }
      } catch (error) {
        console.error("Error fetching users:", error);

        if (error.response?.status === 401) {
          toast.error("Authentication expired. Please login again.");
          // Optionally redirect to login or clear invalid tokens
          localStorage.removeItem("token");
          localStorage.removeItem("user");
        } else if (error.response?.status === 403) {
          toast.error("You don't have permission to view users.");
        } else {
          toast.error("Failed to fetch users. Please try again.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const filteredUsers = users.filter(
    (user) =>
      user.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.branch?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // API call to toggle authentication status
  const toggleAuthStatus = async (userId) => {
    try {
      const response = await axiosInstance.patch(`/user/auth/${userId}`);

      if (response.status === 200) {
        toast.success(response.data.message);
        const data = response.data;

        setUsers((prevUsers) =>
          prevUsers.map((user) =>
            user._id === userId
              ? { ...user, isAuthenticated: data.user.isAuthenticated }
              : user
          )
        );
        console.log(data.message);
      } else {
        console.error("Failed to update authentication status");
        toast.error("Failed to update authentication status");
      }
    } catch (error) {
      console.error("Error toggling auth status:", error);

      if (error.response?.status === 401) {
        toast.error("Authentication expired. Please login again.");
      } else if (error.response?.status === 403) {
        toast.error("You don't have permission to perform this action.");
      } else {
        toast.error("Failed to update authentication status");
      }
    }
  };

  // API call to update user details
  const updateUserDetails = async (userId, userData) => {
    try {
      const response = await axiosInstance.put(
        `/user/update/${userId}`,
        userData
      );

      if (response.status === 200) {
        toast.success("User details updated successfully");
        setUsers((prevUsers) =>
          prevUsers.map((user) =>
            user._id === userId ? { ...user, ...userData } : user
          )
        );
        return true;
      } else {
        console.error("Failed to update user details");
        toast.error("Failed to update user details");
        return false;
      }
    } catch (error) {
      console.error("Error updating user:", error);

      if (error.response?.status === 401) {
        toast.error("Authentication expired. Please login again.");
      } else if (error.response?.status === 403) {
        toast.error("You don't have permission to perform this action.");
      } else {
        toast.error("Failed to update user details");
      }
      return false;
    }
  };

  const handleEditUser = async (userData) => {
    const success = await updateUserDetails(editingUser._id, userData);
    if (success) {
      setShowEditModal(false);
      setEditingUser(null);
    }
  };

  const AuthToggle = ({ user }) => {
    const [isToggling, setIsToggling] = useState(false);

    const handleToggle = async () => {
      setIsToggling(true);
      await toggleAuthStatus(user._id);
      setIsToggling(false);
    };

    return (
      <button
        onClick={handleToggle}
        disabled={isToggling}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${
          user.isAuthenticated ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"
        } ${isToggling ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ease-in-out ${
            user.isAuthenticated ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    );
  };

  const refreshAllUsers = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get("/user/all");

      if (response.status === 200) {
        setUsers(response.data);
        toast.success("Users refreshed successfully");
      } else {
        toast.error("Failed to refresh users");
      }
    } catch (error) {
      console.error("Error refreshing users:", error);

      if (error.response?.status === 401) {
        toast.error("Authentication expired. Please login again.");
      } else if (error.response?.status === 403) {
        toast.error("You don't have permission to view users.");
      } else {
        toast.error("Error refreshing users");
      }
    } finally {
      setLoading(false);
    }
  };

  const EditUserModal = ({ user, onSubmit, onClose }) => {
    const [formData, setFormData] = useState({
      fullName: user?.fullName || "",
      email: user?.email || "",
      branch: user?.branch || "main",
    });

    const handleSubmit = () => {
      onSubmit(formData);
    };

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full animate-in zoom-in-95 slide-in-from-bottom-8 duration-300">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Edit User Details
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Update user information
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          <div className="p-6 space-y-5">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Full Name
              </label>
              <input
                type="text"
                required
                value={formData.fullName}
                onChange={(e) =>
                  setFormData({ ...formData, fullName: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
                placeholder="Enter user's full name"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Email Address
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
                placeholder="user@example.com"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Branch
              </label>
              <select
                value={formData.branch}
                onChange={(e) =>
                  setFormData({ ...formData, branch: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
              >
                <option value="main">Main Branch</option>
                <option value="north">North Branch</option>
                <option value="south">South Branch</option>
                <option value="east">East Branch</option>
              </select>
            </div>
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 font-medium"
              >
                Update User
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Users Management
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Manage user accounts and authentication status
          </p>
        </div>

        {/* Search bar with refresh icon */}
        <div className="flex items-center gap-2">
          <button
            onClick={refreshAllUsers}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition"
            title="Refresh"
            disabled={loading}
          >
            <RefreshCcw
              className={`w-5 h-5 text-gray-600 dark:text-gray-300 ${
                loading ? "animate-spin" : ""
              }`}
            />
          </button>

          <div className="relative group">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5 transition-colors duration-200 group-focus-within:text-orange-500" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 w-80 shadow-sm hover:shadow-md"
            />
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-300 hover:shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Branch
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Authentication
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredUsers.map((user, index) => (
                <tr
                  key={user._id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all duration-200"
                  style={{
                    animationDelay: `${index * 50}ms`,
                  }}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center text-white font-semibold mr-3 shadow-lg">
                        {user.fullName
                          ?.split(" ")
                          .map((n) => n[0])
                          .join("") || "U"}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white">
                          {user.fullName || "Unknown User"}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          ID: {user._id?.slice(-8) || "N/A"}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white flex items-center">
                      <Mail className="w-4 h-4 mr-2 text-gray-400 dark:text-gray-500" />
                      {user.email || "No email"}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white flex items-center">
                      <MapPin className="w-4 h-4 mr-2 text-gray-400 dark:text-gray-500" />
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                        {user.branch
                          ? user.branch.charAt(0).toUpperCase() +
                            user.branch.slice(1) +
                            " Branch"
                          : "Unknown Branch"}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-3">
                      <AuthToggle user={user} />
                      <div className="flex items-center">
                        {user.isAuthenticated ? (
                          <>
                            <Shield className="w-4 h-4 text-green-500 mr-1" />
                            <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                              Active
                            </span>
                          </>
                        ) : (
                          <>
                            <ShieldOff className="w-4 h-4 text-gray-400 mr-1" />
                            <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                              Inactive
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      className="p-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all duration-200 transform hover:scale-110"
                      onClick={() => {
                        setEditingUser(user);
                        setShowEditModal(true);
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && !loading && (
          <div className="text-center py-12">
            <User className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 text-lg">
              No users found
            </p>
            <p className="text-gray-400 dark:text-gray-500 text-sm">
              Try adjusting your search criteria
            </p>
          </div>
        )}
      </div>

      {/* Edit User Modal */}
      {showEditModal && editingUser && (
        <EditUserModal
          user={editingUser}
          onSubmit={handleEditUser}
          onClose={() => {
            setShowEditModal(false);
            setEditingUser(null);
          }}
        />
      )}
    </div>
  );
};

export default Users;
