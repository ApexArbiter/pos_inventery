// lib/whatsapp.js - SIMPLIFIED VERSION
import axios from "axios";

const WHATSAPP_API_URL = "https://graph.facebook.com/v22.0";
const PHONE_NUMBER_ID = "768727999651055";
const ACCESS_TOKEN =
  "EAAPkoZAHjsPUBPNZCeYc2j7R5QJdTxl8IizruEYYdN4PbSKACSvWhI1qH66RhBlZAE8SgmF0ZAf0HlyrElNjr1YWhXWDd75KeXXD8uJgXDn8yXwjgS9lpMydSegMJgrcVIoz1UpmaCe3VWagsG9pmIBmPIPXcwiGDzmPi9szMQtd6x8hJEUZBm0Ot1E5NZBpWRQhAGkrrlI7UZBwiD7ZCJSgpYM1q6Rq3mBe6RNJj92eZB0GHZBgZDZD";

class WhatsAppService {
  constructor() {
    this.apiUrl = `${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`;
    this.headers = {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    };
  }

  // Send Hello World template with enhanced logging
  async sendHelloWorldTemplate(recipientPhone) {
    try {
      const cleanPhone = this.formatPhoneNumber(recipientPhone);
      console.log(
        `📞 Original phone: ${recipientPhone} -> Formatted: ${cleanPhone}`
      );

      const messageData = {
        messaging_product: "whatsapp",
        to: cleanPhone,
        type: "template",
        template: {
          name: "hello_world",
          language: {
            code: "en_US",
          },
        },
      };

      console.log(
        "🚀 Sending hello_world template with data:",
        JSON.stringify(messageData, null, 2)
      );

      const response = await axios.post(this.apiUrl, messageData, {
        headers: this.headers,
        timeout: 30000,
      });

      console.log(
        "✅ Hello World template response:",
        JSON.stringify(response.data, null, 2)
      );
      return response.data;
    } catch (error) {
      console.error("❌ Hello World template error details:");
      console.error("Status:", error.response?.status);
      console.error("Data:", JSON.stringify(error.response?.data, null, 2));
      console.error("Message:", error.message);

      throw new Error(
        `Failed to send hello world template: ${
          error.response?.data?.error?.message || error.message
        }`
      );
    }
  }

  // Send Dynamic template with enhanced logging and validation
  async sendDynamicTemplate(
    recipientPhone,
    customerName,
    orderNumber,
    orderImageUrl
  ) {
    try {
      const cleanPhone = this.formatPhoneNumber(recipientPhone);
      console.log(
        `📞 Dynamic template - Original: ${recipientPhone} -> Formatted: ${cleanPhone}`
      );

      // Validate URL format
      if (!orderImageUrl || !orderImageUrl.startsWith("http")) {
        throw new Error("Invalid image URL provided");
      }

      const messageData = {
        messaging_product: "whatsapp",
        to: cleanPhone,
        type: "template",
        template: {
          name: "invoice",
          language: {
            code: "en",
          },
          components: [
            {
              type: "body",
              parameters: [
                {
                  type: "text",
                  text: customerName,
                },
                {
                  type: "text",
                  text: orderNumber,
                },
                {
                  type: "text",
                  text: orderImageUrl,
                },
              ],
            },
          ],
        },
      };

      console.log(
        "🚀 Sending dynamic template with data:",
        JSON.stringify(messageData, null, 2)
      );

      const response = await axios.post(this.apiUrl, messageData, {
        headers: this.headers,
        timeout: 30000,
      });

      console.log(
        "✅ Dynamic template response:",
        JSON.stringify(response.data, null, 2)
      );
      return response.data;
    } catch (error) {
      console.error("❌ Dynamic template error details:");
      console.error("Status:", error.response?.status);
      console.error("Data:", JSON.stringify(error.response?.data, null, 2));
      console.error("Message:", error.message);

      throw new Error(
        `Failed to send dynamic template: ${
          error.response?.data?.error?.message || error.message
        }`
      );
    }
  }

  // Enhanced phone number formatting with validation
  formatPhoneNumber(phone) {
    console.log(`📞 Formatting phone number: ${phone}`);

    if (!phone) {
      throw new Error("Phone number is required");
    }

    let cleanPhone = phone.toString().replace(/\D/g, "");
    console.log(`📞 After removing non-digits: ${cleanPhone}`);

    // Handle Pakistan numbers specifically
    if (cleanPhone.startsWith("92")) {
      // Already has country code
      console.log(`📞 Already has country code: ${cleanPhone}`);
    } else if (cleanPhone.startsWith("0")) {
      // Remove leading 0 and add country code
      cleanPhone = "92" + cleanPhone.substring(1);
      console.log(`📞 Removed leading 0, added 92: ${cleanPhone}`);
    } else if (cleanPhone.length === 10) {
      // 10 digit number, add country code
      cleanPhone = "92" + cleanPhone;
      console.log(`📞 10 digits, added 92: ${cleanPhone}`);
    } else if (cleanPhone.length === 11 && cleanPhone.startsWith("3")) {
      // 11 digit number starting with 3 (common in Pakistan), add country code
      cleanPhone = "92" + cleanPhone;
      console.log(`📞 11 digits starting with 3, added 92: ${cleanPhone}`);
    }

    // Validate final format
    if (cleanPhone.length < 12 || cleanPhone.length > 15) {
      console.warn(
        `⚠️ Phone number length seems incorrect: ${cleanPhone} (length: ${cleanPhone.length})`
      );
    }

    console.log(`📞 Final formatted number: ${cleanPhone}`);
    return cleanPhone;
  }

  // New method to check WhatsApp Business account status
  async checkAccountStatus() {
    try {
      const response = await axios.get(
        `${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}`,
        { headers: this.headers }
      );
      console.log("📊 WhatsApp Business Account Status:", response.data);
      return response.data;
    } catch (error) {
      console.error(
        "❌ Failed to check account status:",
        error.response?.data || error.message
      );
      throw error;
    }
  }
}
export default new WhatsAppService();
