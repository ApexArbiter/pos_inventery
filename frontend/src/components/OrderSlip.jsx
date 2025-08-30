import React from 'react';
import { X, Printer, MessageSquare, Download, ChefHat } from 'lucide-react';



const OrderSlip = ({ order, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  const handleSendWhatsApp = () => {
    alert(`WhatsApp message would be sent to ${order.customer.phone}`);
  };

  const handleDownload = () => {
    // Create a downloadable version
    const element = document.createElement('a');
    const file = new Blob([document.getElementById('order-slip-content')?.innerHTML || ''], {
      type: 'text/html'
    });
    element.href = URL.createObjectURL(file);
    element.download = `order-slip-${order.id}.html`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b print:hidden">
          <h2 className="text-xl font-semibold text-gray-900">Order Slip</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleDownload}
              className="p-2 text-gray-600 hover:text-gray-800 transition-colors"
              title="Download"
            >
              <Download className="w-5 h-5" />
            </button>
            <button
              onClick={handleSendWhatsApp}
              className="p-2 text-green-600 hover:text-green-800 transition-colors"
              title="Send WhatsApp"
            >
              <MessageSquare className="w-5 h-5" />
            </button>
            <button
              onClick={handlePrint}
              className="p-2 text-blue-600 hover:text-blue-800 transition-colors"
              title="Print"
            >
              <Printer className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Order Slip Content */}
        <div id="order-slip-content" className="p-4 print:p-2 max-w-sm mx-auto">
          {/* Company Header */}
          <div className="text-center mb-4 print:mb-2 border-b-2 border-dashed border-gray-300 pb-3">
            <div className="flex items-center justify-center mb-2">
              <ChefHat className="w-6 h-6 text-orange-600 mr-2" />
              <h1 className="text-lg font-bold text-gray-900 print:text-base">SPICE KITCHEN</h1>
            </div>
            <p className="text-xs text-gray-600">Authentic UK Cuisine</p>
            <p className="text-xs text-gray-600">📍 MG Road, Edinburgh</p>
            <p className="text-xs text-gray-600">📞 +91 98765 43210</p>
          </div>

          {/* Order Header */}
          <div className="mb-3 print:mb-2">
            <div className="text-center mb-2">
              <h2 className="text-sm font-bold text-gray-900">ORDER RECEIPT</h2>
              <p className="text-xs text-gray-600">#{order.id}</p>
            </div>
            <div className="text-xs text-gray-600 space-y-1">
              <div className="flex justify-between">
                <span>Date:</span>
                <span>{new Date(order.created_at).toLocaleDateString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span>Time:</span>
                <span>{new Date(order.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="flex justify-between">
                <span>Customer:</span>
                <span className="font-medium">{order.customer.name}</span>
              </div>
              <div className="flex justify-between">
                <span>Phone:</span>
                <span>{order.customer.phone}</span>
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div className="mb-3 print:mb-2">
            <div className="border-t border-dashed border-gray-300 pt-2">
              <h3 className="text-xs font-semibold text-gray-900 mb-2 text-center">ORDER ITEMS</h3>
              <div className="space-y-1">
                {order.items.map((item, index) => (
                  <div key={index} className="text-xs">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <span className="font-medium">{item.dish_name || item.name}</span>
                        {item.spice_level && (
                          <span className="text-gray-500 ml-1">({item.spice_level})</span>
                        )}
                        {item.notes && (
                          <div className="text-gray-500 text-xs italic">Note: {item.notes}</div>
                        )}
                      </div>
                      <div className="text-right ml-2">
                        <div>{item.quantity} x ${item.price}</div>
                        <div className="font-medium">${item.total.toFixed(2)}</div>
                      </div>
                    </div>
                    {index < order.items.length - 1 && <div className="border-b border-dotted border-gray-200 my-1"></div>}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="border-t border-dashed border-gray-300 pt-2 mb-3">
            <div className="text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal:</span>
                <span>${order.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tax (GST):</span>
                <span>${order.tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t border-dashed border-gray-300 pt-1 font-bold">
                <span>TOTAL:</span>
                <span>${order.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="text-center mb-3">
            <div className="text-xs">
              <span className="text-gray-600">Status: </span>
              <span className={`font-medium ${
                order.status === 'completed' ? 'text-green-600' :
                order.status === 'confirmed' ? 'text-blue-600' :
                order.status === 'pending' ? 'text-yellow-600' :
                'text-gray-600'
              }`}>
                {order.status.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-dashed border-gray-300 pt-2 text-center">
            <p className="text-xs text-gray-600 mb-1">🙏 Thank you for dining with us! 🙏</p>
            <p className="text-xs text-gray-500">Visit us again for more delicious food!</p>
            <p className="text-xs text-gray-500 mt-1">Follow us: @spicekitchen</p>
            <div className="mt-2 text-xs text-gray-400">
              <p>GST No: 29ABCDE1234F1Z5</p>
              <p>FSSAI Lic: 12345678901234</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderSlip;