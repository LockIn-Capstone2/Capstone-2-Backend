const express = require("express");
const router = express.Router();
const { Op } = require("sequelize");
const { Tasks } = require("../database");

// ──────────────────────────────────────────────────────────────
// NOTE: These routes assume app.js has:
// app.use("/api", authenticateJWT, apiRouter)
// so req.user is always available here.
// ──────────────────────────────────────────────────────────────

// GET all tasks for the logged-in user
router.get("/tasks", async (req, res) => {
  try {
    const tasks = await Tasks.findAll({
      where: { user_id: req.user.id },
      order: [["createdAt", "DESC"]],
    });
    res.json(tasks);
  } catch (error) {
    console.error("❌ Error fetching tasks:", error);
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

// POST a new task for the logged-in user
router.post("/tasks", async (req, res) => {
  try {
    const { className, assignment, description, status, deadline, priority } = req.body;

    const newTask = await Tasks.create({
      className,
      assignment,
      description,
      status,
      deadline,
      priority,
      user_id: req.user.id, // ← use the ID from JWT
    });

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
    const { className, assignment, description, status, deadline, priority } = req.body;

    // Ownership check baked into the WHERE
    const task = await Tasks.findOne({
      where: { id: taskId, user_id: req.user.id },
    });

    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    await task.update({ className, assignment, description, status, deadline, priority });
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

    const task = await Tasks.findOne({
      where: { id: taskId, user_id: req.user.id },
    });

    if (!task) {
      return res.status(404).json({ error: "Task not found for this user" });
    }

    await task.destroy();
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

    const task = await Tasks.findOne({
      where: { id: taskId, user_id: req.user.id },
    });

    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    await task.update({ status });
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

    const filteredTasks = await Tasks.findAll({
      where: { user_id: req.user.id, status: statusTask },
      order: [["createdAt", "DESC"]],
    });

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

    const prioritizedTasks = await Tasks.findAll({
      where: { user_id: req.user.id, priority },
      order: [["createdAt", "DESC"]],
    });

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

    const classTasks = await Tasks.findAll({
      where: {
        user_id: req.user.id,
        className: { [Op.iLike]: `%${className}%` },
      },
      order: [["createdAt", "DESC"]],
    });

    res.json(classTasks);
  } catch (error) {
    console.error("❌ Error filtering by class name:", error);
    res.status(500).json({ error: "Failed to filter tasks by class name" });
  }
});

module.exports = router;
