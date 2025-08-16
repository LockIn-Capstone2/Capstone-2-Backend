const express = require("express");
const router = express.Router();
const { StreakSession } = require("../database");

router.get("/streak/:userId", async (req, res) => {
  const userId = req.params.userId;

  const sessions = await StreakSession.findAll({
    where: { userId },
    order: [["startTime", "ASC"]],
  });

  if (sessions.length === 0) return res.json({ streak: 0 });

  let streak = 1;

  for (let i = 1; i < sessions.length; i++) {
    const lastDate = new Date(sessions[i - 1].startTime).setHours(0, 0, 0, 0);
    const currentDate = new Date(sessions[i].startTime).setHours(0, 0, 0, 0);
    const diffDays = (currentDate - lastDate) / (1000 * 60 * 60 * 24);

    if (diffDays === 1) streak++;
    else if (diffDays > 1) streak = 1;
  }

  res.json({ streak });
});

router.post("/start", async (req, res) => {
  const { userId } = req.body;
  try {
    const session = await StreakSession.create({
      userId,
      startTime: new Date(),
    });
    res.status(201).json({ message: "Session started", session });
  } catch (err) {
    res.status(500).json({ error: "Failed to start session" });
  }
});

router.post("/end", async (req, res) => {
  const { userId } = req.body;
  try {
    const session = await StreakSession.findOne({
      where: { userId, endTime: null },
      order: [["startTime", "DESC"]],
    });
    if (!session)
      return res.status(404).json({ error: "No active session found" });

    session.endTime = new Date();
    await session.save();
    res.json({ message: "Session ended", session });
  } catch (err) {
    res.status(500).json({ error: "Failed to end session" });
  }
});

module.exports = router;
