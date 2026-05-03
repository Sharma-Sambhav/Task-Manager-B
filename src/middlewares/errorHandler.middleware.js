const errorHandler = (err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    let message = err.message || "Internal Server Error";

    // Log detailed error for debugging
    console.log('File: errorHandler.middleware.js', 'Error:', {
        statusCode,
        message: err.message,
        stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
        path: req.path,
        method: req.method
    });

    // Sanitize error messages for frontend
    if (statusCode === 500) {
        // Don't expose internal errors to frontend
        if (message.includes("bcrypt") || message.includes("hash")) {
            message = "Authentication error. Please try again or contact support.";
        } else if (message.includes("mongoose") || message.includes("MongoDB")) {
            message = "Database error. Please try again later.";
        } else if (message.includes("jwt") || message.includes("token")) {
            message = "Authentication token error. Please login again.";
        } else if (!err.statusCode) {
            // Generic 500 errors
            message = "Something went wrong. Please try again later.";
        }
    }

    return res.status(statusCode).json({
        success: false,
        message: message,
        errors: err.errors || [],
        ...(process.env.NODE_ENV === "development" && { 
            stack: err.stack,
            originalMessage: err.message 
        })
    });
};

export default errorHandler;
