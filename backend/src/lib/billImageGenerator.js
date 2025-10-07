// lib/billImageGenerator.js - Generate bill as image buffer
import puppeteer from "puppeteer";

class BillImageService {
  // Generate bill HTML content
  generateBillHTML(order) {
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
              <div style="margin-bottom: 2px; padding-left: 8px;">${
                index + 1
              }. ${dealItem}</div>
            `
              )
              .join("")}
          </div>
        `;
      }
      return "";
    };

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Bill - ${order.orderNumber}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 0; 
              padding: 12px; 
              color: #333;
              line-height: 1.2;
              background: white;
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
            .customer-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 8px;
              margin-bottom: 8px;
            }
            .customer-full-width {
              grid-column: span 2;
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
          </style>
        </head>
        <body>
          <div class="bill-container">
            <!-- Header -->
            <div class="header">
              <div class="company-name">POS</div>
              <div style="font-size: 14px; color: #666;">
                Address: Your Restaurant Address
              </div>
              <div style="font-size: 14px; color: #666;">
                Phone: +92-XXX-XXXXXXX | Email: info@restaurant.com
              </div>
            </div>

            <!-- Order Info -->
            <div class="order-info">
              <div><strong>Order Number:</strong> ${order.orderNumber}</div>
              <div><strong>Date:</strong> ${formatDate(order.createdAt)}</div>
              <div>
                <strong>Status:</strong> 
                <span style="text-transform: uppercase; font-weight: bold; color: ${
                  order.status === "confirmed"
                    ? "green"
                    : order.status === "cancelled"
                    ? "red"
                    : "orange"
                };">
                  ${order.status}
                </span>
              </div>
            </div>

            ${
              order.deliveryDate
                ? `
              <div style="margin-bottom: 12px; font-weight: bold;">
                <strong>Delivery Date:</strong> ${formatDate(
                  order.deliveryDate
                )}
              </div>
            `
                : ""
            }

            <!-- Customer Info -->
            <div class="customer-info">
              <h3 style="margin: 0 0 8px 0; font-weight: bold;">Customer Information</h3>
              <div class="customer-grid">
                <div><strong>Name:</strong> ${order.customer.name}</div>
                <div><strong>WhatsApp:</strong> ${order.customer.whatsapp}</div>
                <div class="customer-full-width">
                  <strong>Address:</strong> ${order.customer.address}
                </div>
              </div>
              ${
                order.notes
                  ? `
                <div><strong>Special Notes:</strong> ${order.notes}</div>
              `
                  : ""
              }
            </div>

            <!-- Items Table -->
            <table class="items-table">
              <thead>
                <tr>
                  <th class="sr-number">Sr#</th>
                  <th style="width: 45%;">Item</th>
                  <th style="width: 15%;">Price</th>
                  <th style="width: 10%;">Qty</th>
                  <th style="width: 20%;">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${order.items
                  .map(
                    (item, index) => `
                  <tr>
                    <td class="sr-number">${index + 1}</td>
                    <td>
                      <div>
                        <div style="font-weight: bold;">${item.name}</div>
                        ${
                          item.category === "Deals"
                            ? `
                          <div style="font-size: 11px; color: #888; font-style: italic; margin-top: 2px;">
                            Deal Package
                          </div>
                        `
                            : ""
                        }
                        ${renderDealItems(item)}
                      </div>
                    </td>
                    <td>£${item.price.toFixed(2)}</td>
                    <td style="text-align: center;">${item.quantity}</td>
                    <td>£${item.subtotal.toFixed(2)}</td>
                  </tr>
                `
                  )
                  .join("")}
              </tbody>
            </table>

            <!-- Total Section -->
            <div class="total-section">
              <div class="total-row">
                <span>Subtotal:</span>
                <span>£${order.totalAmount.toFixed(2)}</span>
              </div>

              ${
                order.discount > 0
                  ? `
                <div class="total-row">
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

              <div class="total-row final-total">
                <span>Total Amount:</span>
                <span>£${order.finalAmount.toFixed(2)}</span>
              </div>
            </div>

            <!-- Footer -->
            <div class="footer">
              <p style="margin: 0 0 5px 0; font-weight: bold;">
                Thank you for your order!
              </p>
              <p style="margin: 0; font-size: 12px; color: #666;">
                For any queries, please contact us at the above number.
              </p>
              ${
                order.priority === "high"
                  ? `
                <p style="margin: 10px 0 0 0; font-size: 12px; color: #dc3545; font-weight: bold;">
                  ⚠️ HIGH PRIORITY ORDER
                </p>
              `
                  : ""
              }
            </div>
          </div>
        </body>
      </html>
    `;
  }

  // Generate bill image buffer using Puppeteer
  async generateBillImage(order) {
    let browser;
    try {
      console.log(`🖼️ Generating bill image for order: ${order.orderNumber}`);

      browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });

      const page = await browser.newPage();

      // Set viewport for consistent image size
      await page.setViewport({ width: 800, height: 1200 });

      // Generate and set HTML content
      const htmlContent = this.generateBillHTML(order);
      await page.setContent(htmlContent, { waitUntil: "networkidle0" });

      // Take screenshot of the bill
      const imageBuffer = await page.screenshot({
        type: "png",
        fullPage: true,
        omitBackground: false,
      });

      console.log(`✅ Bill image generated: ${imageBuffer.length} bytes`);
      return imageBuffer;
    } catch (error) {
      console.error("❌ Error generating bill image:", error);
      throw new Error(`Failed to generate bill image: ${error.message}`);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
}

export default new BillImageService();
