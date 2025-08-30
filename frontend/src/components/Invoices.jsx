import React, { useState } from "react";
import {
  Search,
  Filter,
  Eye,
  Download,
  MessageSquare,
  DollarSign,
  FileText,
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  RefreshCw,
} from "lucide-react";

const Invoices = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(false);

  const invoices = [
    {
      id: "INV-001",
      invoice_number: "INV-2024-001",
      order: {
        id: "ORD-001",
        customer: { name: "John Doe", phone: "+1234567890" },
      },
      amount: 138.05,
      payment_method: "Credit Card",
      payment_status: "paid",
      created_at: "2024-01-15T10:30:00Z",
      paid_at: "2024-01-15T11:00:00Z",
    },
    {
      id: "INV-002",
      invoice_number: "INV-2024-002",
      order: {
        id: "ORD-002",
        customer: { name: "Jane Smith", phone: "+1234567891" },
      },
      amount: 98.96,
      payment_method: "Cash",
      payment_status: "pending",
      created_at: "2024-01-15T11:45:00Z",
    },
    {
      id: "INV-003",
      invoice_number: "INV-2024-003",
      order: {
        id: "ORD-003",
        customer: { name: "Mike Johnson", phone: "+1234567892" },
      },
      amount: 253.54,
      payment_method: "Bank Transfer",
      payment_status: "paid",
      created_at: "2024-01-15T09:15:00Z",
      paid_at: "2024-01-15T14:30:00Z",
    },
    {
      id: "INV-004",
      invoice_number: "INV-2024-004",
      order: {
        id: "ORD-004",
        customer: { name: "Sarah Wilson", phone: "+1234567893" },
      },
      amount: 175.3,
      payment_method: "Credit Card",
      payment_status: "failed",
      created_at: "2024-01-15T13:20:00Z",
    },
  ];

  const getStatusConfig = (status) => {
    switch (status) {
      case "paid":
        return {
          color:
            "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
          icon: CheckCircle2,
          iconColor: "text-emerald-600 dark:text-emerald-400",
        };
      case "pending":
        return {
          color:
            "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
          icon: Clock,
          iconColor: "text-amber-600 dark:text-amber-400",
        };
      case "failed":
        return {
          color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
          icon: AlertCircle,
          iconColor: "text-red-600 dark:text-red-400",
        };
      default:
        return {
          color:
            "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
          icon: FileText,
          iconColor: "text-gray-600 dark:text-gray-400",
        };
    }
  };

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch =
      invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.order.customer.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || invoice.payment_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalRevenue = invoices
    .filter((inv) => inv.payment_status === "paid")
    .reduce((acc, inv) => acc + inv.amount, 0);
  const pendingAmount = invoices
    .filter((inv) => inv.payment_status === "pending")
    .reduce((acc, inv) => acc + inv.amount, 0);
  const failedAmount = invoices
    .filter((inv) => inv.payment_status === "failed")
    .reduce((acc, inv) => acc + inv.amount, 0);

  const handleSendWhatsApp = (invoice) => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      alert(`Invoice confirmation sent to ${invoice.order.customer.phone}`);
    }, 1000);
  };

  const handleDownloadInvoice = (invoice) => {
    setIsLoading(true);
    setTimeout(() => {
      const invoiceContent = `
        <html>
          <head>
            <title>Invoice ${invoice.invoice_number}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 40px; background: #f8fafc; }
              .container { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
              .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; }
              .logo { color: #ea580c; font-size: 28px; font-weight: bold; margin-bottom: 10px; }
              .invoice-title { color: #1e293b; font-size: 24px; margin-bottom: 5px; }
              .invoice-number { color: #64748b; font-size: 18px; }
              .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px; }
              .detail-section { background: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #ea580c; }
              .detail-title { font-weight: bold; color: #1e293b; margin-bottom: 10px; }
              .detail-item { margin-bottom: 8px; }
              .amount-section { text-align: center; background: linear-gradient(135deg, #ea580c, #fb923c); color: white; padding: 30px; border-radius: 12px; margin: 30px 0; }
              .amount { font-size: 36px; font-weight: bold; margin-bottom: 10px; }
              .status-badge { display: inline-block; padding: 8px 16px; border-radius: 20px; font-weight: bold; text-transform: uppercase; }
              .status-paid { background: #dcfce7; color: #166534; }
              .status-pending { background: #fef3c7; color: #92400e; }
              .status-failed { background: #fee2e2; color: #991b1b; }
              .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="logo">🍽️ Catering Pro</div>
                <div class="invoice-title">INVOICE</div>
                <div class="invoice-number">${invoice.invoice_number}</div>
              </div>
              
              <div class="details-grid">
                <div class="detail-section">
                  <div class="detail-title">Customer Information</div>
                  <div class="detail-item"><strong>Name:</strong> ${
                    invoice.order.customer.name
                  }</div>
                  <div class="detail-item"><strong>Phone:</strong> ${
                    invoice.order.customer.phone
                  }</div>
                  <div class="detail-item"><strong>Order ID:</strong> ${
                    invoice.order.id
                  }</div>
                </div>
                
                <div class="detail-section">
                  <div class="detail-title">Payment Information</div>
                  <div class="detail-item"><strong>Method:</strong> ${
                    invoice.payment_method
                  }</div>
                  <div class="detail-item"><strong>Date:</strong> ${new Date(
                    invoice.created_at
                  ).toLocaleDateString()}</div>
                  <div class="detail-item">
                    <strong>Status:</strong> 
                    <span class="status-badge status-${
                      invoice.payment_status
                    }">${invoice.payment_status}</span>
                  </div>
                  ${
                    invoice.paid_at
                      ? `<div class="detail-item"><strong>Paid Date:</strong> ${new Date(
                          invoice.paid_at
                        ).toLocaleDateString()}</div>`
                      : ""
                  }
                </div>
              </div>
              
              <div class="amount-section">
                <div class="amount">$${invoice.amount.toFixed(2)}</div>
                <div>Total Amount</div>
              </div>
              
              <div class="footer">
                <p>Thank you for your business!</p>
                <p>Generated on ${new Date().toLocaleDateString()} | Catering Pro Kitchen Management System</p>
              </div>
            </div>
          </body>
        </html>
      `;

      const element = document.createElement("a");
      const file = new Blob([invoiceContent], { type: "text/html" });
      element.href = URL.createObjectURL(file);
      element.download = `${invoice.invoice_number}.html`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      setIsLoading(false);
    }, 1000);
  };

  const statsCards = [
    {
      title: "Total Invoices",
      value: invoices.length,
      icon: FileText,
      color: "blue",
      bgColor: "bg-blue-50 dark:bg-blue-900/20",
      iconColor: "text-blue-600 dark:text-blue-400",
      textColor: "text-blue-600 dark:text-blue-400",
    },
    {
      title: "Total Revenue",
      value: `$${totalRevenue.toFixed(2)}`,
      icon: TrendingUp,
      color: "emerald",
      bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
      iconColor: "text-emerald-600 dark:text-emerald-400",
      textColor: "text-emerald-600 dark:text-emerald-400",
    },
    {
      title: "Pending Amount",
      value: `$${pendingAmount.toFixed(2)}`,
      icon: Clock,
      color: "amber",
      bgColor: "bg-amber-50 dark:bg-amber-900/20",
      iconColor: "text-amber-600 dark:text-amber-400",
      textColor: "text-amber-600 dark:text-amber-400",
    },
    {
      title: "Failed Amount",
      value: `$${failedAmount.toFixed(2)}`,
      icon: AlertCircle,
      color: "red",
      bgColor: "bg-red-50 dark:bg-red-900/20",
      iconColor: "text-red-600 dark:text-red-400",
      textColor: "text-red-600 dark:text-red-400",
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center space-x-4">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4 transition-colors duration-200 group-focus-within:text-orange-500" />
            <input
              type="text"
              placeholder="Search invoices..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2.5 w-80 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 shadow-sm hover:shadow-md"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-10 pr-8 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 text-gray-900 dark:text-gray-100 shadow-sm hover:shadow-md appearance-none cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>

        <button
          onClick={() => window.location.reload()}
          className="flex items-center px-4 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl font-medium"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </button>
      </div>

      {/* Invoice Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.title}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm hover:shadow-lg p-6 border border-gray-200 dark:border-gray-700 transition-all duration-300 transform hover:scale-105 animate-in slide-in-from-bottom-4"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {stat.value}
                  </p>
                </div>
                <div
                  className={`p-3 rounded-xl ${stat.bgColor} transform transition-transform duration-200 hover:scale-110`}
                >
                  <Icon className={`w-6 h-6 ${stat.iconColor}`} />
                </div>
              </div>
              <div
                className={`mt-2 w-full h-1 ${stat.bgColor} rounded-full overflow-hidden`}
              >
                <div
                  className={`h-full ${stat.textColor.replace(
                    "text-",
                    "bg-"
                  )} rounded-full animate-pulse`}
                  style={{ width: "70%" }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Invoices Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden animate-in slide-in-from-bottom-4 duration-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Recent Invoices
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Manage and track all your invoices
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Invoice
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Order ID
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Payment Method
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredInvoices.map((invoice, index) => {
                const statusConfig = getStatusConfig(invoice.payment_status);
                const StatusIcon = statusConfig.icon;

                return (
                  <tr
                    key={invoice.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors  animate-in slide-in-from-left duration-300"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg mr-3">
                          <FileText className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div className="font-semibold text-gray-900 dark:text-gray-100">
                          {invoice.invoice_number}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {invoice.order.customer.name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {invoice.order.customer.phone}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-mono text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-md inline-block">
                        {invoice.order.id}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-bold text-lg text-gray-900 dark:text-gray-100">
                        ${invoice.amount.toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-gray-100 font-medium">
                        {invoice.payment_method}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${statusConfig.color} transition-all duration-200 hover:scale-105`}
                      >
                        <StatusIcon
                          className={`w-3 h-3 mr-1 ${statusConfig.iconColor}`}
                        />
                        {invoice.payment_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <div className="space-y-1">
                        <div className="font-medium">
                          {new Date(invoice.created_at).toLocaleDateString()}
                        </div>
                        {invoice.paid_at && (
                          <div className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Paid:{" "}
                            {new Date(invoice.paid_at).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleDownloadInvoice(invoice)}
                          disabled={isLoading}
                          className="p-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all duration-200 transform hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed group"
                          title="Download Invoice"
                        >
                          <Download
                            className={`w-4 h-4 ${
                              isLoading
                                ? "animate-bounce"
                                : "group-hover:animate-pulse"
                            }`}
                          />
                        </button>
                        <button
                          onClick={() => handleSendWhatsApp(invoice)}
                          disabled={isLoading}
                          className="p-2 text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-all duration-200 transform hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed group"
                          title="Send WhatsApp"
                        >
                          <MessageSquare
                            className={`w-4 h-4 ${
                              isLoading
                                ? "animate-pulse"
                                : "group-hover:animate-bounce"
                            }`}
                          />
                        </button>
                        <button
                          className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-all duration-200 transform hover:scale-110 group"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4 group-hover:animate-pulse" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredInvoices.length === 0 && (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              No invoices found
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Try adjusting your search or filter criteria.
            </p>
          </div>
        )}
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-2xl border border-gray-200 dark:border-gray-700 animate-in zoom-in-95 duration-300">
            <div className="flex items-center space-x-3">
              <RefreshCw className="w-5 h-5 text-orange-600 animate-spin" />
              <span className="text-gray-900 dark:text-gray-100 font-medium">
                Processing...
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Invoices;
