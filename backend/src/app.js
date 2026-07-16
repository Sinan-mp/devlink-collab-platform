  const express = require("express");
  const cors = require("cors");
  require("dotenv").config();

  const app = express();

  // ======================
  // IMPORT ROUTES
  // ======================
  const fileRoutes = require("./routes/fileRoutes");
  const projectRoutes = require("./routes/projectRoutes");
  const testRoutes = require("./routes/testRoutes");
  const authRoutes = require("./routes/authRoutes");
  const userRoutes = require("./routes/userRoutes");
  const pointsRoutes = require("./routes/pointsRoutes");
  const aiRoutes = require("./routes/aiRoutes");
  const taskRoutes = require("./routes/taskRoutes");
  const commitRoutes = require("./routes/commitRoutes");
  const notificationRoutes = require("./routes/notificationRoutes");

  // ======================
  // MIDDLEWARE
  // ======================

  app.use(cors());
  app.use(express.json());
  app.use("/api/projects", projectRoutes);


  // ======================
  // ROOT TEST
  // ======================

  app.get("/", (req, res) => {
    res.send("DevLink API running successfully 🚀");
  });

  // ======================
  // API ROUTES
  // ======================

  app.use("/api/test", testRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/points", pointsRoutes);
  app.use("/api/ai", aiRoutes);
  app.use("/api/tasks", taskRoutes);
  app.use("/api/files", fileRoutes);
  app.use("/api/commits", commitRoutes);
  app.use("/api/notifications", notificationRoutes);
  // PROJECT ROUTES
  app.use("/api", projectRoutes);

  // ======================
  // 404 HANDLER (OPTIONAL)
  // ======================

  app.use((req, res) => {
    res.status(404).json({ message: "Route not found" });
  });

  module.exports = app;
