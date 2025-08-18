const express = require("express");
const router = express.Router();
const { StreakSession, UserProgress } = require("../database");
const { Op } = require("sequelize");

// Calculate streak based on study activity (not just session starts)
const calculateStreak = async (userId) => {
  try {
    // Get all study activities for the user
    const studyActivities = await UserProgress.findAll({
      where: { user_id: userId },
      attributes: ["studied_at"],
      order: [["studied_at", "DESC"]],
    });

    if (studyActivities.length === 0) {
      return { currentStreak: 0, longestStreak: 0, lastStudyDate: null };
    }

    // Get unique study dates (converted to local date)
    const studyDates = [
      ...new Set(
        studyActivities.map((activity) => {
          const date = new Date(activity.studied_at);
          return new Date(date.getFullYear(), date.getMonth(), date.getDate());
        })
      ),
    ].sort((a, b) => b - a); // Sort descending (most recent first)

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    const today = new Date();
    const yesterday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() - 1
    );

    // Check if user studied today or yesterday to start current streak
    const todayDate = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    const yesterdayDate = new Date(
      yesterday.getFullYear(),
      yesterday.getMonth(),
      yesterday.getDate()
    );

    const studiedToday = studyDates.some(
      (date) => date.getTime() === todayDate.getTime()
    );
    const studiedYesterday = studyDates.some(
      (date) => date.getTime() === yesterdayDate.getTime()
    );

    // Calculate current streak
    if (studiedToday) {
      currentStreak = 1;
      let checkDate = yesterdayDate;

      for (let i = 1; i < studyDates.length; i++) {
        const expectedDate = new Date(
          todayDate.getTime() - i * 24 * 60 * 60 * 1000
        );
        const foundDate = studyDates.find(
          (date) => date.getTime() === expectedDate.getTime()
        );

        if (foundDate) {
          currentStreak++;
        } else {
          break;
        }
      }
    } else if (studiedYesterday) {
      currentStreak = 1;
      let checkDate = new Date(yesterdayDate.getTime() - 24 * 60 * 60 * 1000);

      for (let i = 2; i < studyDates.length; i++) {
        const expectedDate = new Date(
          yesterdayDate.getTime() - (i - 1) * 24 * 60 * 60 * 1000
        );
        const foundDate = studyDates.find(
          (date) => date.getTime() === expectedDate.getTime()
        );

        if (foundDate) {
          currentStreak++;
        } else {
          break;
        }
      }
    }

    // Calculate longest streak
    for (let i = 0; i < studyDates.length - 1; i++) {
      const currentDate = studyDates[i];
      const nextDate = studyDates[i + 1];
      const diffDays = Math.floor(
        (currentDate - nextDate) / (24 * 60 * 60 * 1000)
      );

      if (diffDays === 1) {
        tempStreak++;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak + 1);
        tempStreak = 0;
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak + 1);

    return {
      currentStreak,
      longestStreak,
      lastStudyDate: studyDates[0],
      totalStudyDays: studyDates.length,
    };
  } catch (error) {
    console.error("Error calculating streak:", error);
    return { currentStreak: 0, longestStreak: 0, lastStudyDate: null };
  }
};

// Get comprehensive streak information
router.get("/streak/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    const streakInfo = await calculateStreak(userId);

    // Get recent study activity for context
    const recentActivity = await UserProgress.findAll({
      where: { user_id: userId },
      include: [
        {
          model: require("../database").AiChatHistory,
          attributes: ["response_type"],
        },
      ],
      order: [["studied_at", "DESC"]],
      limit: 10,
    });

    // Calculate streak milestones
    const milestones = [1, 3, 7, 14, 30, 60, 100, 365];
    const achievedMilestones = milestones.filter(
      (milestone) => streakInfo.longestStreak >= milestone
    );

    res.json({
      ...streakInfo,
      recentActivity: recentActivity.map((activity) => ({
        id: activity.id,
        type: activity.AiChatHistory?.response_type,
        studiedAt: activity.studied_at,
        isCorrect: activity.is_correct,
        score: activity.score,
      })),
      achievedMilestones,
      nextMilestone:
        milestones.find((milestone) => milestone > streakInfo.currentStreak) ||
        null,
    });
  } catch (error) {
    console.error("Streak calculation error:", error);
    res.status(500).json({ error: "Failed to calculate streak" });
  }
});

// Start a study session
router.post("/start", async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    // Check for existing active session
    const existingSession = await StreakSession.findOne({
      where: {
        user_id: userId,
        endTime: null,
      },
      attributes: [
        "id",
        "user_id",
        "startTime",
        "endTime",
        "createdAt",
        "updatedAt",
      ], // Only select existing columns
      order: [["startTime", "DESC"]],
    });

    if (existingSession) {
      return res.status(409).json({
        error: "Active session already exists",
        session: existingSession,
      });
    }

    const session = await StreakSession.create({
      user_id: userId,
      startTime: new Date(),
    });

    res.status(201).json({
      message: "Session started",
      session,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Session start error:", error);
    res.status(500).json({ error: "Failed to start session" });
  }
});

