import { Project } from "../models/project.models.js";
import { User } from "../models/user.models.js";
import { APIError } from "../utils/APIerror.js";
import mongoose from "mongoose";

// Create project
const createProjectService = async (userId, projectData) => {
    const { name, description, startDate, endDate } = projectData;

    const project = await Project.create({
        name,
        description,
        createdBy: userId,
        members: [userId],
        startDate,
        endDate
    });

    const populatedProject = await Project.findById(project._id)
        .populate('members', 'firstName lastName email')
        .populate('createdBy', 'firstName lastName email');

    return populatedProject;
};

// Get user projects
const getUserProjectsService = async (userId, filters = {}) => {
    const { status, sort = '-createdAt', limit = 50, page = 1 } = filters;

    const query = { members: userId };
    if (status) query.status = status;

    const skip = (page - 1) * limit;

    const projects = await Project.find(query)
        .populate('members', 'firstName lastName email')
        .populate('createdBy', 'firstName lastName email')
        .sort(sort)
        .limit(parseInt(limit))
        .skip(skip);

    const total = await Project.countDocuments(query);

    return { projects, total, page: parseInt(page), limit: parseInt(limit) };
};

// Get project by ID
const getProjectByIdService = async (projectId, userId) => {
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
        throw new APIError(400, "Invalid project ID");
    }

    const project = await Project.findById(projectId)
        .populate('members', 'firstName lastName email')
        .populate('createdBy', 'firstName lastName email');

    if (!project) {
        throw new APIError(404, "Project not found");
    }

    const isMember = project.members.some(member => member._id.toString() === userId.toString());
    if (!isMember) {
        throw new APIError(403, "You are not a member of this project");
    }

    return project;
};

// Update project
const updateProjectService = async (projectId, userId, updates, userRole) => {
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
        throw new APIError(400, "Invalid project ID");
    }

    const project = await Project.findById(projectId);
    if (!project) {
        throw new APIError(404, "Project not found");
    }

    const isCreator = project.createdBy.toString() === userId.toString();
    const isAppAdmin = userRole === "admin";

    if (!isCreator && !isAppAdmin) {
        throw new APIError(403, "Only project creator or app admin can update this project");
    }

    const allowedUpdates = ['name', 'description', 'status', 'startDate', 'endDate'];
    const updateKeys = Object.keys(updates);
    const isValidUpdate = updateKeys.every(key => allowedUpdates.includes(key));

    if (!isValidUpdate) {
        throw new APIError(400, "Invalid updates");
    }

    updateKeys.forEach(key => {
        project[key] = updates[key];
    });

    await project.save();

    const updatedProject = await Project.findById(projectId)
        .populate('members', 'firstName lastName email')
        .populate('createdBy', 'firstName lastName email');

    return updatedProject;
};

// Delete project
const deleteProjectService = async (projectId, userId, userRole) => {
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
        throw new APIError(400, "Invalid project ID");
    }

    const project = await Project.findById(projectId);
    if (!project) {
        throw new APIError(404, "Project not found");
    }

    const isCreator = project.createdBy.toString() === userId.toString();
    const isAppAdmin = userRole === "admin";

    if (!isCreator && !isAppAdmin) {
        throw new APIError(403, "Only project creator or app admin can delete this project");
    }

    await Project.findByIdAndDelete(projectId);

    return { message: "Project deleted successfully" };
};

// Add member
const addMemberService = async (projectId, userId, memberEmail, userRole) => {
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
        throw new APIError(400, "Invalid project ID");
    }

    const project = await Project.findById(projectId);
    if (!project) {
        throw new APIError(404, "Project not found");
    }

    const isCreator = project.createdBy.toString() === userId.toString();
    const isAppAdmin = userRole === "admin";

    if (!isCreator && !isAppAdmin) {
        throw new APIError(403, "Only project creator or app admin can add members");
    }

    const memberToAdd = await User.findOne({ email: memberEmail });
    if (!memberToAdd) {
        throw new APIError(404, "User not found");
    }

    if (memberToAdd.status !== "approved") {
        throw new APIError(400, "User is not approved");
    }

    const isAlreadyMember = project.members.some(
        member => member.toString() === memberToAdd._id.toString()
    );

    if (isAlreadyMember) {
        throw new APIError(409, "User is already a member of this project");
    }

    project.members.push(memberToAdd._id);
    await project.save();

    const updatedProject = await Project.findById(projectId)
        .populate('members', 'firstName lastName email')
        .populate('createdBy', 'firstName lastName email');

    return updatedProject;
};

