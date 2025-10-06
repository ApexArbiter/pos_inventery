// lib/whatsappProxy.js
import axios from "axios";

class WhatsAppProxy {
  constructor() {
    this.whatsappBaseURL =
      process.env.WHATSAPP_API_URL || "http://localhost:3000";
    this.apiKey = "MAHAD"; // Make sure this matches your WhatsApp API server's expected key
    this.sessionId = "raza-catering-session"; // Default session ID
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

  // Session Management Methods
  async getSessionStatus() {
    return this.makeRequest(`/session/status/${this.sessionId}`);
  }

  async startSession() {
    return this.makeRequest(`/session/start/${this.sessionId}`);
  }

  async stopSession() {
    return this.makeRequest(`/session/stop/${this.sessionId}`);
  }

  async restartSession() {
    return this.makeRequest(`/session/restart/${this.sessionId}`);
  }

  async getQRCode() {
    return this.makeRequest(`/session/qr/${this.sessionId}`);
  }

  async getQRCodeImage() {
    return this.makeRequest(`/session/qr/${this.sessionId}/image`, {
      method: "GET",
      responseType: "blob",
    });
  }

  async requestPairingCode(phoneNumber) {
    return this.makeRequest(`/session/pairing-code/${this.sessionId}`, {
      method: "POST",
      data: { phoneNumber },
    });
  }

  async getAllSessions() {
    return this.makeRequest("/sessions");
  }

  async pingServer() {
    return this.makeRequest("/ping");
  }

  // Messaging Methods - Updated to match your server's API
 async sendMessage(phoneNumber, message) {
  const payload = {
    phoneNumber: this.formatPhoneNumber(phoneNumber),
    message: message,
  };

  return this.makeRequest(`/message/text/${this.sessionId}`, {
    method: "POST",
    data: payload,
  });
}

  // Send media from base64 data
async sendImageFile(
  phoneNumber,
  imageBase64,
  filename = "image.jpg",
  mimetype = "image/jpeg", 
  caption = ""
) {
  const payload = {
    phoneNumber: this.formatPhoneNumber(phoneNumber),
    mediaData: imageBase64,
    mimeType: mimetype,
    filename: filename,
    caption: caption,
  };

  return this.makeRequest(`/message/media-base64/${this.sessionId}`, {
    method: "POST",
    data: payload,
  });
}

  // Send media from URL
  async sendImageFromURL(phoneNumber, imageUrl, caption = "", filename = "") {
    const payload = {
      phoneNumber: phoneNumber,
      mediaUrl: imageUrl,
      caption: caption,
      filename: filename,
    };

    return this.makeRequest(`/message/media-url/${this.sessionId}`, {
      method: "POST",
      data: payload,
    });
  }

  // Send document file
  async sendDocument(
    phoneNumber,
    documentBase64,
    filename,
    mimetype,
    caption = ""
  ) {
    const payload = {
      phoneNumber: phoneNumber,
      mediaData: documentBase64,
      mimeType: mimetype,
      filename: filename,
      caption: caption,
    };

    return this.makeRequest(`/message/media-base64/${this.sessionId}`, {
      method: "POST",
      data: payload,
    });
  }

  // Send media with multipart form data (for file uploads)
  async sendMediaFile(phoneNumber, file, caption = "") {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('phoneNumber', phoneNumber);
    formData.append('caption', caption);

    return this.makeRequest(`/message/media/${this.sessionId}`, {
      method: "POST",
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  // Note: Your primary server doesn't have these endpoints, but keeping them for compatibility
  // You would need to implement these on your primary server if needed
  async sendLocation(phoneNumber, latitude, longitude, description = "") {
    throw new Error("Location sending not implemented in primary server");
  }

  async sendContact(phoneNumber, contactPhoneNumber) {
    throw new Error("Contact sending not implemented in primary server");
  }

  async sendPoll(
    phoneNumber,
    pollName,
    pollOptions,
    allowMultipleAnswers = false
  ) {
    throw new Error("Poll sending not implemented in primary server");
  }

  // Helper methods
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

  // Format phone number for WhatsApp (remove non-digits)
  formatPhoneNumber(phoneNumber) {
    return phoneNumber.replace(/\D/g, "");
  }

  // Convert file to base64 and send as image
  async sendFileAsImage(phoneNumber, file, caption = "") {
    try {
      const base64 = await this.fileToBase64(file);
      return await this.sendImageFile(
        phoneNumber,
        base64,
        file.name,
        file.type,
        caption
      );
    } catch (error) {
      throw new Error(`Failed to send file as image: ${error.message}`);
    }
  }

  // Batch send messages
  async sendBatchMessages(messages) {
    const results = [];
    for (const { phoneNumber, message } of messages) {
      try {
        const result = await this.sendMessage(phoneNumber, message);
        results.push({ phoneNumber, success: true, result });
      } catch (error) {
        results.push({ phoneNumber, success: false, error: error.message });
      }
    }
    return results;
  }

  // Check if session is ready
  async isSessionReady() {
    try {
      const status = await this.getSessionStatus();
      return status.isReady === true;
    } catch (error) {
      return false;
    }
  }

  // Wait for session to be ready (with timeout)
  async waitForSession(timeoutMs = 60000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      try {
        const isReady = await this.isSessionReady();
        if (isReady) {
          return true;
        }
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      } catch (error) {
        console.log("Waiting for session...");
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    throw new Error("Session timeout: WhatsApp session not ready");
  }
}

export const whatsappProxy = new WhatsAppProxy();