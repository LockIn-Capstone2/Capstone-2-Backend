const express = require("express");
const router = express.Router();
const { Op } = require("sequelize");
const { UserProgress, AiChatHistory } = require("../database");
const { authenticateJWT } = require("../auth");

// Import badge checking function
const { checkAndAwardBadges } = require("./badges");

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
router.post("/flashcard-progress", authenticateJWT, async (req, res) => {
  const userId = req.user.id; // Get user ID from JWT token
  const {
    ai_chat_history_id, // This is actually the quiz_id from the frontend
    card_index,
    is_correct,
    duration_ms,
    session_id,
  } = req.body;

  try {
    // Validate required fields
    if (
      !ai_chat_history_id ||
      card_index === undefined ||
      is_correct === undefined
    ) {
      return res.status(400).json({
        error:
          "Missing required fields: ai_chat_history_id, card_index, and is_correct are required",
      });
    }

    // First, find the AiChatHistory record by quiz_id to get the actual id
    const aiChatHistory = await AiChatHistory.findOne({
      where: { quiz_id: ai_chat_history_id },
    });

    if (!aiChatHistory) {
      return res.status(404).json({
        error: "Flashcard set not found",
        details: `No flashcard set found with quiz_id: ${ai_chat_history_id}`,
      });
    }

    // Create new progress entry using the actual ai_chat_history_id
    const progressEntry = await UserProgress.create({
      user_id: userId,
      ai_chat_history_id: aiChatHistory.id, // Use the actual integer ID
      card_index,
      is_correct,
      score: null, // null for flashcards
      duration_ms,
      session_id,
      studied_at: new Date(),
    });

    // ✅ Check for newly earned badges
    const newlyEarnedBadges = await checkAndAwardBadges(userId);

    res.status(201).json({
      message: "Flashcard progress recorded successfully",
      progress: progressEntry,
      newlyEarnedBadges: newlyEarnedBadges,
    });
  } catch (e) {
    console.error("Record flashcard progress error ❌", e);
    res.status(500).json({ error: "Server error" });
  }
});

