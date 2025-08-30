import bcrypt from "bcryptjs";
import User from "../models/user.model.js";
import { generateToken } from "../utils/token.js";
import cloudinary from "../lib/cloudinary.js";

export const signup = async (req, res) => {
  const { fullName, email, password, branch, whatsappNumber } = req.body;

  try {
    if (!fullName || !password || !email || !branch)
      return res.status(400).json({ 
        message: "All field are required", 
        success: false 
      });

    if (password.length < 6)
      return res.status(400).json({ 
        message: "Password must be at least 6 characters", 
        success: false 
      });

    const user = await User.findOne({ email });
    if (user) 
      return res.status(400).json({ 
        message: "Email already exists", 
        success: false 
      });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      fullName: fullName,
      email: email,
      password: hashedPassword,
      branch: branch,
      whatsappNumber: whatsappNumber,
      role: "user",
      isAuthenticated: false // Default to false, admin needs to approve
    });

    if (newUser) {
      const token = generateToken(newUser._id, res);
      await newUser.save();
      
      res.status(201).json({
        success: true,
        message: "Account created successfully. Please wait for admin approval.",
        user: {
          _id: newUser._id,
          fullName: newUser.fullName,
          email: newUser.email,
          profilePic: newUser.profilePic,
          isAuthenticated: newUser.isAuthenticated,
          role: newUser.role,
          branch: newUser.branch
        },
        token: token,
      });
    } else {
      res.status(400).json({ 
        message: "Invalid user data", 
        success: false 
      });
    }
  } catch (err) {
    res.status(500).json({ 
      message: "Internal Server error", 
      success: false 
    });
    console.log("Error in Auth Controller while signup:", err);
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  
  try {
    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        message: "User not found. Please check your email or create an account.", 
        success: false 
      });
    }

    // Check password
    const isCorrect = await bcrypt.compare(password, user.password);
    if (!isCorrect) {
      return res.status(401).json({ 
        message: "Invalid credentials. Please check your password.", 
        success: false 
      });
    }

    // Check if user is authenticated by admin
    if (!user.isAuthenticated) {
      return res.status(403).json({
        message: "You need permission from the admin to access the dashboard.",
        success: false
      });
    }

    // Generate token only for authenticated users
    const token = generateToken(user._id, res);

    // Return user data only for authenticated users
    res.status(200).json({
      success: true,
      message: "Login successful!",
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        profilePic: user.profilePic,
        isAuthenticated: user.isAuthenticated,
        role: user.role,
        branch: user.branch,
      },
      token: token,
    });
    
  } catch (err) {
    console.log("Error in login controller:", err);
    res.status(500).json({ 
      message: "Internal server error. Please try again.", 
      success: false 
    });
  }
};

export const logout = (req, res) => {
  try {
    res.cookie("jwt", "", { maxAge: 0 });
    res.status(200).json({ 
      message: "Logout successful", 
      success: true 
    });
  } catch (err) {
    res.status(500).json({ 
      message: "Internal server error", 
      success: false 
    });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { profilePic } = req.body;

    if (!profilePic) {
      return res.status(400).json({ 
        message: "Profile pic is required", 
        success: false 
      });
    }
    
    const uploadResponse = await cloudinary.uploader.upload(profilePic);
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { profilePic: uploadResponse.secure_url },
      { new: true }
    );
    
    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: updatedUser
    });
  } catch (err) {
    console.log("Error in updateProfile:", err);
    res.status(500).json({ 
      message: "Internal server error", 
      success: false 
    });
  }
};

export const checkAuth = (req, res) => {
  try {
    res.status(200).json({
      success: true,
      user: req.user
    });
  } catch (err) {
    console.log("Error in checkAuth:", err);
    res.status(500).json({ 
      message: "Internal server error", 
      success: false 
    });
  }
};