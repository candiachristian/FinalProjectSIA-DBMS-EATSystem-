"use strict";

const db = require("../config/db");

async function getAttendanceReport(
  eventId = null
) {
  let sql = `
    SELECT
      e.event_id,
      e.event_name,
      e.event_date,

      r.registration_id,
      r.proof_image_path,

      a.attendance_id,

      s.student_id,
      s.student_number,
      s.first_name,
      s.middle_name,
      s.last_name,

      p.program_name,
      d.department_name,

      s.year_level,
      s.section,

      ast.status_name AS attendance_status,
      DATE_FORMAT(a.time_in, '%Y-%m-%d %H:%i:%s') AS time_in,
      rs.status_name AS registration_status,

      (
        SELECT GROUP_CONCAT(
          an.note_text
          ORDER BY an.added_at DESC
          SEPARATOR ' | '
        )
        FROM attendance_notes AS an
        WHERE an.attendance_id =
              a.attendance_id
      ) AS notes

    FROM attendance AS a

    INNER JOIN registration AS r
      ON r.registration_id =
         a.registration_id

    INNER JOIN students AS s
      ON s.student_id =
         r.student_id

    INNER JOIN events AS e
      ON e.event_id =
         r.event_id

    LEFT JOIN programs AS p
      ON p.program_id =
         s.program_id

    LEFT JOIN departments AS d
      ON d.department_id =
         p.department_id

    LEFT JOIN attendance_statuses AS ast
      ON ast.status_id =
         a.status_id

    LEFT JOIN registration_statuses AS rs
      ON rs.status_id =
         r.status_id
  `;

  const params = [];

  if (eventId !== null) {
    sql += `
      WHERE e.event_id = ?
    `;

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

  const [rows] = await db.execute(
    sql,
    params
  );

  return rows;
}

async function findEventById(eventId) {
  const [rows] = await db.execute(
    `
      SELECT
        event_id,
        event_name,
        event_date
      FROM events
      WHERE event_id = ?
      LIMIT 1
    `,
    [eventId]
  );

  return rows[0] || null;
}

module.exports = {
  getAttendanceReport,
  findEventById
};
