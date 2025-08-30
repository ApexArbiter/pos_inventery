import React from "react";
import { X, AlertTriangle, CheckCircle, Ban } from "lucide-react";

// Confirmation Modal for Status Change to Confirmed
export const ConfirmStatusModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  orderNumber,
  currentStatus,
  newStatus 
}) => {
  if (!isOpen) return null;

  const getStatusMessage = () => {
    if (newStatus === 'confirmed') {
      return {
        title: "Confirm Order Status Change",
        message: `Are you sure you want to change order ${orderNumber} status to "Confirmed"?`,
        warning: "Once confirmed, this order will be moved to the Kitchen/Production tab and cannot be edited from this view.",
        icon: <CheckCircle className="w-12 h-12 text-orange-500" />,
        confirmText: "Yes, Confirm Order",
        confirmClass: "bg-orange-500 hover:bg-orange-600"
      };
    }
    
    return {
      title: "Change Order Status",
      message: `Change order ${orderNumber} status from "${currentStatus}" to "${newStatus}"?`,
      warning: null,
      icon: <AlertTriangle className="w-12 h-12 text-blue-500" />,
      confirmText: "Yes, Change Status",
      confirmClass: "bg-blue-500 hover:bg-blue-600"
    };
  };

  const statusInfo = getStatusMessage();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full transform transition-all duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {statusInfo.title}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 text-center">
          <div className="mb-4 flex justify-center">
            {statusInfo.icon}
          </div>
          
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            {statusInfo.message}
          </h3>
          
          {statusInfo.warning && (
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4 mb-4">
              <div className="flex items-start">
                <AlertTriangle className="w-5 h-5 text-orange-500 mr-2 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-orange-700 dark:text-orange-300 text-left">
                  {statusInfo.warning}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-6 pt-0">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-3 text-white rounded-xl font-medium transition-colors ${statusInfo.confirmClass}`}
          >
            {statusInfo.confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

// Warning Modal for Cancelled Status
export const CancelledStatusModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  orderNumber 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full transform transition-all duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-red-600 dark:text-red-400">
            Cancel Order
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 text-center">
          <div className="mb-4 flex justify-center">
            <Ban className="w-12 h-12 text-red-500" />
          </div>
          
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Cancel Order {orderNumber}?
          </h3>
          
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-4">
            <div className="flex items-start">
              <AlertTriangle className="w-5 h-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
              <div className="text-left">
                <p className="text-sm text-red-700 dark:text-red-300 font-medium mb-1">
                  Warning: This action cannot be undone!
                </p>
                <p className="text-sm text-red-600 dark:text-red-400">
                  Once cancelled, the order status cannot be changed back to any other status.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-6 pt-0">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 font-medium transition-colors"
          >
            Keep Order
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors"
          >
            Yes, Cancel Order
          </button>
        </div>
      </div>
    </div>
  );
};