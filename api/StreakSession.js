const express = require("express");
const router = express.Router();
const { StreakSession } = require("../database");

router.post("/start", async (req, res) => {
  try {
    const { userId } = req.body;

    const session = await Session.create({
      userId,
      startTime: new Date(),
    });

    res.status(201).json({ message: "Session started", session });
  } catch (error) {
    res.status(500).json({ error: "Failed to start session" });
  }
});

router.post("/end", async (req, res) => {
  try {
    const { userId } = req.body;

    // find the most recent open session
    const session = await Session.findOne({
      where: { userId, endTime: null },
      order: [["startTime", "DESC"]],
    });

    if (!session) {
      return res.status(404).json({ error: "No active session found" });
    }

    session.endTime = new Date();
    await session.save();

    res.json({ message: "Session ended", session });
  } catch (error) {
    res.status(500).json({ error: "Failed to end session" });
  }
});

module.exports = router;
