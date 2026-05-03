import { Task } from "../models/task.models.js";
import { Project } from "../models/project.models.js";
import { User } from "../models/user.models.js";
import { APIError } from "../utils/APIerror.js";
import mongoose from "mongoose";

// Verify project membership
const verifyProjectMembership = async (projectId, userId) => {
    console.log('🔍 Verifying project membership:', { projectId, userId, type: typeof projectId });
    
    if (!projectId) {
        throw new APIError(400, "Project ID is required");
    }
    
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
        console.log('❌ Invalid project ID format:', projectId);
        throw new APIError(400, "Invalid project ID format");
    }

    const project = await Project.findById(projectId);
    if (!project) {
        console.log('❌ Project not found:', projectId);
        throw new APIError(404, "Project not found");
    }
    
    console.log('✅ Project found:', { projectId: project._id, name: project.name, membersCount: project.members.length });
    
    const isMember = project.members.some(
        member => member.toString() === userId.toString()
    );
    
    if (!isMember) {
        console.log('❌ User not a member:', { userId, projectMembers: project.members.map(m => m.toString()) });
        throw new APIError(403, "Access denied: You are not a member of this project");
    }
    
    console.log('✅ User is project member');
    return project;
};

// Get user's accessible projects for task filtering
const getUserAccessibleProjects = async (userId) => {
    const projects = await Project.find({ members: userId }).select('_id');
    return projects.map(p => p._id);
};

// Create task (Admin/Creator only)
const createTaskService = async (userId, userRole, taskData) => {
    const { title, description, projectId, assignedTo, priority, dueDate } = taskData;
    
    // Verify project membership and permissions
    const project = await verifyProjectMembership(projectId, userId);
    
    const isCreator = project.createdBy.toString() === userId.toString();
    const isAppAdmin = userRole === "admin";
    
    if (!isCreator && !isAppAdmin) {
        throw new APIError(403, "Only project creators or admins can create tasks");
    }
    
    // Validate assignee is project member if provided
    if (assignedTo) {
        if (!mongoose.Types.ObjectId.isValid(assignedTo)) {
            throw new APIError(400, "Invalid assignee ID");
        }
        
        const isAssigneeMember = project.members.some(
            member => member.toString() === assignedTo.toString()
        );
        if (!isAssigneeMember) {
            throw new APIError(400, "Cannot assign task to non-project member");
        }
    }
    
    const task = await Task.create({
        title,
        description,
        project: projectId,
        assignedTo,
        createdBy: userId,
        priority,
        dueDate
    });
    
    return await Task.findById(task._id)
        .populate('assignedTo', 'firstName lastName email')
        .populate('createdBy', 'firstName lastName email')
        .populate('project', 'name');
};

// Get all user tasks (across all projects)
const getUserAllTasksService = async (userId, filters = {}) => {
    const { status, priority, assignedToMe, overdue, sort = '-createdAt', limit = 50, page = 1 } = filters;
    
    // Get user's accessible projects
    const accessibleProjects = await getUserAccessibleProjects(userId);
    
    if (accessibleProjects.length === 0) {
        return {
            allTasks: [],
            tasksByProject: [],
            totalTasks: 0,
            page: parseInt(page),
            limit: parseInt(limit)
        };
    }
    
    const query = { project: { $in: accessibleProjects } };
    
    // Apply filters
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (assignedToMe === 'true') query.assignedTo = userId;
    if (overdue === 'true') query.isOverdue = true;
    
    const skip = (page - 1) * limit;
    
    const tasks = await Task.find(query)
        .populate('assignedTo', 'firstName lastName email')
        .populate('createdBy', 'firstName lastName email')
        .populate('project', 'name status')
        .sort(sort)
        .limit(parseInt(limit))
        .skip(skip);
    
    const total = await Task.countDocuments(query);
    
    // Group tasks by project for better organization
    const tasksByProject = {};
    tasks.forEach(task => {
        const projectId = task.project._id.toString();
        if (!tasksByProject[projectId]) {
            tasksByProject[projectId] = {
                project: task.project,
                tasks: []
            };
        }
        tasksByProject[projectId].tasks.push(task);
    });
    
    return {
        allTasks: tasks,
        tasksByProject: Object.values(tasksByProject),
        totalTasks: total,
        page: parseInt(page),
        limit: parseInt(limit)
    };
};

