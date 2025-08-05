const express = require("express");
const router = express.Router();
const { Tasks } = require("../database");

// GET all tasks for a user
router.get("/tasks/:userId", async (req, res) => {
  try {
    const userId = req.params.userId; // storing the user ID from the URL
    const tasks = await Tasks.findAll({ where: { user_id: userId } }); //This is storing all the data that .findall is getting form the model in Tasks in this case it is filtering where the user ID equals the one found in the URL
    res.json(tasks); //Outputting it as a json
  } catch (error) {
    console.error("❌ Error fetching tasks:", error);
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

//POST a new task
//The goal of this is to store the data that the user is sending into the Tasks model
router.post("/tasks/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    //Gets data from the body of the request and stores it in the variables 
    const {
      className,
      assignment,
      description,
      status,
      deadline,
      priority,
    } = req.body;

    const newTask = await Tasks.create({
      className,
      assignment,
      description,
      status,
      deadline,
      priority,
      user_id: userId, // 
    });

    res.status(201).json(newTask);
  } catch (error) {
    console.error("❌ Error creating task:", error);
    res.status(500).json({ error: "Failed to create task" });
  }
});


// UPDATE a task by ID
router.put("/tasks/:userId/:taskId", async (req, res) => {
  try {
    const { taskId, userId } = req.params;

    //This is storing all of the updated data from the request body(When the user updates an
    //  "assignment,description" etc we are stroing that new data in these variables
    const { className, assignment, description, status, deadline, priority } =
      req.body;

    // Finds the task of a specefic user 
    const task = await Tasks.findOne({
      where: {
        id: taskId,
        user_id: userId,
      }
    });

    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    // Update the task
    await task.update({
      className,
      assignment,
      description,
      status,
      deadline,
      priority,
    });

    res.json(task);
  } catch (error) {
    console.error("❌ Error updating task:", error);
    res.status(500).json({ error: "Failed to update task" });
  }
});

//DELETE
router.delete("/tasks/:userId/:taskId", async (req, res) => {
  try {
    const { userId, taskId } = req.params;

    // Searches database and finds the task of a specefic user
    const task = await Tasks.findOne({
      where: {
        id: taskId,
        user_id: userId,
      },
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

//PATCH just update the status

router.patch("/tasks/:userId/:taskId", async (req, res) => {
  try {
    const { userId, taskId } = req.params;
    const { status } = req.body;

    const task = await Tasks.findOne({
      where: {
        id: taskId,
        user_id: userId,
      },
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

module.exports = router;
