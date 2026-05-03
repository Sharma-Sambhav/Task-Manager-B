import { APIError } from "../utils/APIerror.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const verifyAdmin = asyncHandler(async (req, res, next) => {
    try {
        if (!req.user) {
            throw new APIError(401, "Unauthorized - User not authenticated");
        }

        if (req.user.role !== "admin") {
            throw new APIError(403, "Forbidden - Admin access required");
        }

        next();
    } catch (error) {
        console.log('File: admin.middleware.js', 'Line 16:', error);
        throw new APIError(error.statusCode || 403, error?.message || "Forbidden - Admin access required");
    }
});