// End a study session
router.post("/end", async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const session = await StreakSession.findOne({
      where: {
        user_id: userId,
        endTime: null,
      },
      attributes: [
        "id",
        "user_id",
        "startTime",
        "endTime",
        "createdAt",
        "updatedAt",
      ], // Only select existing columns
      order: [["startTime", "DESC"]],
    });

    if (!session) {
      return res.status(404).json({ error: "No active session found" });
    }

    session.endTime = new Date();
    await session.save();

    // Calculate session duration
    const duration = session.endTime - session.startTime;
    const durationMinutes = Math.floor(duration / (1000 * 60));

    res.json({
      message: "Session ended",
      session,
      duration: {
        milliseconds: duration,
        minutes: durationMinutes,
        formatted: `${Math.floor(durationMinutes / 60)}h ${
          durationMinutes % 60
        }m`,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Session end error:", error);
    res.status(500).json({ error: "Failed to end session" });
  }
});

// Get session history
router.get("/history/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    const { limit = 20, offset = 0 } = req.query;

    const sessions = await StreakSession.findAll({
      where: { user_id: userId },
      attributes: [
        "id",
        "user_id",
        "startTime",
        "endTime",
        "createdAt",
        "updatedAt",
      ], // Only select existing columns
      order: [["startTime", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    const sessionsWithDuration = sessions.map((session) => {
      const duration = session.endTime
        ? session.endTime - session.startTime
        : new Date() - session.startTime;

      return {
        id: session.id,
        startTime: session.startTime,
        endTime: session.endTime,
        duration: {
          milliseconds: duration,
          minutes: Math.floor(duration / (1000 * 60)),
          formatted: session.endTime
            ? `${Math.floor(duration / (1000 * 60 * 60))}h ${Math.floor(
                (duration % (1000 * 60 * 60)) / (1000 * 60)
              )}m`
            : "Active",
        },
        isActive: !session.endTime,
      };
    });

    res.json({
      sessions: sessionsWithDuration,
      total: sessions.length,
      hasMore: sessions.length === parseInt(limit),
    });
  } catch (error) {
    console.error("Session history error:", error);
    res.status(500).json({ error: "Failed to fetch session history" });
  }
});

// Get streak statistics
router.get("/stats/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;

    // Get all sessions
    const allSessions = await StreakSession.findAll({
      where: { user_id: userId },
      attributes: [
        "id",
        "user_id",
        "startTime",
        "endTime",
        "createdAt",
        "updatedAt",
      ], // Only select existing columns
      order: [["startTime", "ASC"]],
    });

    // Get all study activities
    const allActivities = await UserProgress.findAll({
      where: { user_id: userId },
      order: [["studied_at", "ASC"]],
    });

    // Calculate statistics
    const totalSessions = allSessions.length;
    const totalStudyTime = allSessions
      .filter((s) => s.endTime)
      .reduce(
        (total, session) => total + (session.endTime - session.startTime),
        0
      );

    const avgSessionLength =
      totalSessions > 0
        ? Math.floor(totalStudyTime / totalSessions / (1000 * 60))
        : 0;

    const studyDays = [
      ...new Set(
        allActivities.map((activity) => {
          const date = new Date(activity.studied_at);
          return new Date(date.getFullYear(), date.getMonth(), date.getDate())
            .toISOString()
            .split("T")[0];
        })
      ),
    ].length;

    const streakInfo = await calculateStreak(userId);

    res.json({
      totalSessions,
      totalStudyTime: {
        milliseconds: totalStudyTime,
        minutes: Math.floor(totalStudyTime / (1000 * 60)),
        hours: Math.floor(totalStudyTime / (1000 * 60 * 60)),
        formatted: `${Math.floor(
          totalStudyTime / (1000 * 60 * 60)
        )}h ${Math.floor((totalStudyTime % (1000 * 60 * 60)) / (1000 * 60))}m`,
      },
      avgSessionLength: {
        minutes: avgSessionLength,
        formatted: `${Math.floor(avgSessionLength / 60)}h ${
          avgSessionLength % 60
        }m`,
      },
      studyDays,
      currentStreak: streakInfo.currentStreak,
      longestStreak: streakInfo.longestStreak,
      lastStudyDate: streakInfo.lastStudyDate,
    });
  } catch (error) {
    console.error("Stats calculation error:", error);
    res.status(500).json({ error: "Failed to calculate statistics" });
  }
});

module.exports = router;
