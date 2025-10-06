import User from "../models/user.model.js";
export const getAllUsers = async (req, res) => {
    try {
        const loggedInUserId = req.user._id;
        const users = await User.find({ _id: { $ne: loggedInUserId } }).select("-password");
        res.status(200).json(users);
    } catch (error) {
        console.error("Error in getAllUsers: ", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
}
export const toggleAuthenticationStatus = async (req, res) => {
    try {
        const { id } = req.params;

        // Find the user first
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Toggle the current status
        const updatedUser = await User.findByIdAndUpdate(
            id,
            { isAuthenticated: !user.isAuthenticated },
            { new: true }
        ).select("-password");

        res.status(200).json({
            message: `User authentication status changed to ${updatedUser.isAuthenticated}`,
            user: updatedUser,
        });
    } catch (error) {
        console.error("Error toggling auth status:", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};
export const updateUserDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const { fullName, email, branch } = req.body;

        const updatedUser = await User.findByIdAndUpdate(
            id,
            { fullName, email, branch },
            { new: true }
        ).select("-password");

        if (!updatedUser) {
            return res.status(404).json({ error: "User not found" });
        }

        res.status(200).json({
            message: "User updated successfully",
            user: updatedUser,
        });
    } catch (error) {
        console.error("Error updating user:", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};