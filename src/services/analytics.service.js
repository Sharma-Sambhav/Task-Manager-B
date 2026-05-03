import { Project } from "../models/project.models.js";
import { APIError } from "../utils/APIerror.js";
import mongoose from "mongoose";

// Helper: Verify project member access
const verifyProjectAccess = async (projectId, userId) => {
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

// Helper: Calculate date ranges
const getDateRanges = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    
    const lastWeekStart = new Date(weekStart);
    lastWeekStart.setDate(weekStart.getDate() - 7);
    
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    return {
        today,
        weekStart,
        lastWeekStart,
        monthStart,
        lastMonthStart,
        lastMonthEnd
    };
};

// 1. Overview Analytics
const getOverviewAnalyticsService = async (projectId, userId) => {
    const project = await verifyProjectAccess(projectId, userId);

    // TODO: Replace with actual Task queries when Task model exists
    const taskStats = {
        total: 0,
        byStatus: { toDo: 0, inProgress: 0, done: 0 },
        byPriority: { low: 0, medium: 0, high: 0 },
        overdue: 0
    };

    const analytics = {
        project: {
            id: project._id,
            name: project.name,
            description: project.description,
            status: project.status,
            startDate: project.startDate,
            endDate: project.endDate,
            createdAt: project.createdAt
        },
        members: {
            total: project.members.length,
            creator: {
                id: project.createdBy._id,
                name: `${project.createdBy.firstName} ${project.createdBy.lastName}`,
                email: project.createdBy.email
            },
            list: project.members.map(m => ({
                id: m._id,
                name: `${m.firstName} ${m.lastName}`,
                email: m.email
            }))
        },
        tasks: taskStats,
        completionRate: taskStats.total > 0 ? (taskStats.byStatus.done / taskStats.total * 100).toFixed(2) : 0,
        progress: taskStats.total > 0 ? (taskStats.byStatus.done / taskStats.total * 100).toFixed(2) : 0
    };

    return analytics;
};

// 2. Project Health Metrics
const getHealthMetricsService = async (projectId, userId) => {
    const project = await verifyProjectAccess(projectId, userId);

    // TODO: Replace with actual Task aggregation
    const now = new Date();
    const daysRemaining = project.endDate ? Math.ceil((project.endDate - now) / (1000 * 60 * 60 * 24)) : null;

    const health = {
        projectInfo: {
            name: project.name,
            status: project.status,
            startDate: project.startDate,
            endDate: project.endDate,
            daysRemaining
        },
        taskMetrics: {
            total: 0,
            completed: 0,
            inProgress: 0,
            toDo: 0,
            overdue: 0,
            completionRate: 0,
            onTimeDeliveryRate: 0
        },
        healthScore: {
            overall: 0,
            completionHealth: 0,
            timelineHealth: daysRemaining !== null ? (daysRemaining > 0 ? 100 : 0) : 100,
            teamHealth: (project.members.length > 0 ? 100 : 0)
        },
        riskScore: 0,
        isOnTrack: true,
        alerts: []
    };

    // Add alerts based on conditions
    if (daysRemaining !== null && daysRemaining < 7 && daysRemaining > 0) {
        health.alerts.push({
            type: "warning",
            message: `Project deadline is in ${daysRemaining} days`
        });
    }

    if (project.members.length < 2) {
        health.alerts.push({
            type: "info",
            message: "Consider adding more team members"
        });
    }

    return health;
};

// 3. Team Performance Analytics
const getTeamPerformanceService = async (projectId, userId) => {
    const project = await verifyProjectAccess(projectId, userId);

    // TODO: Replace with actual Task queries per member
    const memberPerformance = project.members.map(member => ({
        userId: member._id,
        name: `${member.firstName} ${member.lastName}`,
        email: member.email,
        isCreator: member._id.toString() === project.createdBy._id.toString(),
        stats: {
            totalAssigned: 0,
            completed: 0,
            inProgress: 0,
            toDo: 0,
            overdue: 0,
            completionRate: 0,
            averageCompletionTime: 0,
            onTimeDeliveryRate: 0,
            productivityScore: 0,
            tasksCompletedThisWeek: 0,
            tasksCompletedThisMonth: 0,
            lastActivityDate: null,
            isActive: false
        }
    }));

    const teamVelocity = {
        currentWeek: { tasksCompleted: 0, tasksCreated: 0, tasksInProgress: 0 },
        lastWeek: { tasksCompleted: 0, tasksCreated: 0 },
        currentMonth: { tasksCompleted: 0, tasksCreated: 0 },
        averageWeeklyCompletion: 0,
        velocityTrend: "stable",
        burndownRate: 0
    };

    return {
        memberPerformance,
        teamVelocity,
        summary: {
            totalMembers: project.members.length,
            activeMembers: 0,
            topPerformer: null,
            averageProductivity: 0
        }
    };
};

