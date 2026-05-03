import { User } from "../models/user.models.js";
import { APIError } from "../utils/APIerror.js";
import { APIresponse } from "../utils/APIresponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const registerUser = asyncHandler(async (req, res) => {
    try {
        const { firstName, lastName, email, password } = req.body;

        // Validate all fields
        if ([firstName, lastName, email, password].some((field) => field?.trim() === "")) {
            throw new APIError(400, "All fields are required");
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            throw new APIError(400, "User already exists");
        }

        // Create user (password will be hashed by pre-save hook, status defaults to "pending")
        const user = await User.create({
            firstName,
            lastName,
            email,
            password
        });

        // Get user without password
        const createdUser = await User.findById(user._id).select("-password");

        return res
            .status(201)
            .json(
                new APIresponse(
                    201,
                    {
                        user: createdUser
                    },
                    "Registration successful! Your account is pending admin approval. You will be able to login once approved."
                )
            );
    } catch (error) {
        console.log('File: user.controller.js', 'Line 44:', error);
        throw new APIError(error.statusCode || 500, error?.message || "Something went wrong while registering user");
    }
});

const loginUser = asyncHandler(async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate fields
        if ([email, password].some((field) => field?.trim() === "")) {
            throw new APIError(400, "Email and password are required");
        }

        // Check if user exists
        const user = await User.findOne({ email });
        if (!user) {
            throw new APIError(401, "Invalid credentials");
        }

        // Check if password exists (for debugging)
        if (!user.password) {
            console.error('User password is missing in database:', user.email);
            throw new APIError(500, "Account configuration error. Please contact support.");
        }

        // Check user status
        if (user.status === "pending") {
            throw new APIError(403, "Your account is pending approval. Please wait for admin approval.");
        }

        if (user.status === "rejected") {
            throw new APIError(403, "Your account has been rejected. Please contact admin.");
        }

        // Verify password
        try {
            const isPasswordCorrect = await user.isPasswordCorrect(password);
            if (!isPasswordCorrect) {
                throw new APIError(401, "Invalid credentials");
            }
        } catch (bcryptError) {
            console.error('Password verification error:', bcryptError);
            throw new APIError(500, "Authentication error. Please try again or contact support.");
        }

        // Generate access token
        const accessToken = user.generateAccessToken();

        // Get user without password
        const loggedInUser = await User.findById(user._id).select("-password");

        // Cookie options - httpOnly prevents JavaScript access (secure!)
        const options = {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            path: "/"
        };

        console.log("🍪 Setting httpOnly cookie");

        // IMPORTANT: Token is ONLY in httpOnly cookie, NOT in response body
        return res
            .status(200)
            .cookie("token", accessToken, options)
            .json(
                new APIresponse(
                    200,
                    {
                        user: loggedInUser
                    },
                    "User logged in successfully"
                )
            );
    } catch (error) {
        console.log('File: user.controller.js', 'Line 119:', error);
        
        // If it's already an APIError, throw it as is
        if (error.statusCode) {
            throw error;
        }
        
        // Otherwise wrap it
        throw new APIError(500, "Something went wrong while logging in");
    }
});

const getCurrentUser = asyncHandler(async (req, res) => {
    try {
        console.log("📡 /user/me called, user from req:", req.user?.email);
        
        return res
            .status(200)
            .json(
                new APIresponse(
                    200,
                    {
                        user: req.user
                    },
                    "User fetched successfully"
                )
            );
    } catch (error) {
        console.log('File: user.controller.js', 'Line 145:', error);
        throw new APIError(500, "Something went wrong while fetching user");
    }
});

const logoutUser = asyncHandler(async (req, res) => {
    try {
        const options = {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/"
        };

        return res
            .status(200)
            .clearCookie("token", options)
            .json(
                new APIresponse(
                    200,
                    {},
                    "User logged out successfully"
                )
            );
    } catch (error) {
        console.log('File: user.controller.js', 'Line 171:', error);
        throw new APIError(500, "Something went wrong while logging out");
    }
});

export {
    registerUser,
    loginUser,
    getCurrentUser,
    logoutUser
};
