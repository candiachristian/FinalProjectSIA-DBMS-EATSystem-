"use strict";

const Registration = require("../models/registration.model");
const fs = require("fs/promises");
const path = require("path");

const VALID_STATUSES = [
  "Registered",
  "Cancelled"
];

const proofDirectory = path.resolve(
  __dirname,
  "../../public/uploads/proofs"
);

function isPositiveInt(value) {
  return (
    Number.isInteger(Number(value)) &&
    Number(value) > 0
  );
}

async function removeStoredProof(proofPath) {
  if (
    typeof proofPath !== "string" ||
    !/^\/uploads\/proofs\/[A-Za-z0-9._-]+$/.test(
      proofPath
    )
  ) {
    return;
  }

  try {
    await fs.unlink(
      path.join(
        proofDirectory,
        path.basename(proofPath)
      )
    );
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error(
        "Could not remove proof image:",
        error
      );
    }
  }
}

async function removeNewUpload(file) {
  if (!file?.path) {
    return;
  }

  try {
    await fs.unlink(file.path);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error(
        "Could not remove failed proof upload:",
        error
      );
    }
  }
}

function sendError(response, error) {
  if (error.httpStatus ) {
    return response
      .status(error.httpStatus )
      .json({
        success: false,
        error: error.code,
        message: error.message
      });
  }

  console.error(error);

  return response
    .status(500)
    .json({
      success: false,
      error: "SERVER_ERROR",
      message: "Something went wrong."
    });
}

exports.list = async (req, res) => {
  try {
    const {
      eventId,
      student_id
    } = req.query;

    if (eventId !== undefined) {
      if (!isPositiveInt(eventId)) {
        return res.status(400).json({
          success: false,
          message:
            "eventId must be a positive number."
        });
      }

      return res.json({
        success: true,
        data:
          await Registration.getRosterByEvent(
            Number(eventId)
          )
      });
    }

    if (student_id !== undefined) {
      if (!isPositiveInt(student_id)) {
        return res.status(400).json({
          success: false,
          message:
            "student_id must be a positive number."
        });
      }

      return res.json({
        success: true,
        data:
          await Registration.listForStudent(
            Number(student_id)
          )
      });
    }

    return res.status(400).json({
      success: false,
      message:
        "eventId query parameter is required."
    });
  } catch (error) {
    return sendError(res, error);
  }
};

exports.create = async (req, res) => {
  try {
    const body = req.body || {};
    const {
      studentId,
      eventId
    } = body;

    if (
      !isPositiveInt(eventId) ||
      (
        studentId !== undefined &&
        studentId !== "" &&
        !isPositiveInt(studentId)
      )
    ) {
      await removeNewUpload(req.file);

      return res.status(400).json({
        success: false,
        message:
          "A valid eventId is required; if supplied, studentId must be a positive integer."
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "A proof image is required.",
        data: null
      });
    }

    let studentDetails = null;

    if (
      studentId === undefined ||
      studentId === ""
    ) {
      const yearLevel = Number(
        body.yearLevel
      );

      studentDetails = {
        studentNumber: body.studentNumber,
        firstName: body.firstName,
        middleName: body.middleName,
        lastName: body.lastName,
        departmentName: body.departmentName,
        programName: body.programName,
        yearLevel,
        section: body.section
      };

      if (
        !studentDetails.studentNumber ||
        !studentDetails.firstName ||
        !studentDetails.lastName ||
        !studentDetails.departmentName ||
        !studentDetails.programName ||
        !Number.isInteger(yearLevel) ||
        yearLevel < 1 ||
        yearLevel > 5 ||
        !studentDetails.section
      ) {
        await removeNewUpload(req.file);

        return res.status(400).json({
          success: false,
          message:
            "Enter student ID, first and last name, department, program, year (1-5), and section.",
          data: null
        });
      }
    }

    const data =
      await Registration.createRegistration({
        studentId:
          studentId === undefined ||
          studentId === ""
            ? null
            : Number(studentId),

        studentDetails,

        eventId: Number(eventId),

        proofImagePath:
          `/uploads/proofs/${req.file.filename}`
      });

    if (data.oldProofImagePath) {
      await removeStoredProof(
        data.oldProofImagePath
      );

      delete data.oldProofImagePath;
    }

    return res.status(201).json({
      success: true,
      data
    });
  } catch (error) {
    await removeNewUpload(req.file);
    return sendError(res, error);
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const {
      status
    } = req.body;

    if (
      !isPositiveInt(req.params.id) ||
      !VALID_STATUSES.includes(status)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Valid id and status (Registered or Cancelled) required."
      });
    }

    const data =
      await Registration.updateStatusByName(
        Number(req.params.id),
        status
      );

    return res.json({
      success: true,
      data
    });
  } catch (error) {
    return sendError(res, error);
  }
};

exports.remove = async (req, res) => {
  try {
    if (!isPositiveInt(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Valid id required."
      });
    }

    const proofPath =
      await Registration.deleteRegistration(
        Number(req.params.id)
      );

    await removeStoredProof(proofPath);

    return res.json({
      success: true,
      message: "Registration deleted."
    });
  } catch (error) {
    return sendError(res, error);
  }
};

exports.lookupStudents = async (
  req,
  res
) => {
  try {
    const term = String(
      req.query.search || ""
    ).trim();

    if (term.length < 1) {
      return res.status(400).json({
        success: false,
        message: "search is required."
      });
    }

    return res.json({
      success: true,
      data:
        await Registration.searchStudents(
          term
        )
    });
  } catch (error) {
    return sendError(res, error);
  }
};

exports.checkEligibility = async (
  req,
  res
) => {
  try {
    const studentId = Number(
      req.query.studentId
    );

    const eventId = Number(
      req.query.eventId
    );

    if (
      !Number.isInteger(studentId) ||
      studentId <= 0 ||
      !Number.isInteger(eventId) ||
      eventId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Valid studentId and eventId are required."
      });
    }

    const result =
      await Registration.checkProgramEligibility(
        studentId,
        eventId
      );

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    return sendError(res, error);
  }
};

exports.lookupEvents = async (
  req,
  res
) => {
  try {
    return res.json({
      success: true,
      data:
        await Registration.listEvents()
    });
  } catch (error) {
    return sendError(res, error);
  }
};