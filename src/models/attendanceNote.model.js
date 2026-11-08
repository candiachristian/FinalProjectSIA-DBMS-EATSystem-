'use strict';

const db = require('../config/db');

function appError(message, code, httpStatus ) {
  const error = new Error(message);
  error.code = code;
  error.httpStatus = httpStatus;
  return error;
}

async function ensureAttendanceExists(attendanceId) {
  const [rows] = await db.execute(
    'SELECT attendance_id FROM attendance WHERE attendance_id = ? LIMIT 1',
    [attendanceId],
  );

  if (!rows.length) {
    throw appError(
      'Attendance record not found.',
      'ATTENDANCE_NOT_FOUND',
      404,
    );
  }
}

async function getAdminUserId() {
  const [rows] = await db.execute(
    `SELECT u.user_id
       FROM users AS u
       INNER JOIN roles AS r ON r.role_id = u.role_id
      WHERE LOWER(r.role_name) = 'admin'
      ORDER BY u.user_id
      LIMIT 1`,
  );

  if (!rows.length) {
    throw appError(
      'No admin account exists to associate with this note.',
      'ADMIN_NOT_FOUND',
      500,
    );
  }

  return Number(rows[0].user_id);
}

async function listNotes(attendanceId) {
  await ensureAttendanceExists(attendanceId);

  const [rows] = await db.execute(
    `SELECT n.note_id,
            n.attendance_id,
            n.note_text,
            DATE_FORMAT(n.added_at, '%Y-%m-%d %H:%i:%s') AS added_at,
            u.username AS added_by_username
       FROM attendance_notes AS n
       LEFT JOIN users AS u ON u.user_id = n.added_by
      WHERE n.attendance_id = ?
      ORDER BY n.added_at ASC, n.note_id ASC`,
    [attendanceId],
  );

  return rows;
}

async function addNote(attendanceId, noteText) {
  await ensureAttendanceExists(attendanceId);
  const adminUserId = await getAdminUserId();

  const [result] = await db.execute(
    `INSERT INTO attendance_notes (attendance_id, note_text, added_by)
     VALUES (?, ?, ?)`,
    [attendanceId, noteText, adminUserId],
  );

  const [rows] = await db.execute(
    `SELECT n.note_id,
            n.attendance_id,
            n.note_text,
            DATE_FORMAT(n.added_at, '%Y-%m-%d %H:%i:%s') AS added_at,
            u.username AS added_by_username
       FROM attendance_notes AS n
       LEFT JOIN users AS u ON u.user_id = n.added_by
      WHERE n.note_id = ?
      LIMIT 1`,
    [result.insertId],
  );

  return rows[0];
}

async function deleteNote(attendanceId, noteId) {
  const [result] = await db.execute(
    `DELETE FROM attendance_notes
      WHERE attendance_id = ? AND note_id = ?`,
    [attendanceId, noteId],
  );

  return result.affectedRows > 0;
}

module.exports = {
  listNotes,
  addNote,
  deleteNote,
};