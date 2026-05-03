import { asyncHandler } from "../utils/asyncHandler.js";
import { APIError } from "../utils/APIerror.js";
import { APIresponse } from "../utils/APIresponse.js";
import {
    createTaskService,
    getUserAllTasksService,
    getProjectTasksService,
    getTaskByIdService,
    updateTaskService,
    deleteTaskService
} from "../services/task.service.js";

// Create task
const createTask = asyncHandler(async (req, res) => {
    try {
        const { projectId } = req.params;
        const { title, description, assignedTo, priority, dueDate } = req.body;

        if ([title].some((field) => field?.trim() === "")) {
            throw new APIError(400, "Title is required");
        }

        const task = await createTaskService(req.user._id, req.user.role, {
            title,
            description,
            projectId,
            assignedTo,
            priority,
            dueDate
        });

        return res
            .status(201)
            .json(new APIresponse(201, { task }, "Task created successfully"));
    } catch (error) {
        console.log('File: task.controller.js', 'Line 30:', error);
        throw new APIError(error.statusCode || 500, error?.message || "Something went wrong while creating task");
    }
});

// Get all user tasks (across all projects)
const getUserAllTasks = asyncHandler(async (req, res) => {
    try {
        const { status, priority, assignedToMe, overdue, sort, limit, page } = req.query;

        const result = await getUserAllTasksService(req.user._id, {
            status,
            priority,
            assignedToMe,
            overdue,
            sort,
            limit,
            page
        });

        return res
            .status(200)
            .json(new APIresponse(200, result, "Tasks fetched successfully"));
    } catch (error) {
        console.log('File: task.controller.js', 'Line 56:', error);
        throw new APIError(error.statusCode || 500, error?.message || "Something went wrong while fetching tasks");
    }
});

// Get project-specific tasks
const getProjectTasks = asyncHandler(async (req, res) => {
    try {
        const { projectId } = req.params;
        const { status, priority, assignedTo, overdue, sort, limit, page } = req.query;

        const result = await getProjectTasksService(projectId, req.user._id, {
            status,
            priority,
            assignedTo,
            overdue,
            sort,
            limit,
            page
        });

        return res
            .status(200)
            .json(new APIresponse(200, result, "Project tasks fetched successfully"));
    } catch (error) {
        console.log('File: task.controller.js', 'Line 80:', error);
        throw new APIError(error.statusCode || 500, error?.message || "Something went wrong while fetching project tasks");
    }
});

// Get single task by ID
const getTaskById = asyncHandler(async (req, res) => {
    try {
        const { taskId } = req.params;

        const task = await getTaskByIdService(taskId, req.user._id, req.user.role);

        return res
            .status(200)
            .json(new APIresponse(200, { task }, "Task fetched successfully"));
    } catch (error) {
        console.log('File: task.controller.js', 'Line 98:', error);
        throw new APIError(error.statusCode || 500, error?.message || "Something went wrong while fetching task");
    }
});

// Update task
const updateTask = asyncHandler(async (req, res) => {
    try {
        const { taskId } = req.params;
        const updates = req.body;

        if (Object.keys(updates).length === 0) {
            throw new APIError(400, "No updates provided");
        }

        const task = await updateTaskService(taskId, req.user._id, req.user.role, updates);

        return res
            .status(200)
            .json(new APIresponse(200, { task }, "Task updated successfully"));
    } catch (error) {
        console.log('File: task.controller.js', 'Line 120:', error);
        throw new APIError(error.statusCode || 500, error?.message || "Something went wrong while updating task");
    }
});

// Delete task
const deleteTask = asyncHandler(async (req, res) => {
    try {
        const { taskId } = req.params;

        const result = await deleteTaskService(taskId, req.user._id, req.user.role);

        return res
            .status(200)
            .json(new APIresponse(200, result, "Task deleted successfully"));
    } catch (error) {
        console.log('File: task.controller.js', 'Line 137:', error);
        throw new APIError(error.statusCode || 500, error?.message || "Something went wrong while deleting task");
    }
});

export {
    createTask,
    getUserAllTasks,
    getProjectTasks,
    getTaskById,
    updateTask,
    deleteTask
};