import React, { useState, useEffect } from "react";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  ChefHat,
  Clock,
  Star,
  Grid3X3,
  List,
} from "lucide-react";
import AddProductModal from "./modals/AddDishModal";
import axiosInstance from "../api/axiosInstance";
import logo from "../assets/logo.png";

const Dishes = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [viewMode, setViewMode] = useState("card"); // 'card' or 'table'
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0,
  });

const [categories, setCategories] = useState(["all"]);

const fetchCategories = async () => {
  try {
    const response = await axiosInstance.get("/products/categories");
    setCategories(["all", ...response.data.map(cat => cat.name)]);
  } catch (error) {
    console.error("Error fetching categories:", error);
    // Keep default categories as fallback
    setCategories(["all", "Main Course", "Rice", "Dal", "Bread", "Appetizer", "Dessert"]);
  }
};

useEffect(() => {
  fetchCategories();
}, []);
  const fetchDishes = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page,
        limit: pagination.limit,
      };

      // Add search parameter if exists
      if (searchTerm.trim()) {
        params.search = searchTerm.trim();
      }

      // Add category filter if not 'all'
      if (categoryFilter !== "all") {
        params.category = categoryFilter;
      }

      const response = await axiosInstance.get("/products", { params });

      if (response.data && response.data.products) {
        setDishes(response.data.products);
        setPagination(response.data.pagination);
      } else {
        setDishes(response.data || []);
      }
    } catch (error) {
      console.error("Error fetching dishes:", error);
      setError("Failed to fetch dishes. Please try again.");

      // If it's a network error, you might want to show sample data
      if (error.code === "ERR_NETWORK") {
        console.log("Network error, using sample data");
      }
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchDishes();
  }, []);

  // Fetch when search term or category changes (with debounce)
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (pagination.page === 1) {
        fetchDishes(1);
      } else {
        setPagination((prev) => ({ ...prev, page: 1 }));
        fetchDishes(1);
      }
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm, categoryFilter]);

  const toggleAvailability = async (dishId) => {
    try {
      // Find the current dish
      const currentDish = dishes.find(
        (dish) => dish._id === dishId || dish.id === dishId
      );
      if (!currentDish) return;

      // Optimistically update UI
      setDishes((prevDishes) =>
        prevDishes.map((dish) =>
          dish._id === dishId || dish.id === dishId
            ? { ...dish, is_available: !dish.is_available }
            : dish
        )
      );

      // Make API call to update availability
      await axiosInstance.patch(`/products/${dishId}/availability`, {
        is_available: !currentDish.is_available,
      });

      console.log(`Toggled availability for dish ${dishId}`);
    } catch (error) {
      console.error("Error toggling availability:", error);

      // Revert the optimistic update on error
      setDishes((prevDishes) =>
        prevDishes.map((dish) =>
          dish._id === dishId || dish.id === dishId
            ? { ...dish, is_available: !dish.is_available }
            : dish
        )
      );

      alert("Failed to update availability. Please try again.");
    }
  };

  const handleDeleteDish = async (dishId) => {
    if (!window.confirm("Are you sure you want to delete this dish?")) {
      return;
    }

    try {
      // Store original state for potential rollback
      const originalDishes = [...dishes];
      const originalPagination = { ...pagination };

      // Optimistically remove from UI
      setDishes((prevDishes) =>
        prevDishes.filter((dish) => dish._id !== dishId && dish.id !== dishId)
      );

      // Update pagination total optimistically
      setPagination((prev) => ({
        ...prev,
        total: Math.max(0, prev.total - 1),
      }));

      // Make API call to delete
      await axiosInstance.delete(`/products/${dishId}`);

      console.log(`Deleted dish ${dishId}`);

      // If we're on a page that no longer has items and it's not page 1,
      // navigate to the previous page
      const remainingItems = originalDishes.length - 1;
      const currentPage = pagination.page;
      const itemsPerPage = pagination.limit;

      if (
        remainingItems > 0 &&
        currentPage > 1 &&
        remainingItems <= (currentPage - 1) * itemsPerPage
      ) {
        // Need to go to previous page
        fetchDishes(currentPage - 1);
      } else if (
        remainingItems === 0 &&
        searchTerm === "" &&
        categoryFilter === "all"
      ) {
        // If no items left and no filters, just refresh to show empty state
        fetchDishes(1);
      }
    } catch (error) {
      console.error("Error deleting dish:", error);

      // Revert all optimistic updates on error
      setDishes(originalDishes);
      setPagination(originalPagination);
      alert("Failed to delete dish. Please try again.");
    }
  };

  // FIXED: Improved handleProductAdded function
  const handleProductAdded = (updatedProduct) => {
    console.log('handleProductAdded called with:', updatedProduct);
    
    if (editingProduct) {
      // For editing: Find and update only the specific product
      setDishes((prevDishes) => {
        const updatedDishes = prevDishes.map((dish) => {
          const dishId = dish._id || dish.id;
          const updatedId = updatedProduct._id || updatedProduct.id;
          
          // Only update the dish that matches the ID
          if (dishId === updatedId || dishId === editingProduct._id || dishId === editingProduct.id) {
            console.log('Updating dish:', dishId, 'with new data:', updatedProduct);
            // Create a new object to ensure React detects the change
            return {
              ...dish, // Keep existing properties
              ...updatedProduct, // Override with new properties
              _id: dish._id || dish.id, // Preserve the original ID
              id: dish.id || dish._id, // Preserve both ID formats
            };
          }
          // Return other dishes unchanged
          return dish;
        });
        
        console.log('Updated dishes array:', updatedDishes);
        return updatedDishes;
      });
      
      setEditingProduct(null);
      console.log("Product updated successfully");
      
      // Alternative approach: Refresh the data to ensure consistency
      // Uncomment the line below if the above approach still has issues
      // fetchDishes(pagination.page);
      
    } else {
      // For adding: Check if it should appear in current view
      const shouldShowInCurrentView =
        (categoryFilter === "all" ||
          updatedProduct.category === categoryFilter) &&
        (!searchTerm.trim() ||
          updatedProduct.name.toLowerCase().includes(searchTerm.toLowerCase()));

      if (shouldShowInCurrentView) {
        // Add new product to the beginning of the list
        setDishes((prevDishes) => [updatedProduct, ...prevDishes]);
      }

      // Always update the total count
      setPagination((prev) => ({
        ...prev,
        total: prev.total + 1,
      }));

      console.log("New product added successfully");
    }

    // Close modal
    setShowAddModal(false);
  };

  const handleEditDish = (dish) => {
    console.log('Editing dish:', dish);
    setEditingProduct(dish);
    setShowAddModal(true);
  };

  // IMPROVED: Modal close handler that ensures proper cleanup
  const handleModalClose = () => {
    setShowAddModal(false);
    setEditingProduct(null);
    
    // Optional: Refresh data when modal closes to ensure consistency
    // This is a fallback approach if optimistic updates cause issues
    // fetchDishes(pagination.page);
  };

  const getSpiceLevelColor = (level) => {
    switch (level) {
      case "mild":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300";
      case "medium":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300";
      case "hot":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300";
      case "extra_hot":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300";
    }
  };

  if (loading && dishes.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            Loading dishes...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error Message */}
      {error && (
        <div className="bg-red-100 dark:bg-red-900/20 border border-red-400 text-red-700 dark:text-red-300 px-4 py-3 rounded relative">
          <span className="block sm:inline">{error}</span>
          <button
            onClick={() => fetchDishes()}
            className="ml-2 bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
          >
            Retry
          </button>
        </div>
      )}

      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search dishes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-base"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-base"
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category === "all" ? "All Categories" : category}
              </option>
            ))}
          </select>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setViewMode("card")}
              className={`p-2 rounded-md transition-colors ${
                viewMode === "card"
                  ? "bg-white dark:bg-gray-600 text-orange-600 shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
              title="Card View"
            >
              <Grid3X3 className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`p-2 rounded-md transition-colors ${
                viewMode === "table"
                  ? "bg-white dark:bg-gray-600 text-orange-600 shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
              title="Table View"
            >
              <List className="w-5 h-5" />
            </button>
          </div>
          
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-orange-600 text-white px-6 py-2.5 rounded-lg hover:bg-orange-700 transition-colors flex items-center text-base font-medium"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Dish
          </button>
        </div>
      </div>

      {/* Loading indicator for fetching */}
      {loading && dishes.length > 0 && (
        <div className="text-center">
          <div className="inline-flex items-center px-6 py-3 font-semibold leading-6 text-base shadow rounded-md text-orange-500 bg-white dark:bg-gray-800 transition ease-in-out duration-150">
            <div className="animate-spin -ml-1 mr-3 h-6 w-6 text-orange-500">
              <div className="rounded-full h-5 w-5 border-b-2 border-orange-500"></div>
            </div>
            Updating...
          </div>
        </div>
      )}

      {/* Dishes Display - Card or Table View */}
      {viewMode === "card" ? (
        // Card View - Enhanced text sizes and spacing
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          {dishes.map((dish) => (
            <div
              key={`${dish._id || dish.id}-${dish.name}`} // Enhanced key for better React tracking
              className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-300 hover:shadow-md hover:border-orange-300 dark:hover:border-orange-600 ${
                dish.is_available === false ? "opacity-60" : ""
              }`}
            >
              <div className="relative">
                <img
                  src={dish.image || dish.image_url || logo}
                  alt={dish.name}
                  className={`w-full h-40 ${
                    dish.image || dish.image_url
                      ? "object-cover"
                      : "object-contain"
                  }`}
                  onError={(e) => {
                    e.target.src = logo;
                    e.target.classList.remove("object-cover");
                    e.target.classList.add("object-contain");
                  }}
                />
                
                {/* Availability Toggle */}
                {/* <button
                  onClick={() => toggleAvailability(dish._id || dish.id)}
                  className={`absolute top-3 right-3 w-10 h-10 rounded-full text-white text-sm font-bold shadow-lg transition-colors ${
                    dish.is_available !== false
                      ? "bg-green-500 hover:bg-green-600"
                      : "bg-red-500 hover:bg-red-600"
                  }`}
                  title={`Mark as ${dish.is_available !== false ? 'unavailable' : 'available'}`}
                >
                  {dish.is_available !== false ? "✓" : "✗"}
                </button> */}

                {/* Badges */}
                <div className="absolute top-3 left-3 flex flex-col gap-2">
                  {dish.orders_today > 0 && (
                    <div className="bg-orange-500 text-white px-3 py-1 rounded-full text-sm font-semibold shadow-lg">
                      {dish.orders_today}
                    </div>
                  )}
                  {dish.isVegetarian && (
                    <div className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-semibold shadow-lg">
                      V
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4">
                {/* Header Section */}
                <div className="mb-3">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 line-clamp-2 leading-tight">
                    {dish.name}
                  </h3>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                      {dish.category}
                    </p>
                    <p className="text-lg font-bold text-orange-600">
                      £{dish.discountedPrice || dish.price}
                    </p>
                  </div>
                </div>

                {/* Details Section */}
                <div className="flex items-center justify-between mb-4 text-sm text-gray-600 dark:text-gray-400">
                  {/* <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-2" />
                    <span className="font-medium">{dish.preparation_time || dish.prepTime || 15}m</span>
                  </div> */}
                  {dish.spice_levels && dish.spice_levels.length > 0 && (
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${getSpiceLevelColor(
                        dish.spice_levels[0]
                      )}`}
                    >
                      {dish.spice_levels[0].charAt(0).toUpperCase() + dish.spice_levels[0].slice(1)}
                    </span>
                  )}
                </div>

                {/* Action Section */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center space-x-3">
                    <button
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md"
                      title="Edit dish"
                      onClick={() => handleEditDish(dish)}
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteDish(dish._id || dish.id)}
                      className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
                      title="Delete dish"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <span
                    className={`px-3 py-1.5 rounded-full text-sm font-semibold ${
                      dish.is_available !== false
                        ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300"
                        : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300"
                    }`}
                  >
                    {dish.is_available !== false ? "Available" : "Unavailable"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Table View
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Dish
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                {dishes.map((dish) => (
                  <tr
                    key={`${dish._id || dish.id}-${dish.name}`} // Enhanced key for better React tracking
                    className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${
                      dish.is_available === false ? "opacity-60" : ""
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center">
                        <img
                          src={dish.image || dish.image_url || logo}
                          alt={dish.name}
                          className="w-12 h-12 rounded-lg object-cover mr-3"
                          onError={(e) => {
                            e.target.src = logo;
                            e.target.classList.remove("object-cover");
                            e.target.classList.add("object-contain");
                          }}
                        />
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {dish.name}
                          </div>
                          <div className="flex items-center space-x-2 mt-1">
                            {dish.orders_today > 0 && (
                              <span className="bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full text-xs">
                                {dish.orders_today} today
                              </span>
                            )}
                            {dish.isVegetarian && (
                              <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-xs">
                                Veg
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {dish.category}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-orange-600">
                      £{dish.discountedPrice || dish.price}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        // onClick={() => toggleAvailability(dish._id || dish.id)}
                        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                          dish.is_available !== false
                            ? "bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/20 dark:text-green-300"
                            : "bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-300"
                        }`}
                      >
                        {dish.is_available !== false ? "Available" : "Unavailable"}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-2">
                        <button
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors p-1"
                          title="Edit dish"
                          onClick={() => handleEditDish(dish)}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteDish(dish._id || dish.id)}
                          className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors p-1"
                          title="Delete dish"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* No dishes found */}
      {dishes.length === 0 && !loading && (
        <div className="text-center py-16">
          <ChefHat className="w-20 h-20 text-gray-400 mx-auto mb-6" />
          <h3 className="text-2xl font-medium text-gray-900 dark:text-white mb-3">
            No dishes found
          </h3>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            {searchTerm || categoryFilter !== "all"
              ? "Try adjusting your search or filter criteria"
              : "Start by adding your first dish"}
          </p>
        </div>
      )}

      {/* Enhanced Pagination */}
      {pagination.pages > 1 && (
        <div className="flex justify-center items-center space-x-3 pt-8">
          <button
            onClick={() => fetchDishes(pagination.page - 1)}
            disabled={pagination.page <= 1}
            className="px-4 py-2.5 text-base font-medium text-gray-700 bg-white dark:bg-gray-800 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Previous
          </button>

          <span className="px-4 py-2.5 text-base font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 rounded-lg">
            Page {pagination.page} of {pagination.pages}
          </span>

          <button
            onClick={() => fetchDishes(pagination.page + 1)}
            disabled={pagination.page >= pagination.pages}
            className="px-4 py-2.5 text-base font-medium text-gray-700 bg-white dark:bg-gray-800 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Next
          </button>
        </div>
      )}

      {/* Add Product Modal */}
      <AddProductModal
        isOpen={showAddModal}
        onClose={handleModalClose}
        onSuccess={handleProductAdded}
        editProduct={editingProduct}
        isEditMode={!!editingProduct}
      />
    </div>
  );
};

export default Dishes;