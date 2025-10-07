import React from "react";
import { X, Printer, Download, MessageCircle } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const BillGenerator = ({
  isOpen,
  onClose,
  order,
  onImageGenerated,
  isGeneratingForWhatsApp = false,
}) => {
  const billRef = React.useRef();
  const [isGeneratingImage, setIsGeneratingImage] = React.useState(false);

  if (!isOpen || !order) return null;

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
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

  // Function to generate image and send to WhatsApp
  const handleSendViaWhatsApp = async () => {
    const element = billRef.current;

    try {
      setIsGeneratingImage(true);
      console.log("🖼️ Generating bill image for WhatsApp...");

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        width: element.offsetWidth,
        height: element.offsetHeight,
      });

      // Convert canvas to base64 image data
      const imageData = canvas.toDataURL("image/png");
      console.log("✅ Image generated successfully");

      // Call the parent function to handle sending
      if (onImageGenerated) {
        await onImageGenerated(imageData);
      }
    } catch (error) {
      console.error("❌ Error generating image for WhatsApp:", error);
      alert("Error generating bill image. Please try again.");
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleDownloadPDF = async () => {
    const element = billRef.current;

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF();

      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`Bill-${order.orderNumber}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Error generating PDF. Please try again.");
    }
  };

  const handleDownloadImage = async () => {
    const element = billRef.current;

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });

      const link = document.createElement("a");
      link.download = `Bill-${order.orderNumber}.png`;
      link.href = canvas.toDataURL();
      link.click();
    } catch (error) {
      console.error("Error generating image:", error);
      alert("Error generating image. Please try again.");
    }
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
              padding: 12px; 
              color: #333;
              line-height: 1.2;
            }
            .bill-container { 
              max-width: 600px; 
              margin: 0 auto; 
              border: 2px solid #000;
              padding: 12px;
              background: white;
            }
            .header { 
              text-align: center; 
              border-bottom: 2px solid #000; 
              padding-bottom: 10px; 
              margin-bottom: 12px;
            }
            .company-name { 
              font-size: 20px; 
              font-weight: bold; 
              margin-bottom: 5px;
            }
            .order-info { 
              display: flex; 
              justify-content: space-between; 
              margin-bottom: 12px;
              flex-wrap: wrap;
            }
            .customer-info { 
              margin-bottom: 12px; 
              padding: 8px; 
              border: 1px solid #ddd;
            }
            .items-table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-bottom: 12px;
            }
            .items-table th, .items-table td { 
              border: 1px solid #000; 
              padding: 5px; 
              text-align: left;
              vertical-align: top;
            }
            .items-table th { 
              background-color: #f5f5f5; 
              font-weight: bold;
            }
            .sr-number { 
              text-align: center; 
              font-weight: bold;
              width: 50px;
            }
            .deal-items { 
              font-size: 11px; 
              color: #666; 
              margin-top: 4px; 
              padding: 5px; 
              background-color: #f9f9f9;
              border-radius: 4px;
              border-left: 3px solid #007bff;
            }
            .deal-items-title { 
              font-weight: bold; 
              margin-bottom: 4px; 
              color: #007bff;
              font-size: 11px;
            }
            .deal-item { 
              margin-bottom: 2px;
              padding-left: 8px;
            }
            .total-section { 
              border-top: 2px solid #000; 
              padding-top: 10px;
            }
            .total-row { 
              display: flex; 
              justify-content: space-between; 
              margin-bottom: 5px;
            }
            .final-total { 
              font-size: 16px; 
              font-weight: bold; 
              border-top: 1px solid #000; 
              padding-top: 8px; 
              margin-top: 8px;
            }
            .footer { 
              text-align: center; 
              margin-top: 15px; 
              border-top: 1px solid #ddd; 
              padding-top: 10px;
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

  // Enhanced function to render deal items with serial numbers
  const renderDealItems = (item) => {
    // Get items from productId if available, otherwise fall back to item.items
    const dealItems = item.productId?.items || item.items;

    // Check if this is a deal product and has items
    if (item.category === "Deals" && dealItems && dealItems.length > 0) {
      return (
        <div style={billStyles.dealItems}>
          <div style={billStyles.dealItemsTitle}>Deal Includes:</div>
          {dealItems.map((dealItem, index) => (
            <div key={index} style={billStyles.dealItem}>
              {index + 1}. {dealItem}
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // Inline styles for the preview to match print exactly
  const billStyles = {
    container: {
      maxWidth: "600px",
      margin: "0 auto",
      border: "2px solid #000",
      padding: "12px",
      background: "white",
      color: "#333",
      fontFamily: "Arial, sans-serif",
      lineHeight: "1.2",
    },
    header: {
      textAlign: "center",
      borderBottom: "2px solid #000",
      paddingBottom: "10px",
      marginBottom: "12px",
    },
    companyName: {
      fontSize: "20px",
      fontWeight: "bold",
      marginBottom: "5px",
    },
    orderInfo: {
      display: "flex",
      justifyContent: "space-between",
      marginBottom: "12px",
      flexWrap: "wrap",
    },
    customerInfo: {
      marginBottom: "12px",
      padding: "8px",
      border: "1px solid #ddd",
    },
    itemsTable: {
      width: "100%",
      borderCollapse: "collapse",
      marginBottom: "12px",
    },
    tableHeader: {
      border: "1px solid #000",
      padding: "5px",
      textAlign: "left",
      backgroundColor: "#f5f5f5",
      fontWeight: "bold",
      verticalAlign: "top",
    },
    tableHeaderCenter: {
      border: "1px solid #000",
      padding: "5px",
      textAlign: "center",
      backgroundColor: "#f5f5f5",
      fontWeight: "bold",
      verticalAlign: "top",
      width: "50px",
    },
    tableCell: {
      border: "1px solid #000",
      padding: "5px",
      textAlign: "left",
      verticalAlign: "top",
    },
    tableCellCenter: {
      border: "1px solid #000",
      padding: "5px",
      textAlign: "center",
      verticalAlign: "top",
      fontWeight: "bold",
      width: "50px",
    },
    dealItems: {
      fontSize: "11px",
      color: "#666",
      marginTop: "4px",
      padding: "5px",
      backgroundColor: "#f9f9f9",
      borderRadius: "4px",
      borderLeft: "3px solid #007bff",
    },
    dealItemsTitle: {
      fontWeight: "bold",
      marginBottom: "4px",
      color: "#007bff",
      fontSize: "11px",
    },
    dealItem: {
      marginBottom: "2px",
      paddingLeft: "8px",
    },
    totalSection: {
      borderTop: "2px solid #000",
      paddingTop: "10px",
    },
    totalRow: {
      display: "flex",
      justifyContent: "space-between",
      marginBottom: "5px",
    },
    finalTotal: {
      fontSize: "16px",
      fontWeight: "bold",
      borderTop: "1px solid #000",
      paddingTop: "8px",
      marginTop: "8px",
    },
    footer: {
      textAlign: "center",
      marginTop: "15px",
      borderTop: "1px solid #ddd",
      paddingTop: "10px",
    },
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Bill - {order.orderNumber}
          </h2>
          <div className="flex items-center space-x-3">
            {/* WhatsApp Send Button - Show prominently when generating for WhatsApp */}
            {isGeneratingForWhatsApp && (
              <button
                onClick={handleSendViaWhatsApp}
                disabled={isGeneratingImage}
                className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGeneratingImage ? (
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
            )}

            <button
              onClick={handleDownloadPDF}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center"
            >
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </button>
            <button
              onClick={handleDownloadImage}
              className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition-colors flex items-center"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Image
            </button>
            <button
              onClick={handlePrint}
              className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors flex items-center"
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

        {/* Bill Content - Now using inline styles to match print exactly */}
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
                <strong>Date:</strong> {formatDate(order.createdAt)}
              </div>
              <div>
                <strong>Status:</strong>{" "}
                <span
                  style={{
                    textTransform: "uppercase",
                    fontWeight: "bold",
                    color:
                      order.status === "confirmed"
                        ? "green"
                        : order.status === "cancelled"
                        ? "red"
                        : "orange",
                  }}
                >
                  {order.status}
                </span>
              </div>
            </div>

            {/* Delivery Date if available */}
            {order.deliveryDate && (
              <div style={{ marginBottom: "12px", fontWeight: "bold" }}>
                <strong>Delivery Date:</strong> {formatDate(order.deliveryDate)}
              </div>
            )}

            {/* Customer Info */}
            <div style={billStyles.customerInfo}>
              <h3 style={{ margin: "0 0 8px 0", fontWeight: "bold" }}>
                Customer Information
              </h3>

              {/* Grid Container for 2 Columns */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "8px",
                  marginBottom: "8px",
                }}
              >
                <div>
                  <strong>Name:</strong> {order.customer.name}
                </div>
                <div>
                  <strong>WhatsApp:</strong> {order.customer.whatsapp}
                </div>
                <div style={{ gridColumn: "span 2" }}>
                  <strong>Address:</strong> {order.customer.address}
                </div>
              </div>

              {/* Special Notes Outside the Grid */}
              {order.notes && (
                <div>
                  <strong>Special Notes:</strong> {order.notes}
                </div>
              )}
            </div>

            {/* Items Table */}
            <table style={billStyles.itemsTable}>
              <thead>
                <tr>
                  <th style={billStyles.tableHeaderCenter}>Sr#</th>
                  <th style={{ ...billStyles.tableHeader, width: "45%" }}>
                    Item
                  </th>
                  <th style={{ ...billStyles.tableHeader, width: "15%" }}>
                    Price
                  </th>
                  <th style={{ ...billStyles.tableHeader, width: "10%" }}>
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
                    <td style={billStyles.tableCellCenter}>{index + 1}</td>
                    <td style={billStyles.tableCell}>
                      <div>
                        <div style={{ fontWeight: "bold" }}>{item.name}</div>
                        {item.category === "Deals" && (
                          <div
                            style={{
                              fontSize: "11px",
                              color: "#888",
                              fontStyle: "italic",
                              marginTop: "2px",
                            }}
                          >
                            Deal Package
                          </div>
                        )}
                        {renderDealItems(item)}
                      </div>
                    </td>
                    <td style={billStyles.tableCell}>
                      £{item.price.toFixed(2)}
                    </td>
                    <td
                      style={{ ...billStyles.tableCell, textAlign: "center" }}
                    >
                      {item.quantity}
                    </td>
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
              {order.priority === "high" && (
                <p
                  style={{
                    margin: "10px 0 0 0",
                    fontSize: "12px",
                    color: "#dc3545",
                    fontWeight: "bold",
                  }}
                >
                  ⚠️ HIGH PRIORITY ORDER
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer with quick actions */}
        {isGeneratingForWhatsApp && (
          <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Click "Send via WhatsApp" to generate and send this bill to the
                customer
              </p>
              <div className="flex justify-center space-x-3">
                <button
                  onClick={handleSendViaWhatsApp}
                  disabled={isGeneratingImage}
                  className="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {isGeneratingImage ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Send via WhatsApp
                    </>
                  )}
                </button>
                <button
                  onClick={onClose}
                  className="bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 transition-colors flex items-center font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BillGenerator;