// 4. Daily Breakdown (Last N Days)
const getDailyBreakdownService = async (projectId, userId, days = 30) => {
    const project = await verifyProjectAccess(projectId, userId);

    const daysCount = Math.min(Math.max(parseInt(days), 1), 90);
    const dailyData = [];

    for (let i = daysCount - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);

        const nextDate = new Date(date);
        nextDate.setDate(date.getDate() + 1);

        // TODO: Query tasks created/completed on this date
        dailyData.push({
            date: date.toISOString().split('T')[0],
            tasksCreated: 0,
            tasksCompleted: 0,
            tasksInProgress: 0,
            activeMembers: 0,
            memberActivity: []
        });
    }

    return {
        period: `Last ${daysCount} days`,
        startDate: dailyData[0]?.date,
        endDate: dailyData[dailyData.length - 1]?.date,
        data: dailyData,
        summary: {
            totalTasksCreated: 0,
            totalTasksCompleted: 0,
            averageDailyCompletion: 0,
            mostProductiveDay: null
        }
    };
};

// 5. Weekly Breakdown (Last N Weeks)
const getWeeklyBreakdownService = async (projectId, userId, weeks = 12) => {
    const project = await verifyProjectAccess(projectId, userId);

    const weeksCount = Math.min(Math.max(parseInt(weeks), 1), 52);
    const weeklyData = [];

    for (let i = weeksCount - 1; i >= 0; i--) {
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - (weekStart.getDay() + i * 7));
        weekStart.setHours(0, 0, 0, 0);

        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        // TODO: Query tasks for this week
        weeklyData.push({
            weekNumber: weeksCount - i,
            weekStart: weekStart.toISOString().split('T')[0],
            weekEnd: weekEnd.toISOString().split('T')[0],
            tasksCompleted: 0,
            tasksCreated: 0,
            averageCompletionTime: 0,
            activeMembers: 0,
            productivityScore: 0
        });
    }

    return {
        period: `Last ${weeksCount} weeks`,
        data: weeklyData,
        summary: {
            totalTasksCompleted: 0,
            averageWeeklyCompletion: 0,
            bestWeek: null,
            trend: "stable"
        }
    };
};

// 6. Monthly Breakdown (Project Lifetime)
const getMonthlyBreakdownService = async (projectId, userId) => {
    const project = await verifyProjectAccess(projectId, userId);

    const projectStart = project.createdAt;
    const now = new Date();
    const monthlyData = [];

    let currentDate = new Date(projectStart.getFullYear(), projectStart.getMonth(), 1);

    while (currentDate <= now) {
        const monthStart = new Date(currentDate);
        const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

        // TODO: Query tasks for this month
        monthlyData.push({
            month: `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`,
            year: currentDate.getFullYear(),
            monthName: currentDate.toLocaleString('default', { month: 'long' }),
            tasksCompleted: 0,
            tasksCreated: 0,
            averageCompletionTime: 0,
            completionRate: 0,
            topPerformer: null
        });

        currentDate.setMonth(currentDate.getMonth() + 1);
    }

    return {
        period: "Project lifetime",
        totalMonths: monthlyData.length,
        data: monthlyData,
        summary: {
            totalTasksCompleted: 0,
            averageMonthlyCompletion: 0,
            bestMonth: null
        }
    };
};

// 7. Efficiency Metrics
const getEfficiencyMetricsService = async (projectId, userId) => {
    const project = await verifyProjectAccess(projectId, userId);

    // TODO: Calculate from actual task data
    const velocityScore = 0;
    const qualityScore = 0;
    const collaborationScore = (project.members.length / Math.max(project.members.length, 5)) * 100;
    const consistencyScore = 0;

    const overallScore = (
        velocityScore * 0.35 +
        qualityScore * 0.30 +
        collaborationScore * 0.20 +
        consistencyScore * 0.15
    );

    return {
        overallScore: Math.round(overallScore),
        breakdown: {
            velocityScore: Math.round(velocityScore),
            qualityScore: Math.round(qualityScore),
            collaborationScore: Math.round(collaborationScore),
            consistencyScore: Math.round(consistencyScore)
        },
        cycleTime: {
            average: 0,
            median: 0,
            percentile90: 0,
            trend: "stable"
        },
        workloadDistribution: {
            balanced: true,
            giniCoefficient: 0,
            members: project.members.map(m => ({
                userId: m._id,
                name: `${m.firstName} ${m.lastName}`,
                currentLoad: 0,
                loadPercentage: 0,
                isOverloaded: false,
                isUnderloaded: false
            })),
            recommendations: []
        }
    };
};