// Record quiz progress when user takes quiz
router.post("/quiz-progress", authenticateJWT, async (req, res) => {
  const userId = req.user.id; // Get user ID from JWT token
  const { ai_chat_history_id, score, duration_ms, session_id } = req.body;

  try {
    // Validate required fields
    if (!ai_chat_history_id || score === undefined) {
      return res.status(400).json({
        error:
          "Missing required fields: ai_chat_history_id and score are required",
      });
    }

    // First, find the AiChatHistory record by quiz_id to get the actual id
    const aiChatHistory = await AiChatHistory.findOne({
      where: { quiz_id: ai_chat_history_id },
    });

    if (!aiChatHistory) {
      return res.status(404).json({
        error: "Quiz not found",
        details: `No quiz found with quiz_id: ${ai_chat_history_id}`,
      });
    }

    // Create new progress entry using the actual ai_chat_history_id
    const progressEntry = await UserProgress.create({
      user_id: userId,
      ai_chat_history_id: aiChatHistory.id, // Use the actual integer ID
      card_index: null, // null for quizzes
      is_correct: null, // null for quizzes
      score,
      duration_ms,
      session_id,
      studied_at: new Date(),
    });

    // ✅ Check for newly earned badges
    const newlyEarnedBadges = await checkAndAwardBadges(userId);

    res.status(201).json({
      message: "Quiz progress recorded successfully",
      progress: progressEntry,
      newlyEarnedBadges: newlyEarnedBadges,
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

      // ✅ Calculate total study time from duration_ms
      const totalStudyTime = progressData.reduce((total, record) => {
        return total + (record.duration_ms || 0);
      }, 0);

      // ✅ Format study time
      const hours = Math.floor(totalStudyTime / (1000 * 60 * 60));
      const minutes = Math.floor(
        (totalStudyTime % (1000 * 60 * 60)) / (1000 * 60)
      );
      const formattedStudyTime = `${hours}h ${minutes}m`;

      return {
        flashStudied,
        flashCorrect,
        flashAccuracy,
        quizAttempts,
        quizAvgScore,
        totalSessions: progressData.length,
        totalStudyTime: formattedStudyTime, // ✅ Add study time
        totalStudyTimeMs: totalStudyTime, // ✅ Raw milliseconds for calculations
      };
    };

    const allTimeStats = calculateStats(allTimeProgress);
    const todayStats = calculateStats(todayProgress);
    const weekStats = calculateStats(weekProgress);

    res.json({
      today: todayStats,
      this_week: weekStats,
      all_time: allTimeStats,
      // ✅ Removed inaccurate streak_days - use /api/sessions/streak/:userId for accurate streak data
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

      // ✅ Calculate daily study time
      const dailyStudyTime = rows.reduce((total, record) => {
        return total + (record.duration_ms || 0);
      }, 0);

      chartData.push({
        date: date.toISOString().split("T")[0],
        day: date.toLocaleDateString("en-US", { weekday: "short" }),
        flashcardAccuracy: flashAccuracy,
        quizScore: quizAvgScore,
        flashcardCount: flashStudied,
        quizCount: quizAttempts,
        duration_ms: dailyStudyTime, // ✅ Add daily study time
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

// Protected endpoint to get current user's data
router.get("/current-user", authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user summary
    const summary = await UserProgress.findAll({
      where: { user_id: userId },
      include: [
        {
          model: AiChatHistory,
          attributes: ["id", "response_type"],
        },
      ],
      order: [["studied_at", "DESC"]],
    });

    // Calculate all-time stats
    const allTimeStats = summary.reduce(
      (stats, record) => {
        if (record.AiChatHistory?.response_type === "flashcard") {
          stats.totalFlashcards++;
          if (record.is_correct) stats.correctFlashcards++;
          stats.totalStudyTime += record.duration_ms || 0;
        } else if (record.AiChatHistory?.response_type === "quiz") {
          stats.totalQuizzes++;
          if (record.score != null) {
            stats.totalQuizScore += record.score;
            stats.quizCount++;
          }
          stats.totalStudyTime += record.duration_ms || 0;
        }
        return stats;
      },
      {
        totalFlashcards: 0,
        correctFlashcards: 0,
        totalQuizzes: 0,
        totalQuizScore: 0,
        quizCount: 0,
        totalStudyTime: 0,
      }
    );

    const flashAccuracy =
      allTimeStats.totalFlashcards > 0
        ? Math.round(
            (allTimeStats.correctFlashcards / allTimeStats.totalFlashcards) *
              100
          )
        : 0;

    const avgQuizScore =
      allTimeStats.quizCount > 0
        ? Math.round(allTimeStats.totalQuizScore / allTimeStats.quizCount)
        : 0;

    // Get today's stats
    const today = new Date();
    const startOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      0,
      0,
      0,
      0
    );
    const endOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      23,
      59,
      59,
      999
    );

    const todayStats = summary.filter(
      (record) =>
        record.studied_at >= startOfDay && record.studied_at <= endOfDay
    );

    const todayFlashcards = todayStats.filter(
      (r) => r.AiChatHistory?.response_type === "flashcard"
    );
    const todayQuizzes = todayStats.filter(
      (r) => r.AiChatHistory?.response_type === "quiz"
    );

    const todayFlashAccuracy =
      todayFlashcards.length > 0
        ? Math.round(
            (todayFlashcards.filter((r) => r.is_correct).length /
              todayFlashcards.length) *
              100
          )
        : 0;

    const todayQuizScore =
      todayQuizzes.filter((r) => r.score != null).length > 0
        ? Math.round(
            todayQuizzes
              .filter((r) => r.score != null)
              .reduce((sum, r) => sum + r.score, 0) /
              todayQuizzes.filter((r) => r.score != null).length
          )
        : 0;

    res.json({
      user: {
        id: req.user.id,
        username: req.user.username,
        email: req.user.email,
      },
      today: {
        flashcardAccuracy: todayFlashAccuracy,
        quizScore: todayQuizScore,
        flashcardCount: todayFlashcards.length,
        quizCount: todayQuizzes.length,
        studyTime: Math.round(
          todayStats.reduce((sum, r) => sum + (r.duration_ms || 0), 0) / 60000
        ),
      },
      all_time: {
        totalSessions: summary.length,
        totalPoints: allTimeStats.totalFlashcards + allTimeStats.totalQuizzes,
        totalStudyTime: Math.round(allTimeStats.totalStudyTime / 60000) + "m",
        flashAccuracy: flashAccuracy,
        avgQuizScore: avgQuizScore,
        totalFlashcards: allTimeStats.totalFlashcards,
        totalQuizzes: allTimeStats.totalQuizzes,
      },
    });
  } catch (error) {
    console.error("Current user data error:", error);
    res.status(500).json({ error: "Failed to fetch user data" });
  }
});

// Protected endpoint to get current user's daily chart data
router.get("/daily-chart", authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
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

      // Calculate daily study time
      const dailyStudyTime = rows.reduce((total, record) => {
        return total + (record.duration_ms || 0);
      }, 0);

      chartData.push({
        date: date.toISOString().split("T")[0],
        day: date.toLocaleDateString("en-US", { weekday: "short" }),
        flashcardAccuracy: flashAccuracy,
        quizScore: quizAvgScore,
        flashcardCount: flashStudied,
        quizCount: quizAttempts,
        duration_ms: dailyStudyTime,
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

// Protected endpoint to get current user's summary data
router.get("/summary", authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user summary
    const summary = await UserProgress.findAll({
      where: { user_id: userId },
      include: [
        {
          model: AiChatHistory,
          attributes: ["id", "response_type"],
        },
      ],
      order: [["studied_at", "DESC"]],
    });

    // Calculate all-time stats
    const allTimeStats = summary.reduce(
      (stats, record) => {
        if (record.AiChatHistory?.response_type === "flashcard") {
          stats.totalFlashcards++;
          if (record.is_correct) stats.correctFlashcards++;
          stats.totalStudyTime += record.duration_ms || 0;
        } else if (record.AiChatHistory?.response_type === "quiz") {
          stats.totalQuizzes++;
          if (record.score != null) {
            stats.totalQuizScore += record.score;
            stats.quizCount++;
          }
          stats.totalStudyTime += record.duration_ms || 0;
        }
        return stats;
      },
      {
        totalFlashcards: 0,
        correctFlashcards: 0,
        totalQuizzes: 0,
        totalQuizScore: 0,
        quizCount: 0,
        totalStudyTime: 0,
      }
    );

    const flashAccuracy =
      allTimeStats.totalFlashcards > 0
        ? Math.round(
            (allTimeStats.correctFlashcards / allTimeStats.totalFlashcards) *
              100
          )
        : 0;

    const avgQuizScore =
      allTimeStats.quizCount > 0
        ? Math.round(allTimeStats.totalQuizScore / allTimeStats.quizCount)
        : 0;

    // Get today's stats
    const today = new Date();
    const startOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      0,
      0,
      0,
      0
    );
    const endOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      23,
      59,
      59,
      999
    );

    const todayStats = summary.filter(
      (record) =>
        record.studied_at >= startOfDay && record.studied_at <= endOfDay
    );

    const todayFlashcards = todayStats.filter(
      (r) => r.AiChatHistory?.response_type === "flashcard"
    );
    const todayQuizzes = todayStats.filter(
      (r) => r.AiChatHistory?.response_type === "quiz"
    );

    const todayFlashAccuracy =
      todayFlashcards.length > 0
        ? Math.round(
            (todayFlashcards.filter((r) => r.is_correct).length /
              todayFlashcards.length) *
              100
          )
        : 0;

    const todayQuizScore =
      todayQuizzes.filter((r) => r.score != null).length > 0
        ? Math.round(
            todayQuizzes
              .filter((r) => r.score != null)
              .reduce((sum, r) => sum + r.score, 0) /
              todayQuizzes.filter((r) => r.score != null).length
          )
        : 0;

    res.json({
      today: {
        flashcardAccuracy: todayFlashAccuracy,
        quizScore: todayQuizScore,
        flashcardCount: todayFlashcards.length,
        quizCount: todayQuizzes.length,
        studyTime: Math.round(
          todayStats.reduce((sum, r) => sum + (r.duration_ms || 0), 0) / 60000
        ),
      },
      all_time: {
        totalSessions: summary.length,
        totalPoints: allTimeStats.totalFlashcards + allTimeStats.totalQuizzes,
        totalStudyTime: Math.round(allTimeStats.totalStudyTime / 60000) + "m",
        flashAccuracy: flashAccuracy,
        avgQuizScore: avgQuizScore,
        totalFlashcards: allTimeStats.totalFlashcards,
        totalQuizzes: allTimeStats.totalQuizzes,
      },
    });
  } catch (error) {
    console.error("Current user summary error:", error);
    res.status(500).json({ error: "Failed to fetch user summary" });
  }
});

module.exports = router;
