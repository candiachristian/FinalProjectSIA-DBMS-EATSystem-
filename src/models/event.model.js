const db = require("../config/db");

const DEFAULT_STATUS_ID = 1;

const eventSelect = `
  SELECT
    e.event_id,
    e.event_name,
    e.event_date,
    e.start_time,
    e.end_time,
    e.grace_period_minutes,
    e.venue_id,
    v.venue_name AS venue,
    v.location AS venue_location,
    e.category_id,
    c.category_name,
    e.status_id,
    es.status_name AS event_status,
    e.term_id
  FROM events AS e
  INNER JOIN venues AS v ON v.venue_id = e.venue_id
  INNER JOIN event_categories AS c ON c.category_id = e.category_id
  INNER JOIN event_statuses AS es ON es.status_id = e.status_id
`;

async function listEvents({ search, categoryId, date } = {}) {
  let sql = `${eventSelect} WHERE 1 = 1`;
  const params = [];

  if (search) {
    sql += ` AND (
      e.event_name LIKE ?
      OR v.venue_name LIKE ?
      OR v.location LIKE ?
    )`;
    const term = `%${search}%`;
    params.push(term, term, term);
  }

  if (categoryId) {
    sql += " AND e.category_id = ?";
    params.push(Number(categoryId));
  }

  if (date) {
    sql += " AND e.event_date = ?";
    params.push(date);
  }

  sql += " ORDER BY e.event_date ASC, e.start_time ASC";

  const [rows] = await db.execute(sql, params);
  return rows;
}

async function findEventById(eventId) {
  const [rows] = await db.execute(
    `${eventSelect} WHERE e.event_id = ? LIMIT 1`,
    [eventId],
  );

  return rows[0] || null;
}

async function findVenueIdByName(venueName) {
  const [rows] = await db.execute(
    `SELECT venue_id
     FROM venues
     WHERE venue_name = ?
     LIMIT 1`,
    [venueName],
  );

  return rows[0]?.venue_id ?? null;
}

async function createEvent(event) {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    let venueId = event.venueId;

    if (!venueId && event.venueName) {
      const [venueRows] = await connection.execute(
        `SELECT venue_id
     FROM venues
     WHERE LOWER(TRIM(venue_name)) = LOWER(TRIM(?))
     LIMIT 1`,
        [event.venueName],
      );

      if (venueRows.length > 0) {
        venueId = venueRows[0].venue_id;
      } else {
        const [venueResult] = await connection.execute(
          `INSERT INTO venues (venue_name, location)
       VALUES (?, NULL)`,
          [event.venueName.trim()],
        );

        venueId = venueResult.insertId;
      }
    }

    if (!venueId) {
      const error = new Error("Enter a venue name.");
      error.code = "VENUE_REQUIRED";
      throw error;
    }

    const statusId = event.statusId || DEFAULT_STATUS_ID;

    const [result] = await connection.execute(
      `INSERT INTO events
    (event_name, event_date, start_time, end_time,
     grace_period_minutes, venue_id, category_id, status_id, term_id)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        event.eventName,
        event.eventDate,
        event.startTime,
        event.endTime,
        event.gracePeriodMinutes ?? 15,
        venueId,
        event.categoryId,
        statusId,
        event.termId ?? null,
      ],
    );

    await connection.commit();
    return await findEventById(result.insertId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function updateEvent(eventId, event) {
  let venueId = event.venueId;

  if (!venueId && event.venueName) {
    venueId = await findVenueIdByName(event.venueName);
  }

  if (!venueId) {
    const error = new Error("Venue not found. Select an existing venue.");
    error.code = "VENUE_NOT_FOUND";
    throw error;
  }

  const [result] = await db.execute(
    `UPDATE events
     SET event_name = ?,
         event_date = ?,
         start_time = ?,
         end_time = ?,
         grace_period_minutes = ?,
         venue_id = ?,
         category_id = ?,
         term_id = ?
     WHERE event_id = ?`,
    [
      event.eventName,
      event.eventDate,
      event.startTime,
      event.endTime,
      event.gracePeriodMinutes ?? 15,
      venueId,
      event.categoryId,
      event.termId ?? null,
      eventId,
    ],
  );

  if (result.affectedRows === 0) {
    const existing = await findEventById(eventId);
    if (!existing) return null;
  }

  return findEventById(eventId);
}

async function deleteEvent(eventId) {
  const [result] = await db.execute(
    'DELETE FROM events WHERE event_id = ?',
    [eventId]
  );

  return result.affectedRows > 0;
}

module.exports = {
  listEvents,
  findEventById,
  createEvent,
  updateEvent,
  deleteEvent
};
