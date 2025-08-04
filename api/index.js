const express = require("express");
const router = express.Router();

const testDbRouter = require("./test-db");
const taskOrganizerRouter = require("./TaskOrganizer");

router.use("/test-db", testDbRouter);
router.use("/", taskOrganizerRouter); 

module.exports = router;
