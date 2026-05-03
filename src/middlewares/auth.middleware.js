import { User } from "../models/user.models.js";
import { APIError } from "../utils/APIerror.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";

export const verifyJWT = asyncHandler(async (req, res, next) => {
    try {
        console.log("🔐 Auth middleware called");
        console.log("🍪 Cookies:", req.cookies);
        console.log("📋 Authorization header:", req.headers.authorization);
        
        const token = req.cookies?.token || req.header("Authorization")?.replace("Bearer ", "");
        
        console.log("🎫 Token extracted:", token ? token.substring(0, 20) + "..." : "NO TOKEN");
        
        if (!token) {
            throw new APIError(401, "Unauthorized - No token provided");
        }

        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        console.log("✅ Token verified, user ID:", decoded._id);
        
        const user = await User.findById(decoded._id).select("-password");
        
        if (!user) {
            throw new APIError(401, "Unauthorized - Invalid token");
        }

        console.log("✅ User found:", user.email);
        req.user = user;
        next();
    } catch (error) {
        console.log('File: auth.middleware.js', 'Line 32:', error.message);
        throw new APIError(401, error?.message || "Unauthorized - Invalid token");
    }
});
