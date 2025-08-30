import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

export const protectRoute = async (req, res, next) => {
  try {
    // Try to get token from cookies first, then from Authorization header
    let token = req.cookies?.jwt;

    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7); // Remove 'Bearer ' prefix
      }
    }

    if (!token) {
      return res.status(401).json({
        message: "Unauthorized - No token found",
        success: false,
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded) {
      return res.status(401).json({
        message: "Unauthorized - Invalid token",
        success: false,
      });
    }

    // Find user
    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }

    // Check if user is authenticated
    if (!user.isAuthenticated) {
      return res.status(403).json({
        message: "Account not approved by admin",
        success: false,
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Error in protectRoute:", error);

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        message: "Unauthorized - Invalid token",
        success: false,
      });
    }

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        message: "Unauthorized - Token expired",
        success: false,
      });
    }

    return res.status(500).json({
      message: "Internal server error",
      success: false,
    });
  }
};
