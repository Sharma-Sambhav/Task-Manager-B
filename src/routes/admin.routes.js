import { Router } from "express";
import { getPendingUsers, approveUser, rejectUser, getAllUsers } from "../controllers/admin.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { verifyAdmin } from "../middlewares/admin.middleware.js";

const router = Router();

// All admin routes require authentication and admin role
router.use(verifyJWT, verifyAdmin);

router.route("/users/pending").get(getPendingUsers);
router.route("/users").get(getAllUsers);
router.route("/users/:userId/approve").patch(approveUser);
router.route("/users/:userId/reject").patch(rejectUser);

export default router;
