const db = require("../config/db");

async function findProgram(programName, department) {
  const [rows] = await db.query(
    `SELECT program_id
     FROM programs
     WHERE program_name = ? AND department = ?`,
    [programName, department],
  );

  return rows[0];
}

async function findStudentRole() {
  const [rows] = await db.query(
    `SELECT role_id
     FROM roles
     WHERE role_name = ?`,
    ["student"],
  );

  return rows[0];
}

async function createStudentAccount(data, passwordHash, roleId, programId) {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [userResult] = await connection.query(
      `INSERT INTO users (username, password_hash, role_id)
       VALUES (?, ?, ?)`,
      [data.studentNumber, passwordHash, roleId],
    );

    await connection.query(
      `INSERT INTO students
       (user_id, student_number, first_name, middle_name, last_name,
        program_id, year_level, section, email)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userResult.insertId,
        data.studentNumber,
        data.firstName,
        data.middleName || null,
        data.lastName,
        programId,
        data.yearLevel,
        data.section,
        data.email,
      ],
    );

    await connection.commit();
    return userResult.insertId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function findLoginUser(studentNumber) {
  const [rows] = await db.query(
    `SELECT u.user_id, u.username, u.password_hash,
            r.role_name, s.student_id, s.first_name, s.last_name
     FROM users u
     JOIN roles r ON r.role_id = u.role_id
     LEFT JOIN students s ON s.user_id = u.user_id
     WHERE u.username = ?`,
    [studentNumber],
  );

  return rows[0];
}

module.exports = {
  findProgram,
  findStudentRole,
  createStudentAccount,
  findLoginUser,
};
