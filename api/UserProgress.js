const express = require("express");
const router = express.Router();
const { Op } = require("sequelize");
const { UserProgress, AiChatHistory } = require("../database");

router.get("/daily/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    // Get today's date in local timezone
    const today = new Date();
    const start = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      0,
      0,
      0,
      0
    );
    const end = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      23,
      59,
      59,
      999
    );

    const rows = await UserProgress.findAll({
      where: {
        user_id: userId,
        studied_at: { [Op.between]: [start, end] },
      },
      include: [
        {
          model: AiChatHistory,
          attributes: ["id", "response_type"], // "flashcard" | "quiz"
        },
      ],
      order: [["studied_at", "ASC"]],
    });

    const flashAttempts = rows.filter(
      (r) => r.AiChatHistory?.response_type === "flashcard"
    );
    const quizRows = rows.filter(
      (r) => r.AiChatHistory?.response_type === "quiz"
    );

    const flashStudied = flashAttempts.length;
    const flashCorrect = flashAttempts.filter(
      (r) => r.is_correct === true
    ).length;
    const flashAccuracy = flashStudied
      ? Math.round((flashCorrect / flashStudied) * 100)
      : 0;

    const quizAttempts = quizRows.filter((r) => r.score != null).length;
    const quizAvgScore = quizAttempts
      ? Math.round(
          quizRows
            .filter((r) => r.score != null)
            .reduce((s, r) => s + r.score, 0) / quizAttempts
        )
      : 0;

    res.json({
      date_range: { start, end },
      flashcards: {
        studied_today: flashStudied,
        correct_today: flashCorrect,
        accuracy_today: flashAccuracy,
      },
      quizzes: {
        attempts_today: quizAttempts,
        avg_score_today: quizAvgScore,
      },
      // If you want raw rows for debugging:
      // rows
    });
  } catch (e) {
    console.error("Daily progress error ❌", e);
    res.status(500).json({ error: "Server error" });
  }
});

// Get weekly progress for a user
router.get("/weekly/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    // Get the start of the current week (Sunday)
    const today = new Date();
    const dayOfWeek = today.getDay();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - dayOfWeek);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const rows = await UserProgress.findAll({
      where: {
        user_id: userId,
        studied_at: { [Op.between]: [startOfWeek, endOfWeek] },
      },
      include: [
        {
          model: AiChatHistory,
          attributes: ["id", "response_type"],
        },
      ],
      order: [["studied_at", "ASC"]],
    });

    const flashAttempts = rows.filter(
      (r) => r.AiChatHistory?.response_type === "flashcard"
    );
    const quizRows = rows.filter(
      (r) => r.AiChatHistory?.response_type === "quiz"
    );

    const flashStudied = flashAttempts.length;
    const flashCorrect = flashAttempts.filter(
      (r) => r.is_correct === true
    ).length;
    const flashAccuracy = flashStudied
      ? Math.round((flashCorrect / flashStudied) * 100)
      : 0;

    const quizAttempts = quizRows.filter((r) => r.score != null).length;
    const quizAvgScore = quizAttempts
      ? Math.round(
          quizRows
            .filter((r) => r.score != null)
            .reduce((s, r) => s + r.score, 0) / quizAttempts
        )
      : 0;

    res.json({
      date_range: { start: startOfWeek, end: endOfWeek },
      flashcards: {
        studied_this_week: flashStudied,
        correct_this_week: flashCorrect,
        accuracy_this_week: flashAccuracy,
      },
      quizzes: {
        attempts_this_week: quizAttempts,
        avg_score_this_week: quizAvgScore,
      },
    });
  } catch (e) {
    console.error("Weekly progress error ❌", e);
    res.status(500).json({ error: "Server error" });
  }
});

