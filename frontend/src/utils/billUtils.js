// Create this file as: src/components/utils/billUtils.js
// Enhanced billUtils.js - Export functions for direct bill sending
import html2canvas from "html2canvas";

// Function to generate bill HTML content
export const generateBillHTML = (order) => {
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

  const renderDealItems = (item) => {
    const dealItems = item.productId?.items || item.items;

    if (item.category === "Deals" && dealItems && dealItems.length > 0) {
      return `
        <div style="font-size: 11px; color: #666; margin-top: 4px; padding: 5px; background-color: #f9f9f9; border-radius: 4px; border-left: 3px solid #007bff;">
          <div style="font-weight: bold; margin-bottom: 4px; color: #007bff; font-size: 11px;">Deal Includes:</div>
          ${dealItems
            .map(
              (dealItem, index) => `
            <div style="margin-bottom: 2px; padding-left: 8px;">
              ${index + 1}. ${dealItem}
            </div>
          `
            )
            .join("")}
        </div>
      `;
    }
    return "";
  };

  return `
    <div style="max-width: 600px; margin: 0 auto; border: 2px solid #000; padding: 12px; background: white; color: #333; font-family: Arial, sans-serif; line-height: 1.2;">
      <!-- Header -->
      <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 12px;">
        <div style="font-size: 20px; font-weight: bold; margin-bottom: 5px;">Raza Catering</div>
        <div style="font-size: 14px; color: #666;">Address: Your Restaurant Address</div>
        <div style="font-size: 14px; color: #666;">Phone: +92-XXX-XXXXXXX | Email: info@restaurant.com</div>
      </div>

      <!-- Order Info -->
      <div style="display: flex; justify-content: space-between; margin-bottom: 12px; flex-wrap: wrap;">
        <div><strong>Order Number:</strong> ${order.orderNumber}</div>
        <div><strong>Date:</strong> ${formatDate(order.createdAt)}</div>
        <div><strong>Status:</strong> <span style="text-transform: uppercase; font-weight: bold; color: ${
          order.status === "confirmed"
            ? "green"
            : order.status === "cancelled"
            ? "red"
            : "orange"
        };">${order.status}</span></div>
      </div>

      ${
        order.deliveryDate
          ? `
      <div style="margin-bottom: 12px; font-weight: bold;">
        <strong>Delivery Date:</strong> ${formatDate(order.deliveryDate)}
      </div>
      `
          : ""
      }

      <!-- Customer Info -->
      <div style="margin-bottom: 12px; padding: 8px; border: 1px solid #ddd;">
        <h3 style="margin: 0 0 8px 0; font-weight: bold;">Customer Information</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px;">
          <div><strong>Name:</strong> ${order.customer.name}</div>
          <div><strong>WhatsApp:</strong> ${order.customer.whatsapp}</div>
          <div style="grid-column: span 2;"><strong>Address:</strong> ${
            order.customer.address
          }</div>
        </div>
        ${
          order.notes
            ? `<div><strong>Special Notes:</strong> ${order.notes}</div>`
            : ""
        }
      </div>

      <!-- Items Table -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px;">
        <thead>
          <tr>
            <th style="border: 1px solid #000; padding: 5px; text-align: center; background-color: #f5f5f5; font-weight: bold; width: 50px;">Sr#</th>
            <th style="border: 1px solid #000; padding: 5px; text-align: left; background-color: #f5f5f5; font-weight: bold; width: 45%;">Item</th>
            <th style="border: 1px solid #000; padding: 5px; text-align: left; background-color: #f5f5f5; font-weight: bold; width: 15%;">Price</th>
            <th style="border: 1px solid #000; padding: 5px; text-align: left; background-color: #f5f5f5; font-weight: bold; width: 10%;">Qty</th>
            <th style="border: 1px solid #000; padding: 5px; text-align: left; background-color: #f5f5f5; font-weight: bold; width: 20%;">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${order.items
            .map(
              (item, index) => `
            <tr>
              <td style="border: 1px solid #000; padding: 5px; text-align: center; font-weight: bold;">${
                index + 1
              }</td>
              <td style="border: 1px solid #000; padding: 5px; text-align: left; vertical-align: top;">
                <div>
                  <div style="font-weight: bold;">${item.name}</div>
                  ${
                    item.category === "Deals"
                      ? '<div style="font-size: 11px; color: #888; font-style: italic; margin-top: 2px;">Deal Package</div>'
                      : ""
                  }
                  ${renderDealItems(item)}
                </div>
              </td>
              <td style="border: 1px solid #000; padding: 5px; text-align: left; vertical-align: top;">£${item.price.toFixed(
                2
              )}</td>
              <td style="border: 1px solid #000; padding: 5px; text-align: center; vertical-align: top;">${
                item.quantity
              }</td>
              <td style="border: 1px solid #000; padding: 5px; text-align: left; vertical-align: top;">£${item.subtotal.toFixed(
                2
              )}</td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>

      <!-- Total Section -->
      <div style="border-top: 2px solid #000; padding-top: 10px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
          <span>Subtotal:</span>
          <span>£${order.totalAmount.toFixed(2)}</span>
        </div>
        
        ${
          order.discount > 0
            ? `
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
          <span>Discount (${
            order.discountType === "percentage"
              ? `${order.discount}%`
              : `£${order.discount}`
          }):</span>
          <span>-£${calculateDiscountAmount().toFixed(2)}</span>
        </div>
        `
            : ""
        }
        
        <div style="display: flex; justify-content: space-between; font-size: 16px; font-weight: bold; border-top: 1px solid #000; padding-top: 8px; margin-top: 8px;">
          <span>Total Amount:</span>
          <span>£${order.finalAmount.toFixed(2)}</span>
        </div>
      </div>

      <!-- Footer -->
      <div style="text-align: center; margin-top: 15px; border-top: 1px solid #ddd; padding-top: 10px;">
        <p style="margin: 0 0 5px 0; font-weight: bold;">Thank you for your order!</p>
        <p style="margin: 0; font-size: 12px; color: #666;">For any queries, please contact us at the above number.</p>
        ${
          order.priority === "high"
            ? '<p style="margin: 10px 0 0 0; font-size: 12px; color: #dc3545; font-weight: bold;">⚠️ HIGH PRIORITY ORDER</p>'
            : ""
        }
      </div>
    </div>
  `;
};

// Function to create HTML element and generate image
export const generateBillImage = async (order) => {
  return new Promise((resolve, reject) => {
    try {
      // Create a temporary container
      const container = document.createElement("div");
      container.innerHTML = generateBillHTML(order);
      container.style.position = "fixed";
      container.style.top = "-9999px";
      container.style.left = "-9999px";
      container.style.width = "600px";
      container.style.backgroundColor = "#ffffff";

      // Add to document
      document.body.appendChild(container);

      // Wait for a moment to ensure rendering
      setTimeout(async () => {
        try {
          const canvas = await html2canvas(container, {
            scale: 2,
            useCORS: true,
            backgroundColor: "#ffffff",
            width: 600,
            height: container.offsetHeight,
          });

          const imageData = canvas.toDataURL("image/png");

          // Clean up
          document.body.removeChild(container);

          resolve(imageData);
        } catch (error) {
          // Clean up on error
          if (document.body.contains(container)) {
            document.body.removeChild(container);
          }
          reject(error);
        }
      }, 100);
    } catch (error) {
      reject(error);
    }
  });
};

// Main function to send bill directly without modal
export const sendBillDirectly = async (
  order,
  axiosInstance,
  setSendingBill,
  setBillStatus,
  toast
) => {
  const orderId = order._id || order.id;

  try {
    console.log(`🚀 Sending bill directly for order ID: ${orderId}`);

    // Set loading state
    setSendingBill((prev) => ({ ...prev, [orderId]: true }));

    // Generate bill image
    const imageData = await generateBillImage(order);
    console.log("✅ Bill image generated successfully");

    // Send to backend
    const response = await axiosInstance.post(`/orders/${orderId}/send-bill`, {
      imageData: imageData,
    });

    if (response.data.success) {
      const { billImageUrl, sentTo, whatsappMessageId } = response.data.data;

      // Log the bill image URL
      console.log(`📷 Bill image URL: ${billImageUrl}`);

      // Update bill status
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
      return { success: true, imageUrl: billImageUrl };
    }
  } catch (error) {
    console.error("❌ Error sending bill directly:", error);
    const errorMessage = error.response?.data?.error || "Failed to send bill";
    toast.error(errorMessage);
    return { success: false, error: errorMessage };
  } finally {
    setSendingBill((prev) => ({ ...prev, [orderId]: false }));
  }
};
