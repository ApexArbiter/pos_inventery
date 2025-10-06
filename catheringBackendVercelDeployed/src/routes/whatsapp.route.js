// routes/whatsapp.route.js
import express from "express";
import { whatsappProxy } from "../lib/whatsappProxy.js";
import axios from "axios";

const router = express.Router();

// Proxy all WhatsApp session operations
router.get("/session/status", async (req, res) => {
  try {
    const result = await whatsappProxy.getSessionStatus();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/session/start", async (req, res) => {
  try {
    const result = await whatsappProxy.startSession();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/session/qr", async (req, res) => {
  try {
    // Use the image endpoint instead
    const response = await axios({
      url: `${whatsappProxy.whatsappBaseURL}/session/qr/raza-catering-session/image`,
      method: "GET",
      responseType: "stream", // Important for proxying image data
      headers: {
        "x-api-key": whatsappProxy.apiKey,
      },
    });

    // Set appropriate headers for image response
    res.setHeader("Content-Type", "image/png");
    response.data.pipe(res);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/send-notification", async (req, res) => {
  try {
    const { phoneNumber, message } = req.body;
    const result = await whatsappProxy.sendMessage(phoneNumber, message);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
// Add these routes to your whatsapp.route.js

router.get("/session/stop", async (req, res) => {
  try {
    const result = await whatsappProxy.makeRequest(
      "/session/stop/raza-catering-session"
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/session/restart", async (req, res) => {
  try {
    const result = await whatsappProxy.makeRequest(
      "/session/restart/raza-catering-session"
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/session/requestPairingCode", async (req, res) => {
  try {
    const result = await whatsappProxy.makeRequest(
      "/session/requestPairingCode/raza-catering-session",
      {
        method: "POST",
        data: req.body,
      }
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/ping", async (req, res) => {
  try {
    const result = await whatsappProxy.makeRequest("/ping");
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
// Add this endpoint
router.post("/:id/send-bill", async (req, res) => {
  try {
    const { id } = req.params;
    const { imageData } = req.body;

    // Get order details
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }

    // Convert base64 to just the data part
    const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, "");

    // Send via WhatsApp
    const whatsappResponse = await whatsappProxy.sendImageFile(
      order.customer.whatsapp,
      base64Data,
      `bill-${order.orderNumber}.png`,
      "image/png",
      `📄 Your order bill #${
        order.orderNumber
      }\nTotal: £${order.finalAmount.toFixed(2)}\nThank you for your order! 🍽️`
    );

    res.json({
      success: true,
      data: {
        sentTo: order.customer.whatsapp,
        billImageUrl: imageData, // Return the image data
        whatsappMessageId: whatsappResponse.messageId,
      },
    });
  } catch (error) {
    console.error("Error sending bill:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});


export default router;
