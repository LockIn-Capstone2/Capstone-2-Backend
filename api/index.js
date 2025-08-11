const express = require("express");
const router = express.Router();

const testDbRouter = require("./test-db");
const taskOrganizerRouter = require("./TaskOrganizer");
const timerData = require("./timerData");
const CalculatorRouter = require("./Calculator");

router.use("/test-db", testDbRouter);
router.use("/", taskOrganizerRouter); 
router.use("/grade-calculator", CalculatorRouter);
router.use("/", timerData);

module.exports = router;