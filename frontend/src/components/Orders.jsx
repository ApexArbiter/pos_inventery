import React, { useState, useEffect } from "react";
import {
  Plus,
  Search,
  Filter,
  Eye,
  Printer,
  MessageSquare,
  MoreVertical,
  Calendar,
  DollarSign,
  Users,
  Package,
  TrendingUp,
  X,
} from "lucide-react";
import axiosInstance from "../api/axiosInstance";

// Bill Generator Modal Component
const BillGenerator = ({ isOpen, onClose, order }) => {
  const billRef = React.useRef();

  if (!isOpen || !order) return null;

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const calculateDiscountAmount = () => {
    if (order.discountType === "percentage") {
      return (order.totalAmount * order.discount) / 100;
    }
    return order.discount;
  };

  const handlePrint = () => {
    const printContent = billRef.current;
    const printWindow = window.open("", "", "height=600,width=800");

    printWindow.document.write(`
      <html>
        <head>
          <title>Bill - ${order.orderNumber}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 0; 
              padding: 20px; 
              color: #333;
              line-height: 1.4;
            }
            .bill-container { 
              max-width: 600px; 
              margin: 0 auto; 
              border: 2px solid #000;
              padding: 20px;
              background: white;
            }
            .header { 
              text-align: center; 
              border-bottom: 2px solid #000; 
              padding-bottom: 15px; 
              margin-bottom: 20px;
            }
            .company-name { 
              font-size: 24px; 
              font-weight: bold; 
              margin-bottom: 5px;
            }
            .order-info { 
              display: flex; 
              justify-content: space-between; 
              margin-bottom: 20px;
              flex-wrap: wrap;
            }
            .customer-info { 
              margin-bottom: 20px; 
              padding: 10px; 
              border: 1px solid #ddd;
            }
            .items-table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-bottom: 20px;
            }
            .items-table th, .items-table td { 
              border: 1px solid #000; 
              padding: 8px; 
              text-align: left;
            }
            .items-table th { 
              background-color: #f5f5f5; 
              font-weight: bold;
            }
            .total-section { 
              border-top: 2px solid #000; 
              padding-top: 15px;
            }
            .total-row { 
              display: flex; 
              justify-content: space-between; 
              margin-bottom: 5px;
            }
            .final-total { 
              font-size: 18px; 
              font-weight: bold; 
              border-top: 1px solid #000; 
              padding-top: 10px; 
              margin-top: 10px;
            }
            .footer { 
              text-align: center; 
              margin-top: 30px; 
              border-top: 1px solid #ddd; 
              padding-top: 15px;
            }
            @media print {
              body { margin: 0; padding: 10px; }
              .no-print { display: none !important; }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  // Inline styles for the preview to match print exactly
  const billStyles = {
    container: {
      maxWidth: "600px",
      margin: "0 auto",
      border: "2px solid #000",
      padding: "20px",
      background: "white",
      color: "#333",
      fontFamily: "Arial, sans-serif",
      lineHeight: "1.4",
    },
    header: {
      textAlign: "center",
      borderBottom: "2px solid #000",
      paddingBottom: "15px",
      marginBottom: "20px",
    },
    companyName: {
      fontSize: "24px",
      fontWeight: "bold",
      marginBottom: "5px",
    },
    orderInfo: {
      display: "flex",
      justifyContent: "space-between",
      marginBottom: "20px",
      flexWrap: "wrap",
    },
    customerInfo: {
      marginBottom: "20px",
      padding: "10px",
      border: "1px solid #ddd",
    },
    itemsTable: {
      width: "100%",
      borderCollapse: "collapse",
      marginBottom: "20px",
    },
    tableHeader: {
      border: "1px solid #000",
      padding: "8px",
      textAlign: "left",
      backgroundColor: "#f5f5f5",
      fontWeight: "bold",
    },
    tableCell: {
      border: "1px solid #000",
      padding: "8px",
      textAlign: "left",
    },
    totalSection: {
      borderTop: "2px solid #000",
      paddingTop: "15px",
    },
    totalRow: {
      display: "flex",
      justifyContent: "space-between",
      marginBottom: "5px",
    },
    finalTotal: {
      fontSize: "18px",
      fontWeight: "bold",
      borderTop: "1px solid #000",
      paddingTop: "10px",
      marginTop: "10px",
    },
    footer: {
      textAlign: "center",
      marginTop: "30px",
      borderTop: "1px solid #ddd",
      paddingTop: "15px",
    },
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Printer className="w-6 h-6 text-orange-500" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Bill Preview
              </h2>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={handlePrint}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center"
              >
                <Printer className="w-4 h-4 mr-2" />
                Print
              </button>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Bill Content */}
        <div className="p-6">
          <div ref={billRef} style={billStyles.container}>
            {/* Header */}
            <div style={billStyles.header}>
              <div style={billStyles.companyName}>POS</div>
              <div style={{ fontSize: "14px", color: "#666" }}>
                Address: Your Restaurant Address
              </div>
              <div style={{ fontSize: "14px", color: "#666" }}>
                Phone: +92-XXX-XXXXXXX | Email: info@restaurant.com
              </div>
            </div>

            {/* Order Info */}
            <div style={billStyles.orderInfo}>
              <div>
                <strong>Order Number:</strong> {order.orderNumber}
              </div>
              <div>
                <strong>Date:</strong> {formatDate(order.created_at)}
              </div>
              <div>
                <strong>Status:</strong>{" "}
                <span
                  style={{
                    textTransform: "uppercase",
                    fontWeight: "bold",
                    color: "green",
                  }}
                >
                  {order.status}
                </span>
              </div>
            </div>

            {/* Customer Info */}
            <div style={billStyles.customerInfo}>
              <h3 style={{ margin: "0 0 10px 0", fontWeight: "bold" }}>
                Customer Information
              </h3>
              <div style={{ marginBottom: "5px" }}>
                <strong>Name:</strong> {order.customer.name}
              </div>
              <div style={{ marginBottom: "5px" }}>
                <strong>WhatsApp:</strong> {order.customer.whatsapp}
              </div>
              <div style={{ marginBottom: "5px" }}>
                <strong>Address:</strong> {order.customer.address}
              </div>
              {order.notes && (
                <div>
                  <strong>Notes:</strong> {order.notes}
                </div>
              )}
            </div>

            {/* Items Table */}
            <table style={billStyles.itemsTable}>
              <thead>
                <tr>
                  <th style={{ ...billStyles.tableHeader, width: "50%" }}>
                    Item
                  </th>
                  <th style={{ ...billStyles.tableHeader, width: "15%" }}>
                    Price
                  </th>
                  <th style={{ ...billStyles.tableHeader, width: "15%" }}>
                    Qty
                  </th>
                  <th style={{ ...billStyles.tableHeader, width: "20%" }}>
                    Subtotal
                  </th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item, index) => (
                  <tr key={index}>
                    <td style={billStyles.tableCell}>{item.name}</td>
                    <td style={billStyles.tableCell}>
                      £{item.price.toFixed(2)}
                    </td>
                    <td style={billStyles.tableCell}>{item.quantity}</td>
                    <td style={billStyles.tableCell}>
                      £{item.subtotal.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Total Section */}
            <div style={billStyles.totalSection}>
              <div style={billStyles.totalRow}>
                <span>Subtotal:</span>
                <span>£{order.totalAmount.toFixed(2)}</span>
              </div>

              {order.discount > 0 && (
                <div style={billStyles.totalRow}>
                  <span>
                    Discount (
                    {order.discountType === "percentage"
                      ? `${order.discount}%`
                      : `£${order.discount}`}
                    ):
                  </span>
                  <span>-£{calculateDiscountAmount().toFixed(2)}</span>
                </div>
              )}

              <div style={{ ...billStyles.totalRow, ...billStyles.finalTotal }}>
                <span>Total Amount:</span>
                <span>£{order.finalAmount.toFixed(2)}</span>
              </div>
            </div>

            {/* Footer */}
            <div style={billStyles.footer}>
              <p style={{ margin: "0 0 5px 0", fontWeight: "bold" }}>
                Thank you for your order!
              </p>
              <p style={{ margin: "0", fontSize: "12px", color: "#666" }}>
                For any queries, please contact us at the above number.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Order Details Modal Component
const OrderDetailsModal = ({ isOpen, onClose, order, onPrint }) => {
  if (!isOpen || !order) return null;

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const calculateDiscountAmount = () => {
    if (order.discountType === "percentage") {
      return (order.totalAmount * order.discount) / 100;
    }
    return order.discount;
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Package className="w-6 h-6 text-orange-500" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Order Details
              </h2>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => onPrint(order)}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center"
              >
                <Printer className="w-4 h-4 mr-2" />
                Print Bill
              </button>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Order Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-xl">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-500 p-2 rounded-lg">
                  <Package className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Order Number
                  </p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {order.orderNumber}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-xl">
              <div className="flex items-center space-x-3">
                <div className="bg-green-500 p-2 rounded-lg">
                  <DollarSign className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Total Amount
                  </p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    £{order.finalAmount.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-orange-50 dark:bg-orange-900/30 p-4 rounded-xl">
              <div className="flex items-center space-x-3">
                <div className="bg-orange-500 p-2 rounded-lg">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Order Date
                  </p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {/* {formatDate(order.createdAt)} */}
                    {new Date(order.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 dark:bg-purple-900/30 p-4 rounded-xl">
              <div className="flex items-center space-x-3">
                <div className="bg-purple-500 p-2 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Priority
                  </p>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(
                      order.priority
                    )}`}
                  >
                    {order.priority}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Customer Information */}
          <div className="bg-white dark:bg-gray-700 p-6 rounded-xl border border-gray-200 dark:border-gray-600">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Customer Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Name</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {order.customer.name}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  WhatsApp
                </p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {order.customer.whatsapp}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Address
                </p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {order.customer.address}
                </p>
              </div>
            </div>
            {order.deliveryDate && (
              <div className="mt-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Delivery Date
                </p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {formatDate(order.deliveryDate)}
                </p>
              </div>
            )}
            {order.notes && (
              <div className="mt-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Notes
                </p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {order.notes}
                </p>
              </div>
            )}
          </div>

          {/* Order Items */}
          <div className="bg-white dark:bg-gray-700 p-6 rounded-xl border border-gray-200 dark:border-gray-600">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Order Items
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Item
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Quantity
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Subtotal
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                  {order.items.map((item, index) => (
                    <tr key={index}>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {item.name}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-gray-900 dark:text-white">
                        £{item.price.toFixed(2)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-gray-900 dark:text-white">
                        {item.quantity}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap font-medium text-gray-900 dark:text-white">
                        £{item.subtotal.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Order Summary */}
          <div className="bg-white dark:bg-gray-700 p-6 rounded-xl border border-gray-200 dark:border-gray-600">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Order Summary
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">
                  Subtotal:
                </span>
                <span className="font-medium text-gray-900 dark:text-white">
                  £{order.totalAmount.toFixed(2)}
                </span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    Discount (
                    {order.discountType === "percentage"
                      ? `${order.discount}%`
                      : `£${order.discount}`}
                    ):
                  </span>
                  <span className="font-medium text-red-600">
                    -£{calculateDiscountAmount().toFixed(2)}
                  </span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-600">
                <span className="text-lg font-semibold text-gray-900 dark:text-white">
                  Total:
                </span>
                <span className="text-lg font-bold text-green-600">
                  £{order.finalAmount.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main Confirmed Orders Component
const ConfirmedOrders = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [showBillGenerator, setShowBillGenerator] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({});
  const [statusCounts, setStatusCounts] = useState({});
  const [statusFilter, setStatusFilter] = useState("confirmed");
  const [priorityFilter, setPriorityFilter] = useState("all");

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

  useEffect(() => {
    fetchOrders();
  }, [statusFilter, priorityFilter, searchTerm]);

  // Filter only confirmed orders
  const confirmedOrders = orders.filter(
    (order) => order.status === "confirmed"
  );

  const filteredOrders = confirmedOrders.filter((order) => {
    const matchesSearch =
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer.whatsapp.includes(searchTerm);
    return matchesSearch;
  });

  // Calculate stats
  const totalOrders = confirmedOrders.length;
  const totalRevenue = confirmedOrders.reduce(
    (sum, order) => sum + order.finalAmount,
    0
  );
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const totalItems = confirmedOrders.reduce(
    (sum, order) =>
      sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
    0
  );

  const handleViewOrder = (order) => {
    setSelectedOrder(order);
    setShowOrderDetails(true);
  };

  const handlePrintOrder = (order) => {
    setSelectedOrder(order);
    setShowBillGenerator(true);
  };

  const handleSendWhatsApp = (order) => {
    const message = `Hi ${order.customer.name}! Your order ${
      order.orderNumber
    } has been confirmed. Total: £${order.finalAmount.toFixed(
      2
    )}. We'll notify you once it's ready for delivery.`;
    const whatsappUrl = `https://wa.me/${order.customer.whatsapp.replace(
      "+",
      ""
    )}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
        role="alert"
      >
        <strong className="font-bold">Error!</strong>
        <span className="block sm:inline"> {error}</span>
        <button
          onClick={() => fetchOrders()}
          className="absolute top-0 bottom-0 right-0 px-4 py-3"
        >
          <svg
            className="fill-current h-6 w-6 text-red-500"
            role="button"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
          >
            <title>Refresh</title>
            <path d="M10 3v2a5 5 0 0 0-3.54 8.54l-1.41 1.41A7 7 0 0 1 10 3zm4.95 2.05A7 7 0 0 1 10 17v-2a5 5 0 0 0 3.54-8.54l1.41-1.41zM10 20l-4-4 4-4v8zm0-12V0l4 4-4 4z" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {/* <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 rounded-2xl text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Total Orders</p>
              <p className="text-3xl font-bold">{totalOrders}</p>
            </div>
            <Package className="w-8 h-8 text-blue-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 rounded-2xl text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Total Revenue</p>
              <p className="text-3xl font-bold">£{totalRevenue.toFixed(2)}</p>
            </div>
            <DollarSign className="w-8 h-8 text-green-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-6 rounded-2xl text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">Average Order</p>
              <p className="text-3xl font-bold">£{averageOrderValue.toFixed(2)}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-purple-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-6 rounded-2xl text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm">Total Items</p>
              <p className="text-3xl font-bold">{totalItems}</p>
            </div>
            <Users className="w-8 h-8 text-orange-200" />
          </div>
        </div>
      </div> */}

      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
            Confirmed Orders Only
          </span>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-300 hover:shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Order ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Items
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Order Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Delivery Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredOrders.map((order) => (
                <tr
                  key={order.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all duration-200"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {order.orderNumber}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {order.customer.name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {order.customer.whatsapp}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {order.items.length} item
                      {order.items.length > 1 ? "s" : ""}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {order.items
                        .slice(0, 2)
                        .map((item) => item.name)
                        .join(", ")}
                      {order.items.length > 2 && "..."}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900 dark:text-white">
                      £{order.finalAmount.toFixed(2)}
                    </div>
                    {order.discount > 0 && (
                      <div className="text-xs text-red-500">
                        -
                        {order.discountType === "percentage"
                          ? `${order.discount}%`
                          : `${order.discount}`}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        order.priority === "high"
                          ? "bg-red-100 text-red-800"
                          : order.priority === "medium"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-green-100 text-green-800"
                      }`}
                    >
                      {order.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {order.deliveryDate
                      ? new Date(order.deliveryDate).toLocaleDateString()
                      : "Not set"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleViewOrder(order)}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg p-2 transition-all duration-200 transform hover:scale-110"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handlePrintOrder(order)}
                        className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/30 rounded-lg p-2 transition-all duration-200 transform hover:scale-110"
                        title="Print Bill"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {filteredOrders.length === 0 && (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No confirmed orders found
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              {searchTerm
                ? "Try adjusting your search terms."
                : "Confirmed orders will appear here."}
            </p>
          </div>
        )}
      </div>

      {/* Summary Statistics */}
      {/* {confirmedOrders.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Confirmed Orders Summary
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{totalOrders}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Total Orders</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">${totalRevenue.toFixed(2)}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Total Revenue</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">${averageOrderValue.toFixed(2)}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Average Order Value</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{totalItems}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Total Items</div>
            </div>
          </div>
        </div>
      )} */}

      {/* Order Details Modal */}
      <OrderDetailsModal
        isOpen={showOrderDetails}
        onClose={() => setShowOrderDetails(false)}
        order={selectedOrder}
        onPrint={handlePrintOrder}
      />

      {/* Bill Generator Modal */}
      <BillGenerator
        isOpen={showBillGenerator}
        onClose={() => setShowBillGenerator(false)}
        order={selectedOrder}
      />
    </div>
  );
};

export default ConfirmedOrders;
