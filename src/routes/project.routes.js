import { Router } from "express";
import {
    createProject,
    getUserProjects,
    getProjectById,
    updateProject,
    deleteProject,
    addMember,
    removeMember,
    getProjectAnalytics,
    archiveProject,
    searchProjects
} from "../controllers/project.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// All routes require authentication
router.use(verifyJWT);

// CRUD
router.route("/").post(createProject).get(getUserProjects);
router.route("/search").get(searchProjects);
router.route("/:projectId")
    .get(getProjectById)
    .put(updateProject)
    .delete(deleteProject);

// Member Management
router.route("/:projectId/members").post(addMember);
router.route("/:projectId/members/:memberId").delete(removeMember);

// Analytics & Actions
router.route("/:projectId/analytics").get(getProjectAnalytics);
router.route("/:projectId/archive").patch(archiveProject);

export default router;
