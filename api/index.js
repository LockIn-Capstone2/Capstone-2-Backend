const express = require("express");
const router = express.Router();

const testDbRouter = require("./test-db");
const taskOrganizerRouter = require("./TaskOrganizer");
const timerData = require("./timerData");

router.use("/test-db", testDbRouter);
router.use("/", taskOrganizerRouter);
router.use("/", timerData);

module.exports = router;
