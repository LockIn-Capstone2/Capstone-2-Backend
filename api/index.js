const express = require("express");
const router = express.Router();
const testDbRouter = require("./test-db");

const taskOrganizerRouter = require("./TaskOrganizer");
const timerData = require("./timerData");
const CalculatorRouter = require("./Calculator");
const signUp = require("../auth/index");
const chatRouter = require("./aichathistory");
const streakSessionRouter = require("./StreakSession");
const UserProgressRouter = require("./UserProgress");

router.use("/test-db", testDbRouter);
router.use("/", taskOrganizerRouter);
router.use("/grade-calculator", CalculatorRouter);
router.use("/", timerData);
router.use("/signup", signUp.router);
router.use("/chat", chatRouter);
router.use("/sessions", streakSessionRouter);
router.use("/progress", UserProgressRouter);

module.exports = router;
