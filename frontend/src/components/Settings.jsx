import React, { useState } from "react";
import {
  Download,
  FileSpreadsheet,
  Users,
  Calendar,
  Filter,
  AlertCircle,
  CheckCircle,
  Clock,
  Search,
} from "lucide-react";
import axiosInstance from "../api/axiosInstance";

const DocumentDownloadCenter = () => {
  const [activeTab, setActiveTab] = useState("orders");
  const [downloadStatus, setDownloadStatus] = useState({});
  const [dateFilters, setDateFilters] = useState({
    startDate: "",
    endDate: "",
  });
  const [orderFilters, setOrderFilters] = useState({
    status: "all",
    priority: "all",
    search: "",
  });

  const tabs = [
    { id: "orders", label: "Order Reports", icon: FileSpreadsheet },
    { id: "customers", label: "Customer Analytics", icon: Users },
  ];

  const fetchOrderData = async (startDate, endDate, filters = {}) => {
    try {
      const queryParams = new URLSearchParams();

      // Required date parameters
      if (startDate) queryParams.append("startDate", startDate);
      if (endDate) queryParams.append("endDate", endDate);

      // Optional filter parameters
      if (filters.status && filters.status !== "all")
        queryParams.append("status", filters.status);
      if (filters.priority && filters.priority !== "all")
        queryParams.append("priority", filters.priority);
      if (filters.search) queryParams.append("search", filters.search);

      // Pagination - set high limit to get all data for export
      queryParams.append("limit", "10000");
      queryParams.append("page", "1");

      // Sorting
      queryParams.append("sortBy", "createdAt");
      queryParams.append("sortOrder", "desc");

      const response = await axiosInstance.get(
        `/orders/date-range?${queryParams}`
      );

      // With axios, the response data is automatically parsed
      const data = response.data;

      // The updated controller returns more data
      return {
        orders: data.orders,
        stats: data.stats,
        statusBreakdown: data.statusBreakdown,
        total: data.pagination.total,
      };
    } catch (error) {
      console.error("Error fetching order data:", error);
      throw error;
    }
  };

  const fetchAllOrders = async () => {
    try {
      const response = await axiosInstance.get("/orders", {
        params: {
          limit: 10000,
          page: 1,
        },
      });

      // With axios, the response data is automatically parsed
      const data = response.data;
      return data.orders;
    } catch (error) {
      console.error("Error fetching all orders:", error);
      throw error;
    }
  };
  // Generate customer analytics from order data
  const generateCustomerAnalytics = (orders) => {
    const customerMap = {};

    orders.forEach((order) => {
      const phone = order.customer.whatsapp;

      if (!customerMap[phone]) {
        customerMap[phone] = {
          name: order.customer.name,
          phone: order.customer.whatsapp,
          address: order.customer.address,
          totalOrders: 0,
          confirmedOrders: 0,
          deliveredOrders: 0,
          cancelledOrders: 0,
          pendingOrders: 0,
          totalSpent: 0,
          averageOrderValue: 0,
          firstOrderDate: order.createdAt,
          lastOrderDate: order.createdAt,
        };
      }

      const customer = customerMap[phone];
      customer.totalOrders++;
      customer.totalSpent += order.finalAmount;

      // Count by status
      switch (order.status) {
        case "confirmed":
          customer.confirmedOrders++;
          break;
        case "delivered":
          customer.deliveredOrders++;
          break;
        case "cancelled":
          customer.cancelledOrders++;
          break;
        case "pending":
          customer.pendingOrders++;
          break;
      }

      // Update date ranges
      if (new Date(order.createdAt) < new Date(customer.firstOrderDate)) {
        customer.firstOrderDate = order.createdAt;
      }
      if (new Date(order.createdAt) > new Date(customer.lastOrderDate)) {
        customer.lastOrderDate = order.createdAt;
      }
    });

    // Calculate average order values
    Object.values(customerMap).forEach((customer) => {
      customer.averageOrderValue =
        customer.totalOrders > 0
          ? Math.round(customer.totalSpent / customer.totalOrders)
          : 0;
    });

    return Object.values(customerMap);
  };

  // Convert to CSV and download
  const downloadCSV = (data, filename, headers) => {
    let csvContent = headers.join(",") + "\n";

    data.forEach((row) => {
      const csvRow = headers.map((header) => {
        let value = "";

        // Map headers to data properties for orders
        if (filename.includes("orders")) {
          switch (header) {
            case "Order Number":
              value = row.orderNumber;
              break;
            case "Date":
              value = new Date(row.createdAt).toLocaleDateString();
              break;
            case "Customer Name":
              value = row.customer.name;
              break;
            case "Phone Number":
              value = row.customer.whatsapp;
              break;
            case "Address":
              value = row.customer.address;
              break;
            case "Status":
              value = row.status;
              break;
            case "Priority":
              value = row.priority;
              break;
            case "Total Amount":
              value = row.totalAmount;
              break;
            case "Discount":
              value = row.discount;
              break;
            case "Final Amount":
              value = row.finalAmount;
              break;
            case "Items":
              value = row.items
                .map((item) => `${item.name} (${item.quantity})`)
                .join("; ");
              break;
            case "Branch":
              value = row.branch || "";
              break;
            case "Notes":
              value = row.notes || "";
              break;
            default:
              value = "";
          }
        }
        // Map headers to data properties for customers
        else if (filename.includes("customer")) {
          switch (header) {
            case "Customer Name":
              value = row.name;
              break;
            case "Phone Number":
              value = row.phone;
              break;
            case "Address":
              value = row.address;
              break;
            case "Total Orders":
              value = row.totalOrders;
              break;
            case "Confirmed Orders":
              value = row.confirmedOrders;
              break;
            case "Delivered Orders":
              value = row.deliveredOrders;
              break;
            case "Cancelled Orders":
              value = row.cancelledOrders;
              break;
            case "Pending Orders":
              value = row.pendingOrders;
              break;
            case "Total Spent (PKR)":
              value = row.totalSpent;
              break;
            case "Average Order Value (PKR)":
              value = row.averageOrderValue;
              break;
            case "First Order Date":
              value = new Date(row.firstOrderDate).toLocaleDateString();
              break;
            case "Last Order Date":
              value = new Date(row.lastOrderDate).toLocaleDateString();
              break;
            default:
              value = "";
          }
        }

        // Escape quotes and wrap in quotes if contains comma
        if (
          typeof value === "string" &&
          (value.includes(",") || value.includes('"'))
        ) {
          value = `"${value.replace(/"/g, '""')}"`;
        }

        return value;
      });

      csvContent += csvRow.join(",") + "\n";
    });

    // Create and download file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

const handleOrdersDownload = async () => {
  const reportType = "detailed-orders";
  setDownloadStatus({ ...downloadStatus, [reportType]: "downloading" });

  try {
    let orders;

    if (dateFilters.startDate && dateFilters.endDate) {
      // Use date range API - this returns an object with orders array
      const response = await fetchOrderData(
        dateFilters.startDate,
        dateFilters.endDate,
        orderFilters
      );
      
      // Extract the orders array from the response object
      orders = response.orders; // <-- This is the key fix!
      
    } else {
      // Get all orders - this returns array directly
      orders = await fetchAllOrders();

      // Apply filters on frontend if no date range specified
      if (orderFilters.status !== "all") {
        orders = orders.filter(
          (order) => order.status === orderFilters.status
        );
      }
      if (orderFilters.priority !== "all") {
        orders = orders.filter(
          (order) => order.priority === orderFilters.priority
        );
      }
      if (orderFilters.search) {
        const searchLower = orderFilters.search.toLowerCase();
        orders = orders.filter(
          (order) =>
            order.orderNumber.toLowerCase().includes(searchLower) ||
            order.customer.name.toLowerCase().includes(searchLower) ||
            order.customer.whatsapp.includes(searchLower)
        );
      }
    }

    // Add validation to ensure orders is an array
    if (!Array.isArray(orders)) {
      throw new Error('Expected orders to be an array but got: ' + typeof orders);
    }

    const headers = [
      "Order Number",
      "Date",
      "Customer Name",
      "Phone Number",
      "Address",
      "Status",
      "Priority",
      "Total Amount",
      "Discount",
      "Final Amount",
      "Items",
      "Branch",
      "Notes",
    ];

    const filename = `orders_report_${dateFilters.startDate || "all"}_to_${
      dateFilters.endDate || "current"
    }_${new Date().toISOString().split("T")[0]}.csv`;

    downloadCSV(orders, filename, headers);

    setDownloadStatus({ ...downloadStatus, [reportType]: "completed" });
    setTimeout(() => {
      setDownloadStatus({ ...downloadStatus, [reportType]: "idle" });
    }, 3000);
  } catch (error) {
    console.error("Download error:", error);
    setDownloadStatus({ ...downloadStatus, [reportType]: "error" });
    setTimeout(() => {
      setDownloadStatus({ ...downloadStatus, [reportType]: "idle" });
    }, 3000);
  }
};

  const handleCustomerAnalyticsDownload = async () => {
    const reportType = "customer-analytics";
    setDownloadStatus({ ...downloadStatus, [reportType]: "downloading" });

    try {
      // Fetch all orders to generate customer analytics
      const orders = await fetchAllOrders();
      const customerAnalytics = generateCustomerAnalytics(orders);

      const headers = [
        "Customer Name",
        "Phone Number",
        "Address",
        "Total Orders",
        "Confirmed Orders",
        "Delivered Orders",
        "Cancelled Orders",
        "Pending Orders",
        "Total Spent (PKR)",
        "Average Order Value (PKR)",
        "First Order Date",
        "Last Order Date",
      ];

      const filename = `customer_analytics_${
        new Date().toISOString().split("T")[0]
      }.csv`;

      downloadCSV(customerAnalytics, filename, headers);

      setDownloadStatus({ ...downloadStatus, [reportType]: "completed" });
      setTimeout(() => {
        setDownloadStatus({ ...downloadStatus, [reportType]: "idle" });
      }, 3000);
    } catch (error) {
      console.error("Download error:", error);
      setDownloadStatus({ ...downloadStatus, [reportType]: "error" });
      setTimeout(() => {
        setDownloadStatus({ ...downloadStatus, [reportType]: "idle" });
      }, 3000);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "downloading":
        return <Clock className="w-4 h-4 animate-spin" />;
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "error":
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Download className="w-4 h-4" />;
    }
  };

  const getButtonText = (status) => {
    switch (status) {
      case "downloading":
        return "Generating Excel...";
      case "completed":
        return "Downloaded!";
      case "error":
        return "Retry Download";
      default:
        return "Download Excel";
    }
  };

  const renderOrdersTab = () => (
    <div className="space-y-8">
      <div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
          <div className="w-3 h-6 bg-gradient-to-b from-blue-500 to-blue-600 rounded-full mr-3"></div>
          Order Reports & Data Export
        </h3>

        {/* Filters Section */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6 mb-8">
          <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-4 flex items-center">
            <Filter className="w-5 h-5 mr-2" />
            Filter Options
          </h4>

          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={dateFilters.startDate}
                onChange={(e) =>
                  setDateFilters({ ...dateFilters, startDate: e.target.value })
                }
                className="w-full px-4 py-3 border border-blue-300 dark:border-blue-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={dateFilters.endDate}
                onChange={(e) =>
                  setDateFilters({ ...dateFilters, endDate: e.target.value })
                }
                className="w-full px-4 py-3 border border-blue-300 dark:border-blue-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
            </div>
          </div>

          {/* Additional Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">
                Order Status
              </label>
              <select
                value={orderFilters.status}
                onChange={(e) =>
                  setOrderFilters({ ...orderFilters, status: e.target.value })
                }
                className="w-full px-4 py-3 border border-blue-300 dark:border-blue-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="preparing">Preparing</option>
                <option value="ready">Ready</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">
                Priority
              </label>
              <select
                value={orderFilters.priority}
                onChange={(e) =>
                  setOrderFilters({ ...orderFilters, priority: e.target.value })
                }
                className="w-full px-4 py-3 border border-blue-300 dark:border-blue-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              >
                <option value="all">All Priorities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            {/* <div>
              <label className="block text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Order number, customer name..."
                  value={orderFilters.search}
                  onChange={(e) =>
                    setOrderFilters({ ...orderFilters, search: e.target.value })
                  }
                  className="w-full pl-10 pr-4 py-3 border border-blue-300 dark:border-blue-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
              </div>
            </div> */}
          </div>
        </div>

        {/* Download Card */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-8 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center mb-6">
            <div className="p-4 bg-green-100 dark:bg-green-900/30 rounded-xl mr-6">
              <FileSpreadsheet className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h4 className="text-xl font-semibold text-gray-900 dark:text-white">
                Detailed Order Report
              </h4>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Export complete order details with customer information
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div className="space-y-3">
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                Complete order information and customer details
              </div>
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                Order status, priority, and timing data
              </div>
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                Item-wise breakdown with quantities
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                Pricing, discounts, and final amounts
              </div>
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                Branch and user tracking information
              </div>
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                Compatible with Excel and Google Sheets
              </div>
            </div>
          </div>

          <button
            onClick={handleOrdersDownload}
            disabled={downloadStatus["detailed-orders"] === "downloading"}
            className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-green-400 disabled:to-green-500 text-white px-8 py-4 rounded-xl transition-all duration-200 transform hover:scale-[1.02] shadow-lg hover:shadow-xl flex items-center justify-center disabled:cursor-not-allowed disabled:transform-none text-lg font-medium"
          >
            {getStatusIcon(downloadStatus["detailed-orders"])}
            <span className="ml-3">
              {getButtonText(downloadStatus["detailed-orders"])}
            </span>
          </button>
        </div>
      </div>
    </div>
  );

  const renderCustomersTab = () => (
    <div className="space-y-8">
      <div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
          <div className="w-3 h-6 bg-gradient-to-b from-purple-500 to-purple-600 rounded-full mr-3"></div>
          Customer Analytics & Insights
        </h3>

        {/* Customer Analytics Card */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-8 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center mb-6">
            <div className="p-4 bg-purple-100 dark:bg-purple-900/30 rounded-xl mr-6">
              <Users className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h4 className="text-xl font-semibold text-gray-900 dark:text-white">
                Customer Database Export
              </h4>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Comprehensive customer behavior and ordering patterns
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="space-y-3">
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                Complete customer contact information
              </div>
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                Total orders placed by each customer
              </div>
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                Order status breakdown (confirmed, cancelled, pending)
              </div>
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                Customer lifetime value and spending patterns
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                Average order value per customer
              </div>
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                First and last order dates for retention analysis
              </div>
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                Ready for marketing and loyalty programs
              </div>
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                Customer segmentation and targeting insights
              </div>
            </div>
          </div>

          <button
            onClick={handleCustomerAnalyticsDownload}
            disabled={downloadStatus["customer-analytics"] === "downloading"}
            className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 disabled:from-purple-400 disabled:to-purple-500 text-white px-8 py-4 rounded-xl transition-all duration-200 transform hover:scale-[1.02] shadow-lg hover:shadow-xl flex items-center justify-center disabled:cursor-not-allowed disabled:transform-none text-lg font-medium"
          >
            {getStatusIcon(downloadStatus["customer-analytics"])}
            <span className="ml-3">
              {getButtonText(downloadStatus["customer-analytics"])}
            </span>
          </button>
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case "orders":
        return renderOrdersTab();
      case "customers":
        return renderCustomersTab();
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
  

        {/* Navigation Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex space-x-8 px-8 overflow-x-auto">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-6 px-3 border-b-3 font-semibold text-base transition-all duration-300 whitespace-nowrap ${
                      activeTab === tab.id
                        ? "border-indigo-500 text-indigo-600 dark:text-indigo-400 transform scale-105"
                        : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
                    }`}
                  >
                    <div className="flex items-center">
                      <Icon
                        className={`w-5 h-5 mr-3 transition-transform duration-200 ${
                          activeTab === tab.id ? "scale-110" : ""
                        }`}
                      />
                      {tab.label}
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Content Area */}
          <div className="p-8">{renderTabContent()}</div>
        </div>

        {/* Help Section */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-6">
          <div className="flex items-start">
            <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-xl mr-4 mt-1">
              <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                Export Instructions
              </h4>
              <div className="text-sm text-gray-700 dark:text-gray-300 space-y-2">
                <p>
                  <strong>Order Reports:</strong> Use date filters to specify
                  the reporting period. Leave dates empty to export all orders.
                </p>
                <p>
                  <strong>Customer Analytics:</strong> Automatically generates
                  insights from all customer orders including frequency,
                  spending, and status patterns.
                </p>
                <p>
                  <strong>File Format:</strong> All downloads are in CSV format,
                  fully compatible with Excel and Google Sheets.
                </p>
                <p>
                  <strong>Data Security:</strong> Exports respect your user
                  permissions - admins see all data, staff see only their
                  created orders.
                </p>
              </div>
            </div>
          </div>
        </div>

       
      </div>
    </div>
  );
};

export default DocumentDownloadCenter;
