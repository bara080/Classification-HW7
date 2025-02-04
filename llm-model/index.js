import express from "express";
import morgan from "morgan";
import dotenv from "dotenv";
import cors from "cors";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import mongooseSanitizer from "mongoose-sanitize";
import hpp from "hpp";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

if (!PORT) {
    console.error("ERROR: Missing PORT in environment variables.");
    process.exit(1);
}

// Security Middleware
app.use(helmet());
app.use(mongooseSanitizer());
app.use("/api",limiter);
app.use(hpp());
// Rate Limiting (Protects against brute-force attacks)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 100, // Limit each IP to 100 requests per window
    message: { status: "error", message: "Too many requests, please try again later." }
});
app.use(limiter);

// Logging Middleware
if (process.env.NODE_ENV === "development") {
    app.use(morgan("dev"));
}

// CORS Middleware (Allows frontend apps to access API)
app.use(cors());

// Body Parser Middleware
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// Define API Routes (Example)
app.get("/api", (req, res) => {
    res.json({ message: "API is running!" });
});

// Catch-All Route for Non-API Requests (Optional)
app.get("/", (req, res) => {
    res.send("<h1>Welcome to the Express Server</h1><p>Use <code>/api</code> for API requests.</p>");
});

// 404 Route Handler (MUST BE BEFORE ERROR HANDLER)
app.use("*", (req, res) => {
    res.status(404).json({
        status: "error",
        message: `Route ${req.originalUrl} not found!`,
    });
});

// Global Error Handler (MUST BE AT THE END)
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({
        status: "error",
        message: err.message || "Internal server error",
        ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    });
});

// Start Server
const server = app.listen(PORT, () => {
    console.log(`Server is running at ${PORT} in ${process.env.NODE_ENV || "production"} mode`);
});

// Graceful Shutdown Handling (SIGINT & SIGTERM)
const shutdown = (signal) => {
    console.log(`${signal} received. Shutting down gracefully...`);
    server.close(() => {
        console.log("Server closed.");
        process.exit(0);
    });
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
