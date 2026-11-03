const db = require('../config/db');

async function listStudents({ search, programId }) {
  let sql = `
    SELECT
      s.student_id,
      s.student_number,
      s.first_name,
      s.middle_name,
      s.last_name,
      s.program_id,
      p.program_name,
      d.department_id,
      d.department_name,
      s.year_level,
      s.section,
      s.email
    FROM students AS s
    INNER JOIN programs AS p
      ON p.program_id = s.program_id
    INNER JOIN departments AS d
      ON d.department_id = p.department_id
    WHERE 1 = 1
  `;

  const params = [];

  if (search) {
    sql += `
      AND (
        s.student_number LIKE ?
        OR s.first_name LIKE ?
        OR s.middle_name LIKE ?
        OR s.last_name LIKE ?
        OR s.email LIKE ?
      )
    `;

    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
  }

  if (programId) {
    sql += ' AND s.program_id = ?';
    params.push(programId);
  }

  sql += ' ORDER BY s.last_name, s.first_name';

  const [rows] = await db.execute(sql, params);
  return rows;
}

async function findStudentById(studentId) {
  const [rows] = await db.execute(
    `SELECT
       s.student_id,
       s.student_number,
       s.first_name,
       s.middle_name,
       s.last_name,
       s.program_id,
       p.program_name,
       d.department_id,
       d.department_name,
       s.year_level,
       s.section,
       s.email
     FROM students AS s
     INNER JOIN programs AS p
       ON p.program_id = s.program_id
     INNER JOIN departments AS d
       ON d.department_id = p.department_id
     WHERE s.student_id = ?
     LIMIT 1`,
    [studentId]
  );

  return rows[0] || null;
}

async function createStudent(student) {
  const [result] = await db.execute(
    `INSERT INTO students
       (student_number, first_name, middle_name, last_name,
        program_id, year_level, section, email)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      student.studentNumber,
      student.firstName,
      student.middleName || null,
      student.lastName,
      student.programId,
      student.yearLevel,
      student.section,
      student.email
    ]
  );

  return findStudentById(result.insertId);
}

async function updateStudent(studentId, student) {
  const [result] = await db.execute(
    `UPDATE students
     SET student_number = ?,
         first_name = ?,
         middle_name = ?,
         last_name = ?,
         program_id = ?,
         year_level = ?,
         section = ?,
         email = ?
     WHERE student_id = ?`,
    [
      student.studentNumber,
      student.firstName,
      student.middleName || null,
      student.lastName,
      student.programId,
      student.yearLevel,
      student.section,
      student.email,
      studentId
    ]
  );

  if (result.affectedRows === 0) {
    return null;
  }

  return findStudentById(studentId);
}

async function deleteStudent(studentId) {
  const [result] = await db.execute(
    'DELETE FROM students WHERE student_id = ?',
    [studentId]
  );

  return result.affectedRows > 0;
}

module.exports = {
  listStudents,
  findStudentById,
  createStudent,
  updateStudent,
  deleteStudent
};
