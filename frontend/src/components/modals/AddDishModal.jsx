import React, { useEffect, useState } from "react";
import { X, Upload, Plus, Minus, Loader2 } from "lucide-react";
import axiosInstance from "../../api/axiosInstance"; // Adjust path as needed

const AddProductModal = ({
  isOpen,
  onClose,
  onSuccess,
  editProduct = null,
  isEditMode = false,
}) => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    subCategory: "",
    price: "",
    minPersons: "",
    discountedPrice: "",
    notes: "",
    isVegetarian: false,
  });

  const [items, setItems] = useState([""]);
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [categories, setCategories] = useState([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [categoryLoading, setCategoryLoading] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await axiosInstance.get("/products/categories");
      setCategories(response.data);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    
    setCategoryLoading(true);
    try {
      await axiosInstance.post("/products/categories", { 
        name: newCategoryName.trim() 
      });
      setNewCategoryName("");
      setShowCategoryModal(false);
      fetchCategories(); // Refresh the list
      alert("Category added successfully!");
    } catch (error) {
      alert(error.response?.data?.error || "Error adding category");
    } finally {
      setCategoryLoading(false);
    }
  };

  const handleDeleteCategory = async (categoryId, categoryName) => {
    if (!confirm(`Are you sure you want to delete "${categoryName}"?`)) return;
    
    try {
      await axiosInstance.delete(`/products/categories/${categoryId}`);
      fetchCategories(); // Refresh the list
      alert("Category deleted successfully!");
    } catch (error) {
      alert(error.response?.data?.error || "Error deleting category");
    }
  };

  // Add this useEffect after the existing state declarations
  useEffect(() => {
    if (isEditMode && editProduct) {
      setFormData({
        name: editProduct.name || "",
        description: editProduct.description || "",
        category: editProduct.category || "",
        subCategory: editProduct.subCategory || "",
        price: editProduct.price?.toString() || "",
        minPersons: editProduct.minPersons?.toString() || "",
        discountedPrice: editProduct.discountedPrice?.toString() || "",
        notes: editProduct.notes || "",
        isVegetarian: editProduct.isVegetarian || false,
      });

      if (editProduct.items && editProduct.items.length > 0) {
        setItems(editProduct.items);
      } else {
        setItems([""]);
      }

      if (editProduct.image) {
        setImagePreview(editProduct.image);
      }
    } else {
      // Reset form for add mode
      setFormData({
        name: "",
        description: "",
        category: "",
        subCategory: "",
        price: "",
        minPersons: "",
        discountedPrice: "",
        notes: "",
        isVegetarian: false,
      });
      setItems([""]);
      setImage(null);
      setImagePreview(null);
    }
  }, [isEditMode, editProduct]);

  const removeImage = () => {
    setImage(null);
    setImagePreview(null);
    setErrors((prev) => ({ ...prev, image: "" }));
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }

    // Reset items when category changes from/to Deals
    if (name === "category") {
      if (value !== "Deals" && formData.category === "Deals") {
        setItems([""]);
      } else if (value === "Deals" && formData.category !== "Deals") {
        setItems([""]);
      }
    }
  };

  const handleItemChange = (index, value) => {
    const newItems = [...items];
    newItems[index] = value;
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, ""]);
  };

  const removeItem = (index) => {
    if (items.length > 1) {
      const newItems = items.filter((_, i) => i !== index);
      setItems(newItems);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        setErrors((prev) => ({
          ...prev,
          image: "Please select a valid image file",
        }));
        return;
      }

      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrors((prev) => ({
          ...prev,
          image: "Image size should be less than 5MB",
        }));
        return;
      }

      setImage(file);
      setErrors((prev) => ({ ...prev, image: "" }));

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Product name is required";
    }

    if (!formData.description.trim()) {
      newErrors.description = "Description is required";
    }

    if (!formData.category) {
      newErrors.category = "Category is required";
    }

    if (!formData.price || formData.price <= 0) {
      newErrors.price = "Valid price is required";
    }

    if (
      formData.discountedPrice &&
      parseFloat(formData.discountedPrice) >= parseFloat(formData.price)
    ) {
      newErrors.discountedPrice =
        "Discounted price must be less than original price";
    }

    // Validate items for Deals category
    if (formData.category === "Deals") {
      const filteredItems = items.filter((item) => item.trim() !== "");
      if (filteredItems.length === 0) {
        newErrors.items = "At least one item is required for Deals category";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      category: "",
      subCategory: "",
      price: "",
      minPersons: "",
      discountedPrice: "",
      notes: "",
      isVegetarian: false,
    });
    setItems([""]);
    setImage(null);
    setImagePreview(null);
    setErrors({});
  };

  const convertImageToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Prepare the data to send (same as before)
      const submitData = {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        price: parseFloat(formData.price),
        isVegetarian: formData.isVegetarian,
      };

      // Add optional fields only if they have values (same as before)
      if (formData.subCategory) {
        submitData.subCategory = formData.subCategory;
      }

      if (formData.minPersons) {
        submitData.minPersons = parseInt(formData.minPersons);
      }

      if (formData.discountedPrice) {
        submitData.discountedPrice = parseFloat(formData.discountedPrice);
      }

      if (formData.notes) {
        submitData.notes = formData.notes;
      }

      // Add items for Deals category or if items are provided
      if (formData.category === "Deals" || items.some((item) => item.trim())) {
        const filteredItems = items.filter((item) => item.trim() !== "");
        submitData.items = filteredItems;
      }

      // Convert image to base64 if provided
      if (image) {
        const base64Image = await convertImageToBase64(image);
        submitData.image = base64Image;
      }

      console.log("Submitting data:", submitData);

      // Make API call - different endpoint for edit vs create
      let response;
      if (isEditMode) {
        response = await axiosInstance.put(
          `/products/${editProduct._id}`,
          submitData
        );
      } else {
        response = await axiosInstance.post("/products", submitData);
      }

      console.log(
        `Product ${isEditMode ? "updated" : "created"} successfully:`,
        response.data
      );

      // Call success callback with the product
      if (onSuccess) {
        onSuccess(response.data.product);
      }

      // Reset form and close modal
      resetForm();
      onClose();

      // Show success message
      alert(`Product ${isEditMode ? "updated" : "created"} successfully!`);
    } catch (error) {
      console.error(
        `Error ${isEditMode ? "updating" : "creating"} product:`,
        error
      );

      let errorMessage = `Failed to ${
        isEditMode ? "update" : "create"
      } product. Please try again.`;

      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }

      setErrors({ submit: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Check if category is Deals to show/hide items field
  const showItemsField = formData.category === "Deals";

  return (
    <>
      {/* Main Modal */}
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {isEditMode ? "Edit Product" : "Add New Product"}
            </h3>

            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Error Message */}
            {errors.submit && (
              <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                {errors.submit}
              </div>
            )}

            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Product Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                    errors.name
                      ? "border-red-500"
                      : "border-gray-300 dark:border-gray-600"
                  }`}
                  placeholder="Enter product name"
                  disabled={loading}
                />
                {errors.name && (
                  <p className="text-red-500 text-sm mt-1">{errors.name}</p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Category *
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowCategoryModal(true)}
                    className="text-sm text-orange-600 hover:text-orange-800 font-medium"
                    disabled={loading}
                  >
                    Manage Categories
                  </button>
                </div>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                    errors.category
                      ? "border-red-500"
                      : "border-gray-300 dark:border-gray-600"
                  }`}
                  disabled={loading}
                >
                  <option value="">Select a category</option>
                  {categories.map((category) => (
                    <option key={category._id} value={category.name}>
                      {category.name}
                    </option>
                  ))}
                </select>
                {errors.category && (
                  <p className="text-red-500 text-sm mt-1">{errors.category}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Sub Category
                </label>
                <input
                  type="text"
                  name="subCategory"
                  value={formData.subCategory}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Enter sub category"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Price (£) *
                </label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                    errors.price
                      ? "border-red-500"
                      : "border-gray-300 dark:border-gray-600"
                  }`}
                  placeholder="0.00"
                  disabled={loading}
                />
                {errors.price && (
                  <p className="text-red-500 text-sm mt-1">{errors.price}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Minimum Persons
                </label>
                <input
                  type="number"
                  name="minPersons"
                  value={formData.minPersons}
                  onChange={handleInputChange}
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="1"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description *
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                  errors.description
                    ? "border-red-500"
                    : "border-gray-300 dark:border-gray-600"
                }`}
                placeholder="Describe the product..."
                disabled={loading}
              />
              {errors.description && (
                <p className="text-red-500 text-sm mt-1">{errors.description}</p>
              )}
            </div>

            {/* Items - Only show when category is "Deals" */}
            {showItemsField && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Items/Ingredients {formData.category === "Deals" && "*"}
                </label>
                {items.map((item, index) => (
                  <div key={index} className="flex items-center gap-2 mb-2">
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => handleItemChange(index, e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Enter item"
                      disabled={loading}
                    />
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="p-2 text-red-600 hover:text-red-800 transition-colors disabled:opacity-50"
                        disabled={loading}
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                    )}
                    {index === items.length - 1 && (
                      <button
                        type="button"
                        onClick={addItem}
                        className="p-2 text-orange-600 hover:text-orange-800 transition-colors disabled:opacity-50"
                        disabled={loading}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                {errors.items && (
                  <p className="text-red-500 text-sm mt-1">{errors.items}</p>
                )}
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Additional notes..."
                disabled={loading}
              />
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Product Image
              </label>
              <div className="flex items-center space-x-4">
                <label className="flex items-center px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50">
                  <Upload className="w-4 h-4 mr-2 text-gray-600 dark:text-gray-400" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Choose Image
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                    disabled={loading}
                  />
                </label>
                {image && (
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {image.name}
                  </span>
                )}
              </div>
              {errors.image && (
                <p className="text-red-500 text-sm mt-1">{errors.image}</p>
              )}

              {/* Image Preview */}
              {imagePreview && (
                <div className="mt-4 relative inline-block">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-32 h-32 object-cover rounded-lg border border-gray-300 dark:border-gray-600"
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    disabled={loading}
                    className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold transition-colors disabled:opacity-50"
                    title="Remove image"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>

            {/* Vegetarian Toggle */}
            <div className="flex items-center">
              <input
                type="checkbox"
                name="isVegetarian"
                checked={formData.isVegetarian}
                onChange={handleInputChange}
                className="w-4 h-4 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500 dark:focus:ring-orange-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                disabled={loading}
              />
              <label className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Vegetarian Product
              </label>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 flex items-center"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {isEditMode ? "Updating..." : "Creating..."}
                  </>
                ) : isEditMode ? (
                  "Update Product"
                ) : (
                  "Add Product"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Category Management Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[70]">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-gray-900 dark:text-white">Manage Categories</h4>
                <button
                  onClick={() => setShowCategoryModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="p-4">
              {/* Add Category */}
              <div className="mb-4">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Enter category name"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg mb-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
                />
                <button
                  onClick={handleAddCategory}
                  disabled={categoryLoading || !newCategoryName.trim()}
                  className="w-full bg-orange-600 text-white px-3 py-2 rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center justify-center"
                >
                  {categoryLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    "Add Category"
                  )}
                </button>
              </div>
              
              {/* Categories List */}
              <div className="max-h-60 overflow-y-auto">
                <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Existing Categories:</h5>
                {categories.map((category) => (
                  <div key={category._id} className="flex justify-between items-center py-2 px-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                    <div className="flex items-center">
                      <span className="text-gray-900 dark:text-white">{category.name}</span>
                      {category.isDefault && (
                        <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 px-2 py-1 rounded">
                          Default
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteCategory(category._id, category.name)}
                      disabled={category.isDefault}
                      className={`text-sm ${
                        category.isDefault 
                          ? 'text-gray-400 cursor-not-allowed' 
                          : 'text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300'
                      }`}
                      title={category.isDefault ? "Cannot delete default category" : "Delete category"}
                    >
                      Delete
                    </button>
                  </div>
                ))}
                {categories.length === 0 && (
                  <p className="text-gray-500 dark:text-gray-400 text-sm">No categories found</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AddProductModal;