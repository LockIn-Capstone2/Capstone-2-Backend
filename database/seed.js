const db = require("./db");
const {
  User,
  Tasks,
  Calculator,
  Reminder,
  Session,
  AiChatHistory,
  UserProgress,
} = require("./index");

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

    // Create multiple AI chat histories for different days
    const aiChatHistories = await AiChatHistory.bulkCreate([
      {
        user_id: 1,
        user_request: "Make me flashcards",
        ai_response: "JSON flashcards...",
        response_type: "flashcard",
        status: "success",
      },
      {
        user_id: 1,
        user_request: "Create a quiz",
        ai_response: "JSON quiz...",
        response_type: "quiz",
        status: "success",
      },
      {
        user_id: 1,
        user_request: "More flashcards",
        ai_response: "JSON flashcards...",
        response_type: "flashcard",
        status: "success",
      },
      {
        user_id: 1,
        user_request: "Another quiz",
        ai_response: "JSON quiz...",
        response_type: "quiz",
        status: "success",
      },
    ]);

    // Create UserProgress entries for the last 7 days with realistic data
    const today = new Date();
    const userProgressData = [];

    // Generate data for the last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);

      // Each day has some flashcard attempts and quiz attempts
      const flashcardAttempts = Math.floor(Math.random() * 5) + 3; // 3-7 attempts
      const quizAttempts = Math.floor(Math.random() * 3) + 1; // 1-3 attempts

      // Create flashcard attempts for this day
      for (let j = 0; j < flashcardAttempts; j++) {
        const isCorrect = Math.random() > 0.3; // 70% accuracy on average
        userProgressData.push({
          user_id: 1,
          ai_chat_history_id: 1, // flashcard
          studied_at: new Date(date.getTime() + j * 60000), // spread throughout the day
          is_correct: isCorrect,
          score: null,
          card_index: j,
        });
      }

      // Create quiz attempts for this day
      for (let j = 0; j < quizAttempts; j++) {
        const score = Math.floor(Math.random() * 30) + 70; // 70-100 score
        userProgressData.push({
          user_id: 1,
          ai_chat_history_id: 2, // quiz
          studied_at: new Date(
            date.getTime() + (j + flashcardAttempts) * 60000
          ),
          is_correct: null,
          score: score,
        });
      }
    }

    await UserProgress.bulkCreate(userProgressData);

    // Create a Task
    const tasks = await Tasks.bulkCreate([
      {
        className: "Math 101",
        assignment: "Homework 1",
        description: "Complete exercises 1–10 on page 52",
        status: "in-progress",
        deadline: new Date("2025-08-05"),
        priority: "high",
        user_id: user[0].id,
      },
      {
        className: "Math 201",
        assignment: "Homework 2",
        description: "Complete exercises 1–10 on page 52",
        status: "in-progress",
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
      duration: "00:45:00",
      user_id: user[0].id,
      started_at: new Date(),
      created_at: new Date(),
    });

    //  Add reminder for the first task
    await Reminder.create({
      task_id: tasks[0].id, // use the first task's id
      remind: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    });

    console.log("🌱 Seeded the database");
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
