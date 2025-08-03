const express = require("express");
const router = express.Router();
const { Calculator } = require("../database");


// POST: Calculate a final grade. Creates a new grade entry in db
router.post("/grade-entry", async (req, res) => {
    const {user_id, assignment_type, assignment_grade, assignment_weight} = req.body;

    try {
        // check that required fields are not omitted
        if (!assignment_type || weight == null || score == null) {
            return res.status(400).json({error: "Missing required fields"});
        }
        // Create new grade entry in db
        const newGradeEntry = await Calculator.create({
            user_id,
            assignment_type,
            assignment_grade,
            assignment_weight
        });
        // Return new created grade entry
        res.status(201).json(newGradeEntry);
    } catch(error) {
        console.error("Error creating new grade entry: ", error);
        res.status(500).json({error: "Unable to calculate final grade. Sorry!"})
    }
});






module.exports = router;