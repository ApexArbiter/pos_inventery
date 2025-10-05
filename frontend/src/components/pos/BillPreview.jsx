import React, { useRef, useState } from 'react';
import {
  Receipt,
  Download,
  Printer,
  MessageCircle,
  X,
  Share2,
  Copy,
  Check,
  Building,
  Calendar,
  Clock,
  User,
  Phone,
  CreditCard,
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import toast from 'react-hot-toast';

const BillPreview = ({ transaction, onClose, onWhatsAppSend, loading }) => {
  const billRef = useRef(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  // Generate bill image
  const generateBillImage = async () => {
    if (!billRef.current) return null;

    try {
      setGenerating(true);
      
      const canvas = await html2canvas(billRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        width: billRef.current.scrollWidth,
        height: billRef.current.scrollHeight,
      });

      return canvas.toDataURL('image/png');
    } catch (error) {
      console.error('Error generating bill image:', error);
      toast.error('Failed to generate bill image');
      return null;
    } finally {
      setGenerating(false);
    }
  };

  // Download as image
  const downloadAsImage = async () => {
    const imageData = await generateBillImage();
    if (!imageData) return;

    const link = document.createElement('a');
    link.download = `bill-${transaction.billNumber}.png`;
    link.href = imageData;
    link.click();
    
    toast.success('Bill downloaded as image');
  };

  // Download as PDF
  const downloadAsPDF = async () => {
    const imageData = await generateBillImage();
    if (!imageData) return;

    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210; // A4 width in mm
      const imgHeight = (billRef.current.scrollHeight * imgWidth) / billRef.current.scrollWidth;
      
      pdf.addImage(imageData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`bill-${transaction.billNumber}.pdf`);
      
      toast.success('Bill downloaded as PDF');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    }
  };

  // Print bill
  const printBill = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Popup blocked. Please allow popups and try again.');
      return;
    }

    const billHTML = billRef.current.innerHTML;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Bill - ${transaction.billNumber}</title>
          <style>
            body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
            .bill-container { max-width: 80mm; margin: 0 auto; }
            @media print {
              body { margin: 0; padding: 0; }
              .bill-container { max-width: none; }
            }
          </style>
        </head>
        <body>
          <div class="bill-container">
            ${billHTML}
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.print();
    printWindow.close();
    
    toast.success('Bill sent to printer');
  };

  // Send via WhatsApp
  const sendViaWhatsApp = async () => {
    const imageData = await generateBillImage();
    if (!imageData) return;

    onWhatsAppSend(imageData);
  };

  // Copy bill details
  const copyBillDetails = () => {
    const billText = `
BILL DETAILS
-----------
Bill Number: ${transaction.billNumber}
Date: ${new Date(transaction.billGeneratedAt).toLocaleString()}
Customer: ${transaction.customerInfo?.name || 'Walk-in Customer'}
Phone: ${transaction.customerInfo?.phone || 'N/A'}

ITEMS:
${transaction.items.map((item, index) => 
  `${index + 1}. ${item.productName} - ${item.quantity} x Rs.${item.sellingPrice} = Rs.${(item.quantity * item.sellingPrice).toFixed(2)}`
).join('\n')}

SUMMARY:
Subtotal: Rs.${transaction.subtotal.toFixed(2)}
${transaction.totalDiscount > 0 ? `Discount: -Rs.${transaction.totalDiscount.toFixed(2)}\n` : ''}GST: Rs.${transaction.gstAmount.toFixed(2)}
TOTAL: Rs.${transaction.finalAmount.toFixed(2)}

Payment Method: ${transaction.paymentMethod.toUpperCase()}
Status: ${transaction.paymentStatus.toUpperCase()}
    `.trim();

    navigator.clipboard.writeText(billText).then(() => {
      setCopied(true);
      toast.success('Bill details copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      toast.error('Failed to copy bill details');
    });
  };

  // Format currency
  const formatCurrency = (amount) => `Rs.${parseFloat(amount).toFixed(2)}`;

  // Get payment method display
  const getPaymentMethodDisplay = (method) => {
    const methods = {
      cash: 'Cash',
      card: 'Card',
      upi: 'UPI',
      wallet: 'Digital Wallet',
      net_banking: 'Net Banking',
    };
    return methods[method] || method.toUpperCase();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
            <Receipt className="w-5 h-5 mr-2" />
            Bill Preview
          </h2>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={copyBillDetails}
              className={`p-2 rounded-lg transition-colors ${
                copied
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
              title="Copy Bill Details"
            >
              {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
            </button>
            
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Bill Preview */}
            <div className="lg:col-span-2">
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-900">
                
                {/* Bill Content */}
                <div ref={billRef} className="max-w-sm mx-auto bg-white text-black p-6 font-mono text-sm">
                  
                  {/* Store Header */}
                  <div className="text-center mb-6 border-b-2 border-dashed border-gray-400 pb-4">
                    <h1 className="text-lg font-bold mb-2">
                      {transaction.storeDetails?.storeName || 'SuperMarket POS'}
                    </h1>
                    <div className="text-xs space-y-1">
                      <p>{transaction.storeDetails?.address || 'Store Address'}</p>
                      <p>Phone: {transaction.storeDetails?.phone || '+91 XXXXXXXXXX'}</p>
                      {transaction.storeDetails?.email && (
                        <p>Email: {transaction.storeDetails.email}</p>
                      )}
                      {transaction.storeDetails?.gstNumber && (
                        <p>GST: {transaction.storeDetails.gstNumber}</p>
                      )}
                    </div>
                  </div>

                  {/* Bill Info */}
                  <div className="mb-4 space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span>Bill No:</span>
                      <span className="font-semibold">{transaction.billNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Date:</span>
                      <span>{new Date(transaction.billGeneratedAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Time:</span>
                      <span>{new Date(transaction.billGeneratedAt).toLocaleTimeString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Cashier:</span>
                      <span>{transaction.cashierDetails?.fullName || 'Staff'}</span>
                    </div>
                  </div>

                  {/* Customer Info */}
                  {transaction.customerInfo && (
                    <div className="mb-4 border-t border-dashed border-gray-400 pt-2">
                      <div className="text-xs space-y-1">
                        <div className="flex justify-between">
                          <span>Customer:</span>
                          <span className="font-semibold">{transaction.customerInfo.name}</span>
                        </div>
                        {transaction.customerInfo.phone && (
                          <div className="flex justify-between">
                            <span>Phone:</span>
                            <span>{transaction.customerInfo.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Items */}
                  <div className="mb-4 border-t border-dashed border-gray-400 pt-2">
                    <div className="text-xs mb-2 font-semibold">ITEMS:</div>
                    {transaction.items.map((item, index) => (
                      <div key={index} className="mb-2">
                        <div className="flex justify-between">
                          <span className="font-medium truncate pr-2">
                            {item.productName}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span>{item.quantity} x Rs.{item.sellingPrice.toFixed(2)}</span>
                          <span className="font-semibold">
                            Rs.{(item.quantity * item.sellingPrice).toFixed(2)}
                          </span>
                        </div>
                        {item.gstRate > 0 && (
                          <div className="text-xs text-gray-600 ml-2">
                            (GST {item.gstRate}%)
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Totals */}
                  <div className="border-t border-dashed border-gray-400 pt-2 mb-4">
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span>{formatCurrency(transaction.subtotal)}</span>
                      </div>
                      
                      {transaction.totalDiscount > 0 && (
                        <div className="flex justify-between">
                          <span>Discount:</span>
                          <span>-{formatCurrency(transaction.totalDiscount)}</span>
                        </div>
                      )}
                      
                      <div className="flex justify-between">
                        <span>GST Amount:</span>
                        <span>{formatCurrency(transaction.gstAmount)}</span>
                      </div>
                      
                      <div className="flex justify-between border-t border-gray-400 pt-1 font-bold text-sm">
                        <span>TOTAL:</span>
                        <span>{formatCurrency(transaction.finalAmount)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Payment Info */}
                  <div className="border-t border-dashed border-gray-400 pt-2 mb-4">
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span>Payment:</span>
                        <span className="font-semibold">
                          {getPaymentMethodDisplay(transaction.paymentMethod)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Status:</span>
                        <span className={`font-semibold ${
                          transaction.paymentStatus === 'completed' 
                            ? 'text-green-600' 
                            : 'text-orange-600'
                        }`}>
                          {transaction.paymentStatus.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="text-center border-t border-dashed border-gray-400 pt-4">
                    <div className="text-xs space-y-1">
                      <p className="font-semibold">Thank you for shopping with us!</p>
                      <p>Visit us again soon</p>
                      <p className="text-xs text-gray-600 mt-2">
                        This is a computer generated bill
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions & Details */}
            <div className="space-y-6">
              
              {/* Quick Actions */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  
                  <button
                    onClick={sendViaWhatsApp}
                    disabled={loading || generating}
                    className="w-full bg-green-500 text-white py-3 px-4 rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Sending...
                      </>
                    ) : (
                      <>
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Send via WhatsApp
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={printBill}
                    disabled={generating}
                    className="w-full bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center disabled:opacity-50"
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    Print Bill
                  </button>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={downloadAsImage}
                      disabled={generating}
                      className="bg-purple-500 text-white py-2 px-3 rounded-lg hover:bg-purple-600 transition-colors flex items-center justify-center disabled:opacity-50 text-sm"
                    >
                      {generating ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <>
                          <Download className="w-4 h-4 mr-1" />
                          PNG
                        </>
                      )}
                    </button>
                    
                    <button
                      onClick={downloadAsPDF}
                      disabled={generating}
                      className="bg-red-500 text-white py-2 px-3 rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center disabled:opacity-50 text-sm"
                    >
                      {generating ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <>
                          <Download className="w-4 h-4 mr-1" />
                          PDF
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Transaction Details */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Transaction Details</h3>
                <div className="space-y-3 text-sm">
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400 flex items-center">
                      <Receipt className="w-4 h-4 mr-2" />
                      Bill Number
                    </span>
                    <span className="font-semibold">{transaction.billNumber}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400 flex items-center">
                      <Calendar className="w-4 h-4 mr-2" />
                      Date
                    </span>
                    <span>{new Date(transaction.billGeneratedAt).toLocaleDateString()}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400 flex items-center">
                      <Clock className="w-4 h-4 mr-2" />
                      Time
                    </span>
                    <span>{new Date(transaction.billGeneratedAt).toLocaleTimeString()}</span>
                  </div>
                  
                  {transaction.customerInfo && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 dark:text-gray-400 flex items-center">
                          <User className="w-4 h-4 mr-2" />
                          Customer
                        </span>
                        <span>{transaction.customerInfo.name}</span>
                      </div>
                      
                      {transaction.customerInfo.phone && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600 dark:text-gray-400 flex items-center">
                            <Phone className="w-4 h-4 mr-2" />
                            Phone
                          </span>
                          <span>{transaction.customerInfo.phone}</span>
                        </div>
                      )}
                    </>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400 flex items-center">
                      <CreditCard className="w-4 h-4 mr-2" />
                      Payment
                    </span>
                    <span>{getPaymentMethodDisplay(transaction.paymentMethod)}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400 flex items-center">
                      <Building className="w-4 h-4 mr-2" />
                      Cashier
                    </span>
                    <span>{transaction.cashierDetails?.fullName || 'Staff'}</span>
                  </div>
                </div>
              </div>

              {/* Order Summary */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Order Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Items:</span>
                    <span>{transaction.items.reduce((sum, item) => sum + item.quantity, 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(transaction.subtotal)}</span>
                  </div>
                  {transaction.totalDiscount > 0 && (
                    <div className="flex justify-between">
                      <span>Discount:</span>
                      <span className="text-red-600">-{formatCurrency(transaction.totalDiscount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>GST:</span>
                    <span>{formatCurrency(transaction.gstAmount)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t border-gray-300 dark:border-gray-600 pt-2">
                    <span>Total:</span>
                    <span className="text-green-600 dark:text-green-400">
                      {formatCurrency(transaction.finalAmount)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-6 bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Bill generated successfully
            </div>
            <button
              onClick={onClose}
              className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillPreview;
