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
    const { title, due_date, priority, user_id } = req.body; // This grabs the data from the body of the request 

    const newTask = await Tasks.create({ //Cretaing a new row in the tasks model 
      title,
      due_date,
      priority,
      user_id
    });

    res.status(201).json(newTask);//The data then gets stored in the new row in the tasks model (newTask)
  } catch (error) {
    console.error("❌ Error creating task:", error);
    res.status(500).json({ error: "Failed to create task" });
  }
});




module.exports = router;