// Remove member
const removeMemberService = async (projectId, userId, memberId, userRole) => {
    if (!mongoose.Types.ObjectId.isValid(projectId) || !mongoose.Types.ObjectId.isValid(memberId)) {
        throw new APIError(400, "Invalid project or member ID");
    }

    const project = await Project.findById(projectId);
    if (!project) {
        throw new APIError(404, "Project not found");
    }

    const isCreator = project.createdBy.toString() === userId.toString();
    const isAppAdmin = userRole === "admin";

    if (!isCreator && !isAppAdmin) {
        throw new APIError(403, "Only project creator or app admin can remove members");
    }

    if (project.createdBy.toString() === memberId.toString()) {
        throw new APIError(400, "Cannot remove the project creator");
    }

    const memberIndex = project.members.findIndex(
        member => member.toString() === memberId.toString()
    );

    if (memberIndex === -1) {
        throw new APIError(404, "Member not found in this project");
    }

    project.members.splice(memberIndex, 1);
    await project.save();

    const updatedProject = await Project.findById(projectId)
        .populate('members', 'firstName lastName email')
        .populate('createdBy', 'firstName lastName email');

    return updatedProject;
};

// Get project analytics
const getProjectAnalyticsService = async (projectId, userId) => {
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
        throw new APIError(400, "Invalid project ID");
    }

    const project = await Project.findById(projectId)
        .populate('members', 'firstName lastName email')
        .populate('createdBy', 'firstName lastName email');

    if (!project) {
        throw new APIError(404, "Project not found");
    }

    const isMember = project.members.some(member => member._id.toString() === userId.toString());
    if (!isMember) {
        throw new APIError(403, "You are not a member of this project");
    }

    const analytics = {
        projectInfo: {
            name: project.name,
            description: project.description,
            status: project.status,
            startDate: project.startDate,
            endDate: project.endDate
        },
        memberStats: {
            total: project.members.length,
            creator: {
                userId: project.createdBy._id,
                name: `${project.createdBy.firstName} ${project.createdBy.lastName}`,
                email: project.createdBy.email
            }
        }
    };

    return analytics;
};

// Archive project
const archiveProjectService = async (projectId, userId, userRole) => {
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
        throw new APIError(400, "Invalid project ID");
    }

    const project = await Project.findById(projectId);
    if (!project) {
        throw new APIError(404, "Project not found");
    }

    const isCreator = project.createdBy.toString() === userId.toString();
    const isAppAdmin = userRole === "admin";

    if (!isCreator && !isAppAdmin) {
        throw new APIError(403, "Only project creator or app admin can archive this project");
    }

    // Archive means moving to archived status - preserves all data but marks as inactive
    project.status = "archived";
    await project.save();

    const updatedProject = await Project.findById(projectId)
        .populate('members', 'firstName lastName email')
        .populate('createdBy', 'firstName lastName email');

    return updatedProject;
};

// Search projects
const searchProjectsService = async (userId, query, filters = {}) => {
    const { status, sort = '-createdAt', limit = 50, page = 1 } = filters;

    const searchQuery = { members: userId };
    
    if (query) {
        searchQuery.$text = { $search: query };
    }
    
    if (status) {
        searchQuery.status = status;
    }

    const skip = (page - 1) * limit;

    const projects = await Project.find(searchQuery)
        .populate('members', 'firstName lastName email')
        .populate('createdBy', 'firstName lastName email')
        .sort(sort)
        .limit(parseInt(limit))
        .skip(skip);

    const total = await Project.countDocuments(searchQuery);

    return { projects, total, page: parseInt(page), limit: parseInt(limit) };
};

export {
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
};