// 8. Forecast & Predictions
const getForecastService = async (projectId, userId) => {
    const project = await verifyProjectAccess(projectId, userId);

    const now = new Date();
    const estimatedDate = project.endDate || new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    return {
        forecast: {
            estimatedCompletionDate: estimatedDate,
            confidenceLevel: 50,
            basedOn: {
                currentVelocity: 0,
                remainingTasks: 0,
                historicalAccuracy: 0
            },
            scenarios: {
                optimistic: new Date(estimatedDate.getTime() - 7 * 24 * 60 * 60 * 1000),
                realistic: estimatedDate,
                pessimistic: new Date(estimatedDate.getTime() + 14 * 24 * 60 * 60 * 1000)
            }
        }
    };
};

// 9. Risk Assessment
const getRiskAssessmentService = async (projectId, userId) => {
    const project = await verifyProjectAccess(projectId, userId);

    const factors = [];
    let riskScore = 0;

    // Check deadline proximity
    if (project.endDate) {
        const daysRemaining = Math.ceil((project.endDate - new Date()) / (1000 * 60 * 60 * 24));
        if (daysRemaining < 7 && daysRemaining > 0) {
            factors.push({
                factor: "deadline_approaching",
                severity: "high",
                impact: 30,
                description: `Project deadline is in ${daysRemaining} days`,
                mitigation: "Prioritize critical tasks and consider deadline extension"
            });
            riskScore += 30;
        }
    }

    // Check team size
    if (project.members.length < 2) {
        factors.push({
            factor: "small_team",
            severity: "medium",
            impact: 20,
            description: "Project has only one member",
            mitigation: "Add more team members to distribute workload"
        });
        riskScore += 20;
    }

    const overallRisk = riskScore < 25 ? "low" : riskScore < 50 ? "medium" : riskScore < 75 ? "high" : "critical";

    return {
        overallRisk,
        riskScore: Math.min(riskScore, 100),
        factors,
        recommendations: factors.map(f => f.mitigation)
    };
};

// 10. Trend Analysis
const getTrendAnalysisService = async (projectId, userId) => {
    const project = await verifyProjectAccess(projectId, userId);

    // TODO: Calculate from historical task data
    return {
        completionRate: {
            current: 0,
            lastWeek: 0,
            lastMonth: 0,
            trend: "stable",
            changePercentage: 0
        },
        velocity: {
            current: 0,
            lastWeek: 0,
            trend: "stable",
            changePercentage: 0
        },
        teamActivity: {
            current: project.members.length,
            lastWeek: project.members.length,
            trend: "stable"
        }
    };
};

// 11. Member-Specific Analytics
const getMemberAnalyticsService = async (projectId, userId, memberId) => {
    const project = await verifyProjectAccess(projectId, userId);

    if (!mongoose.Types.ObjectId.isValid(memberId)) {
        throw new APIError(400, "Invalid member ID");
    }

    const member = project.members.find(m => m._id.toString() === memberId.toString());
    if (!member) {
        throw new APIError(404, "Member not found in this project");
    }

    // TODO: Query member's tasks
    return {
        member: {
            id: member._id,
            name: `${member.firstName} ${member.lastName}`,
            email: member.email,
            isCreator: member._id.toString() === project.createdBy._id.toString()
        },
        stats: {
            totalAssigned: 0,
            completed: 0,
            inProgress: 0,
            toDo: 0,
            overdue: 0,
            completionRate: 0,
            averageCompletionTime: 0,
            productivityScore: 0
        },
        recentActivity: [],
        performance: {
            rank: 1,
            percentile: 100,
            comparedToTeamAverage: 0
        }
    };
};

// 12. Period Comparison
const getPeriodComparisonService = async (projectId, userId, period = 'week') => {
    const project = await verifyProjectAccess(projectId, userId);

    const validPeriods = ['week', 'month'];
    if (!validPeriods.includes(period)) {
        throw new APIError(400, "Invalid period. Use 'week' or 'month'");
    }

    // TODO: Calculate from task data
    const comparison = {
        period,
        current: {
            tasksCompleted: 0,
            tasksCreated: 0,
            velocity: 0,
            activeMembers: project.members.length
        },
        previous: {
            tasksCompleted: 0,
            tasksCreated: 0,
            velocity: 0,
            activeMembers: project.members.length
        },
        changes: {
            tasksCompleted: { value: 0, percentage: 0, trend: "stable" },
            tasksCreated: { value: 0, percentage: 0, trend: "stable" },
            velocity: { value: 0, percentage: 0, trend: "stable" },
            activeMembers: { value: 0, percentage: 0, trend: "stable" }
        }
    };

    return comparison;
};

export {
    getOverviewAnalyticsService,
    getHealthMetricsService,
    getTeamPerformanceService,
    getDailyBreakdownService,
    getWeeklyBreakdownService,
    getMonthlyBreakdownService,
    getEfficiencyMetricsService,
    getForecastService,
    getRiskAssessmentService,
    getTrendAnalysisService,
    getMemberAnalyticsService,
    getPeriodComparisonService
};
