import mongoose, { Schema } from "mongoose";

const projectSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        minlength: [3, "Project name must be at least 3 characters"],
        maxlength: [100, "Project name cannot exceed 100 characters"]
    },
    description: {
        type: String,
        trim: true,
        maxlength: [500, "Description cannot exceed 500 characters"]
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    members: [{
        type: Schema.Types.ObjectId,
        ref: "User"
    }],
    status: {
        type: String,
        enum: ["planning", "active", "on_hold", "completed", "cancelled", "overdue", "archived"],
        default: "planning"
    },
    startDate: {
        type: Date,
        required: [true, "Start date is required"]
    },
    endDate: {
        type: Date,
        required: [true, "End date is required"]
    },
    // Auto-completion settings
    autoCompleteOnEndDate: {
        type: Boolean,
        default: true  // Automatically mark as completed when end date is reached
    },
    allowTasksAfterEndDate: {
        type: Boolean,
        default: false  // Prevent new tasks after end date
    }
}, {
    timestamps: true
});

// Indexes for performance
projectSchema.index({ createdBy: 1 });
projectSchema.index({ members: 1 });
projectSchema.index({ status: 1 });
projectSchema.index({ name: 'text', description: 'text' });

// Validation: endDate must be after startDate
projectSchema.pre("save", function (next) {
    if (this.startDate && this.endDate && this.endDate <= this.startDate) {
        next(new Error("End date must be after start date"));
    }
    
    const now = new Date();
    
    // Auto-activate project if start date has arrived and status is still planning
    if (this.status === "planning" && this.startDate <= now) {
        this.status = "active";
    }
    
    // Auto-mark as overdue if end date has passed and project is still active
    if (this.endDate < now && 
        (this.status === "active" || this.status === "planning")) {
        this.status = "overdue";
    }
    
    // Auto-complete if enabled and end date reached
    if (this.autoCompleteOnEndDate && 
        this.endDate < now && 
        this.status === "active") {
        this.status = "completed";
    }
    
    next();
});

// Instance method to check if project allows new tasks
projectSchema.methods.canAddTasks = function() {
    const now = new Date();
    
    // Can't add tasks if project is completed or cancelled
    if (this.status === "completed" || this.status === "cancelled") {
        return false;
    }
    
    // Check if tasks are allowed after end date
    if (this.endDate < now && !this.allowTasksAfterEndDate) {
        return false;
    }
    
    return true;
};

// Instance method to get project health status
projectSchema.methods.getHealthStatus = function() {
    const now = new Date();
    const daysUntilEnd = Math.ceil((this.endDate - now) / (1000 * 60 * 60 * 24));
    
    if (this.status === "completed") return "completed";
    if (this.status === "cancelled") return "cancelled";
    if (this.status === "overdue") return "overdue";
    
    if (daysUntilEnd < 0) return "overdue";
    if (daysUntilEnd <= 7) return "critical";
    if (daysUntilEnd <= 30) return "warning";
    
    return "healthy";
};

export const Project = mongoose.model("Project", projectSchema);
