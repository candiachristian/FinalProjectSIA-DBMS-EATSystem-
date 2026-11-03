const db = require('../config/db');

async function getAttendanceReport(eventId = null) {
  let sql = `
    SELECT
      e.event_id,
      e.event_name,
      e.event_date,
      r.registration_id,
      s.student_id,
      s.student_number,
      s.first_name,
      s.middle_name,
      s.last_name,
      p.program_name,
      d.department_name,
      s.year_level,
      s.section,
      ast.status_name AS attendance_status
    FROM attendance AS a
    INNER JOIN registration AS r
      ON r.registration_id = a.registration_id
    INNER JOIN students AS s
      ON s.student_id = r.student_id
    INNER JOIN events AS e
      ON e.event_id = r.event_id
    LEFT JOIN programs AS p
      ON p.program_id = s.program_id
    LEFT JOIN departments AS d
      ON d.department_id = p.department_id
    LEFT JOIN attendance_statuses AS ast
      ON ast.status_id = a.status_id
  `;

  const params = [];

  if (eventId !== null) {
    sql += ' WHERE e.event_id = ?';
    params.push(eventId);
  }

  sql += `
    ORDER BY
      p.program_name ASC,
      s.year_level ASC,
      s.section ASC,
      s.last_name ASC,
      s.first_name ASC
  `;

  const [rows] = await db.execute(sql, params);
  return rows;
}

async function findEventById(eventId) {
  const [rows] = await db.execute(
    `SELECT event_id, event_name, event_date
     FROM events
     WHERE event_id = ?
     LIMIT 1`,
    [eventId]
  );

  return rows[0] || null;
}

module.exports = {
  getAttendanceReport,
  findEventById
};