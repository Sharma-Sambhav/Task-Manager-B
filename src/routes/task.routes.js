import { Router } from "express";
import {
    createTask,
    getUserAllTasks,
    getProjectTasks,
    getTaskById,
    updateTask,
    deleteTask
} from "../controllers/task.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// All routes require authentication
router.use(verifyJWT);

// User's all tasks (across all projects)
router.route("/tasks").get(getUserAllTasks);

// Project-specific task routes
router.route("/projects/:projectId/tasks")
    .post(createTask)
    .get(getProjectTasks);

// Individual task routes
router.route("/tasks/:taskId")
    .get(getTaskById)
    .put(updateTask)
    .delete(deleteTask);

export default router;