// Get all progress for a user (with optional date range)
router.get("/all/:userId", async (req, res) => {
  const { userId } = req.params;
  const { start_date, end_date } = req.query;

  try {
    let whereClause = { user_id: userId };

    if (start_date && end_date) {
      const start = new Date(start_date);
      const end = new Date(end_date);
      end.setHours(23, 59, 59, 999);
      whereClause.studied_at = { [Op.between]: [start, end] };
    }

    const rows = await UserProgress.findAll({
      where: whereClause,
      include: [
        {
          model: AiChatHistory,
          attributes: ["id", "response_type"],
        },
      ],
      order: [["studied_at", "DESC"]],
    });

    const flashAttempts = rows.filter(
      (r) => r.AiChatHistory?.response_type === "flashcard"
    );
    const quizRows = rows.filter(
      (r) => r.AiChatHistory?.response_type === "quiz"
    );

    const flashStudied = flashAttempts.length;
    const flashCorrect = flashAttempts.filter(
      (r) => r.is_correct === true
    ).length;
    const flashAccuracy = flashStudied
      ? Math.round((flashCorrect / flashStudied) * 100)
      : 0;

    const quizAttempts = quizRows.filter((r) => r.score != null).length;
    const quizAvgScore = quizAttempts
      ? Math.round(
          quizRows
            .filter((r) => r.score != null)
            .reduce((s, r) => s + r.score, 0) / quizAttempts
        )
      : 0;

    res.json({
      total_flashcards: {
        studied_total: flashStudied,
        correct_total: flashCorrect,
        accuracy_total: flashAccuracy,
      },
      total_quizzes: {
        attempts_total: quizAttempts,
        avg_score_total: quizAvgScore,
      },
      total_sessions: rows.length,
      recent_activity: rows.slice(0, 10), // Last 10 activities
    });
  } catch (e) {
    console.error("All progress error ❌", e);
    res.status(500).json({ error: "Server error" });
  }
});

// Record new progress entry
router.post("/record", async (req, res) => {
  const {
    user_id,
    ai_chat_history_id,
    card_index,
    is_correct,
    score,
    duration_ms,
    session_id,
  } = req.body;

  try {
    // Validate required fields
    if (!user_id || !ai_chat_history_id) {
      return res.status(400).json({
        error:
          "Missing required fields: user_id and ai_chat_history_id are required",
      });
    }

    // Create new progress entry
    const progressEntry = await UserProgress.create({
      user_id,
      ai_chat_history_id,
      card_index,
      is_correct,
      score,
      duration_ms,
      session_id,
      studied_at: new Date(),
    });

    res.status(201).json({
      message: "Progress recorded successfully",
      progress: progressEntry,
    });
  } catch (e) {
    console.error("Record progress error ❌", e);
    res.status(500).json({ error: "Server error" });
  }
});

// Record flashcard progress when user studies
router.post("/flashcard-progress", async (req, res) => {
  const {
    user_id,
    ai_chat_history_id,
    card_index,
    is_correct,
    duration_ms,
    session_id,
  } = req.body;

  try {
    // Validate required fields
    if (
      !user_id ||
      !ai_chat_history_id ||
      card_index === undefined ||
      is_correct === undefined
    ) {
      return res.status(400).json({
        error:
          "Missing required fields: user_id, ai_chat_history_id, card_index, and is_correct are required",
      });
    }

    // Create new progress entry
    const progressEntry = await UserProgress.create({
      user_id,
      ai_chat_history_id,
      card_index,
      is_correct,
      score: null, // null for flashcards
      duration_ms,
      session_id,
      studied_at: new Date(),
    });

    res.status(201).json({
      message: "Flashcard progress recorded successfully",
      progress: progressEntry,
    });
  } catch (e) {
    console.error("Record flashcard progress error ❌", e);
    res.status(500).json({ error: "Server error" });
  }
});

// Record quiz progress when user takes quiz
router.post("/quiz-progress", async (req, res) => {
  const { user_id, ai_chat_history_id, score, duration_ms, session_id } =
    req.body;

  try {
    // Validate required fields
    if (!user_id || !ai_chat_history_id || score === undefined) {
      return res.status(400).json({
        error:
          "Missing required fields: user_id, ai_chat_history_id, and score are required",
      });
    }

    // Create new progress entry
    const progressEntry = await UserProgress.create({
      user_id,
      ai_chat_history_id,
      card_index: null, // null for quizzes
      is_correct: null, // null for quizzes
      score,
      duration_ms,
      session_id,
      studied_at: new Date(),
    });

    res.status(201).json({
      message: "Quiz progress recorded successfully",
      progress: progressEntry,
    });
  } catch (e) {
    console.error("Record quiz progress error ❌", e);
    res.status(500).json({ error: "Server error" });
  }
});

// Get real-time progress for a specific flashcard set
router.get("/flashcard-set/:aiChatHistoryId/:userId", async (req, res) => {
  const { aiChatHistoryId, userId } = req.params;

  try {
    const progress = await UserProgress.findAll({
      where: {
        user_id: userId,
        ai_chat_history_id: aiChatHistoryId,
      },
      order: [["studied_at", "ASC"]],
    });

    const totalAttempts = progress.length;
    const correctAttempts = progress.filter(
      (p) => p.is_correct === true
    ).length;
    const accuracy =
      totalAttempts > 0
        ? Math.round((correctAttempts / totalAttempts) * 100)
        : 0;

    res.json({
      flashcard_set_id: aiChatHistoryId,
      total_attempts: totalAttempts,
      correct_attempts: correctAttempts,
      accuracy: accuracy,
      progress_entries: progress,
    });
  } catch (e) {
    console.error("Get flashcard set progress error ❌", e);
    res.status(500).json({ error: "Server error" });
  }
});

