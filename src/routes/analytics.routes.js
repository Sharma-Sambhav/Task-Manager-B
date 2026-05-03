import { Router } from "express";
import {
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
} from "../controllers/analytics.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// All routes require authentication
router.use(verifyJWT);

// Analytics endpoints
router.route("/:projectId/analytics/overview").get(getOverviewAnalytics);
router.route("/:projectId/analytics/health").get(getHealthMetrics);
router.route("/:projectId/analytics/team-performance").get(getTeamPerformance);
router.route("/:projectId/analytics/daily").get(getDailyBreakdown);
router.route("/:projectId/analytics/weekly").get(getWeeklyBreakdown);
router.route("/:projectId/analytics/monthly").get(getMonthlyBreakdown);
router.route("/:projectId/analytics/efficiency").get(getEfficiencyMetrics);
router.route("/:projectId/analytics/forecast").get(getForecast);
router.route("/:projectId/analytics/risks").get(getRiskAssessment);
router.route("/:projectId/analytics/trends").get(getTrendAnalysis);
router.route("/:projectId/analytics/member/:memberId").get(getMemberAnalytics);
router.route("/:projectId/analytics/compare").get(getPeriodComparison);

export default router;
