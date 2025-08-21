const express = require("express");
const router = express.Router();
const { Op } = require("sequelize");
const { Tasks } = require("../database");

// ──────────────────────────────────────────────────────────────
// NOTE: These routes assume app.js has:
// app.use("/api", authenticateJWT, apiRouter)
// so req.user is always available here.
// ──────────────────────────────────────────────────────────────

// Middleware to ensure user is authenticated (extra safety check)
const ensureAuthenticated = (req, res, next) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
};

// Apply authentication check to all routes
router.use(ensureAuthenticated);

// GET all tasks for the logged-in user
router.get("/tasks", async (req, res) => {
  try {
    console.log("🔍 Fetching tasks for user:", req.user.id);

    const tasks = await Tasks.findAll({
      where: { user_id: req.user.id },
      order: [["createdAt", "DESC"]],
    });

    console.log(`✅ Found ${tasks.length} tasks for user ${req.user.id}`);
    res.json(tasks);
  } catch (error) {
    console.error("❌ Error fetching tasks:", error);
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

// POST a new task for the logged-in user
router.post("/tasks", async (req, res) => {
  try {
    const { className, assignment, description, status, deadline, priority } =
      req.body;

    console.log("📝 Creating task for user:", req.user.id, "Data:", req.body);

    // Validate required fields
    if (!className || !assignment) {
      return res.status(400).json({
        error: "Class name and assignment are required",
      });
    }

    const newTask = await Tasks.create({
      className,
      assignment,
      description,
      status: status || "pending",
      deadline,
      priority: priority || "medium",
      user_id: req.user.id, // ← use the ID from JWT
    });

    console.log("✅ Task created successfully:", newTask.id);
    res.status(201).json(newTask);
  } catch (error) {
    console.error("❌ Error creating task:", error);
    res.status(500).json({ error: "Failed to create task" });
  }
});

// UPDATE a task by ID (must belong to the logged-in user)
router.put("/tasks/:taskId", async (req, res) => {
  try {
    const { taskId } = req.params;
    const { className, assignment, description, status, deadline, priority } =
      req.body;

    console.log(`🔄 Updating task ${taskId} for user:`, req.user.id);

    // Ownership check baked into the WHERE
    const task = await Tasks.findOne({
      where: { id: taskId, user_id: req.user.id },
    });

    if (!task) {
      console.log(`❌ Task ${taskId} not found for user ${req.user.id}`);
      return res.status(404).json({ error: "Task not found" });
    }

    await task.update({
      className,
      assignment,
      description,
      status,
      deadline,
      priority,
    });
    console.log(`✅ Task ${taskId} updated successfully`);
    res.json(task);
  } catch (error) {
    console.error("❌ Error updating task:", error);
    res.status(500).json({ error: "Failed to update task" });
  }
});

// DELETE a task by ID (must belong to the logged-in user)
router.delete("/tasks/:taskId", async (req, res) => {
  try {
    const { taskId } = req.params;

    console.log(`🗑️ Deleting task ${taskId} for user:`, req.user.id);

    const task = await Tasks.findOne({
      where: { id: taskId, user_id: req.user.id },
    });

    if (!task) {
      console.log(`❌ Task ${taskId} not found for user ${req.user.id}`);
      return res.status(404).json({ error: "Task not found for this user" });
    }

    await task.destroy();
    console.log(`✅ Task ${taskId} deleted successfully`);
    res.json({ message: "Task deleted successfully", deletedTask: task });
  } catch (error) {
    console.error("❌ Error deleting task:", error);
    res.status(500).json({ error: "Failed to delete task" });
  }
});

// PATCH status only (must belong to the logged-in user)
router.patch("/tasks/:taskId", async (req, res) => {
  try {
    const { taskId } = req.params;
    const { status } = req.body;

    console.log(
      `🔄 Updating status for task ${taskId} to "${status}" for user:`,
      req.user.id
    );

    if (!status) {
      return res.status(400).json({ error: "Status is required" });
    }

    const task = await Tasks.findOne({
      where: { id: taskId, user_id: req.user.id },
    });

    if (!task) {
      console.log(`❌ Task ${taskId} not found for user ${req.user.id}`);
      return res.status(404).json({ error: "Task not found" });
    }

    await task.update({ status });
    console.log(`✅ Task ${taskId} status updated to "${status}"`);
    res.json(task);
  } catch (error) {
    console.error("❌ Error updating task status:", error);
    res.status(500).json({ error: "Failed to update task status" });
  }
});

// FILTER: by status
router.get("/tasks/status/:statusTask", async (req, res) => {
  try {
    const { statusTask } = req.params;

    console.log(
      `🔍 Filtering tasks by status "${statusTask}" for user:`,
      req.user.id
    );

    const filteredTasks = await Tasks.findAll({
      where: { user_id: req.user.id, status: statusTask },
      order: [["createdAt", "DESC"]],
    });

    console.log(
      `✅ Found ${filteredTasks.length} tasks with status "${statusTask}"`
    );
    res.json(filteredTasks);
  } catch (error) {
    console.error("❌ Error filtering by status:", error);
    res.status(500).json({ error: "Failed to filter tasks by status" });
  }
});

// FILTER: by priority
router.get("/tasks/priority/:priority", async (req, res) => {
  try {
    const { priority } = req.params;

    console.log(
      `🔍 Filtering tasks by priority "${priority}" for user:`,
      req.user.id
    );

    const prioritizedTasks = await Tasks.findAll({
      where: { user_id: req.user.id, priority },
      order: [["createdAt", "DESC"]],
    });

    console.log(
      `✅ Found ${prioritizedTasks.length} tasks with priority "${priority}"`
    );
    res.json(prioritizedTasks);
  } catch (error) {
    console.error("❌ Error filtering by priority:", error);
    res.status(500).json({ error: "Failed to filter tasks by priority" });
  }
});

// FILTER: by className (case-insensitive substring)
router.get("/tasks/class/:className", async (req, res) => {
  try {
    const { className } = req.params;

    console.log(
      `🔍 Filtering tasks by class "${className}" for user:`,
      req.user.id
    );

    const classTasks = await Tasks.findAll({
      where: {
        user_id: req.user.id,
        className: { [Op.iLike]: `%${className}%` },
      },
      order: [["createdAt", "DESC"]],
    });

    console.log(`✅ Found ${classTasks.length} tasks for class "${className}"`);
    res.json(classTasks);
  } catch (error) {
    console.error("❌ Error filtering by class name:", error);
    res.status(500).json({ error: "Failed to filter tasks by class name" });
  }
});

// GET task statistics for the logged-in user
router.get("/tasks/stats", async (req, res) => {
  try {
    console.log("📊 Getting task statistics for user:", req.user.id);

    const totalTasks = await Tasks.count({
      where: { user_id: req.user.id },
    });

    const completedTasks = await Tasks.count({
      where: { user_id: req.user.id, status: "completed" },
    });

    const pendingTasks = await Tasks.count({
      where: { user_id: req.user.id, status: "pending" },
    });

    const highPriorityTasks = await Tasks.count({
      where: { user_id: req.user.id, priority: "high" },
    });

    const stats = {
      total: totalTasks,
      completed: completedTasks,
      pending: pendingTasks,
      highPriority: highPriorityTasks,
      completionRate:
        totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
    };

    console.log(`✅ Task stats for user ${req.user.id}:`, stats);
    res.json(stats);
  } catch (error) {
    console.error("❌ Error getting task statistics:", error);
    res.status(500).json({ error: "Failed to get task statistics" });
  }
});

module.exports = router;
