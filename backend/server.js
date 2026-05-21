const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  process.env.FRONTEND_URL, // Set this to your Vercel URL in Render env vars
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS policy: Origin ${origin} not allowed`));
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' })); // Increased for profile pic base64

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.error("MongoDB connection error:", err));

app.use("/api/districts", require("./routes/districtRoutes"));
app.use("/api/talukas", require("./routes/talukaRoutes"));
app.use("/api/villages", require("./routes/villageRoutes"));
app.use("/api/roads", require("./routes/roadRoutes"));
app.use("/api/lulc", require("./routes/lulcRoutes"));
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/admin", require("./routes/adminRoutes")); // New admin routes
app.use("/api/analysis", require("./routes/analysisRoutes")); // Analysis routes

const initAdmin = require("./initAdmin");

const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  console.log(`Server Running on port ${PORT}`);
  await initAdmin(); // Ensure singleton admin is created
});
