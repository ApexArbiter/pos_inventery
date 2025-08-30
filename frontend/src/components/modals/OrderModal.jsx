import React, { useState, useEffect } from "react";
import {
  Plus,
  Search,
  X,
  Minus,
  Trash2,
  Package,
  Save,
  Leaf,
} from "lucide-react";
import axiosInstance from "../../api/axiosInstance";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";

const OrderModal = ({ isOpen, onClose, order, onSave, onDelete, orders }) => {
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [detectedCountry, setDetectedCountry] = useState("GB");
  const [customerInfo, setCustomerInfo] = useState({
    name: "",
    whatsapp: "",
    address: "",
    notes: "",
  });
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState("amount");
  const [priority, setPriority] = useState("medium");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [showProductModal, setShowProductModal] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Updated state for backend integration
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productError, setProductError] = useState(null);

  // API function to fetch products with proper error handling
  const fetchProducts = async () => {
    try {
      setLoadingProducts(true);
      setProductError(null);

      const params = {
        limit: 100, // Get more products for selection
        page: 1,
      };

      // Add search and category filters if they exist
      if (productSearch) params.search = productSearch;
      if (categoryFilter !== "all") params.category = categoryFilter;

      const response = await axiosInstance.get("/products", { params });

      // Handle the response structure from your backend
      if (response.data.products) {
        setProducts(response.data.products);
      } else {
        setProducts(response.data);
      }
    } catch (err) {
      console.error("Error fetching products:", err);
      setProductError("Failed to fetch products. Please try again.");
      setProducts([]); // Clear products on error
    } finally {
      setLoadingProducts(false);
    }
  };
  // Detect user's country from IP
  useEffect(() => {
    const detectCountry = async () => {
      try {
        // Using ipify + ipapi with CORS support
        const ipResponse = await fetch("https://api.ipify.org?format=json");
        const { ip } = await ipResponse.json();

        const locationResponse = await fetch(`https://ipapi.co/${ip}/json/`);
        const data = await locationResponse.json();

        setDetectedCountry(data.country_code || "GB");
      } catch (error) {
        console.log("Could not detect country, using default");
        setDetectedCountry("GB");
      }
    };

    if (isOpen && !order) {
      detectCountry();
    }
  }, [isOpen, order]);

  // Fetch products when modal opens or search/filter changes
  useEffect(() => {
    if (isOpen) {
      fetchProducts();
    }
  }, [isOpen, productSearch, categoryFilter]);

  // Debounced search effect
  useEffect(() => {
    if (isOpen && productSearch) {
      const delayedSearch = setTimeout(() => {
        fetchProducts();
      }, 500);
      return () => clearTimeout(delayedSearch);
    }
  }, [productSearch, isOpen]);

  // Update the order initialization to handle backend data structure
  useEffect(() => {
    if (order) {
      setCustomerInfo({
        name: order.customer.name,
        whatsapp: order.customer.whatsapp,
        address: order.customer.address,
        notes: order.notes || order.customer.notes || "",
      });

      // Handle populated vs non-populated productId
      const mappedItems = order.items.map((item) => {
        // If productId is populated (has name, price, etc.)
        if (item.productId && typeof item.productId === "object") {
          return {
            id: item.productId._id,
            _id: item.productId._id,
            name: item.productId.name || item.name,
            category: item.productId.category || item.category,
            price: item.productId.price || item.price,
            quantity: item.quantity,
            subtotal: item.subtotal,
            isVegetarian: item.productId.isVegetarian || item.isVegetarian,
            description: item.productId.description || "",
            image: item.productId.image || "",
          };
        } else {
          // If productId is just an ID string
          return {
            id: item.productId || item._id,
            _id: item.productId || item._id,
            name: item.name,
            category: item.category,
            price: item.price,
            quantity: item.quantity,
            subtotal: item.subtotal,
            isVegetarian: item.isVegetarian,
            description: item.description || "",
            image: item.image || "",
          };
        }
      });

      setSelectedProducts(mappedItems);
      setDiscount(order.discount);
      setDiscountType(order.discountType);
      setPriority(order.priority);
      setDeliveryDate(
        order.deliveryDate ? order.deliveryDate.split("T")[0] : ""
      );
    } else {
      resetForm();
    }
  }, [order]);

  const resetForm = () => {
    setSelectedProducts([]);
    setCustomerInfo({ name: "", whatsapp: "", address: "", notes: "" });
    setDiscount(0);
    setDiscountType("amount");
    setPriority("medium");
    setDeliveryDate("");
    setProductSearch("");
    setCategoryFilter("all");
    setShowDeleteConfirm(false);
    setProductError(null);
    setDetectedCountry("GB");
  };

  // Update addProductToOrder to handle backend product structure
  const addProductToOrder = (product) => {
    const productId = product._id;
    const existingProduct = selectedProducts.find((p) => p._id === productId);

    if (existingProduct) {
      setSelectedProducts(
        selectedProducts.map((p) =>
          p._id === productId
            ? {
                ...p,
                quantity: p.quantity + 1,
                subtotal: (p.quantity + 1) * p.price,
              }
            : p
        )
      );
    } else {
      setSelectedProducts([
        ...selectedProducts,
        {
          id: productId,
          _id: productId,
          name: product.name,
          category: product.category,
          price: product.price,
          quantity: 1,
          subtotal: product.price,
          isVegetarian: product.isVegetarian,
          description: product.description || "",
          image: product.image || "",
        },
      ]);
    }
  };

  // Update product quantity and remove functions
  const updateProductQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      setSelectedProducts(selectedProducts.filter((p) => p._id !== productId));
    } else {
      setSelectedProducts(
        selectedProducts.map((p) =>
          p._id === productId
            ? { ...p, quantity: newQuantity, subtotal: newQuantity * p.price }
            : p
        )
      );
    }
  };

  const removeProduct = (productId) => {
    setSelectedProducts(selectedProducts.filter((p) => p._id !== productId));
  };

  const calculateSubtotal = () => {
    return selectedProducts.reduce(
      (total, product) => total + product.subtotal,
      0
    );
  };

  const calculateDiscount = () => {
    const subtotal = calculateSubtotal();
    if (discountType === "percentage") {
      return (subtotal * discount) / 100;
    }
    return discount;
  };

  const calculateFinalAmount = () => {
    return Math.max(0, calculateSubtotal() - calculateDiscount());
  };

  // Update handleSave to match your backend API expectations
  const handleSave = () => {
    // Validate required fields
    if (!customerInfo.name || !customerInfo.whatsapp || !customerInfo.address) {
      alert("Please fill in all required customer information.");
      return;
    }

    if (selectedProducts.length === 0) {
      alert("Please select at least one product.");
      return;
    }

    // Transform selectedProducts to match backend expected format
    const transformedItems = selectedProducts.map((product) => ({
      productId: product._id,
      quantity: product.quantity,
    }));

    const orderData = {
      customer: {
        name: customerInfo.name.trim(),
        whatsapp: customerInfo.whatsapp.trim(),
        address: customerInfo.address.trim(),
      },
      items: transformedItems,
      discount: parseFloat(discount) || 0,
      discountType,
      priority,
      deliveryDate: deliveryDate || undefined,
      notes: customerInfo.notes?.trim() || "",
    };

    onSave(orderData);
    resetForm();
  };

  const handleDelete = () => {
    if (order) {
      onDelete(order.id);
      resetForm();
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Update filteredProducts to handle backend data
  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      !productSearch ||
      product.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      (product.description &&
        product.description
          .toLowerCase()
          .includes(productSearch.toLowerCase()));

    const matchesCategory =
      categoryFilter === "all" || product.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

// Add this state variable
const [categories, setCategories] = useState([]);

// Add this function after the existing functions
const fetchCategories = async () => {
  try {
    const response = await axiosInstance.get("/products/categories");
    setCategories(response.data.map(cat => cat.name));
  } catch (error) {
    console.error("Error fetching categories:", error);
    // Fallback to extracting from products
    const productCategories = [...new Set(products.map((p) => p.category))].filter(Boolean);
    setCategories(productCategories);
  }
};

// Add this useEffect (or modify existing one that calls fetchProducts)
useEffect(() => {
  if (isOpen) {
    fetchProducts();
    fetchCategories();
  }
}, [isOpen]);

  // Product grid rendering with proper error handling
  const renderProductGrid = () => {
    if (loadingProducts) {
      return (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          <span className="ml-3 text-gray-600 dark:text-gray-400">
            Loading products...
          </span>
        </div>
      );
    }

    if (productError) {
      return (
        <div className="text-center py-12">
          <div className="mb-4">
            <Package className="w-12 h-12 mx-auto text-red-400 mb-2" />
            <p className="text-red-600 dark:text-red-400 mb-4">
              {productError}
            </p>
          </div>
          <button
            onClick={fetchProducts}
            className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors"
          >
            Retry Loading Products
          </button>
        </div>
      );
    }

    if (filteredProducts.length === 0) {
      return (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <Package className="w-12 h-12 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No products found
          </h3>
          <p>Try adjusting your search or filter criteria.</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProducts.map((product) => {
          const productId = product._id;
          const isSelected = selectedProducts.some((p) => p._id === productId);
          const selectedProduct = selectedProducts.find(
            (p) => p._id === productId
          );
          const displayPrice = product.discountedPrice || product.price;

          return (
            <div
              key={productId}
              className={`border rounded-xl p-4 transition-all duration-200 cursor-pointer hover:shadow-md ${
                isSelected
                  ? "border-orange-500 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-400"
                  : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
              }`}
            >
              <div className="flex items-start space-x-3">
                <div className="w-16 h-16 bg-gray-200 dark:bg-gray-600 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = "none";
                        e.target.nextSibling.style.display = "flex";
                      }}
                    />
                  ) : null}
                  <div className="w-full h-full flex items-center justify-center">
                    {product.isVegetarian && (
                      <Leaf className="w-6 h-6 text-green-500" />
                    )}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 dark:text-white text-sm leading-tight break-words">
                        {product.name}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {product.category}
                        {product.subCategory && ` • ${product.subCategory}`}
                      </p>
                      {product.description && (
                        <p
                          className="text-xs text-gray-600 dark:text-gray-300 mt-1 leading-tight overflow-hidden"
                          style={{
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                          }}
                        >
                          {product.description}
                        </p>
                      )}

                      <div className="flex items-center mt-2">
                        <span className="text-lg font-bold text-orange-600 dark:text-orange-400">
                          £{displayPrice}
                        </span>
                        {product.discountedPrice &&
                          product.price !== product.discountedPrice && (
                            <span className="ml-2 text-sm text-gray-500 line-through">
                              £{product.price}
                            </span>
                          )}
                        {product.isVegetarian && (
                          <span className="ml-2 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 text-xs rounded-full">
                            Veg
                          </span>
                        )}
                      </div>

                      {product.minPersons && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Min. {product.minPersons} persons
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    {isSelected ? (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            updateProductQuantity(
                              productId,
                              selectedProduct.quantity - 1
                            );
                          }}
                          className="w-8 h-8 flex items-center justify-center bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-lg hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <input
                          type="number"
                          value={selectedProduct?.quantity || 0}
                          onChange={(e) => {
                            const newQty = Math.max(
                              1,
                              parseInt(e.target.value) || 1
                            );
                            updateProductQuantity(productId, newQty);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-12 text-center font-medium text-orange-600 dark:text-orange-400 bg-transparent border-none outline-none"
                          min="1"
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            updateProductQuantity(
                              productId,
                              selectedProduct.quantity + 1
                            );
                          }}
                          className="w-8 h-8 flex items-center justify-center bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-lg hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => addProductToOrder(product)}
                        className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors flex items-center transform hover:scale-105"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Update the selected products rendering
  const renderSelectedProducts = () => {
    if (selectedProducts.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <Package className="w-8 h-8 mx-auto mb-2" />
          <p>No products selected</p>
        </div>
      );
    }

    return (
      <div className="space-y-3 mb-6 max-h-64 overflow-y-auto">
        {selectedProducts.map((product) => (
          <div
            key={product._id}
            className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 transition-all duration-300"
          >
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gray-200 dark:bg-gray-600 rounded-lg flex items-center justify-center overflow-hidden">
                {product.image ? (
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = "none";
                      e.target.nextSibling.style.display = "flex";
                    }}
                  />
                ) : null}
                <div className="w-full h-full flex items-center justify-center">
                  {product.isVegetarian && (
                    <Leaf className="w-4 h-4 text-green-500" />
                  )}
                </div>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">
                  {product.name}
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  £{product.price} each
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() =>
                    updateProductQuantity(product._id, product.quantity - 1)
                  }
                  className="w-8 h-8 flex items-center justify-center bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <input
                  type="number"
                  value={product.quantity}
                  onChange={(e) => {
                    const newQty = Math.max(1, parseInt(e.target.value) || 1);
                    updateProductQuantity(product._id, newQty);
                  }}
                  className="w-12 text-center font-medium text-gray-900 dark:text-white bg-transparent border-none outline-none focus:bg-gray-100 dark:focus:bg-gray-600 rounded px-1"
                  min="1"
                />
                <button
                  onClick={() =>
                    updateProductQuantity(product._id, product.quantity + 1)
                  }
                  className="w-8 h-8 flex items-center justify-center bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="text-right min-w-[80px]">
                <p className="font-semibold text-gray-900 dark:text-white">
                  £{product.subtotal}
                </p>
              </div>
              <button
                onClick={() => removeProduct(product._id)}
                className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Main Order Modal */}
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto transition-all duration-300">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {order ? "Edit Order" : "Create New Order"}
              </h2>
              <div className="flex items-center space-x-2">
                {order && (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors px-3 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
                <button
                  onClick={handleClose}
                  className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Customer Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Customer Information
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Customer Name *
                    </label>
                    <input
                      type="text"
                      value={customerInfo.name}
                      onChange={(e) =>
                        setCustomerInfo({
                          ...customerInfo,
                          name: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300"
                      placeholder="Enter customer name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      WhatsApp Number *
                    </label>
                    <div className="relative">
                      <PhoneInput
                        international
                        countryCallingCodeEditable={false}
                        defaultCountry={detectedCountry}
                        value={customerInfo.whatsapp}
                        onChange={(value) =>
                          setCustomerInfo({
                            ...customerInfo,
                            whatsapp: value || "",
                          })
                        }
                        className="phone-input-wrapper"
                        numberInputProps={{
                          className: "phone-number-input",
                        }}
                        countrySelectProps={{
                          className: "phone-country-select",
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Address *
                    </label>
                    <textarea
                      value={customerInfo.address}
                      onChange={(e) =>
                        setCustomerInfo({
                          ...customerInfo,
                          address: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300"
                      rows="3"
                      placeholder="Enter delivery address"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Notes
                    </label>
                    <textarea
                      value={customerInfo.notes}
                      onChange={(e) =>
                        setCustomerInfo({
                          ...customerInfo,
                          notes: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300"
                      rows="2"
                      placeholder="Special instructions..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Priority
                      </label>
                      <select
                        value={priority}
                        onChange={(e) => setPriority(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Delivery Date
                      </label>
                      <input
                        type="date"
                        value={deliveryDate}
                        onChange={(e) => setDeliveryDate(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Products Section */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Products
                  </h3>
                  <button
                    onClick={() => setShowProductModal(true)}
                    className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors flex items-center transform hover:scale-105"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Products
                  </button>
                </div>

                {/* Selected Products */}
                {renderSelectedProducts()}

                {/* Order Summary */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 space-y-3 border border-gray-200 dark:border-gray-600 transition-all duration-300">
                  <h4 className="font-semibold text-gray-900 dark:text-white">
                    Order Summary
                  </h4>

                  <div className="flex justify-between text-sm text-gray-700 dark:text-gray-300">
                    <span>Subtotal:</span>
                    <span>£{calculateSubtotal()}</span>
                  </div>

                  {/* Discount Section */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        Discount:
                      </span>
                      <div className="flex items-center space-x-2">
                        <select
                          value={discountType}
                          onChange={(e) => setDiscountType(e.target.value)}
                          className="text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded transition-all duration-300"
                        >
                          <option value="amount">£</option>
                          <option value="percentage">%</option>
                        </select>
                        <input
                          type="number"
                          value={discount}
                          onChange={(e) =>
                            setDiscount(
                              Math.max(0, parseFloat(e.target.value) || 0)
                            )
                          }
                          className="w-20 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded focus:ring-1 focus:ring-orange-500 transition-all duration-300"
                          min="0"
                          step="0.01"
                        />
                      </div>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                      <span>Discount Amount:</span>
                      <span>-${calculateDiscount().toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="border-t border-gray-300 dark:border-gray-600 pt-3">
                    <div className="flex justify-between text-lg font-bold text-gray-900 dark:text-white">
                      <span>Total:</span>
                      <span>£{calculateFinalAmount().toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handleClose}
                className="px-6 py-3 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={
                  !customerInfo.name ||
                  !customerInfo.whatsapp ||
                  !customerInfo.address ||
                  selectedProducts.length === 0
                }
                className="px-6 py-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center transform hover:scale-105"
              >
                <Save className="w-4 h-4 mr-2" />
                {order ? "Update Order" : "Create Order"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Product Selection Modal */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden transition-all duration-300">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Select Products
                </h2>
                <button
                  onClick={() => setShowProductModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Product Search and Filter */}
              <div className="flex items-center space-x-4 mt-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300"
                  />
                </div>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300"
                >
                  <option value="all">All Categories</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Products Grid */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {renderProductGrid()}
            </div>

            {/* Selected Products Summary */}
            {selectedProducts.length > 0 && (
              <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-700 transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedProducts.length} product
                    {selectedProducts.length !== 1 ? "s" : ""} selected
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="font-semibold text-gray-900 dark:text-white">
                      Total: £{calculateSubtotal()}
                    </span>
                    <button
                      onClick={() => setShowProductModal(false)}
                      className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors transform hover:scale-105"
                    >
                      Done
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full transition-all duration-300">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 dark:bg-red-900/30 rounded-full">
                <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white text-center mb-2">
                Delete Order
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
                Are you sure you want to delete order {order?.orderNumber}? This
                action cannot be undone.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <style jsx>{`
        /* Phone Input Styling */
        .phone-input-wrapper {
          width: 100% !important;
        }

        .phone-input-wrapper .PhoneInput {
          position: relative;
          width: 100%;
        }

        .phone-number-input {
          width: 100% !important;
          padding: 12px 16px 12px 70px !important;
          border: 1px solid #d1d5db !important;
          background: white !important;
          color: #111827 !important;
          border-radius: 12px !important;
          font-size: 16px !important;
          transition: all 0.3s ease !important;
          outline: none !important;
        }

        .phone-number-input:focus {
          ring: 2px !important;
          ring-color: #f97316 !important;
          border-color: transparent !important;
          box-shadow: 0 0 0 2px #f97316 !important;
        }

        /* Dark mode styles */
        :global(.dark) .phone-number-input {
          border-color: #4b5563 !important;
          background-color: #374151 !important;
          color: white !important;
        }

        :global(.dark) .phone-number-input:focus {
          border-color: transparent !important;
          box-shadow: 0 0 0 2px #f97316 !important;
        }

        /* Country select styling */
        .phone-country-select {
          position: absolute !important;
          left: 4px !important;
          top: 50% !important;
          transform: translateY(-50%) !important;
          z-index: 10 !important;
          background: transparent !important;
          border: none !important;
          padding: 8px 4px !important;
          border-radius: 8px !important;
          cursor: pointer !important;
        }

        .phone-country-select:hover {
          background-color: #f3f4f6 !important;
        }

        :global(.dark) .phone-country-select:hover {
          background-color: #4b5563 !important;
        }

        /* Country select arrow */
        .phone-input-wrapper .PhoneInputCountrySelectArrow {
          display: none !important;
        }

        /* Country flag */
        .phone-input-wrapper .PhoneInputCountryFlag {
          width: 20px !important;
          height: 15px !important;
          margin-right: 8px !important;
        }

        /* Dropdown styling */
        .phone-input-wrapper .PhoneInputCountrySelect:focus {
          outline: none !important;
        }

        /* Fix for the country code text */
        .phone-input-wrapper .PhoneInputCountryCallingCode {
          font-size: 14px !important;
          color: #6b7280 !important;
          margin-left: 4px !important;
        }

        :global(.dark) .phone-input-wrapper .PhoneInputCountryCallingCode {
          color: #9ca3af !important;
        }

        /* Ensure proper spacing */
        .phone-input-wrapper .PhoneInputCountry {
          display: flex !important;
          align-items: center !important;
          padding-right: 8px !important;
          border-right: 1px solid #d1d5db !important;
          margin-right: 8px !important;
        }

        :global(.dark) .phone-input-wrapper .PhoneInputCountry {
          border-right-color: #4b5563 !important;
        }

        /* Mobile responsiveness */
        @media (max-width: 640px) {
          .phone-number-input {
            padding-left: 65px !important;
            font-size: 16px !important; /* Prevents zoom on iOS */
          }

          .phone-country-select {
            left: 2px !important;
          }
        }

        /* Additional fixes for better integration */
        .phone-input-wrapper input[type="tel"] {
          -webkit-appearance: none !important;
          -moz-appearance: textfield !important;
        }

        .phone-input-wrapper input[type="tel"]::-webkit-outer-spin-button,
        .phone-input-wrapper input[type="tel"]::-webkit-inner-spin-button {
          -webkit-appearance: none !important;
          margin: 0 !important;
        }
      `}</style>
    </>
  );
};

export default OrderModal;
