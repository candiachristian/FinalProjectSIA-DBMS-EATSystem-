const db = require('../config/db');

async function listEvents({ search, categoryId, date }) {
  let sql = `
    SELECT
      e.event_id,
      e.event_name,
      e.description,
      e.event_date,
      e.start_time,
      e.end_time,
      e.venue,
      e.event_category_id,
      ec.category_name
    FROM events AS e
    LEFT JOIN event_categories AS ec
      ON ec.event_category_id = e.event_category_id
    WHERE 1 = 1
  `;

  const params = [];

  if (search) {
    sql += `
      AND (
        e.event_name LIKE ?
        OR e.description LIKE ?
        OR e.venue LIKE ?
      )
    `;

    const term = `%${search}%`;
    params.push(term, term, term);
  }

  if (categoryId) {
    sql += ' AND e.event_category_id = ?';
    params.push(categoryId);
  }

  if (date) {
    sql += ' AND e.event_date = ?';
    params.push(date);
  }

  sql += ' ORDER BY e.event_date ASC, e.start_time ASC';

  const [rows] = await db.execute(sql, params);
  return rows;
}

async function findEventById(eventId) {
  const [rows] = await db.execute(
    `SELECT
       e.event_id,
       e.event_name,
       e.description,
       e.event_date,
       e.start_time,
       e.end_time,
       e.venue,
       e.event_category_id,
       ec.category_name
     FROM events AS e
     LEFT JOIN event_categories AS ec
       ON ec.event_category_id = e.event_category_id
     WHERE e.event_id = ?
     LIMIT 1`,
    [eventId]
  );

  return rows[0] || null;
}

async function createEvent(event) {
  const [result] = await db.execute(
    `INSERT INTO events
       (event_name, description, event_date, start_time, end_time,
        venue, event_category_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      event.eventName,
      event.description || null,
      event.eventDate,
      event.startTime,
      event.endTime,
      event.venue,
      event.categoryId
    ]
  );

  return findEventById(result.insertId);
}

async function updateEvent(eventId, event) {
  const [result] = await db.execute(
    `UPDATE events
     SET event_name = ?,
         description = ?,
         event_date = ?,
         start_time = ?,
         end_time = ?,
         venue = ?,
         event_category_id = ?
     WHERE event_id = ?`,
    [
      event.eventName,
      event.description || null,
      event.eventDate,
      event.startTime,
      event.endTime,
      event.venue,
      event.categoryId,
      eventId
    ]
  );

  if (result.affectedRows === 0) {
    return null;
  }

  return findEventById(eventId);
}

module.exports = {
  listEvents,
  findEventById,
  createEvent,
  updateEvent
};
