import mongoose, { Schema } from "mongoose";

const taskSchema = new Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: [200, "Title cannot exceed 200 characters"]
    },
    description: {
        type: String,
        trim: true,
        maxlength: [1000, "Description cannot exceed 1000 characters"]
    },
    project: {
        type: Schema.Types.ObjectId,
        ref: "Project",
        required: true,
        index: true
    },
    assignedTo: {
        type: Schema.Types.ObjectId,
        ref: "User"
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    status: {
        type: String,
        enum: ["to_do", "in_progress", "done"],
        default: "to_do"
    },
    priority: {
        type: String,
        enum: ["low", "medium", "high"],
        default: "medium"
    },
    dueDate: {
        type: Date
    },
    completedAt: {
        type: Date
    },
    isOverdue: {
        type: Boolean,
        default: false
    },
    overdueNotificationSent: {
        type: Boolean,
        default: false
    },
    statusHistory: [{
        status: String,
        changedBy: { type: Schema.Types.ObjectId, ref: "User" },
        changedAt: { type: Date, default: Date.now },
        reason: String
    }]
}, {
    timestamps: true
});

// Indexes for performance and security
taskSchema.index({ project: 1, assignedTo: 1 });
taskSchema.index({ project: 1, status: 1 });
taskSchema.index({ assignedTo: 1, status: 1 });
taskSchema.index({ dueDate: 1, status: 1 });
taskSchema.index({ isOverdue: 1 });

// Pre-save middleware for overdue detection
taskSchema.pre("save", function(next) {
    const now = new Date();
    
    // Check if task is overdue
    if (this.dueDate && this.dueDate < now && this.status !== "done") {
        this.isOverdue = true;
    } else if (this.status === "done") {
        this.isOverdue = false;
    }
    
    next();
});

// Instance method to check user access level
taskSchema.methods.getUserAccessLevel = async function(userId, userRole) {
    const Project = mongoose.model("Project");
    const project = await Project.findById(this.project);
    
    if (!project) return 'NO_ACCESS';
    
    const isProjectMember = project.members.some(
        member => member.toString() === userId.toString()
    );
    
    if (!isProjectMember) return 'NO_ACCESS';
    
    const isCreator = project.createdBy.toString() === userId.toString();
    const isAppAdmin = userRole === "admin";
    const isAssigned = this.assignedTo && this.assignedTo.toString() === userId.toString();
    
    if (isCreator || isAppAdmin) return 'FULL_ACCESS';
    if (isAssigned) return 'ASSIGNED_ACCESS';
    return 'READ_ONLY';
};

export const Task = mongoose.model("Task", taskSchema);