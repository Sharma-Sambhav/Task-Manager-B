import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";


const app = express();

app.use(
  cors({
    origin: process.env.NODE_ENV === "production" ? "https://taskmanager.sambhav.click" : "http://localhost:3000",
    credentials: true,
  })
);
app.use(
  express.json({
    limit: "10mb",
  })
);
app.use(
  express.urlencoded({
    extended: true,
    limit: "10mb",
  })
);
app.use(express.static("public"));
app.use(cookieParser());


// Import Routes
import userRouter from "./routes/user.routes.js";
import adminRouter from "./routes/admin.routes.js";
import projectRouter from "./routes/project.routes.js";
import analyticsRouter from "./routes/analytics.routes.js";
import taskRouter from "./routes/task.routes.js";

// Register Routes
app.use("/api/v1/user", userRouter);
app.use("/api/v1/admin", adminRouter);
app.use("/api/v1/projects", projectRouter);
app.use("/api/v1/projects", analyticsRouter);
app.use("/api/v1", taskRouter);

// 404 handler - must be after all routes
import notFound from "./middlewares/notFound.middleware.js";
app.use(notFound);

// Global error handler - must be last
import errorHandler from "./middlewares/errorHandler.middleware.js";
app.use(errorHandler);


export default app 
 
