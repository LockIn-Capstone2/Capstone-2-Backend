const db = require("./db");
const { User, Tasks, Calculator, Reminder, Session } = require('./index');



const seed = async () => {
  try {
    db.logging = false;
    await db.sync({ force: true }); // Drop and recreate tables

    const user = await User.create({
      username: 'benjamin',
      email: 'benjamin@example.com',
      password: 'supersecurepassword',
      role: 'student'
    });

    // Create a Task
    const task = await Tasks.create({
      className: 'Math 101',
      assignment: 'Homework 1',
      description: 'Complete exercises 1–10 on page 52',
      status: 'in-progress',
      deadline: new Date('2025-08-05'),
      priority: 'high',
      user_id: user.id
    });
    // Add calculator entry
    const calculator = await Calculator.create({
      assessment: 'Midterm Exam',
      grade: 85,
      weight: 25,
      user_id: user.id
    });

    // Add study session
    await Session.create({
      duration: 45,
      user_id: user.id,
      started_at: new Date(),
      created_at: new Date()
    });

    //  Add reminder for task
    await Reminder.create({
      task_id: task.id,
      remind: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) 
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
