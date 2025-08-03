const express = require("express");
const router = express.Router();

const testDbRouter = require("./test-db");
const taskOrganizerRouter = require("./TaskOrganizer");
const CaclulatorRouter = require("./Calculator");

router.use("/test-db", testDbRouter);
router.use("/tasks", taskOrganizerRouter); 
router.use("/grade-calculator", CaclulatorRouter);

module.exports = router;
