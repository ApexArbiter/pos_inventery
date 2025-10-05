const express = require('express');
import { protectRoute } from "../middleware/auth.middleware.js";
import { getAllUsers, toggleAuthenticationStatus, updateUserDetails } from "../controllers/users.controller.js";

const router = express.Router();

router.get("/all", protectRoute, getAllUsers);
router.patch("/auth/:id", protectRoute, toggleAuthenticationStatus);
router.put("/update/:id", protectRoute, updateUserDetails); 

export default router;
