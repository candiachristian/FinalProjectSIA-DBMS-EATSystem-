const crypto = require('crypto');
const { promisify } = require('util');
const Auth = require('../models/auth.model');

const scrypt = promisify(crypto.scrypt);

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = await scrypt(password, salt, 64);

  return `${salt}:${hash.toString('hex')}`;
}

async function passwordMatches(password, storedHash) {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;

  const [salt, savedHash] = parts;
  const hash = await scrypt(password, salt, 64);
  const savedBuffer = Buffer.from(savedHash, 'hex');
  const hashBuffer = Buffer.from(hash);

  return savedBuffer.length === hashBuffer.length &&
    crypto.timingSafeEqual(savedBuffer, hashBuffer);
}

async function signup(req, res) {
  const {
    studentNumber,
    firstName,
    middleName,
    lastName,
    department,
    programName,
    yearLevel,
    section,
    email,
    password
  } = req.body;

  if (
    !studentNumber || !firstName || !lastName ||
    !department || !programName || !yearLevel ||
    !section || !email || !password
  ) {
    return res.status(400).json({
      success: false,
      message: 'Please complete all required fields.'
    });
  }

  if (password.length < 4) {
    return res.status(400).json({
      success: false,
      message: 'Password must be at least 4 characters.'
    });
  }

  const year = Number(yearLevel);
  if (!Number.isInteger(year) || year < 1 || year > 5) {
    return res.status(400).json({
      success: false,
      message: 'Year level must be between 1 and 5.'
    });
  }

  try {
    const program = await Auth.findProgram(
      programName.trim(),
      department.trim()
    );

    if (!program) {
      return res.status(400).json({
        success: false,
        message: 'That program and department are not in the database.'
      });
    }

    const studentRole = await Auth.findStudentRole();

    if (!studentRole) {
      return res.status(500).json({
        success: false,
        message: 'The student role has not been set up.'
      });
    }

    const passwordHash = await hashPassword(password);

    await Auth.createStudentAccount(
      {
        studentNumber: studentNumber.trim(),
        firstName: firstName.trim(),
        middleName: middleName ? middleName.trim() : '',
        lastName: lastName.trim(),
        yearLevel: year,
        section: section.trim(),
        email: email.trim()
      },
      passwordHash,
      studentRole.role_id,
      program.program_id
    );

    return res.status(201).json({
      success: true,
      message: 'Account created. You can now log in.'
    });
  } catch (error) {
    console.error(error);

    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: 'That student number or email is already registered.'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Could not create the account.'
    });
  }
}

async function login(req, res) {
  const { studentNumber, password } = req.body;

  if (!studentNumber || !password) {
    return res.status(400).json({
      success: false,
      message: 'Enter your student ID and password.'
    });
  }

  try {
    const user = await Auth.findLoginUser(studentNumber.trim());

    if (
      !user ||
      !user.password_hash ||
      !(await passwordMatches(password, user.password_hash))
    ) {
      return res.status(401).json({
        success: false,
        message: 'Invalid student ID or password.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      user: {
        userId: user.user_id,
        studentId: user.student_id,
        studentNumber: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role_name
      }
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: 'Could not log in.'
    });
  }
}

module.exports = { signup, login };
