import { asyncHandler } from "../utils/asyncHandler.js";
import { APIError } from "../utils/APIerror.js";
import { APIresponse } from "../utils/APIresponse.js";
import {
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
} from "../services/analytics.service.js";

// Overview Analytics
const getOverviewAnalytics = asyncHandler(async (req, res) => {
    try {
        const { projectId } = req.params;

        const analytics = await getOverviewAnalyticsService(projectId, req.user._id);

        return res
            .status(200)
            .json(new APIresponse(200, analytics, "Overview analytics fetched successfully"));
    } catch (error) {
        console.log('File: analytics.controller.js', 'Line 28:', error);
        throw new APIError(error.statusCode || 500, error?.message || "Failed to fetch overview analytics");
    }
});

// Health Metrics
const getHealthMetrics = asyncHandler(async (req, res) => {
    try {
        const { projectId } = req.params;

        const health = await getHealthMetricsService(projectId, req.user._id);

        return res
            .status(200)
            .json(new APIresponse(200, health, "Health metrics fetched successfully"));
    } catch (error) {
        console.log('File: analytics.controller.js', 'Line 45:', error);
        throw new APIError(error.statusCode || 500, error?.message || "Failed to fetch health metrics");
    }
});

// Team Performance
const getTeamPerformance = asyncHandler(async (req, res) => {
    try {
        const { projectId } = req.params;

        const performance = await getTeamPerformanceService(projectId, req.user._id);

        return res
            .status(200)
            .json(new APIresponse(200, performance, "Team performance fetched successfully"));
    } catch (error) {
        console.log('File: analytics.controller.js', 'Line 62:', error);
        throw new APIError(error.statusCode || 500, error?.message || "Failed to fetch team performance");
    }
});

// Daily Breakdown
const getDailyBreakdown = asyncHandler(async (req, res) => {
    try {
        const { projectId } = req.params;
        const { days = 30 } = req.query;

        const breakdown = await getDailyBreakdownService(projectId, req.user._id, days);

        return res
            .status(200)
            .json(new APIresponse(200, breakdown, "Daily breakdown fetched successfully"));
    } catch (error) {
        console.log('File: analytics.controller.js', 'Line 80:', error);
        throw new APIError(error.statusCode || 500, error?.message || "Failed to fetch daily breakdown");
    }
});

// Weekly Breakdown
const getWeeklyBreakdown = asyncHandler(async (req, res) => {
    try {
        const { projectId } = req.params;
        const { weeks = 12 } = req.query;

        const breakdown = await getWeeklyBreakdownService(projectId, req.user._id, weeks);

        return res
            .status(200)
            .json(new APIresponse(200, breakdown, "Weekly breakdown fetched successfully"));
    } catch (error) {
        console.log('File: analytics.controller.js', 'Line 98:', error);
        throw new APIError(error.statusCode || 500, error?.message || "Failed to fetch weekly breakdown");
    }
});

// Monthly Breakdown
const getMonthlyBreakdown = asyncHandler(async (req, res) => {
    try {
        const { projectId } = req.params;

        const breakdown = await getMonthlyBreakdownService(projectId, req.user._id);

        return res
            .status(200)
            .json(new APIresponse(200, breakdown, "Monthly breakdown fetched successfully"));
    } catch (error) {
        console.log('File: analytics.controller.js', 'Line 115:', error);
        throw new APIError(error.statusCode || 500, error?.message || "Failed to fetch monthly breakdown");
    }
});

// Efficiency Metrics
const getEfficiencyMetrics = asyncHandler(async (req, res) => {
    try {
        const { projectId } = req.params;

        const efficiency = await getEfficiencyMetricsService(projectId, req.user._id);

        return res
            .status(200)
            .json(new APIresponse(200, efficiency, "Efficiency metrics fetched successfully"));
    } catch (error) {
        console.log('File: analytics.controller.js', 'Line 132:', error);
        throw new APIError(error.statusCode || 500, error?.message || "Failed to fetch efficiency metrics");
    }
});

// Forecast
const getForecast = asyncHandler(async (req, res) => {
    try {
        const { projectId } = req.params;

        const forecast = await getForecastService(projectId, req.user._id);

        return res
            .status(200)
            .json(new APIresponse(200, forecast, "Forecast fetched successfully"));
    } catch (error) {
        console.log('File: analytics.controller.js', 'Line 149:', error);
        throw new APIError(error.statusCode || 500, error?.message || "Failed to fetch forecast");
    }
});

// Risk Assessment
const getRiskAssessment = asyncHandler(async (req, res) => {
    try {
        const { projectId } = req.params;

        const risks = await getRiskAssessmentService(projectId, req.user._id);

        return res
            .status(200)
            .json(new APIresponse(200, risks, "Risk assessment fetched successfully"));
    } catch (error) {
        console.log('File: analytics.controller.js', 'Line 166:', error);
        throw new APIError(error.statusCode || 500, error?.message || "Failed to fetch risk assessment");
    }
});

// Trend Analysis
const getTrendAnalysis = asyncHandler(async (req, res) => {
    try {
        const { projectId } = req.params;

        const trends = await getTrendAnalysisService(projectId, req.user._id);

        return res
            .status(200)
            .json(new APIresponse(200, trends, "Trend analysis fetched successfully"));
    } catch (error) {
        console.log('File: analytics.controller.js', 'Line 183:', error);
        throw new APIError(error.statusCode || 500, error?.message || "Failed to fetch trend analysis");
    }
});

// Member Analytics
const getMemberAnalytics = asyncHandler(async (req, res) => {
    try {
        const { projectId, memberId } = req.params;

        const analytics = await getMemberAnalyticsService(projectId, req.user._id, memberId);

        return res
            .status(200)
            .json(new APIresponse(200, analytics, "Member analytics fetched successfully"));
    } catch (error) {
        console.log('File: analytics.controller.js', 'Line 200:', error);
        throw new APIError(error.statusCode || 500, error?.message || "Failed to fetch member analytics");
    }
});

// Period Comparison
const getPeriodComparison = asyncHandler(async (req, res) => {
    try {
        const { projectId } = req.params;
        const { period = 'week' } = req.query;

        const comparison = await getPeriodComparisonService(projectId, req.user._id, period);

        return res
            .status(200)
            .json(new APIresponse(200, comparison, "Period comparison fetched successfully"));
    } catch (error) {
        console.log('File: analytics.controller.js', 'Line 218:', error);
        throw new APIError(error.statusCode || 500, error?.message || "Failed to fetch period comparison");
    }
});

export {
    getOverviewAnalytics,
    getHealthMetrics,
    getTeamPerformance,
    getDailyBreakdown,
    getWeeklyBreakdown,
    getMonthlyBreakdown,
    getEfficiencyMetrics,
    getForecast,
    getRiskAssessment,
    getTrendAnalysis,
    getMemberAnalytics,
    getPeriodComparison
};
