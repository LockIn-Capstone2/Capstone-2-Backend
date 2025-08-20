require("dotenv").config();
const express = require("express");
const morgan = require("morgan");
const path = require("path");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const app = express();
const apiRouter = require("./api");
const { db } = require("./database");
const cors = require("cors");
const { Model } = require("sequelize");
const PORT = process.env.PORT || 8080;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
const { router: authRouter, authenticateJWT } = require("./auth");
const calendarRouter = require("./api/calendar");

// body parser middleware
app.use(express.json());
app.use(
  cors({
    origin: [
      FRONTEND_URL,
      "http://localhost:3000",
      "https://lock-in-front-end.vercel.app",
    ],
    credentials: true,
  })
);

// cookie parser middleware
app.use(cookieParser());

app.use(morgan("dev")); // logging middleware
app.use(express.static(path.join(__dirname, "public"))); // serve static files from public folder
app.use("/auth", authRouter); // mount auth router (no auth required)
app.use("/api/calendar", authenticateJWT, calendarRouter); // mount calendar router FIRST
app.use("/api", authenticateJWT, apiRouter); // mount main api router SECOND

// Route to serve the chart page
app.get("/chart", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "chart.html"));
});

// error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.sendStatus(500);
});

const runApp = async () => {
  try {
    await db.sync();
    console.log("✅ Connected to the database");
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
    });
  } catch (err) {
    console.error("❌ Unable to connect to the database:", err);
  }
};

runApp();

module.exports = app;
