import { User } from "../models/user.models.js";
import { APIError } from "../utils/APIerror.js";
import { APIresponse } from "../utils/APIresponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Get all pending users
const getPendingUsers = asyncHandler(async (req, res) => {
    try {
        const pendingUsers = await User.find({ status: "pending" }).select("-password").sort({ createdAt: -1 });

        return res
            .status(200)
            .json(
                new APIresponse(
                    200,
                    { users: pendingUsers, count: pendingUsers.length },
                    "Pending users fetched successfully"
                )
            );
    } catch (error) {
        console.log('File: admin.controller.js', 'Line 19:', error);
        throw new APIError(500, "Something went wrong while fetching pending users");
    }
});

// Approve user
const approveUser = asyncHandler(async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await User.findById(userId);
        if (!user) {
            throw new APIError(404, "User not found");
        }

        if (user.status !== "pending") {
            throw new APIError(400, "User is not in pending status");
        }

        user.status = "approved";
        await user.save();

        const updatedUser = await User.findById(userId).select("-password");

        return res
            .status(200)
            .json(
                new APIresponse(
                    200,
                    { user: updatedUser },
                    "User approved successfully"
                )
            );
    } catch (error) {
        console.log('File: admin.controller.js', 'Line 52:', error);
        throw new APIError(error.statusCode || 500, error?.message || "Something went wrong while approving user");
    }
});

// Reject user
const rejectUser = asyncHandler(async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await User.findById(userId);
        if (!user) {
            throw new APIError(404, "User not found");
        }

        if (user.status !== "pending") {
            throw new APIError(400, "User is not in pending status");
        }

        user.status = "rejected";
        await user.save();

        const updatedUser = await User.findById(userId).select("-password");

        return res
            .status(200)
            .json(
                new APIresponse(
                    200,
                    { user: updatedUser },
                    "User rejected successfully"
                )
            );
    } catch (error) {
        console.log('File: admin.controller.js', 'Line 85:', error);
        throw new APIError(error.statusCode || 500, error?.message || "Something went wrong while rejecting user");
    }
});

// Get all users (for admin dashboard)
const getAllUsers = asyncHandler(async (req, res) => {
    try {
        const users = await User.find().select("-password").sort({ createdAt: -1 });

        const stats = {
            total: users.length,
            pending: users.filter(u => u.status === "pending").length,
            approved: users.filter(u => u.status === "approved").length,
            rejected: users.filter(u => u.status === "rejected").length,
            admins: users.filter(u => u.role === "admin").length,
            members: users.filter(u => u.role === "member").length
        };

        return res
            .status(200)
            .json(
                new APIresponse(
                    200,
                    { users, stats },
                    "Users fetched successfully"
                )
            );
    } catch (error) {
        console.log('File: admin.controller.js', 'Line 117:', error);
        throw new APIError(500, "Something went wrong while fetching users");
    }
});

export {
    getPendingUsers,
    approveUser,
    rejectUser,
    getAllUsers
};
