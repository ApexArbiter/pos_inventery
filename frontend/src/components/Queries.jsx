// Updated OrderManagement.jsx - Fixed direct bill sending
import React, { useEffect, useState } from "react";
import {
  Plus,
  Search,
  ShoppingCart,
  Clock,
  CheckCircle,
  AlertCircle,
  User,
  Phone,
  MapPin,
  Calendar,
  X,
  Package,
  Edit,
  MessageCircle,
} from "lucide-react";
import axiosInstance from "../api/axiosInstance";
import OrderModal from "./modals/OrderModal";
import BillGenerator from "./BillGenerator";

import {
  ConfirmStatusModal,
  CancelledStatusModal,
} from "./modals/ConfirmStatusModal";
import { toast } from "react-hot-toast";
import { sendBillDirectly } from "../utils/billUtils.js";

const OrderManagement = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [sendingBill, setSendingBill] = useState({});
  const [billStatus, setBillStatus] = useState({});

  // Keep BillGenerator state for manual bill generation if needed
  const [showBillGenerator, setShowBillGenerator] = useState(false);
  const [currentOrderForBill, setCurrentOrderForBill] = useState(null);

  const [showConfirmStatusModal, setShowConfirmStatusModal] = useState(false);
  const [showCancelledModal, setShowCancelledModal] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState(null);

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusCounts, setStatusCounts] = useState({
    pending: 0,
    confirmed: 0,
    preparing: 0,
    ready: 0,
    delivered: 0,
    cancelled: 0,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });

  // API Functions
  const fetchOrders = async (page = 1, limit = 20) => {
    try {
      setLoading(true);
      const params = {
        page,
        limit,
        sortBy: "createdAt",
        sortOrder: "desc",
      };

      if (statusFilter !== "all") params.status = statusFilter;
      if (priorityFilter !== "all") params.priority = priorityFilter;
      if (searchTerm) params.search = searchTerm;

      const response = await axiosInstance.get("/orders", { params });

      setOrders(response.data.orders);
      setPagination(response.data.pagination);
      setStatusCounts(response.data.statusCounts);
      setError(null);
    } catch (err) {
      setError("Failed to fetch orders");
      console.error("Error fetching orders:", err);
    } finally {
      setLoading(false);
    }
  };

  // Direct bill sending function - no modal needed
  const sendBillViaWhatsAppDirect = async (orderId) => {
    try {
      // Find the order
      const order = orders.find((o) => (o._id || o.id) === orderId);
      if (!order) {
        toast.error("Order not found");
        console.error("Order not found");
        return;
      }

      console.log(`🚀 Sending bill directly for order: ${order.orderNumber}`);

      // Use the exported direct send function
      const result = await sendBillDirectly(
        order,
        axiosInstance,
        setSendingBill,
        setBillStatus,
        toast
      );

      if (result.success) {
        console.log("✅ Bill sent successfully via direct method");
      }
    } catch (error) {
      console.error("❌ Error in direct bill sending:", error);
      toast.error("Failed to send bill");
    }
  };

  // Updated function for manual bill generation (opens modal)
  const openBillGenerator = async (orderId) => {
    try {
      const order = orders.find((o) => (o._id || o.id) === orderId);
      if (!order) {
        toast.error("Order not found");
        return;
      }

      setCurrentOrderForBill(order);
      setShowBillGenerator(true);
    } catch (error) {
      console.error("❌ Error opening bill generator:", error);
      toast.error("Failed to open bill generator");
    }
  };

  // Function to handle bill image generation from modal
  const handleBillImageGenerated = async (imageData) => {
    if (!currentOrderForBill) return;

    const orderId = currentOrderForBill._id || currentOrderForBill.id;

    try {
      console.log(`🚀 Sending bill from modal for order ID: ${orderId}`);

      const response = await axiosInstance.post(
        `/orders/${orderId}/send-bill`,
        {
          imageData: imageData,
        }
      );

      if (response.data.success) {
        const { billImageUrl, sentTo, whatsappMessageId } = response.data.data;

        console.log(`📷 Bill image URL: ${billImageUrl}`);

        setBillStatus((prev) => ({
          ...prev,
          [orderId]: {
            sent: true,
            sentAt: new Date(),
            imageUrl: billImageUrl,
            messageId: whatsappMessageId,
          },
        }));

        toast.success(`Bill sent successfully to ${sentTo}!`);
        setShowBillGenerator(false);
        setCurrentOrderForBill(null);
      }
    } catch (error) {
      console.error("❌ Error sending bill from modal:", error);
      const errorMessage = error.response?.data?.error || "Failed to send bill";
      toast.error(errorMessage);
    }
  };

  const handleBillGeneratorClose = () => {
    setShowBillGenerator(false);
    setCurrentOrderForBill(null);
    if (currentOrderForBill) {
      const orderId = currentOrderForBill._id || currentOrderForBill.id;
      setSendingBill((prev) => ({ ...prev, [orderId]: false }));
    }
  };

  const handleStatusChange = (orderId, newStatus, currentStatus) => {
    if (newStatus === "cancelled") {
      setPendingStatusChange({ orderId, newStatus, currentStatus });
      setShowCancelledModal(true);
    } else if (newStatus === "confirmed") {
      setPendingStatusChange({ orderId, newStatus, currentStatus });
      setShowConfirmStatusModal(true);
    } else {
      updateOrderStatus(orderId, newStatus);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await axiosInstance.patch(`/orders/${orderId}/status`, {
        status: newStatus,
      });

      setOrders(
        orders.map((order) =>
          (order._id || order.id) === orderId
            ? {
                ...order,
                status: newStatus,
                updatedAt: new Date().toISOString(),
              }
            : order
        )
      );

      fetchOrders(pagination.page, pagination.limit);
    } catch (err) {
      console.error("Error updating order status:", err);
      setError("Failed to update order status");
    }
  };

  const confirmStatusChange = () => {
    if (pendingStatusChange) {
      updateOrderStatus(
        pendingStatusChange.orderId,
        pendingStatusChange.newStatus
      );
      setPendingStatusChange(null);
      setShowConfirmStatusModal(false);
      setShowCancelledModal(false);
    }
  };

  const cancelStatusChange = () => {
    setPendingStatusChange(null);
    setShowConfirmStatusModal(false);
    setShowCancelledModal(false);
  };

  const handleOrderSave = async (orderData) => {
    try {
      if (editingOrder) {
        const response = await axiosInstance.put(
          `/orders/${editingOrder._id || editingOrder.id}`,
          orderData
        );
        setOrders(
          orders.map((order) =>
            (order._id || order.id) === (editingOrder._id || editingOrder.id)
              ? response.data.order
              : order
          )
        );
        toast.success("Order details updated successfully");
      } else {
        const response = await axiosInstance.post("/orders", orderData);
        const newOrder = response.data.order;

        // Add new order to state immediately
        setOrders([newOrder, ...orders]);
        toast.success("Order created successfully");

        // Auto-send bill for new orders - pass the order directly instead of looking it up
        setTimeout(async () => {
          try {
            console.log(
              "🔄 Auto-sending bill for new order:",
              newOrder.orderNumber
            );

            // Use the sendBillDirectly function but pass the order directly
            const result = await sendBillDirectly(
              newOrder, // Pass the order object directly
              axiosInstance,
              setSendingBill,
              setBillStatus,
              toast
            );

            if (result.success) {
              console.log("✅ Bill sent successfully via direct method");
            }
          } catch (billError) {
            console.error("Failed to auto-send WhatsApp bill:", billError);
            toast.error("Order created but failed to send bill automatically");
          }
        }, 2000); // Increased delay to 2 seconds// 1 second delay to ensure order is processed
      }

      setShowOrderModal(false);
      // Refresh orders list to get latest data
      setTimeout(() => {
        fetchOrders(pagination.page, pagination.limit);
      }, 500);
    } catch (err) {
      console.error("Error saving order:", err);
      toast.error("Failed to save order");
    }
  };

  const handleOrderDelete = async (orderId) => {
    try {
      await axiosInstance.delete(`/orders/${orderId}`);
      setOrders(orders.filter((order) => (order._id || order.id) !== orderId));
      setShowOrderModal(false);
      fetchOrders(pagination.page, pagination.limit);
    } catch (err) {
      console.error("Error deleting order:", err);
      setError("Failed to delete order");
    }
  };

  // Effects
  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      fetchOrders(1, pagination.limit);
    }, 500);
    return () => clearTimeout(delayedSearch);
  }, [searchTerm, statusFilter, priorityFilter]);

  const openEditOrder = (order) => {
    setEditingOrder(order);
    setShowOrderModal(true);
  };

  const openCreateOrder = () => {
    setEditingOrder(null);
    setShowOrderModal(true);
  };

  // Loading state
  if (loading && orders.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading orders...</p>
        </div>
      </div>
    );
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case "pending":
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case "confirmed":
        return <CheckCircle className="w-4 h-4 text-blue-500" />;
      case "preparing":
        return <Package className="w-4 h-4 text-orange-500" />;
      case "ready":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "delivered":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "cancelled":
        return <X className="w-4 h-4 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 border border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-700";
      case "confirmed":
        return "bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700";
      case "preparing":
        return "bg-orange-100 text-orange-800 border border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-700";
      case "ready":
        return "bg-green-100 text-green-800 border border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700";
      case "delivered":
        return "bg-green-100 text-green-800 border border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700";
      case "cancelled":
        return "bg-red-100 text-red-800 border border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700";
      default:
        return "bg-gray-100 text-gray-800 border border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600";
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800 border border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-700";
      case "low":
        return "bg-green-100 text-green-800 border border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700";
      default:
        return "bg-gray-100 text-gray-800 border border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600";
    }
  };

  const filteredOrders = orders.filter((order) => {
    if (order.status === "confirmed") return false;

    const matchesSearch =
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer.whatsapp.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || order.status === statusFilter;
    const matchesPriority =
      priorityFilter === "all" || order.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 transition-colors duration-300">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 transition-all duration-300">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
              <input
                type="text"
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 min-w-[250px] transition-all duration-300"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-900 dark:text-white transition-all duration-300"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="preparing">Preparing</option>
              <option value="ready">Ready</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-900 dark:text-white transition-all duration-300"
            >
              <option value="all">All Priority</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <button
            onClick={openCreateOrder}
            className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-3 rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all duration-200 flex items-center shadow-lg font-medium transform hover:scale-105"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Order
          </button>
        </div>

        {/* Order Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              label: "Pending",
              count: statusCounts.pending,
              icon: Clock,
              bgColor: "from-yellow-500 to-yellow-600",
            },
            {
              label: "Preparing",
              count: statusCounts.preparing,
              icon: Package,
              bgColor: "from-orange-500 to-orange-600",
            },
            {
              label: "Ready",
              count: statusCounts.ready,
              icon: CheckCircle,
              bgColor: "from-green-500 to-green-600",
            },
            {
              label: "Total",
              count: orders.length,
              icon: ShoppingCart,
              bgColor: "from-blue-500 to-blue-600",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-300 transform hover:scale-105"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    {stat.label}
                  </p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {stat.count ? stat.count : 0}
                  </p>
                </div>
                <div
                  className={`p-3 bg-gradient-to-br ${stat.bgColor} rounded-xl shadow-lg`}
                >
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Orders List */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 transition-all duration-300">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Orders
              </h3>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {filteredOrders.length} of {orders.length} orders
              </div>
            </div>
          </div>

          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredOrders.map((order) => (
              <div
                key={order.id}
                className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all duration-200"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      {getStatusIcon(order.status)}
                      <h4 className="font-semibold text-gray-900 dark:text-white text-lg">
                        {order.orderNumber}
                      </h4>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                          order.status
                        )}`}
                      >
                        {order.status.toUpperCase()}
                      </span>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(
                          order.priority
                        )}`}
                      >
                        {order.priority.toUpperCase()}
                      </span>
                    </div>

                    <div className="mb-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        <strong>Items:</strong>{" "}
                        {order.items
                          .map((item) => `${item.name} (${item.quantity})`)
                          .join(", ")}
                      </div>
                      {order.notes && (
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          <strong>Notes:</strong> {order.notes}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-lg">
                        <User className="w-4 h-4 mr-2" />
                        <span className="font-medium">
                          {order.customer.name}
                        </span>
                      </div>
                      <div className="flex items-center bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-lg">
                        <Phone className="w-4 h-4 mr-2" />
                        <span className="font-medium">
                          {order.customer.whatsapp}
                        </span>
                      </div>
                      <div className="flex items-center bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-lg">
                        <MapPin className="w-4 h-4 mr-2" />
                        <span className="font-medium">
                          {order.customer.address}
                        </span>
                      </div>
                      <div className="flex items-center bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-lg">
                        <Calendar className="w-4 h-4 mr-2" />
                        <span className="font-medium">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 ml-6">
                    <div className="text-right">
                      <div className="flex items-center text-lg font-bold text-gray-900 dark:text-white">
                        £ {order.finalAmount}
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Total: £{order.totalAmount} | Discount: £
                        {order.discount}
                      </span>
                    </div>

                    <div className="flex flex-col gap-2">
                      <select
                        value={order.status}
                        onChange={(e) =>
                          handleStatusChange(
                            order._id || order.id,
                            e.target.value,
                            order.status
                          )
                        }
                        disabled={order.status === "cancelled"}
                        className="text-xs px-2 py-1 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="pending">Pending</option>
                        <option value="preparing">Preparing</option>
                        <option value="ready">Ready</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>

                      <button
                        onClick={() => openEditOrder(order)}
                        className="flex items-center text-orange-600 hover:text-orange-700 transition-colors text-sm font-medium bg-orange-50 dark:bg-orange-900/30 px-3 py-1 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/50"
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Edit
                      </button>

                      {/* Direct WhatsApp send button */}
                      <button
                        onClick={() =>
                          sendBillViaWhatsAppDirect(order._id || order.id)
                        }
                        disabled={sendingBill[order._id || order.id]}
                        className={`flex items-center text-sm font-medium px-3 py-1 rounded-lg transition-colors ${
                          sendingBill[order._id || order.id]
                            ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                            : billStatus[order._id || order.id]?.sent
                            ? "text-green-600 hover:text-green-700 bg-green-50 dark:bg-green-900/30 hover:bg-green-100 dark:hover:bg-green-900/50"
                            : "text-purple-600 hover:text-purple-700 bg-purple-50 dark:bg-purple-900/30 hover:bg-purple-100 dark:hover:bg-purple-900/50"
                        }`}
                      >
                        {sendingBill[order._id || order.id] ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-500 mr-1"></div>
                            Sending...
                          </>
                        ) : billStatus[order._id || order.id]?.sent ? (
                          <>
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Resend Bill
                          </>
                        ) : (
                          <>
                            <MessageCircle className="w-3 h-3 mr-1" />
                            Send Bill
                          </>
                        )}
                      </button>

                      {/* Optional: Manual bill generator button */}
                      <button
                        onClick={() => openBillGenerator(order._id || order.id)}
                        className="flex items-center text-blue-600 hover:text-blue-700 transition-colors text-sm font-medium bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50"
                      >
                        <Package className="w-3 h-3 mr-1" />
                        View Bill
                      </button>

                      {billStatus[order._id || order.id]?.sent && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 px-2">
                          Sent:{" "}
                          {new Date(
                            billStatus[order._id || order.id].sentAt
                          ).toLocaleTimeString()}
                          {billStatus[order._id || order.id]?.imageUrl && (
                            <div className="text-xs text-blue-500 mt-1">
                              <a
                                href={
                                  billStatus[order._id || order.id].imageUrl
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:underline"
                              >
                                View Image
                              </a>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {filteredOrders.length === 0 && (
              <div className="p-12 text-center">
                <ShoppingCart className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No orders found
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Try adjusting your search or filter criteria.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Order Modal */}
        {showOrderModal && (
          <OrderModal
            isOpen={showOrderModal}
            onClose={() => setShowOrderModal(false)}
            order={editingOrder}
            onSave={handleOrderSave}
            onDelete={handleOrderDelete}
            orders={orders}
          />
        )}

        {/* Bill Generator Modal - Only for manual bill generation */}
        {showBillGenerator && currentOrderForBill && (
          <BillGenerator
            isOpen={showBillGenerator}
            onClose={handleBillGeneratorClose}
            order={currentOrderForBill}
            onImageGenerated={handleBillImageGenerated}
            isGeneratingForWhatsApp={false} // This is for manual generation
          />
        )}

        {/* Status Confirmation Modals */}
        {showConfirmStatusModal && pendingStatusChange && (
          <ConfirmStatusModal
            isOpen={showConfirmStatusModal}
            onClose={cancelStatusChange}
            onConfirm={confirmStatusChange}
            orderNumber={
              orders.find(
                (o) => (o._id || o.id) === pendingStatusChange.orderId
              )?.orderNumber
            }
            currentStatus={pendingStatusChange.currentStatus}
            newStatus={pendingStatusChange.newStatus}
          />
        )}

        {showCancelledModal && pendingStatusChange && (
          <CancelledStatusModal
            isOpen={showCancelledModal}
            onClose={cancelStatusChange}
            onConfirm={confirmStatusChange}
            orderNumber={
              orders.find(
                (o) => (o._id || o.id) === pendingStatusChange.orderId
              )?.orderNumber
            }
          />
        )}
      </div>
    </div>
  );
};

export default OrderManagement;
