import React, { useState, useEffect, useCallback } from "react";
import {
  MessageCircle,
  QrCode,
  Power,
  RefreshCw,
  Send,
  AlertCircle,
  CheckCircle,
  Clock,
  Smartphone,
  Monitor,
  Wifi,
  WifiOff,
  Zap,
  X,
  Camera,
  Phone,
  Settings,
} from "lucide-react";
import axiosInstance from "../api/axiosInstance";

const WhatsAppSettings = () => {
  const [sessionId] = useState("raza-catering-session"); // Fixed session ID for the business
  const [sessionStatus, setSessionStatus] = useState("unknown");
  const [qrCode, setQrCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [testMessage, setTestMessage] = useState({
    phoneNumber: "",
    message: "Hello! This is a test message from Raza Catering.",
  });
  const [pairingCode, setPairingCode] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(null);
  const [screenshot, setScreenshot] = useState("");

  // Add notification helper
  const addNotification = useCallback((type, message, duration = 5000) => {
    const id = Date.now();
    const notification = { id, type, message, timestamp: new Date() };
    setNotifications((prev) => [notification, ...prev.slice(0, 4)]); // Keep only latest 5

    if (duration > 0) {
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }, duration);
    }
  }, []);

  // Check session status
  const checkSessionStatus = useCallback(async () => {
    try {
      const response = await axiosInstance.get("/whatsapp/session/status");
      setSessionStatus(response.data.state || "unknown");
      setLastUpdate(new Date());

      if (response.data.state === "CONNECTED") {
        addNotification("success", "WhatsApp session is connected and ready!");
      }
    } catch (error) {
      setSessionStatus("error");
      addNotification(
        "error",
        `Failed to check status: ${
          error.response?.data?.error || error.message
        }`
      );
    }
  }, [addNotification]);

  // Get QR code
  const getQRCode = useCallback(async () => {
    if (sessionStatus === "CONNECTED") return;

    setIsLoading(true);
    try {
      const response = await axiosInstance.get("/whatsapp/session/qr", {
        responseType: "blob", // Get as blob for image
      });

      const imageUrl = URL.createObjectURL(response.data);
      setQrCode(imageUrl);
      addNotification("info", "QR Code updated! Please scan with your phone.");
    } catch (error) {
      addNotification(
        "error",
        `Failed to get QR code: ${error.response?.data?.error || error.message}`
      );
    } finally {
      setIsLoading(false);
    }
  }, [sessionStatus, addNotification]);

  // Start session
  const startSession = async () => {
    setIsLoading(true);
    try {
      await axiosInstance.get("/whatsapp/session/start");
      addNotification("success", "Session started successfully!");
      setTimeout(() => {
        checkSessionStatus();
        getQRCode();
      }, 2000);
    } catch (error) {
      addNotification(
        "error",
        `Failed to start session: ${
          error.response?.data?.error || error.message
        }`
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Stop session
  const stopSession = async () => {
    setIsLoading(true);
    try {
      await axiosInstance.get("/whatsapp/session/stop");
      setSessionStatus("STOPPED");
      setQrCode("");
      addNotification("info", "Session stopped successfully.");
    } catch (error) {
      addNotification(
        "error",
        `Failed to stop session: ${
          error.response?.data?.error || error.message
        }`
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Restart session
  const restartSession = async () => {
    setIsLoading(true);
    try {
      await axiosInstance.get("/whatsapp/session/restart");
      addNotification("success", "Session restarted successfully!");
      setTimeout(() => {
        checkSessionStatus();
        getQRCode();
      }, 2000);
    } catch (error) {
      addNotification(
        "error",
        `Failed to restart session: ${
          error.response?.data?.error || error.message
        }`
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Request pairing code
  const requestPairingCode = async () => {
    if (!phoneNumber) {
      addNotification("warning", "Please enter a phone number first.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await axiosInstance.post(
        "/whatsapp/session/requestPairingCode",
        {
          phoneNumber: phoneNumber.replace(/\D/g, ""), // Remove non-digits
          showNotification: true,
        }
      );

      setPairingCode(
        response.data.code || "Check your phone for the pairing code"
      );
      addNotification("success", "Pairing code requested! Check your phone.");
    } catch (error) {
      addNotification(
        "error",
        `Failed to request pairing code: ${
          error.response?.data?.error || error.message
        }`
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Send test message
  const sendTestMessage = async () => {
    if (!testMessage.phoneNumber || !testMessage.message) {
      addNotification(
        "warning",
        "Please fill in both phone number and message."
      );
      return;
    }

    setIsLoading(true);
    try {
      await axiosInstance.post("/whatsapp/send-notification", {
        phoneNumber: testMessage.phoneNumber.replace(/\D/g, ""),
        message: testMessage.message,
      });

      addNotification("success", "Test message sent successfully!");
    } catch (error) {
      addNotification(
        "error",
        `Failed to send test message: ${
          error.response?.data?.error || error.message
        }`
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Get screenshot - Note: You'll need to add this route to your backend
  const getScreenshot = async () => {
    setIsLoading(true);
    try {
      const response = await axiosInstance.get("/whatsapp/session/screenshot", {
        responseType: "blob",
      });
      const imageUrl = URL.createObjectURL(response.data);
      setScreenshot(imageUrl);
      addNotification("success", "Screenshot captured!");
    } catch (error) {
      addNotification(
        "error",
        `Failed to get screenshot: ${
          error.response?.data?.error || error.message
        }`
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Auto refresh logic
  useEffect(() => {
    if (autoRefresh && sessionStatus !== "CONNECTED") {
      const interval = setInterval(() => {
        checkSessionStatus();
        if (sessionStatus === "WAITING_QR_SCAN") {
          getQRCode();
        }
      }, 10000); // Check every 10 seconds

      setRefreshInterval(interval);
      return () => clearInterval(interval);
    } else if (refreshInterval) {
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    }
  }, [
    autoRefresh,
    sessionStatus,
    checkSessionStatus,
    getQRCode,
    refreshInterval,
  ]);

  // Initial load
  useEffect(() => {
    checkSessionStatus();
  }, [checkSessionStatus]);

  const getStatusColor = (status) => {
    switch (status) {
      case "CONNECTED":
        return "text-green-600 dark:text-green-400";
      case "WAITING_QR_SCAN":
        return "text-yellow-600 dark:text-yellow-400";
      case "STOPPED":
        return "text-gray-600 dark:text-gray-400";
      case "error":
        return "text-red-600 dark:text-red-400";
      default:
        return "text-gray-600 dark:text-gray-400";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "CONNECTED":
        return <Wifi className="w-5 h-5 text-green-500" />;
      case "WAITING_QR_SCAN":
        return <QrCode className="w-5 h-5 text-yellow-500" />;
      case "STOPPED":
        return <WifiOff className="w-5 h-5 text-gray-500" />;
      case "error":
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500 animate-spin" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
              <MessageCircle className="w-8 h-8 text-green-500 mr-3" />
              WhatsApp Settings
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage your WhatsApp Web connection for order notifications
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Auto Refresh
              </label>
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`relative w-11 h-6 transition-colors duration-200 ease-in-out rounded-full ${
                  autoRefresh ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"
                }`}
              >
                <span
                  className={`${
                    autoRefresh ? "translate-x-5" : "translate-x-0"
                  } inline-block w-5 h-5 transform bg-white rounded-full transition-transform duration-200 ease-in-out`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Notifications */}
        {notifications.length > 0 && (
          <div className="space-y-2">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 rounded-xl border flex items-center justify-between animate-in slide-in-from-top-2 duration-300 ${
                  notification.type === "success"
                    ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200"
                    : notification.type === "error"
                    ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200"
                    : notification.type === "warning"
                    ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200"
                    : "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200"
                }`}
              >
                <div className="flex items-center">
                  {notification.type === "success" && (
                    <CheckCircle className="w-5 h-5 mr-3" />
                  )}
                  {notification.type === "error" && (
                    <AlertCircle className="w-5 h-5 mr-3" />
                  )}
                  {notification.type === "warning" && (
                    <AlertCircle className="w-5 h-5 mr-3" />
                  )}
                  {notification.type === "info" && (
                    <AlertCircle className="w-5 h-5 mr-3" />
                  )}
                  <span>{notification.message}</span>
                </div>
                <button
                  onClick={() =>
                    setNotifications((prev) =>
                      prev.filter((n) => n.id !== notification.id)
                    )
                  }
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Status Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                Connection Status
              </h2>
              <div className="flex items-center space-x-3">
                {getStatusIcon(sessionStatus)}
                <span
                  className={`text-lg font-medium ${getStatusColor(
                    sessionStatus
                  )}`}
                >
                  {sessionStatus.replace("_", " ").toUpperCase()}
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Session ID
              </p>
              <p className="text-lg font-mono font-semibold text-gray-900 dark:text-white">
                {sessionId}
              </p>
              {lastUpdate && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                  Last updated: {lastUpdate.toLocaleTimeString()}
                </p>
              )}
            </div>
          </div>

          {/* Control Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <button
              onClick={startSession}
              disabled={isLoading || sessionStatus === "CONNECTED"}
              className="flex items-center justify-center px-6 py-4 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-xl transition-all duration-200 transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed shadow-lg"
            >
              <Power className="w-5 h-5 mr-2" />
              Start Session
            </button>

            <button
              onClick={stopSession}
              disabled={isLoading || sessionStatus === "STOPPED"}
              className="flex items-center justify-center px-6 py-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-xl transition-all duration-200 transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed shadow-lg"
            >
              <Power className="w-5 h-5 mr-2" />
              Stop Session
            </button>

            <button
              onClick={restartSession}
              disabled={isLoading}
              className="flex items-center justify-center px-6 py-4 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-xl transition-all duration-200 transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed shadow-lg"
            >
              <RefreshCw
                className={`w-5 h-5 mr-2 ${isLoading ? "animate-spin" : ""}`}
              />
              Restart
            </button>

            <button
              onClick={checkSessionStatus}
              disabled={isLoading}
              className="flex items-center justify-center px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-xl transition-all duration-200 transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed shadow-lg"
            >
              <RefreshCw
                className={`w-5 h-5 mr-2 ${isLoading ? "animate-spin" : ""}`}
              />
              Refresh Status
            </button>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* QR Code Section */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                <QrCode className="w-6 h-6 text-green-500 mr-3" />
                QR Code Authentication
              </h3>
              <button
                onClick={getQRCode}
                disabled={isLoading || sessionStatus === "CONNECTED"}
                className="px-4 py-2 bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50 text-green-700 dark:text-green-300 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw
                  className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
                />
              </button>
            </div>

            <div className="space-y-6">
              {sessionStatus === "CONNECTED" ? (
                <div className="text-center p-8 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h4 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-2">
                    WhatsApp Connected!
                  </h4>
                  <p className="text-green-600 dark:text-green-300">
                    Your WhatsApp Web session is active and ready to send
                    notifications.
                  </p>
                </div>
              ) : qrCode ? (
                <div className="text-center">
                  <div className="bg-white p-4 rounded-xl inline-block shadow-lg">
                    {console.log(qrCode)}
                    {console.log(qrCode.type)}
                    <img
                      src={qrCode} // This is now an object URL from blob
                      alt="WhatsApp QR Code"
                      className="w-64 h-64 mx-auto"
                    />
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-4">
                    Scan this QR code with your WhatsApp mobile app to connect
                  </p>
                  <div className="flex items-center justify-center mt-4 text-sm text-gray-500 dark:text-gray-400">
                    <Smartphone className="w-4 h-4 mr-2" />
                    Open WhatsApp → Settings → Linked Devices → Link a Device
                  </div>
                </div>
              ) : (
                <div className="text-center p-8 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700">
                  <QrCode className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">
                    Click "Start Session" to generate a QR code for WhatsApp Web
                    connection
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Pairing Code Section */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
              <Phone className="w-6 h-6 text-blue-500 mr-3" />
              Phone Number Pairing
            </h3>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Phone Number (International Format)
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="e.g., 923001234567"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Enter your phone number without + symbol (e.g., 923001234567
                  for Pakistan)
                </p>
              </div>

              <button
                onClick={requestPairingCode}
                disabled={
                  isLoading || !phoneNumber || sessionStatus === "CONNECTED"
                }
                className="w-full flex items-center justify-center px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-xl transition-all duration-200 transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed shadow-lg"
              >
                <Phone className="w-5 h-5 mr-2" />
                Request Pairing Code
              </button>

              {pairingCode && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
                  <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
                    Pairing Code Generated
                  </h4>
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 font-mono text-2xl text-center text-blue-600 dark:text-blue-400 tracking-wider">
                    {pairingCode}
                  </div>
                  <p className="text-sm text-blue-600 dark:text-blue-300 mt-3">
                    Enter this code in your WhatsApp mobile app when prompted
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Test Message Section */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
            <Send className="w-6 h-6 text-purple-500 mr-3" />
            Test Message
          </h3>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Test Phone Number
                </label>
                <input
                  type="tel"
                  value={testMessage.phoneNumber}
                  onChange={(e) =>
                    setTestMessage({
                      ...testMessage,
                      phoneNumber: e.target.value,
                    })
                  }
                  placeholder="923001234567"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Test Message
                </label>
                <textarea
                  value={testMessage.message}
                  onChange={(e) =>
                    setTestMessage({ ...testMessage, message: e.target.value })
                  }
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 resize-none"
                  placeholder="Enter your test message here..."
                />
              </div>
            </div>

            <div className="flex flex-col justify-center">
              <button
                onClick={sendTestMessage}
                disabled={
                  isLoading ||
                  sessionStatus !== "CONNECTED" ||
                  !testMessage.phoneNumber ||
                  !testMessage.message
                }
                className="w-full flex items-center justify-center px-6 py-4 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-xl transition-all duration-200 transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed shadow-lg mb-4"
              >
                <Send className="w-5 h-5 mr-2" />
                Send Test Message
              </button>

              {sessionStatus !== "CONNECTED" && (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                  Connect WhatsApp first to send test messages
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Additional Tools */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Screenshot Tool */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
              <Camera className="w-6 h-6 text-indigo-500 mr-3" />
              Page Screenshot
            </h3>

            <div className="space-y-4">
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Capture a screenshot of the current WhatsApp Web session for
                debugging.
              </p>

              <button
                onClick={getScreenshot}
                disabled={isLoading || sessionStatus !== "CONNECTED"}
                className="w-full flex items-center justify-center px-6 py-4 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-xl transition-all duration-200 transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed shadow-lg"
              >
                <Camera className="w-5 h-5 mr-2" />
                Take Screenshot
              </button>

              {screenshot && (
                <div className="mt-4">
                  <img
                    src={screenshot}
                    alt="WhatsApp Web Screenshot"
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-700"
                  />
                </div>
              )}
            </div>
          </div>

          {/* System Info */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
              <Settings className="w-6 h-6 text-gray-500 mr-3" />
              System Information
            </h3>

            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">
                  API Base URL:
                </span>
                <span className="text-gray-900 dark:text-white font-mono text-sm">
                  {axiosInstance.defaults.baseURL}
                </span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">
                  Session ID:
                </span>
                <span className="text-gray-900 dark:text-white font-mono text-sm">
                  {sessionId}
                </span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">
                  Auto Refresh:
                </span>
                <span
                  className={`text-sm font-medium ${
                    autoRefresh
                      ? "text-green-600 dark:text-green-400"
                      : "text-gray-500"
                  }`}
                >
                  {autoRefresh ? "Enabled" : "Disabled"}
                </span>
              </div>

              <div className="flex justify-between items-center py-2">
                <span className="text-gray-600 dark:text-gray-400">
                  Connection Status:
                </span>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(sessionStatus)}
                  <span
                    className={`text-sm font-medium ${getStatusColor(
                      sessionStatus
                    )}`}
                  >
                    {sessionStatus.replace("_", " ").toLowerCase()}
                  </span>
                </div>
              </div>

              {/* Health Check */}
              <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={async () => {
                    try {
                      const response = await axiosInstance.get(
                        "/whatsapp/ping"
                      );
                      addNotification(
                        "success",
                        `API Health Check: ${
                          response.data.message || "API is working!"
                        }`
                      );
                    } catch (error) {
                      addNotification(
                        "error",
                        `API Health Check Failed: ${error.message}`
                      );
                    }
                  }}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-xl transition-all duration-200 transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed shadow-lg"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Ping API
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Help & Instructions */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-700 rounded-2xl p-8">
          <div className="flex items-start">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl mr-6 mt-1">
              <AlertCircle className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Setup Instructions
              </h4>
              <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
                <div>
                  <h5 className="font-semibold text-gray-900 dark:text-white mb-2">
                    First Time Setup:
                  </h5>
                  <ol className="list-decimal list-inside space-y-2 ml-4">
                    <li>
                      Click "Start Session" to initialize the WhatsApp Web
                      connection
                    </li>
                    <li>
                      Either scan the QR code with your phone or use phone
                      number pairing
                    </li>
                    <li>Wait for the status to show "CONNECTED"</li>
                    <li>Test the connection by sending a test message</li>
                  </ol>
                </div>

                <div>
                  <h5 className="font-semibold text-gray-900 dark:text-white mb-2">
                    QR Code Method:
                  </h5>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Open WhatsApp on your phone</li>
                    <li>Go to Settings → Linked Devices</li>
                    <li>Tap "Link a Device" and scan the QR code</li>
                  </ul>
                </div>

                <div>
                  <h5 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Phone Pairing Method:
                  </h5>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>
                      Enter your phone number in international format (without
                      +)
                    </li>
                    <li>Click "Request Pairing Code"</li>
                    <li>Enter the received code in your WhatsApp mobile app</li>
                  </ul>
                </div>

                <div>
                  <h5 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Troubleshooting:
                  </h5>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>
                      If QR code expires, click the refresh button to generate a
                      new one
                    </li>
                    <li>
                      Enable "Auto Refresh" to automatically check status and
                      update QR codes
                    </li>
                    <li>
                      Use "Restart Session" if the connection becomes unstable
                    </li>
                    <li>Take screenshots to debug connection issues</li>
                    <li>Use the ping test to verify API connectivity</li>
                  </ul>
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mt-6">
                  <div className="flex items-start">
                    <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mr-3 mt-0.5 flex-shrink-0" />
                    <div>
                      <h6 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                        Important Notes:
                      </h6>
                      <ul className="text-yellow-700 dark:text-yellow-300 space-y-1 text-sm">
                        <li>
                          • Keep this browser tab open to maintain the WhatsApp
                          connection
                        </li>
                        <li>
                          • The session will persist across browser restarts if
                          properly connected
                        </li>
                        <li>
                          • Only one WhatsApp Web session can be active at a
                          time per phone number
                        </li>
                        <li>
                          • Test messages are sent from your business WhatsApp
                          account
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppSettings;
