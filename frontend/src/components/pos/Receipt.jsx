import React from 'react';
import { Receipt as ReceiptIcon, Download, Printer } from 'lucide-react';

const Receipt = ({ transaction, onClose }) => {
  const formatDate = (date) => {
    return new Date(date).toLocaleString('en-IN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // Create a downloadable receipt
    const receiptContent = generateReceiptText();
    const blob = new Blob([receiptContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt-${transaction.billNumber}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const generateReceiptText = () => {
    let receipt = '';
    receipt += '='.repeat(40) + '\n';
    receipt += '        DEMO SUPERMARKET\n';
    receipt += '    123 Main Street, Demo City\n';
    receipt += '        GST: GST123456789\n';
    receipt += '='.repeat(40) + '\n';
    receipt += `Bill No: ${transaction.billNumber}\n`;
    receipt += `Date: ${formatDate(transaction.billGeneratedAt)}\n`;
    receipt += `Cashier: ${transaction.cashierName}\n`;
    if (transaction.customerInfo) {
      receipt += `Customer: ${transaction.customerInfo.name}\n`;
    }
    receipt += '-'.repeat(40) + '\n';
    
    transaction.items.forEach(item => {
      receipt += `${item.productName}\n`;
      receipt += `${item.quantity} x Rs.${item.unitPrice} = Rs.${item.totalPrice}\n`;
    });
    
    receipt += '-'.repeat(40) + '\n';
    receipt += `Subtotal: Rs.${transaction.subtotal.toFixed(2)}\n`;
    receipt += `GST (18%): Rs.${transaction.gstAmount.toFixed(2)}\n`;
    receipt += `Total: Rs.${transaction.finalAmount.toFixed(2)}\n`;
    receipt += `Payment: ${transaction.paymentMethod.toUpperCase()}\n`;
    receipt += '='.repeat(40) + '\n';
    receipt += '        Thank you for shopping!\n';
    receipt += '     Visit us again soon!\n';
    receipt += '='.repeat(40) + '\n';
    
    return receipt;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center">
              <ReceiptIcon className="w-6 h-6 mr-2 text-green-600" />
              Receipt
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Receipt Content */}
        <div className="p-6">
          <div className="text-center mb-6">
            <h3 className="text-lg font-bold">DEMO SUPERMARKET</h3>
            <p className="text-sm text-gray-600">123 Main Street, Demo City</p>
            <p className="text-sm text-gray-600">GST: GST123456789</p>
          </div>

          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span>Bill No:</span>
              <span className="font-medium">{transaction.billNumber}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Date:</span>
              <span>{formatDate(transaction.billGeneratedAt)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Cashier:</span>
              <span>{transaction.cashierName}</span>
            </div>
            {transaction.customerInfo && (
              <div className="flex justify-between text-sm">
                <span>Customer:</span>
                <span>{transaction.customerInfo.name}</span>
              </div>
            )}
          </div>

          <div className="border-t border-b py-4 my-4">
            <div className="space-y-2">
              {transaction.items.map((item, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <div className="flex-1">
                    <div className="font-medium">{item.productName}</div>
                    <div className="text-gray-600">
                      {item.quantity} x Rs.{item.unitPrice}
                    </div>
                  </div>
                  <div className="font-medium">
                    Rs.{item.totalPrice.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span>Rs.{transaction.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>GST (18%):</span>
              <span>Rs.{transaction.gstAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>Total:</span>
              <span>Rs.{transaction.finalAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Payment:</span>
              <span className="font-medium">{transaction.paymentMethod.toUpperCase()}</span>
            </div>
          </div>

          <div className="text-center mt-6 py-4 border-t">
            <p className="text-sm text-gray-600">Thank you for shopping!</p>
            <p className="text-sm text-gray-600">Visit us again soon!</p>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 border-t bg-gray-50">
          <div className="flex space-x-3">
            <button
              onClick={handlePrint}
              className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Printer className="w-4 h-4 mr-2" />
              Print
            </button>
            <button
              onClick={handleDownload}
              className="flex-1 flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Receipt;
