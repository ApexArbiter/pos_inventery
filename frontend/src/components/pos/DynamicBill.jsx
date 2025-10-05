import React, { useRef, useState, useEffect } from 'react';
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
import { useAuth } from '../../contexts/AuthContext';

const DynamicBill = ({ transaction, onClose, onWhatsAppSend, loading }) => {
  const { store } = useAuth();
  const billRef = useRef(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [storeInfo, setStoreInfo] = useState({
    storeName: 'SuperMarket POS',
    address: '123 Main Street',
    city: 'Demo City',
    phone: '+92 300 1234567',
    email: 'info@supermarket.com',
    gstNumber: 'GST123456789',
    logo: null
  });

  useEffect(() => {
    if (store) {
      setStoreInfo({
        storeName: store.storeName || 'SuperMarket POS',
        address: store.address || '123 Main Street',
        city: store.city || 'Demo City',
        phone: store.contact?.phone || '+92 300 1234567',
        email: store.contact?.email || 'info@supermarket.com',
        gstNumber: store.gstNumber || 'GST123456789',
        logo: store.logo || null
      });
    }
  }, [store]);

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

  // Generate PDF
  const generatePDF = async () => {
    try {
      setGenerating(true);
      const imageData = await generateBillImage();
      
      if (!imageData) return;

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [80, 200] // Receipt size
      });

      const imgWidth = 80;
      const pageHeight = 200;
      const imgHeight = (imageData.height * imgWidth) / imageData.width;
      let heightLeft = imgHeight;

      let position = 0;

      pdf.addImage(imageData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imageData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`bill-${transaction.billNumber}.pdf`);
      toast.success('PDF downloaded successfully!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setGenerating(false);
    }
  };

  // Print bill
  const handlePrint = () => {
    window.print();
  };

  // Copy bill text
  const copyBillText = () => {
    const billText = generateBillText();
    navigator.clipboard.writeText(billText).then(() => {
      setCopied(true);
      toast.success('Bill text copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Generate bill text for copying
  const generateBillText = () => {
    let text = '';
    text += '='.repeat(40) + '\n';
    text += `        ${storeInfo.storeName.toUpperCase()}\n`;
    text += `    ${storeInfo.address}, ${storeInfo.city}\n`;
    text += `        Phone: ${storeInfo.phone}\n`;
    text += `        Email: ${storeInfo.email}\n`;
    text += `        GST: ${storeInfo.gstNumber}\n`;
    text += '='.repeat(40) + '\n';
    text += `Bill No: ${transaction.billNumber}\n`;
    text += `Date: ${new Date(transaction.createdAt).toLocaleString()}\n`;
    text += `Cashier: ${transaction.cashierName}\n`;
    if (transaction.customerInfo) {
      text += `Customer: ${transaction.customerInfo.name}\n`;
    }
    text += '-'.repeat(40) + '\n';
    
    transaction.items.forEach(item => {
      text += `${item.productName}\n`;
      text += `${item.quantity} x Rs.${item.unitPrice} = Rs.${item.totalPrice}\n`;
    });
    
    text += '-'.repeat(40) + '\n';
    text += `Subtotal: Rs.${transaction.subtotal.toFixed(2)}\n`;
    if (transaction.totalDiscount > 0) {
      text += `Discount: -Rs.${transaction.totalDiscount.toFixed(2)}\n`;
    }
    text += `GST: Rs.${transaction.gstAmount.toFixed(2)}\n`;
    text += `TOTAL: Rs.${transaction.finalAmount.toFixed(2)}\n`;
    text += '='.repeat(40) + '\n';
    text += '        Thank you for shopping!\n';
    text += '     Please visit us again soon!\n';
    text += '='.repeat(40) + '\n';
    
    return text;
  };

  // Send via WhatsApp
  const handleWhatsAppSend = async () => {
    try {
      const imageData = await generateBillImage();
      if (imageData && onWhatsAppSend) {
        await onWhatsAppSend(imageData, transaction);
      }
    } catch (error) {
      console.error('Error sending via WhatsApp:', error);
      toast.error('Failed to send via WhatsApp');
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString('en-PK', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <Receipt className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Bill Preview
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Bill Content */}
        <div className="p-4">
          <div
            ref={billRef}
            className="bg-white p-4 border border-gray-200 rounded-lg text-black text-sm font-mono"
            style={{ width: '300px', margin: '0 auto' }}
          >
            {/* Store Header */}
            <div className="text-center mb-4">
              {storeInfo.logo && (
                <img
                  src={storeInfo.logo}
                  alt="Store Logo"
                  className="w-16 h-16 mx-auto mb-2 object-contain"
                />
              )}
              <h1 className="text-lg font-bold uppercase">{storeInfo.storeName}</h1>
              <p className="text-xs">{storeInfo.address}, {storeInfo.city}</p>
              <p className="text-xs">Phone: {storeInfo.phone}</p>
              <p className="text-xs">Email: {storeInfo.email}</p>
              <p className="text-xs">GST: {storeInfo.gstNumber}</p>
            </div>

            <div className="border-t border-gray-300 pt-2 mb-2">
              <div className="flex justify-between text-xs">
                <span>Bill No: {transaction.billNumber}</span>
                <span>Date: {formatDate(transaction.createdAt)}</span>
              </div>
              <div className="flex justify-between text-xs mt-1">
                <span>Cashier: {transaction.cashierName}</span>
                {transaction.customerInfo && (
                  <span>Customer: {transaction.customerInfo.name}</span>
                )}
              </div>
            </div>

            {/* Items Table */}
            <div className="border-t border-gray-300 pt-2 mb-2">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-300">
                    <th className="text-left py-1">Item</th>
                    <th className="text-center py-1">Qty</th>
                    <th className="text-right py-1">Rate</th>
                    <th className="text-right py-1">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {transaction.items.map((item, index) => (
                    <tr key={index} className="border-b border-gray-200">
                      <td className="py-1">
                        <div className="font-medium">{item.productName}</div>
                        {item.barcode && (
                          <div className="text-xs text-gray-500">#{item.barcode}</div>
                        )}
                      </td>
                      <td className="text-center py-1">{item.quantity}</td>
                      <td className="text-right py-1">Rs.{(item.unitPrice || item.sellingPrice || 0).toFixed(2)}</td>
                      <td className="text-right py-1 font-medium">
                        Rs.{((item.totalPrice || item.totalAmount || (item.quantity * (item.unitPrice || item.sellingPrice || 0)))).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals Table */}
            <div className="border-t border-gray-300 pt-2">
              <table className="w-full text-xs">
                <tbody>
                  <tr>
                    <td className="text-left py-1">Subtotal:</td>
                    <td className="text-right py-1">Rs.{(transaction.subtotal || 0).toFixed(2)}</td>
                  </tr>
                  {transaction.totalDiscount > 0 && (
                    <tr>
                      <td className="text-left py-1 text-red-600">Discount:</td>
                      <td className="text-right py-1 text-red-600">-Rs.{(transaction.totalDiscount || 0).toFixed(2)}</td>
                    </tr>
                  )}
                  <tr>
                    <td className="text-left py-1">GST (18%):</td>
                    <td className="text-right py-1">Rs.{(transaction.gstAmount || 0).toFixed(2)}</td>
                  </tr>
                  <tr className="border-t-2 border-gray-400">
                    <td className="text-left py-2 font-bold text-base">TOTAL:</td>
                    <td className="text-right py-2 font-bold text-base">Rs.{(transaction.finalAmount || 0).toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Payment Info Table */}
            <div className="border-t border-gray-300 pt-2 mt-2">
              <table className="w-full text-xs">
                <tbody>
                  <tr>
                    <td className="text-left py-1 font-medium">Payment Method:</td>
                    <td className="text-right py-1">{transaction.paymentMethod === 'cash' ? 'Cash' : 'Online'}</td>
                  </tr>
                  <tr>
                    <td className="text-left py-1 font-medium">Status:</td>
                    <td className="text-right py-1">
                      <span className={`px-2 py-1 rounded text-xs ${
                        transaction.paymentStatus === 'paid' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {transaction.paymentStatus === 'paid' ? 'Paid' : 'Pending'}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-300 pt-2 mt-4 text-center text-xs">
              <p className="font-bold">Thank you for shopping!</p>
              <p>Please visit us again soon!</p>
              <p className="mt-2 text-gray-600">
                Generated on {new Date().toLocaleString()}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 mt-4">
            <button
              onClick={handlePrint}
              disabled={generating}
              className="flex-1 flex items-center justify-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <Printer className="w-4 h-4 mr-2" />
              Print
            </button>
            
            <button
              onClick={generatePDF}
              disabled={generating}
              className="flex-1 flex items-center justify-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              <Download className="w-4 h-4 mr-2" />
              PDF
            </button>
            
            <button
              onClick={copyBillText}
              disabled={generating}
              className="flex-1 flex items-center justify-center px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
            >
              {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
            
            {onWhatsAppSend && (
              <button
                onClick={handleWhatsAppSend}
                disabled={generating || loading}
                className="flex-1 flex items-center justify-center px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                WhatsApp
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DynamicBill;
