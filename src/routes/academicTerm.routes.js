const express = require("express");
const AcademicTermController = require("../controllers/academicTerm.controller");

const router = express.Router();

router.get("/", AcademicTermController.getTerms);
router.get("/:termId", AcademicTermController.getTermById);
router.post("/", AcademicTermController.addTerm);

module.exports = router;
