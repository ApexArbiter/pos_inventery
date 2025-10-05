import React, { useEffect, useRef, useState } from 'react';
import { X, Camera, CameraOff } from 'lucide-react';
import toast from 'react-hot-toast';

const BarcodeScanner = ({ onScan, onClose }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isScanning, setIsScanning] = useState(false);
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(null);
  const [detectedBarcodes, setDetectedBarcodes] = useState([]);

  // Initialize camera
  useEffect(() => {
    const initCamera = async () => {
      try {
        // Check if BarcodeDetector is available
        if (!('BarcodeDetector' in window)) {
          setError('Barcode detection not supported in this browser. Please use Chrome or Edge.');
          return;
        }

        const constraints = {
          video: {
            facingMode: 'environment', // Use rear camera if available
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        };

        const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          setStream(mediaStream);
          setIsScanning(true);
        }
      } catch (err) {
        console.error('Camera access error:', err);
        setError('Camera access denied or not available. Please allow camera access and try again.');
      }
    };

    initCamera();

    // Cleanup on unmount
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Barcode detection
  useEffect(() => {
    let animationFrameId;
    let barcodeDetector;

    const detectBarcodes = async () => {
      if (!isScanning || !videoRef.current || videoRef.current.readyState !== 4) {
        animationFrameId = requestAnimationFrame(detectBarcodes);
        return;
      }

      try {
        if (!barcodeDetector) {
          barcodeDetector = new BarcodeDetector({
            formats: [
              'code_128',
              'code_39',
              'ean_13',
              'ean_8',
              'upc_a',
              'upc_e',
              'qr_code',
            ],
          });
        }

        const barcodes = await barcodeDetector.detect(videoRef.current);
        
        if (barcodes.length > 0) {
          const newBarcodes = barcodes.map(barcode => ({
            rawValue: barcode.rawValue,
            format: barcode.format,
            boundingBox: barcode.boundingBox,
          }));
          
          setDetectedBarcodes(newBarcodes);
          
          // Auto-scan the first detected barcode
          const firstBarcode = barcodes[0];
          if (firstBarcode.rawValue && firstBarcode.rawValue.length > 0) {
            handleBarcodeDetected(firstBarcode.rawValue);
            return; // Stop scanning after successful detection
          }
        } else {
          setDetectedBarcodes([]);
        }

        // Continue scanning
        animationFrameId = requestAnimationFrame(detectBarcodes);
      } catch (err) {
        console.error('Barcode detection error:', err);
        animationFrameId = requestAnimationFrame(detectBarcodes);
      }
    };

    if (isScanning && videoRef.current) {
      detectBarcodes();
    }

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isScanning]);

  const handleBarcodeDetected = (barcode) => {
    if (barcode && barcode.trim()) {
      // Vibrate if supported
      if (navigator.vibrate) {
        navigator.vibrate(200);
      }
      
      // Play success sound
      try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmIaAz2B0OzEgyEELILM8OOGNwgbaLrv5Z1NEAxQp+TyvmIdCzZ/ze3AeSMFl');
        audio.play().catch(() => {}); // Ignore audio errors
      } catch (e) {
        // Ignore audio errors
      }

      toast.success(`Barcode detected: ${barcode}`);
      onScan(barcode);
      onClose();
    }
  };

  const stopScanning = () => {
    setIsScanning(false);
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    onClose();
  };

  // Draw bounding boxes for detected barcodes
  useEffect(() => {
    if (!canvasRef.current || !videoRef.current || detectedBarcodes.length === 0) {
      return;
    }

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext('2d');

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw bounding boxes
    detectedBarcodes.forEach(barcode => {
      if (barcode.boundingBox) {
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 3;
        ctx.strokeRect(
          barcode.boundingBox.x,
          barcode.boundingBox.y,
          barcode.boundingBox.width,
          barcode.boundingBox.height
        );

        // Draw barcode value
        ctx.fillStyle = '#00ff00';
        ctx.font = '16px Arial';
        ctx.fillText(
          barcode.rawValue,
          barcode.boundingBox.x,
          barcode.boundingBox.y - 5
        );
      }
    });
  }, [detectedBarcodes]);

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md mx-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Camera Error
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="text-center">
            <CameraOff className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
            <button
              onClick={onClose}
              className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
      <div className="relative w-full h-full max-w-4xl max-h-4xl">
        
        {/* Header */}
        <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between">
          <div className="bg-black bg-opacity-50 rounded-lg px-4 py-2">
            <h3 className="text-white font-semibold flex items-center">
              <Camera className="w-5 h-5 mr-2" />
              Barcode Scanner
            </h3>
            <p className="text-white text-sm opacity-75">
              Point camera at barcode to scan
            </p>
          </div>
          
          <button
            onClick={stopScanning}
            className="bg-red-500 text-white p-3 rounded-full hover:bg-red-600 transition-colors shadow-lg"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Video Container */}
        <div className="relative w-full h-full flex items-center justify-center">
          <div className="relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="max-w-full max-h-full rounded-lg shadow-2xl"
              style={{ transform: 'scaleX(-1)' }} // Mirror the video
            />
            
            {/* Overlay canvas for bounding boxes */}
            <canvas
              ref={canvasRef}
              className="absolute top-0 left-0 w-full h-full pointer-events-none"
              style={{ transform: 'scaleX(-1)' }} // Mirror the canvas too
            />

            {/* Scanning overlay */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Corner brackets */}
              <div className="absolute top-4 left-4 w-8 h-8 border-l-4 border-t-4 border-green-400 rounded-tl-lg"></div>
              <div className="absolute top-4 right-4 w-8 h-8 border-r-4 border-t-4 border-green-400 rounded-tr-lg"></div>
              <div className="absolute bottom-4 left-4 w-8 h-8 border-l-4 border-b-4 border-green-400 rounded-bl-lg"></div>
              <div className="absolute bottom-4 right-4 w-8 h-8 border-r-4 border-b-4 border-green-400 rounded-br-lg"></div>
              
              {/* Scanning line animation */}
              <div className="absolute inset-x-0 top-1/2 h-0.5 bg-green-400 animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Status Bar */}
        <div className="absolute bottom-4 left-4 right-4">
          <div className="bg-black bg-opacity-50 rounded-lg px-4 py-3 text-center">
            {detectedBarcodes.length > 0 ? (
              <div className="text-green-400">
                <p className="font-semibold">Barcode Detected!</p>
                <p className="text-sm">{detectedBarcodes[0].rawValue}</p>
              </div>
            ) : (
              <div className="text-white">
                <div className="flex items-center justify-center mb-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-green-400 border-t-transparent mr-2"></div>
                  <span>Scanning for barcodes...</span>
                </div>
                <p className="text-xs opacity-75">
                  Supported formats: EAN-13, UPC, Code 128, Code 39, QR Code
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2">
          <div className="bg-black bg-opacity-50 rounded-lg px-6 py-2">
            <p className="text-white text-sm text-center">
              Hold steady and ensure barcode is clearly visible
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BarcodeScanner;
