const express = require("express");
const router = express.Router();
const { Session } = require("../database");
const { Sequelize } = require("sequelize");
const { authenticateJWT } = require("../auth");

//getting a study durations by userId(foregin key that references the id in users table)
router.get("/data", authenticateJWT, async (req, res) => {
  const userId = req.user.id; // Get userId from authenticated JWT token

  try {
    const sessions = await Session.findAll({
      where: {
        user_id: userId,
      },
      attributes: [
        "duration",
        [
          Sequelize.literal(`to_char("created_at",'MM-DD-YYYY')`),
          "formattedDate",
        ],
      ],
    });
    res.json(sessions);
  } catch (error) {
    console.log("ERR:", error);
    res.sendStatus(501);
  }
});

router.post("/data", authenticateJWT, async (req, res) => {
  const userId = req.user.id; // Get userId from authenticated JWT token
  const { duration } = req.body;

  const newSession = await Session.create({
    duration: duration,
    user_id: userId,
  });

  res.json(newSession);
});

module.exports = router;