// Get project-specific tasks
const getProjectTasksService = async (projectId, userId, filters = {}) => {
    // Verify project membership
    await verifyProjectMembership(projectId, userId);
    
    const { status, priority, assignedTo, overdue, sort = '-createdAt', limit = 50, page = 1 } = filters;
    
    const query = { project: projectId };
    
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (assignedTo) query.assignedTo = assignedTo;
    if (overdue === 'true') query.isOverdue = true;
    
    const skip = (page - 1) * limit;
    
    const tasks = await Task.find(query)
        .populate('assignedTo', 'firstName lastName email')
        .populate('createdBy', 'firstName lastName email')
        .sort(sort)
        .limit(parseInt(limit))
        .skip(skip);
    
    const total = await Task.countDocuments(query);
    
    return {
        tasks,
        total,
        page: parseInt(page),
        limit: parseInt(limit)
    };
};

// Get single task by ID
const getTaskByIdService = async (taskId, userId, userRole) => {
    if (!mongoose.Types.ObjectId.isValid(taskId)) {
        throw new APIError(400, "Invalid task ID");
    }

    const task = await Task.findById(taskId)
        .populate('assignedTo', 'firstName lastName email')
        .populate('createdBy', 'firstName lastName email')
        .populate('project', 'name');
    
    if (!task) {
        throw new APIError(404, "Task not found");
    }
    
    // Check access level
    const accessLevel = await task.getUserAccessLevel(userId, userRole);
    
    if (accessLevel === 'NO_ACCESS') {
        throw new APIError(403, "Access denied: You don't have permission to view this task");
    }
    
    return task;
};

// Update task with access control
const updateTaskService = async (taskId, userId, userRole, updates) => {
    if (!mongoose.Types.ObjectId.isValid(taskId)) {
        throw new APIError(400, "Invalid task ID");
    }

    const task = await Task.findById(taskId).populate('project');
    if (!task) {
        throw new APIError(404, "Task not found");
    }
    
    // Check access level
    const accessLevel = await task.getUserAccessLevel(userId, userRole);
    
    if (accessLevel === 'NO_ACCESS') {
        throw new APIError(403, "Access denied: You don't have permission to view this task");
    }
    
    // Define allowed updates based on access level
    const allowedUpdates = {
        'FULL_ACCESS': ['title', 'description', 'assignedTo', 'priority', 'dueDate', 'status'],
        'ASSIGNED_ACCESS': ['status'],
        'READ_ONLY': []
    };
    
    const userAllowedUpdates = allowedUpdates[accessLevel] || [];
    const updateKeys = Object.keys(updates);
    
    const hasInvalidUpdates = updateKeys.some(key => !userAllowedUpdates.includes(key));
    if (hasInvalidUpdates) {
        throw new APIError(403, `Access denied: You can only update your tasks`);
    }
    
    // Validate assignee if being updated
    if (updates.assignedTo && accessLevel === 'FULL_ACCESS') {
        if (!mongoose.Types.ObjectId.isValid(updates.assignedTo)) {
            throw new APIError(400, "Invalid assignee ID");
        }
        
        const project = await Project.findById(task.project._id);
        const isAssigneeMember = project.members.some(
            member => member.toString() === updates.assignedTo.toString()
        );
        if (!isAssigneeMember) {
            throw new APIError(400, "Cannot assign task to non-project member");
        }
    }
    
    // Track status changes
    if (updates.status && updates.status !== task.status) {
        task.statusHistory.push({
            status: updates.status,
            changedBy: userId,
            changedAt: new Date()
        });
        
        if (updates.status === 'done') {
            updates.completedAt = new Date();
        }
    }
    
    // Apply updates
    Object.keys(updates).forEach(key => {
        task[key] = updates[key];
    });
    
    await task.save();
    
    return await Task.findById(taskId)
        .populate('assignedTo', 'firstName lastName email')
        .populate('createdBy', 'firstName lastName email')
        .populate('project', 'name');
};

// Delete task (Admin/Creator only)
const deleteTaskService = async (taskId, userId, userRole) => {
    if (!mongoose.Types.ObjectId.isValid(taskId)) {
        throw new APIError(400, "Invalid task ID");
    }

    const task = await Task.findById(taskId).populate('project');
    if (!task) {
        throw new APIError(404, "Task not found");
    }
    
    // Check access level
    const accessLevel = await task.getUserAccessLevel(userId, userRole);
    
    if (accessLevel !== 'FULL_ACCESS') {
        throw new APIError(403, "Access denied: Only project creators or admins can delete tasks");
    }
    
    await Task.findByIdAndDelete(taskId);
    
    return { message: "Task deleted successfully" };
};

export {
    createTaskService,
    getUserAllTasksService,
    getProjectTasksService,
    getTaskByIdService,
    updateTaskService,
    deleteTaskService
};