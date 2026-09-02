import express from "express";
import cors from "cors";
import batchRoutes from "./routes/batchRoutes.js";
import resultRoutes from "./routes/resultRoutes.js";
import { ApiError } from "./utils/ApiError.js";

const app = express();

// Enable CORS for frontend origin (e.g. http://localhost:5173)
app.use(
  cors({
    origin: process.env.CLIENT_URL || true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mount API routes under /api
app.use("/api", batchRoutes);
app.use("/api", resultRoutes);

// Healthcheck endpoint
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Global Error Handler Middleware using ApiError standard
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  const errors = err.errors || [];

  return res.status(statusCode).json({
    statusCode,
    success: false,
    message,
    errors,
    data: null,
  });
});

export default app;
