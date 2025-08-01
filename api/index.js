const express = require("express");
const router = express.Router();

const testDbRouter = require("./test-db");
const taskOrganizerRouter = require("./TaskOrganizer");

router.use("/test-db", testDbRouter);
router.use("/tasks", taskOrganizerRouter); 

module.exports = router;
