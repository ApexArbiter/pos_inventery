// lib/whatsappProxy.js
import axios from "axios";

class WhatsAppProxy {
  constructor() {
    this.whatsappBaseURL =
      process.env.WHATSAPP_API_URL || "http://localhost:3000";
    this.apiKey = "MAHAD"; // Make sure this matches your WhatsApp API server's expected key
  }

  async makeRequest(endpoint, options = {}) {
    try {
      const response = await axios({
        url: `${this.whatsappBaseURL}${endpoint}`,
        headers: {
          "Content-Type": "application/json",
          ...(this.apiKey && { "x-api-key": this.apiKey }),
          ...options.headers,
        },
        ...options,
      });
      return response.data;
    } catch (error) {
      console.error(
        "WhatsApp API Error:",
        error.response?.data || error.message
      );
      throw new Error(
        `WhatsApp API failed: ${error.response?.data?.error || error.message}`
      );
    }
  }

  async getQRCodeImage() {
    return this.makeRequest("/session/qr/raza-catering-session/image", {
      method: "GET",
      responseType: "blob",
    });
  }

  // Fixed: Send text message with proper structure
  async sendMessage(phoneNumber, message) {
    const payload = {
      chatId: `${phoneNumber.replace(/\D/g, "")}@c.us`,
      contentType: "string", // Required field
      content: message, // Changed from 'message' to 'content'
    };
    console.log(payload);

    return this.makeRequest("/client/sendMessage/raza-catering-session", {
      method: "POST",
      data: payload,
    });
  }

  // New: Send image file
  async sendImageFile(
    phoneNumber,
    imageBase64,
    filename = "image.jpg",
    mimetype = "image/jpeg"
  ) {
    const payload = {
      chatId: `${phoneNumber.replace(/\D/g, "")}@c.us`,
      contentType: "MessageMedia",
      content: {
        mimetype: mimetype,
        data: imageBase64, // Base64 encoded image data
        filename: filename,
      },
    };

    return this.makeRequest("/client/sendMessage/raza-catering-session", {
      method: "POST",
      data: payload,
    });
  }

  // New: Send image from URL
  async sendImageFromURL(phoneNumber, imageUrl, options = {}) {
    const payload = {
      chatId: `${phoneNumber.replace(/\D/g, "")}@c.us`,
      contentType: "MessageMediaFromURL",
      content: imageUrl,
      options: options,
    };

    return this.makeRequest("/client/sendMessage/raza-catering-session", {
      method: "POST",
      data: payload,
    });
  }

  // New: Send document file
  async sendDocument(phoneNumber, documentBase64, filename, mimetype) {
    const payload = {
      chatId: `${phoneNumber.replace(/\D/g, "")}@c.us`,
      contentType: "MessageMedia",
      content: {
        mimetype: mimetype,
        data: documentBase64,
        filename: filename,
      },
    };

    return this.makeRequest("/client/sendMessage/raza-catering-session", {
      method: "POST",
      data: payload,
    });
  }

  // New: Send location
  async sendLocation(phoneNumber, latitude, longitude, description = "") {
    const payload = {
      chatId: `${phoneNumber.replace(/\D/g, "")}@c.us`,
      contentType: "Location",
      content: {
        latitude: latitude,
        longitude: longitude,
        description: description,
      },
    };

    return this.makeRequest("/client/sendMessage/raza-catering-session", {
      method: "POST",
      data: payload,
    });
  }

  // New: Send contact
  async sendContact(phoneNumber, contactPhoneNumber) {
    const payload = {
      chatId: `${phoneNumber.replace(/\D/g, "")}@c.us`,
      contentType: "Contact",
      content: {
        contactId: `${contactPhoneNumber.replace(/\D/g, "")}@c.us`,
      },
    };

    return this.makeRequest("/client/sendMessage/raza-catering-session", {
      method: "POST",
      data: payload,
    });
  }

  // New: Send poll
  async sendPoll(
    phoneNumber,
    pollName,
    pollOptions,
    allowMultipleAnswers = false
  ) {
    const payload = {
      chatId: `${phoneNumber.replace(/\D/g, "")}@c.us`,
      contentType: "Poll",
      content: {
        pollName: pollName,
        pollOptions: pollOptions,
        options: {
          allowMultipleAnswers: allowMultipleAnswers,
        },
      },
    };

    return this.makeRequest("/client/sendMessage/raza-catering-session", {
      method: "POST",
      data: payload,
    });
  }

  // New: Send text with media attachment
  async sendTextWithMedia(
    phoneNumber,
    message,
    imageBase64,
    filename = "image.jpg",
    mimetype = "image/jpeg"
  ) {
    const payload = {
      chatId: `${phoneNumber.replace(/\D/g, "")}@c.us`,
      contentType: "string",
      content: message,
      options: {
        media: {
          mimetype: mimetype,
          data: imageBase64,
          filename: filename,
        },
      },
    };

    return this.makeRequest("/client/sendMessage/raza-catering-session", {
      method: "POST",
      data: payload,
    });
  }

  // Helper: Convert file to base64
  fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        // Remove the data:mime;base64, prefix
        const base64 = reader.result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = (error) => reject(error);
    });
  }

  async getSessionStatus() {
    return this.makeRequest("/session/status/raza-catering-session");
  }

  async startSession() {
    return this.makeRequest("/session/start/raza-catering-session");
  }
}

export const whatsappProxy = new WhatsAppProxy();
