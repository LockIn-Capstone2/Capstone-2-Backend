const express = require("express");
const router = express.Router();
const { Session } = require("../database");

//getting a study durations by userId(foregin key that references the id in users table)
router.get("/data/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    const sessions = await Session.findAll({
      where: {
        user_id: userId,
      },
      attributes: ["duration", "created_at"],
    });

    res.json(sessions);
  } catch (error) {
    res.sendStatus(501);
  }
});

module.exports = router;
