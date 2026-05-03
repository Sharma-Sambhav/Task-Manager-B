import { Project } from "../models/project.models.js";
import { Task } from "../models/task.models.js";
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

    // Get actual task statistics
    const tasks = await Task.find({ project: projectId });
    
    const taskStats = {
        total: tasks.length,
        byStatus: {
            toDo: tasks.filter(t => t.status === 'to_do').length,
            inProgress: tasks.filter(t => t.status === 'in_progress').length,
            done: tasks.filter(t => t.status === 'done').length
        },
        byPriority: {
            low: tasks.filter(t => t.priority === 'low').length,
            medium: tasks.filter(t => t.priority === 'medium').length,
            high: tasks.filter(t => t.priority === 'high').length
        },
        overdue: tasks.filter(t => t.isOverdue).length
    };

    const completionRate = taskStats.total > 0 ? 
        Math.round((taskStats.byStatus.done / taskStats.total) * 100) : 0;

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
        completionRate: `${completionRate}%`,
        progress: `${completionRate}%`
    };

    return analytics;
};

// 2. Project Health Metrics
const getHealthMetricsService = async (projectId, userId) => {
    const project = await verifyProjectAccess(projectId, userId);

    // Get actual task data
    const tasks = await Task.find({ project: projectId });
    const now = new Date();
    const daysRemaining = project.endDate ? Math.ceil((project.endDate - now) / (1000 * 60 * 60 * 24)) : null;

    const taskMetrics = {
        total: tasks.length,
        completed: tasks.filter(t => t.status === 'done').length,
        inProgress: tasks.filter(t => t.status === 'in_progress').length,
        toDo: tasks.filter(t => t.status === 'to_do').length,
        overdue: tasks.filter(t => t.isOverdue).length,
        completionRate: tasks.length > 0 ? Math.round((tasks.filter(t => t.status === 'done').length / tasks.length) * 100) : 0,
        onTimeDeliveryRate: 0 // TODO: Calculate based on due dates
    };

    // Calculate health scores
    const completionHealth = taskMetrics.completionRate;
    const timelineHealth = daysRemaining !== null ? (daysRemaining > 0 ? Math.min(100, (daysRemaining / 30) * 100) : 0) : 100;
    const teamHealth = Math.min(100, (project.members.length / 3) * 100); // Optimal team size is 3+
    const overallHealth = Math.round((completionHealth + timelineHealth + teamHealth) / 3);

    // Calculate risk score
    let riskScore = 0;
    if (taskMetrics.overdue > 0) riskScore += (taskMetrics.overdue / taskMetrics.total) * 40;
    if (daysRemaining !== null && daysRemaining < 7) riskScore += 30;
    if (project.members.length < 2) riskScore += 20;
    if (taskMetrics.completionRate < 50) riskScore += 20;

    const health = {
        projectInfo: {
            name: project.name,
            status: project.status,
            startDate: project.startDate,
            endDate: project.endDate,
            daysRemaining
        },
        taskMetrics,
        healthScore: {
            overall: overallHealth,
            completionHealth,
            timelineHealth,
            teamHealth
        },
        riskScore: Math.min(Math.round(riskScore), 100),
        isOnTrack: riskScore < 50 && completionHealth > 30,
        alerts: []
    };

    // Add alerts based on conditions
    if (taskMetrics.overdue > 0) {
        health.alerts.push({
            type: "error",
            message: `${taskMetrics.overdue} task(s) are overdue and require immediate attention`
        });
    }

    if (daysRemaining !== null && daysRemaining < 7 && daysRemaining > 0) {
        health.alerts.push({
            type: "warning",
            message: `Project deadline is in ${daysRemaining} days`
        });
    }

    if (daysRemaining !== null && daysRemaining < 0) {
        health.alerts.push({
            type: "error",
            message: "Project has exceeded its deadline"
        });
    }

    if (project.members.length < 2) {
        health.alerts.push({
            type: "info",
            message: "Consider adding more team members to distribute workload"
        });
    }

    if (taskMetrics.total === 0) {
        health.alerts.push({
            type: "info",
            message: "No tasks have been created yet. Start by defining project objectives."
        });
    }

    return health;
};

