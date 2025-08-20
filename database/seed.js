const db = require("./db");
const { nanoid } = require("nanoid");
const {
  User,
  Tasks,
  Calculator,
  Reminder,
  Session,
  AiChatHistory,
  UserProgress,
  Badge,
  UserBadge,
} = require("./index");

const seed = async () => {
  try {
    db.logging = false;
    await db.sync({ force: true }); // Drop and recreate tables

    const user = await User.bulkCreate([
      {
        firstName: "Benjamin",
        lastName: "Test",
        username: "benjamin",
        email: "benjamin@example.com",
        passwordHash: User.hashPassword("supersecurepassword"),
        role: "student",
      },
      {
        firstName: "David",
        lastName: "Test",
        username: "David",
        email: "David@example.com",
        passwordHash: User.hashPassword("supersecurepassword2"),
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
        quiz_id: nanoid(8), // Generate unique ID for flashcards
      },
      {
        user_id: 1,
        user_request: "Create a quiz",
        ai_response: "JSON quiz...",
        response_type: "quiz",
        status: "success",
        quiz_id: nanoid(8), // Generate unique ID for quiz
      },
      {
        user_id: 1,
        user_request: "More flashcards",
        ai_response: "JSON flashcards...",
        response_type: "flashcard",
        status: "success",
        quiz_id: nanoid(8), // Generate unique ID for flashcards
      },
      {
        user_id: 1,
        user_request: "Another quiz",
        ai_response: "JSON quiz...",
        response_type: "quiz",
        status: "success",
        quiz_id: nanoid(8), // Generate unique ID for quiz
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
        const duration = Math.floor(Math.random() * 30000) + 10000; // 10-40 seconds
        userProgressData.push({
          user_id: 1,
          ai_chat_history_id: 1, // flashcard
          studied_at: new Date(date.getTime() + j * 60000), // spread throughout the day
          is_correct: isCorrect,
          score: null,
          card_index: j,
          duration_ms: duration, // ✅ Add duration
          session_id: `session_${date.toISOString().split("T")[0]}_${j}`, // ✅ Add session ID
        });
      }

      // Create quiz attempts for this day
      for (let j = 0; j < quizAttempts; j++) {
        const score = Math.floor(Math.random() * 30) + 70; // 70-100 score
        const duration = Math.floor(Math.random() * 120000) + 60000; // 1-3 minutes
        userProgressData.push({
          user_id: 1,
          ai_chat_history_id: 2, // quiz
          studied_at: new Date(
            date.getTime() + (j + flashcardAttempts) * 60000
          ),
          is_correct: null,
          score: score,
          duration_ms: duration, // ✅ Add duration
          session_id: `session_${date.toISOString().split("T")[0]}_${
            j + flashcardAttempts
          }`, // ✅ Add session ID
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
      user_id: user[0].id,
      assignment_type: "Homework",
      assignment_name: "First Homework",
      assignment_grade: 85,
      assignment_weight: 25,
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

    // Create badges
    const badges = await Badge.bulkCreate([
      {
        name: "Week Warrior",
        description: "Maintain a 7-day study streak",
        icon: "🔥",
        category: "streak",
        requirement_type: "streak_days",
        requirement_value: 7,
        rarity: "common",
        points: 100,
      },
      {
        name: "Quiz Master",
        description: "Complete 50 quizzes",
        icon: "🧠",
        category: "quiz",
        requirement_type: "quiz_count",
        requirement_value: 50,
        rarity: "rare",
        points: 250,
      },
      {
        name: "Accuracy Ace",
        description: "Achieve 90% flashcard accuracy",
        icon: "🎯",
        category: "accuracy",
        requirement_type: "accuracy_percentage",
        requirement_value: 90,
        rarity: "epic",
        points: 500,
      },
      {
        name: "Speed Demon",
        description:
          "Complete activities with fast average time (under 30 seconds)",
        icon: "⚡",
        category: "speed",
        requirement_type: "completion_time",
        requirement_value: 30000, // 30 seconds in milliseconds
        rarity: "rare",
        points: 300,
      },
      {
        name: "Century Club",
        description: "Maintain a 100-day study streak",
        icon: "👑",
        category: "milestone",
        requirement_type: "streak_days",
        requirement_value: 100,
        rarity: "legendary",
        points: 1000,
      },
    ]);

    // Create UserBadge entries to link users with badges
    await UserBadge.bulkCreate([
      {
        user_id: 1,
        badge_id: 1, // Week Warrior - user has 7 day streak
        earned_at: new Date(),
        progress_value: 7, // 7 day streak achieved
      },
      {
        user_id: 1,
        badge_id: 4, // Speed Demon - user has fast completion time
        earned_at: new Date(),
        progress_value: 52682, // completion time in ms
      },
    ]);

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
