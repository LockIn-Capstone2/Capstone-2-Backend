const express = require("express");
const router = express.Router();
const { Calculator } = require("../database");

// POST: Calculate a final grade. Creates a new grade entry in db
router.post("/new-grade-entry", async (req, res) => {
  const { user_id, assignment_type, assignment_name, assignment_grade, assignment_weight } =
    req.body;
  console.log(req.body.user_id)
  try {
    // check that required fields are not omitted
    if (
      !assignment_type ||
      !assignment_name ||
      assignment_weight == null ||
      assignment_grade == null
    ) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Create new grade entry in db
    const newGradeEntry = await Calculator.create({
      user_id: req.body.user_id,
      assignment_type: req.body.assignment_type,
      assignment_name: req.body.assignment_name,
      assignment_grade: req.body.assignment_grade,
      assignment_weight: req.body.assignment_weight
    });
    newGradeEntry.save()

    // Return new created grade entry
    res.status(201).json(newGradeEntry);
  } catch (error) {
    console.error("Error creating new grade entry: ", error);
    res.status(500).json({ error: "Unable to calculate final grade. Sorry!" });
  }
});

// GET: Fetch all of user's past grade-calculator entries.
router.get("/grade-entries/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    const entries = await Calculator.findAll({ where: { user_id: userId } });
    res.status(200).json(entries);
  } catch (error) {
    console.error("Error fetching previous grade entries for user", error);
    res
      .status(500)
      .json({ error: "Unable to return your previous grade entries. Sorry!" });
  }
});

// GET: Fetch a specific grade-calculator entry
router.get("/grade-entry/:entryId", async (req, res) => {
  try {
    const entryId = req.params.entryId;
    const entry = await Calculator.findByPk(entryId);
    if (!entry) {
      return res.status(404).json({ error: "Entry not found" });
    }
    res.json(entry);
  } catch (error) {
    console.error("Error fetching previous grade entry");
    res
      .status(500)
      .json({ error: "Unable to return previous grade entry. Sorry!" });
  }
});

// PUT: Update a specific grade entry by ID
router.put("/grade-entry/:entryId", async (req, res) => {
  try {
    const entryId = req.params.entryId;
    const { assignment_grade, assignment_weight } = req.body;
    const entry = await Calculator.findByPk(entryId);
    if (!entry) {
      return res.status(404).json({ error: "Entry not found" });
    }
    // update the assignment grade and weight if provided; otherwise, keep the existing values
    entry.assignment_grade = assignment_grade ?? entry.assignment_grade;
    entry.assignment_weight = assignment_weight ?? entry.assignment_weight;
    await entry.save();
    res.json(entry);
  } catch (error) {
    console.error("Error updating grade entry: ", error);
    res.status(500).json({ error: "Unable to update grade entry. Sorry!" });
  }
});

// DELETE: Delete a specific grade entry
router.delete("/grade-entry/:entryId", async (req, res) => {
  try {
    const entryId = req.params.entryId;
    const deleted = await Calculator.destroy({ where: { id: entryId } });
    if (!deleted) {
      return res.status(404).json({ error: "Entry not found" });
    }
    res.json({ message: "Grade entry deleted" });
  } catch (error) {
    console.error("Error deleting grade entry: ", error);
    res.status(500).json({ error: "Unable to delete grade entry" });
  }
});

module.exports = router;