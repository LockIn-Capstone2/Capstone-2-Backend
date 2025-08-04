const express = require("express");
const router = express.Router();
const { Tasks } = require("../database");

// GET all tasks for a user
router.get("/tasks/:userId", async (req, res) => {
  try {
    const userId  = req.params.userId;// storing the user ID from the URL 
    const tasks = await Tasks.findAll({ where: { user_id: userId } });//This is storing all the data that .findall is getting form the model in Tasks in this case it is filtering where the user ID equals the one found in the URL
    res.json(tasks);//Outputting it as a json 
  } catch (error) {
    console.error("❌ Error fetching tasks:", error);
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

//POST a new task
//The goal of this is to store the data that the user is sending into the Tasks model 
router.post("/tasks", async (req, res) => {
  try {
    const { className, assignment, description, status, deadline, priority, user_id } = req.body; // Storing all the info found in the body of the request, so basically all of the things that the user inputted in the table 

    const newTask = await Tasks.create({ // With that data we we create a new row in the tasks model and store all the data
      className,
      assignment,
      description,
      status,
      deadline,
      priority,
      user_id
    });

    res.status(201).json(newTask);
  } catch (error) {
    console.error("❌ Error creating task:", error);
    res.status(500).json({ error: "Failed to create task" });
  }
});

// UPDATE a task by ID
router.put("/tasks/:taskId", async (req, res) => {
  try {
    const { taskId } = req.params;

    const {
      className,
      assignment,
      description,
      status,
      deadline,
      priority
    } = req.body;

    // Find the task
    const task = await Tasks.findByPk(taskId);

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
      priority
    });

    res.json(task);
  } catch (error) {
    console.error("❌ Error updating task:", error);
    res.status(500).json({ error: "Failed to update task" });
  }
});



module.exports = router;
