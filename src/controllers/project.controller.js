import { asyncHandler } from "../utils/asyncHandler.js";
import { APIError } from "../utils/APIerror.js";
import { APIresponse } from "../utils/APIresponse.js";
import {
    createProjectService,
    getUserProjectsService,
    getProjectByIdService,
    updateProjectService,
    deleteProjectService,
    addMemberService,
    removeMemberService,
    getProjectAnalyticsService,
    archiveProjectService,
    searchProjectsService
} from "../services/project.service.js";

// Create project
const createProject = asyncHandler(async (req, res) => {
    try {
        const { name, description, startDate, endDate } = req.body;

        if (!name || name.trim() === "") {
            throw new APIError(400, "Project name is required");
        }

        const project = await createProjectService(req.user._id, {
            name,
            description,
            startDate,
            endDate
        });

        return res
            .status(201)
            .json(new APIresponse(201, { project }, "Project created successfully"));
    } catch (error) {
        console.log('File: project.controller.js', 'Line 35:', error);
        throw new APIError(error.statusCode || 500, error?.message || "Something went wrong while creating project");
    }
});

// Get user projects
const getUserProjects = asyncHandler(async (req, res) => {
    try {
        const { status, sort, limit, page } = req.query;

        const result = await getUserProjectsService(req.user._id, {
            status,
            sort,
            limit,
            page
        });

        return res
            .status(200)
            .json(new APIresponse(200, result, "Projects fetched successfully"));
    } catch (error) {
        console.log('File: project.controller.js', 'Line 56:', error);
        throw new APIError(error.statusCode || 500, error?.message || "Something went wrong while fetching projects");
    }
});

// Get project by ID
const getProjectById = asyncHandler(async (req, res) => {
    try {
        const { projectId } = req.params;

        const project = await getProjectByIdService(projectId, req.user._id);

        return res
            .status(200)
            .json(new APIresponse(200, { project }, "Project fetched successfully"));
    } catch (error) {
        console.log('File: project.controller.js', 'Line 74:', error);
        throw new APIError(error.statusCode || 500, error?.message || "Something went wrong while fetching project");
    }
});

// Update project
const updateProject = asyncHandler(async (req, res) => {
    try {
        const { projectId } = req.params;
        const updates = req.body;

        if (Object.keys(updates).length === 0) {
            throw new APIError(400, "No updates provided");
        }

        const project = await updateProjectService(projectId, req.user._id, updates, req.user.role);

        return res
            .status(200)
            .json(new APIresponse(200, { project }, "Project updated successfully"));
    } catch (error) {
        console.log('File: project.controller.js', 'Line 96:', error);
        throw new APIError(error.statusCode || 500, error?.message || "Something went wrong while updating project");
    }
});

// Delete project
const deleteProject = asyncHandler(async (req, res) => {
    try {
        const { projectId } = req.params;

        const result = await deleteProjectService(projectId, req.user._id, req.user.role);

        return res
            .status(200)
            .json(new APIresponse(200, result, "Project deleted successfully"));
    } catch (error) {
        console.log('File: project.controller.js', 'Line 113:', error);
        throw new APIError(error.statusCode || 500, error?.message || "Something went wrong while deleting project");
    }
});

// Add member
const addMember = asyncHandler(async (req, res) => {
    try {
        const { projectId } = req.params;
        const { email } = req.body;

        if (!email || email.trim() === "") {
            throw new APIError(400, "Member email is required");
        }

        const project = await addMemberService(projectId, req.user._id, email, req.user.role);

        return res
            .status(200)
            .json(new APIresponse(200, { project }, "Member added successfully"));
    } catch (error) {
        console.log('File: project.controller.js', 'Line 135:', error);
        throw new APIError(error.statusCode || 500, error?.message || "Something went wrong while adding member");
    }
});

// Remove member
const removeMember = asyncHandler(async (req, res) => {
    try {
        const { projectId, memberId } = req.params;

        const project = await removeMemberService(projectId, req.user._id, memberId, req.user.role);

        return res
            .status(200)
            .json(new APIresponse(200, { project }, "Member removed successfully"));
    } catch (error) {
        console.log('File: project.controller.js', 'Line 152:', error);
        throw new APIError(error.statusCode || 500, error?.message || "Something went wrong while removing member");
    }
});

// Get project analytics
const getProjectAnalytics = asyncHandler(async (req, res) => {
    try {
        const { projectId } = req.params;

        const analytics = await getProjectAnalyticsService(projectId, req.user._id);

        return res
            .status(200)
            .json(new APIresponse(200, { analytics }, "Analytics fetched successfully"));
    } catch (error) {
        console.log('File: project.controller.js', 'Line 169:', error);
        throw new APIError(error.statusCode || 500, error?.message || "Something went wrong while fetching analytics");
    }
});

// Archive project
const archiveProject = asyncHandler(async (req, res) => {
    try {
        const { projectId } = req.params;

        const project = await archiveProjectService(projectId, req.user._id, req.user.role);

        return res
            .status(200)
            .json(new APIresponse(200, { project }, "Project archived successfully"));
    } catch (error) {
        console.log('File: project.controller.js', 'Line 186:', error);
        throw new APIError(error.statusCode || 500, error?.message || "Something went wrong while archiving project");
    }
});

// Search projects
const searchProjects = asyncHandler(async (req, res) => {
    try {
        const { q, status, sort, limit, page } = req.query;

        const result = await searchProjectsService(req.user._id, q, {
            status,
            sort,
            limit,
            page
        });

        return res
            .status(200)
            .json(new APIresponse(200, result, "Projects searched successfully"));
    } catch (error) {
        console.log('File: project.controller.js', 'Line 207:', error);
        throw new APIError(error.statusCode || 500, error?.message || "Something went wrong while searching projects");
    }
});

export {
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
};
