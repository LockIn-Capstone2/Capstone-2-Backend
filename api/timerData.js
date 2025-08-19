const express = require("express");
const router = express.Router();
const { Session } = require("../database");
const { Sequelize } = require("sequelize");
//getting a study durations by userId(foregin key that references the id in users table)
router.get("/data/:userId", async (req, res) => {
  const { userId } = req.params;
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

router.post("/data/:userId", async (req, res) => {
  const { userId } = req.params;
  const { duration } = req.body;

  const newSession = await Session.create({
    duration: duration,
    user_id: userId,
  });

  res.json(newSession);
});

module.exports = router;
