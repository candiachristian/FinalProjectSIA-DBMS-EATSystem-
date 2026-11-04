const AcademicTerm = require("../models/academicTerm.model");

function isPositiveInteger(value) {
  return Number.isInteger(Number(value)) && Number(value) > 0;
}

function handleError(error, res) {
  if (error.code === "ER_DUP_ENTRY") {
    return res.status(409).json({
      success: false,
      message: "That academic term already exists.",
      data: null
    });
  }

  console.error("Academic term API error:", error);

  return res.status(500).json({
    success: false,
    message:
      "A server error occurred while processing the academic term.",
    data: null
  });
}

async function getTerms(req, res) {
  try {
    const terms = await AcademicTerm.listTerms();

    return res.status(200).json({
      success: true,
      data: terms
    });
  } catch (error) {
    return handleError(error, res);
  }
}

async function getTermById(req, res) {
  try {
    if (!isPositiveInteger(req.params.termId)) {
      return res.status(400).json({
        success: false,
        message: "A valid termId is required.",
        data: null
      });
    }

    const term = await AcademicTerm.findTermById(
      Number(req.params.termId)
    );

    if (!term) {
      return res.status(404).json({
        success: false,
        message: "Academic term not found.",
        data: null
      });
    }

    return res.status(200).json({
      success: true,
      data: term
    });
  } catch (error) {
    return handleError(error, res);
  }
}

async function addTerm(req, res) {
  try {
    const termName = String(req.body?.termName || "").trim();

    if (!termName || termName.length > 80) {
      return res.status(400).json({
        success: false,
        message:
          "termName is required and must not exceed 80 characters.",
        data: null
      });
    }

    const term = await AcademicTerm.createTerm(termName);

    return res.status(201).json({
      success: true,
      message: "Academic term created successfully.",
      data: term
    });
  } catch (error) {
    return handleError(error, res);
  }
}

module.exports = {
  getTerms,
  getTermById,
  addTerm
};
