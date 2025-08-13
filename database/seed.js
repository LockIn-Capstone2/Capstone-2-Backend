const db = require("./db");
const { User, Tasks, Calculator, Reminder, Session } = require("./index");

const seed = async () => {
  try {
    db.logging = false;
    await db.sync({ force: true }); // Drop and recreate tables

    const user = await User.bulkCreate([
      {
        username: "benjamin",
        email: "benjamin@example.com",
        password: "supersecurepassword",
        role: "student",
      },
      {
        username: "David",
        email: "David@example.com",
        password: "supersecurepassword2",
        role: "student",
      },
    ]);

    // Create a Task

    const tasks = await Tasks.bulkCreate([
      {
        className: "Math 101",
        assignment: "Homework 1",
        description: "Complete exercises 1–10 on page 52",
        status: "In-progress",
        deadline: new Date("2025-08-05"),
        priority: "high",
        user_id: user[0].id,
      },
      {
        className: "Math 201",
        assignment: "Homework 2",
        description: "Complete exercises 1–10 on page 52",
        status: "In-progress",
        deadline: new Date("2025-08-05"),
        priority: "high",
        user_id: user[1].id,
      },
    ]);
    // Add calculator entry
    const calculator = await Calculator.create({
      assessment: "Midterm Exam",
      grade: 85,
      weight: 25,
      user_id: user[0].id,

    });

    // Add study session
    await Session.create({
      duration: 45,
      user_id: user[0].id,
      started_at: new Date(),
      created_at: new Date(),
    });

    //  Add reminder for the first task
    await Reminder.create({
      task_id: tasks[0].id, // use the first task's id
      remind: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    });

    console.log("🌱 Seeded the database!");
  } catch (error) {
    console.error("❌ Error seeding database:", error);

    if (error.message.includes("does not exist")) {
      console.log("\n🤔🤔🤔 Have you created your database??? 🤔🤔🤔");
    }

    process.exit(1);
  }

  await db.close();
};

seed();
