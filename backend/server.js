/** @format */

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const connectDB = require("./config/database");

const app = express();

app.set("trust proxy", 1);

// Configure allowed frontend origins
const allowed = [
  process.env.FRONTEND_URL,
  ...(process.env.EXTRA_ORIGINS || "").split(","),
]
  .map((origin) => origin && origin.trim().replace(/\/+$/, ""))
  .filter(Boolean);

app.use(helmet());

app.use(
  cors({
    origin: (origin, callback) => {
      const normalizedOrigin = origin ? origin.replace(/\/+$/, "") : "";

      if (!origin || allowed.includes(normalizedOrigin)) {
        return callback(null, true);
      }

      console.error("Blocked CORS origin:", origin);
      return callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json({ limit: "10kb" }));

app.use(
  "/api",
  rateLimit({
    windowMs: 60_000,
    max: 120,
  }),
);

// Health check
app.get("/", (_req, res) => {
  res.json({ status: "ok", service: "student-api" });
});

// Student API routes
app.use("/api/students", require("./routes/studentRoutes"));

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Error handler
app.use((err, _req, res, _next) => {
  const isCorsError = err.message === "Not allowed by CORS";

  res.status(isCorsError ? 403 : 500).json({
    success: false,
    message: isCorsError ? "Origin not allowed" : "Server error",
  });
});

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`API running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Startup failed:", error.message);
    process.exit(1);
  });