// 3. Team Performance Analytics
const getTeamPerformanceService = async (projectId, userId) => {
    const project = await verifyProjectAccess(projectId, userId);

    // Get all tasks for the project
    const tasks = await Task.find({ project: projectId })
        .populate('assignedTo', 'firstName lastName email')
        .populate('createdBy', 'firstName lastName email');

    // Calculate member performance
    const memberPerformance = project.members.map(member => {
        const memberTasks = tasks.filter(t => 
            t.assignedTo && t.assignedTo._id.toString() === member._id.toString()
        );
        
        const completed = memberTasks.filter(t => t.status === 'done').length;
        const inProgress = memberTasks.filter(t => t.status === 'in_progress').length;
        const toDo = memberTasks.filter(t => t.status === 'to_do').length;
        const overdue = memberTasks.filter(t => t.isOverdue).length;
        const totalAssigned = memberTasks.length;
        
        const completionRate = totalAssigned > 0 ? Math.round((completed / totalAssigned) * 100) : 0;
        const productivityScore = Math.max(0, completionRate - (overdue * 10)); // Penalty for overdue tasks
        
        // Calculate recent activity
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        const tasksCompletedThisWeek = memberTasks.filter(t => 
            t.status === 'done' && t.completedAt && new Date(t.completedAt) >= weekAgo
        ).length;
        
        const tasksCompletedThisMonth = memberTasks.filter(t => 
            t.status === 'done' && t.completedAt && new Date(t.completedAt) >= monthAgo
        ).length;
        
        const lastActivity = memberTasks
            .filter(t => t.updatedAt)
            .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))[0];
        
        return {
            userId: member._id,
            name: `${member.firstName} ${member.lastName}`,
            email: member.email,
            isCreator: member._id.toString() === project.createdBy._id.toString(),
            stats: {
                totalAssigned,
                completed,
                inProgress,
                toDo,
                overdue,
                completionRate,
                averageCompletionTime: 0, // TODO: Calculate from task completion times
                onTimeDeliveryRate: 0, // TODO: Calculate from due dates
                productivityScore,
                tasksCompletedThisWeek,
                tasksCompletedThisMonth,
                lastActivityDate: lastActivity ? lastActivity.updatedAt : null,
                isActive: tasksCompletedThisWeek > 0 || (lastActivity && new Date(lastActivity.updatedAt) >= weekAgo)
            }
        };
    });

    // Calculate team velocity
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    
    const lastWeekStart = new Date(weekStart);
    lastWeekStart.setDate(weekStart.getDate() - 7);
    
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const currentWeekCompleted = tasks.filter(t => 
        t.status === 'done' && t.completedAt && new Date(t.completedAt) >= weekStart
    ).length;
    
    const currentWeekCreated = tasks.filter(t => 
        new Date(t.createdAt) >= weekStart
    ).length;
    
    const currentWeekInProgress = tasks.filter(t => 
        t.status === 'in_progress'
    ).length;
    
    const lastWeekCompleted = tasks.filter(t => 
        t.status === 'done' && t.completedAt && 
        new Date(t.completedAt) >= lastWeekStart && new Date(t.completedAt) < weekStart
    ).length;
    
    const lastWeekCreated = tasks.filter(t => 
        new Date(t.createdAt) >= lastWeekStart && new Date(t.createdAt) < weekStart
    ).length;
    
    const currentMonthCompleted = tasks.filter(t => 
        t.status === 'done' && t.completedAt && new Date(t.completedAt) >= monthStart
    ).length;
    
    const currentMonthCreated = tasks.filter(t => 
        new Date(t.createdAt) >= monthStart
    ).length;
    
    // Calculate velocity trend
    let velocityTrend = "stable";
    if (currentWeekCompleted > lastWeekCompleted) velocityTrend = "increasing";
    else if (currentWeekCompleted < lastWeekCompleted) velocityTrend = "decreasing";
    
    const teamVelocity = {
        currentWeek: {
            tasksCompleted: currentWeekCompleted,
            tasksCreated: currentWeekCreated,
            tasksInProgress: currentWeekInProgress
        },
        lastWeek: {
            tasksCompleted: lastWeekCompleted,
            tasksCreated: lastWeekCreated
        },
        currentMonth: {
            tasksCompleted: currentMonthCompleted,
            tasksCreated: currentMonthCreated
        },
        averageWeeklyCompletion: Math.round((currentWeekCompleted + lastWeekCompleted) / 2),
        velocityTrend,
        burndownRate: currentWeekInProgress > 0 ? Math.round((currentWeekCompleted / currentWeekInProgress) * 100) : 0
    };
    
    // Find top performer
    const activeMembers = memberPerformance.filter(m => m.stats.isActive).length;
    const topPerformer = memberPerformance
        .filter(m => m.stats.totalAssigned > 0)
        .sort((a, b) => b.stats.productivityScore - a.stats.productivityScore)[0];
    
    const averageProductivity = memberPerformance.length > 0 ? 
        Math.round(memberPerformance.reduce((sum, m) => sum + m.stats.productivityScore, 0) / memberPerformance.length) : 0;

    return {
        memberPerformance,
        teamVelocity,
        summary: {
            totalMembers: project.members.length,
            activeMembers,
            topPerformer: topPerformer ? {
                userId: topPerformer.userId,
                name: topPerformer.name,
                score: topPerformer.stats.productivityScore
            } : null,
            averageProductivity
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

    // Get tasks with completion data
    const tasks = await Task.find({ project: projectId });
    
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    
    // Current completion rate
    const currentCompletionRate = tasks.length > 0 ? 
        Math.round((tasks.filter(t => t.status === 'done').length / tasks.length) * 100) : 0;
    
    // Last week completion rate (tasks that existed a week ago)
    const tasksExistingLastWeek = tasks.filter(t => new Date(t.createdAt) <= weekAgo);
    const lastWeekCompletionRate = tasksExistingLastWeek.length > 0 ? 
        Math.round((tasksExistingLastWeek.filter(t => t.status === 'done').length / tasksExistingLastWeek.length) * 100) : 0;
    
    // Last month completion rate
    const tasksExistingLastMonth = tasks.filter(t => new Date(t.createdAt) <= monthAgo);
    const lastMonthCompletionRate = tasksExistingLastMonth.length > 0 ? 
        Math.round((tasksExistingLastMonth.filter(t => t.status === 'done').length / tasksExistingLastMonth.length) * 100) : 0;
    
    // Velocity calculations
    const currentWeekCompleted = tasks.filter(t => 
        t.status === 'done' && t.completedAt && new Date(t.completedAt) >= weekAgo
    ).length;
    
    const lastWeekCompleted = tasks.filter(t => 
        t.status === 'done' && t.completedAt && 
        new Date(t.completedAt) >= twoWeeksAgo && new Date(t.completedAt) < weekAgo
    ).length;
    
    // Determine trends
    const completionTrend = currentCompletionRate > lastWeekCompletionRate ? "up" : 
                           currentCompletionRate < lastWeekCompletionRate ? "down" : "stable";
    
    const velocityTrend = currentWeekCompleted > lastWeekCompleted ? "up" : 
                          currentWeekCompleted < lastWeekCompleted ? "down" : "stable";
    
    const completionChange = lastWeekCompletionRate > 0 ? 
        Math.round(((currentCompletionRate - lastWeekCompletionRate) / lastWeekCompletionRate) * 100) : 0;
    
    const velocityChange = lastWeekCompleted > 0 ? 
        Math.round(((currentWeekCompleted - lastWeekCompleted) / lastWeekCompleted) * 100) : 0;

    return {
        completionRate: {
            current: currentCompletionRate,
            lastWeek: lastWeekCompletionRate,
            lastMonth: lastMonthCompletionRate,
            trend: completionTrend,
            changePercentage: Math.abs(completionChange)
        },
        velocity: {
            current: currentWeekCompleted,
            lastWeek: lastWeekCompleted,
            trend: velocityTrend,
            changePercentage: Math.abs(velocityChange)
        },
        teamActivity: {
            current: project.members.length,
            lastWeek: project.members.length, // TODO: Track member additions/removals
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
