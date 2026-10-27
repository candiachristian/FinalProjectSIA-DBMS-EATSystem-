const db = require('../config/db');

async function listForStudent(studentId) {
    const [rows] = await db.query(
        `SELECT
            r.registration_id,
            r.registered_at,
            rs.status_name,
            e.event_id,
            e.event_title,
            e.starts_at,
            e.ends_at,
            v.venue_name
        FROM registrations r
        INNER JOIN registration_statuses rs
            ON rs.registration_status_id = r.registration_status_id
        INNER JOIN events e
            ON e.event_id = r.event_id
        INNER JOIN venues v
            ON v.venue_id = e.venue_id
        WHERE r.student_id = ?
        ORDER BY e.starts_at`,
        [studentId]
    );

    return rows;
}

async function getById(registrationId) {
    const [rows] = await db.query(
        `SELECT
            r.registration_id,
            r.student_id,
            r.event_id,
            r.registration_status_id,
            r.registered_at,
            rs.status_name,
            e.event_title,
            e.starts_at,
            e.ends_at,
            v.venue_name
        FROM registrations r
        INNER JOIN registration_statuses rs
            ON rs.registration_status_id = r.registration_status_id
        INNER JOIN events e
            ON e.event_id = r.event_id
        INNER JOIN venues v
            ON v.venue_id = e.venue_id
        WHERE r.registration_id = ?`,
        [registrationId]
    );

    return rows[0];
}

async function add(studentId, eventId, statusId) {
    const [result] = await db.query(
        `INSERT INTO registrations
            (student_id, event_id, registration_status_id)
        VALUES (?, ?, ?)`,
        [studentId, eventId, statusId]
    );

    return result.insertId;
}

async function updateStatus(registrationId, statusId) {
    const [result] = await db.query(
        `UPDATE registrations
        SET registration_status_id = ?
        WHERE registration_id = ?`,
        [statusId, registrationId]
    );

    return result.affectedRows;
}

async function remove(registrationId) {
    const [result] = await db.query(
        `DELETE FROM registrations
        WHERE registration_id = ?`,
        [registrationId]
    );

    return result.affectedRows;
}

async function findDuplicate(studentId, eventId) {
    const [rows] = await db.query(
        `SELECT registration_id
        FROM registrations
        WHERE student_id = ?
          AND event_id = ?`,
        [studentId, eventId]
    );

    return rows[0];
}

module.exports = {
    listForStudent,
    getById,
    add,
    updateStatus,
    remove,
    findDuplicate
};