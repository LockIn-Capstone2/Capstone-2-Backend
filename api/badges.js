const express = require("express");
const router = express.Router();
const { Op } = require("sequelize");
const {
  Badge,
  UserBadge,
  UserProgress,
  AiChatHistory,
} = require("../database");

// Get all available badges
router.get("/", async (req, res) => {
  try {
    const badges = await Badge.findAll({
      order: [
        ["category", "ASC"],
        ["requirement_value", "ASC"],
      ],
    });
    res.json(badges);
  } catch (error) {
    console.error("Error fetching badges:", error);
    res.status(500).json({ error: "Failed to fetch badges" });
  }
});

// Get user's earned badges
router.get("/user/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    const userBadges = await UserBadge.findAll({
      where: { user_id: userId },
      include: [
        {
          model: Badge,
          attributes: [
            "id",
            "name",
            "description",
            "icon",
            "category",
            "rarity",
            "points",
          ],
        },
      ],
      order: [["earned_at", "DESC"]],
    });

    res.json(userBadges);
  } catch (error) {
    console.error("Error fetching user badges:", error);
    res.status(500).json({ error: "Failed to fetch user badges" });
  }
});

// Get user's badge progress (earned + progress towards unearned)
router.get("/progress/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    // Get all badges
    const allBadges = await Badge.findAll({
      order: [
        ["category", "ASC"],
        ["requirement_value", "ASC"],
      ],
    });

    // Get user's earned badges
    const earnedBadges = await UserBadge.findAll({
      where: { user_id: userId },
      include: [
        {
          model: Badge,
          attributes: [
            "id",
            "name",
            "description",
            "icon",
            "category",
            "rarity",
            "points",
          ],
        },
      ],
    });

    const earnedBadgeIds = earnedBadges.map((ub) => ub.badge_id);

    // Calculate user's current stats
    const userStats = await calculateUserStats(userId);

    // Build progress array
    const badgeProgress = allBadges.map((badge) => {
      const earned = earnedBadges.find((ub) => ub.badge_id === badge.id);
      const currentValue = getCurrentValue(badge.requirement_type, userStats);
      const isEarned = earned !== undefined;
      const progress = Math.min(
        (currentValue / badge.requirement_value) * 100,
        100
      );

      return {
        badge: {
          id: badge.id,
          name: badge.name,
          description: badge.description,
          icon: badge.icon,
          category: badge.category,
          rarity: badge.rarity,
          points: badge.points,
          requirement_type: badge.requirement_type,
          requirement_value: badge.requirement_value,
        },
        earned: isEarned,
        earned_at: earned?.earned_at,
        current_value: currentValue,
        progress_percentage: progress,
        is_new: earned?.is_new || false,
      };
    });

    res.json({
      badgeProgress,
      totalEarned: earnedBadges.length,
      totalBadges: allBadges.length,
      userStats,
    });
  } catch (error) {
    console.error("Error calculating badge progress:", error);
    res.status(500).json({ error: "Failed to calculate badge progress" });
  }
});

// Mark badge as viewed (remove "NEW" status)
router.put("/view/:userId/:badgeId", async (req, res) => {
  const { userId, badgeId } = req.params;

  try {
    await UserBadge.update(
      { is_new: false },
      { where: { user_id: userId, badge_id: badgeId } }
    );

    res.json({ message: "Badge marked as viewed" });
  } catch (error) {
    console.error("Error marking badge as viewed:", error);
    res.status(500).json({ error: "Failed to mark badge as viewed" });
  }
});

// Check and award badges (called after user activity)
router.post("/check/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    const newlyEarnedBadges = await checkAndAwardBadges(userId);

    res.json({
      message: "Badge check completed",
      newlyEarned: newlyEarnedBadges,
      count: newlyEarnedBadges.length,
    });
  } catch (error) {
    console.error("Error checking badges:", error);
    res.status(500).json({ error: "Failed to check badges" });
  }
});

// Helper function to calculate user stats
async function calculateUserStats(userId) {
  // Get all user progress
  const allProgress = await UserProgress.findAll({
    where: { user_id: userId },
    include: [
      {
        model: AiChatHistory,
        attributes: ["id", "response_type"],
      },
    ],
  });

  // Calculate streak (simplified - you might want to use the streak API)
  const today = new Date();
  const startOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  const todayProgress = allProgress.filter(
    (p) => new Date(p.studied_at) >= startOfToday
  );
  const currentStreak = todayProgress.length > 0 ? 7 : 0; // Simplified for now

  // Calculate quiz count
  const quizProgress = allProgress.filter(
    (p) => p.AiChatHistory?.response_type === "quiz"
  );
  const quizCount = quizProgress.length;

  // Calculate accuracy
  const flashcardProgress = allProgress.filter(
    (p) => p.AiChatHistory?.response_type === "flashcard"
  );
  const correctFlashcards = flashcardProgress.filter(
    (p) => p.is_correct === true
  ).length;
  const totalFlashcards = flashcardProgress.length;
  const accuracy =
    totalFlashcards > 0
      ? Math.round((correctFlashcards / totalFlashcards) * 100)
      : 0;

  // Calculate average completion time
  const validDurations = allProgress.filter(
    (p) => p.duration_ms && p.duration_ms > 0
  );
  const avgCompletionTime =
    validDurations.length > 0
      ? Math.round(
          validDurations.reduce((sum, p) => sum + p.duration_ms, 0) /
            validDurations.length
        )
      : 0;

  // Calculate total study days
  const uniqueDays = [
    ...new Set(
      allProgress.map((p) => new Date(p.studied_at).toISOString().split("T")[0])
    ),
  ];
  const totalDays = uniqueDays.length;

  return {
    currentStreak,
    quizCount,
    accuracy,
    avgCompletionTime,
    totalDays,
  };
}

// Helper function to get current value for a requirement type
function getCurrentValue(requirementType, userStats) {
  switch (requirementType) {
    case "streak_days":
      return userStats.currentStreak;
    case "quiz_count":
      return userStats.quizCount;
    case "accuracy_percentage":
      return userStats.accuracy;
    case "completion_time":
      return userStats.avgCompletionTime;
    case "total_days":
      return userStats.totalDays;
    default:
      return 0;
  }
}

// Helper function to check and award badges
async function checkAndAwardBadges(userId) {
  const userStats = await calculateUserStats(userId);
  const allBadges = await Badge.findAll();
  const earnedBadges = await UserBadge.findAll({
    where: { user_id: userId },
    attributes: ["badge_id"],
  });

  const earnedBadgeIds = earnedBadges.map((ub) => ub.badge_id);
  const newlyEarnedBadges = [];

  for (const badge of allBadges) {
    // Skip if already earned
    if (earnedBadgeIds.includes(badge.id)) {
      continue;
    }

    const currentValue = getCurrentValue(badge.requirement_type, userStats);

    // Check if badge should be awarded
    if (currentValue >= badge.requirement_value) {
      // Award the badge
      const userBadge = await UserBadge.create({
        user_id: userId,
        badge_id: badge.id,
        progress_value: currentValue,
        is_new: true,
      });

      newlyEarnedBadges.push({
        badge: {
          id: badge.id,
          name: badge.name,
          description: badge.description,
          icon: badge.icon,
          category: badge.category,
          rarity: badge.rarity,
          points: badge.points,
        },
        earned_at: userBadge.earned_at,
        progress_value: currentValue,
      });
    }
  }

  return newlyEarnedBadges;
}

module.exports = router;
module.exports.checkAndAwardBadges = checkAndAwardBadges;