// Get progress summary for dashboard
router.get("/summary/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    // Get today's date
    const today = new Date();
    const startOfToday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      0,
      0,
      0,
      0
    );
    const endOfToday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      23,
      59,
      59,
      999
    );

    // Get this week's date range
    const dayOfWeek = today.getDay();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - dayOfWeek);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    // Get all time progress
    const allTimeProgress = await UserProgress.findAll({
      where: { user_id: userId },
      include: [
        {
          model: AiChatHistory,
          attributes: ["id", "response_type"],
        },
      ],
    });

    // Get today's progress
    const todayProgress = await UserProgress.findAll({
      where: {
        user_id: userId,
        studied_at: { [Op.between]: [startOfToday, endOfToday] },
      },
      include: [
        {
          model: AiChatHistory,
          attributes: ["id", "response_type"],
        },
      ],
    });

    // Get this week's progress
    const weekProgress = await UserProgress.findAll({
      where: {
        user_id: userId,
        studied_at: { [Op.between]: [startOfWeek, endOfWeek] },
      },
      include: [
        {
          model: AiChatHistory,
          attributes: ["id", "response_type"],
        },
      ],
    });

    // Calculate statistics
    const calculateStats = (progressData) => {
      const flashAttempts = progressData.filter(
        (r) => r.AiChatHistory?.response_type === "flashcard"
      );
      const quizRows = progressData.filter(
        (r) => r.AiChatHistory?.response_type === "quiz"
      );

      const flashStudied = flashAttempts.length;
      const flashCorrect = flashAttempts.filter(
        (r) => r.is_correct === true
      ).length;
      const flashAccuracy = flashStudied
        ? Math.round((flashCorrect / flashStudied) * 100)
        : 0;

      const quizAttempts = quizRows.filter((r) => r.score != null).length;
      const quizAvgScore = quizAttempts
        ? Math.round(
            quizRows
              .filter((r) => r.score != null)
              .reduce((s, r) => s + r.score, 0) / quizAttempts
          )
        : 0;

      return {
        flashStudied,
        flashCorrect,
        flashAccuracy,
        quizAttempts,
        quizAvgScore,
        totalSessions: progressData.length,
      };
    };

    const allTimeStats = calculateStats(allTimeProgress);
    const todayStats = calculateStats(todayProgress);
    const weekStats = calculateStats(weekProgress);

    res.json({
      today: todayStats,
      this_week: weekStats,
      all_time: allTimeStats,
      streak_days: weekProgress.length > 0 ? 1 : 0, // Simple streak calculation
    });
  } catch (e) {
    console.error("Progress summary error ❌", e);
    res.status(500).json({ error: "Server error" });
  }
});

// Get daily progress for the last 7 days for charts
router.get("/daily-chart/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    const chartData = [];
    const today = new Date();

    // Get data for the last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);

      const start = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        0,
        0,
        0,
        0
      );
      const end = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        23,
        59,
        59,
        999
      );

      const rows = await UserProgress.findAll({
        where: {
          user_id: userId,
          studied_at: { [Op.between]: [start, end] },
        },
        include: [
          {
            model: AiChatHistory,
            attributes: ["id", "response_type"],
          },
        ],
        order: [["studied_at", "ASC"]],
      });

      const flashAttempts = rows.filter(
        (r) => r.AiChatHistory?.response_type === "flashcard"
      );
      const quizRows = rows.filter(
        (r) => r.AiChatHistory?.response_type === "quiz"
      );

      const flashStudied = flashAttempts.length;
      const flashCorrect = flashAttempts.filter(
        (r) => r.is_correct === true
      ).length;
      const flashAccuracy = flashStudied
        ? Math.round((flashCorrect / flashStudied) * 100)
        : 0;

      const quizAttempts = quizRows.filter((r) => r.score != null).length;
      const quizAvgScore = quizAttempts
        ? Math.round(
            quizRows
              .filter((r) => r.score != null)
              .reduce((s, r) => s + r.score, 0) / quizAttempts
          )
        : 0;

      chartData.push({
        date: date.toISOString().split("T")[0],
        day: date.toLocaleDateString("en-US", { weekday: "short" }),
        flashcardAccuracy: flashAccuracy,
        quizScore: quizAvgScore,
        flashcardCount: flashStudied,
        quizCount: quizAttempts,
      });
    }

    res.json({
      chartData,
      dateRange: {
        start: new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        end: today.toISOString().split("T")[0],
      },
    });
  } catch (e) {
    console.error("Daily chart data error ❌", e);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
