const Student = require('../models/student.model');

function isValidId(value) {
  return Number.isInteger(Number(value)) && Number(value) > 0;
}

function validateStudent(body) {
  const requiredFields = [
    'studentNumber',
    'firstName',
    'lastName',
    'programId',
    'yearLevel',
    'section',
    'email'
  ];

  for (const field of requiredFields) {
    if (body[field] === undefined || String(body[field]).trim() === '') {
      return `${field} is required.`;
    }
  }

  if (!isValidId(body.programId)) {
    return 'programId must be a valid positive number.';
  }

  const yearLevel = Number(body.yearLevel);
  if (!Number.isInteger(yearLevel) || yearLevel < 1 || yearLevel > 5) {
    return 'yearLevel must be a whole number from 1 to 5.';
  }

  const email = String(body.email).trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'A valid email address is required.';
  }

  return null;
}

function handleDatabaseError(error, res) {
  if (error.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      success: false,
      message: 'A student with that student number or email already exists.',
      data: null
    });
  }

  if (error.code === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(400).json({
      success: false,
      message: 'The selected program does not exist.',
      data: null
    });
  }

  console.error(error);

  return res.status(500).json({
    success: false,
    message: 'A server error occurred while processing the student request.',
    data: null
  });
}

async function getStudents(req, res) {
  try {
    const search = String(req.query.search || '').trim();
    const programId = req.query.programId;

    if (programId && !isValidId(programId)) {
      return res.status(400).json({
        success: false,
        message: 'programId must be a valid positive number.',
        data: null
      });
    }

    const students = await Student.listStudents({ search, programId });

    return res.status(200).json({
      success: true,
      data: students
    });
  } catch (error) {
    return handleDatabaseError(error, res);
  }
}

async function getStudentById(req, res) {
  try {
    const { studentId } = req.params;

    if (!isValidId(studentId)) {
      return res.status(400).json({
        success: false,
        message: 'A valid studentId is required.',
        data: null
      });
    }

    const student = await Student.findStudentById(Number(studentId));

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found.',
        data: null
      });
    }

    return res.status(200).json({
      success: true,
      data: student
    });
  } catch (error) {
    return handleDatabaseError(error, res);
  }
}

async function addStudent(req, res) {
  try {
    const body = req.body || {};
    const validationError = validateStudent(body);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
        data: null
      });
    }

    const student = await Student.createStudent({
      studentNumber: String(body.studentNumber).trim(),
      firstName: String(body.firstName).trim(),
      middleName: body.middleName
        ? String(body.middleName).trim()
        : null,
      lastName: String(body.lastName).trim(),
      programId: Number(body.programId),
      yearLevel: Number(body.yearLevel),
      section: String(body.section).trim(),
      email: String(body.email).trim()
    });

    return res.status(201).json({
      success: true,
      message: 'Student added successfully.',
      data: student
    });
  } catch (error) {
    return handleDatabaseError(error, res);
  }
}

async function editStudent(req, res) {
  try {
    const { studentId } = req.params;

    if (!isValidId(studentId)) {
      return res.status(400).json({
        success: false,
        message: 'A valid studentId is required.',
        data: null
      });
    }

    const body = req.body || {};
    const validationError = validateStudent(body);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
        data: null
      });
    }

    const student = await Student.updateStudent(Number(studentId), {
      studentNumber: String(body.studentNumber).trim(),
      firstName: String(body.firstName).trim(),
      middleName: body.middleName
        ? String(body.middleName).trim()
        : null,
      lastName: String(body.lastName).trim(),
      programId: Number(body.programId),
      yearLevel: Number(body.yearLevel),
      section: String(body.section).trim(),
      email: String(body.email).trim()
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found.',
        data: null
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Student updated successfully.',
      data: student
    });
  } catch (error) {
    return handleDatabaseError(error, res);
  }
}

async function deleteStudent(req, res) {
  try {
    const { studentId } = req.params;

    if (!isValidId(studentId)) {
      return res.status(400).json({
        success: false,
        message: 'A valid studentId is required.',
        data: null
      });
    }

    const deleted = await Student.deleteStudent(Number(studentId));

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Student not found.',
        data: null
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Student deleted successfully.',
      data: null
    });
  } catch (error) {
    if (
      error.code === 'ER_ROW_IS_REFERENCED_2' ||
      error.errno === 1451
    ) {
      return res.status(409).json({
        success: false,
        message: 'Cannot delete this student because related records, such as registrations, reference them.',
        data: null
      });
    }

    return handleDatabaseError(error, res);
  }
}

module.exports = {
  getStudents,
  getStudentById,
  addStudent,
  editStudent,
  deleteStudent
};
