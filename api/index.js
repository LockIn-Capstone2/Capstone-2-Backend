const express = require("express");
const router = express.Router();
const testDbRouter = require("./test-db");
const chatRouter = require("./aichathistory");

router.use("/test-db", testDbRouter);
router.use("/chat", chatRouter);

module.exports = router;
