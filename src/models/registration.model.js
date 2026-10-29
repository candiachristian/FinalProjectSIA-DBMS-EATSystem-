'use strict';
const db = require('../config/db');

const OVERLAP_CHECK_ENABLED = true;
const ALLOW_REREGISTER = true;

function appError(message, code, httpStatus) {
    const err = new Error(message);
    err.code = code;
    err.httpStatus = httpStatus;
    return err;
}

async function getStatusId(conn, name) {
    const [rows] = await conn.execute(
        'SELECT status_id FROM registration_statuses WHERE status_name = ? LIMIT 1',
        [name]
    );
    if (!rows.length) throw appError(`Status "${name}" is not configured.`, 'STATUS_MISSING', 500);
    return rows[0].status_id;
}

async function assertNoOverlap(conn, studentId, eventId, activeStatusId) {
    if (!OVERLAP_CHECK_ENABLED) return;
    const [rows] = await conn.execute(
        `SELECT 1
           FROM registration r
           JOIN events old_e ON old_e.event_id = r.event_id
           JOIN events new_e ON new_e.event_id = ?
          WHERE r.student_id = ?
            AND r.status_id = ?
            AND r.event_id <> new_e.event_id
            AND old_e.event_date = new_e.event_date
            AND old_e.start_time < new_e.end_time
            AND old_e.end_time > new_e.start_time
          LIMIT 1`,
        [eventId, studentId, activeStatusId]
    );
    if (rows.length) {
        throw appError('Student has another active registration that overlaps this event.', 'REGISTRATION_OVERLAP', 409);
    }
}

async function getRosterByEvent(eventId) {
    const [rows] = await db.query(
        `SELECT r.registration_id,
                DATE_FORMAT(r.registered_at, '%Y-%m-%d %H:%i') AS registered_at,
                s.student_id, s.student_number, s.first_name, s.last_name,
                s.year_level, s.section,
                e.event_id, e.event_name,
                DATE_FORMAT(e.event_date, '%Y-%m-%d') AS event_date,
                TIME_FORMAT(e.start_time, '%H:%i') AS start_time,
                TIME_FORMAT(e.end_time, '%H:%i') AS end_time,
                rs.status_name
           FROM registration r
          INNER JOIN students s ON s.student_id = r.student_id
          INNER JOIN events e ON e.event_id = r.event_id
          INNER JOIN registration_statuses rs ON rs.status_id = r.status_id
          WHERE r.event_id = ?
          ORDER BY s.last_name, s.first_name`,
        [eventId]
    );
    return rows;
}

async function listForStudent(studentId) {
    const [rows] = await db.query(
        `SELECT r.registration_id,
                DATE_FORMAT(r.registered_at, '%Y-%m-%d %H:%i') AS registered_at,
                rs.status_name,
                e.event_id, e.event_name,
                DATE_FORMAT(e.event_date, '%Y-%m-%d') AS event_date,
                TIME_FORMAT(e.start_time, '%H:%i') AS start_time,
                TIME_FORMAT(e.end_time, '%H:%i') AS end_time,
                v.venue_name
           FROM registration r
          INNER JOIN registration_statuses rs ON rs.status_id = r.status_id
          INNER JOIN events e ON e.event_id = r.event_id
          INNER JOIN venues v ON v.venue_id = e.venue_id
          WHERE r.student_id = ?
          ORDER BY e.event_date, e.start_time`,
        [studentId]
    );
    return rows;
}

async function getById(registrationId) {
    const [rows] = await db.query(
        `SELECT r.registration_id, r.student_id, r.event_id, r.status_id,
                r.registered_by, rs.status_name, e.event_name
           FROM registration r
          INNER JOIN registration_statuses rs ON rs.status_id = r.status_id
          INNER JOIN events e ON e.event_id = r.event_id
          WHERE r.registration_id = ?`,
        [registrationId]
    );
    return rows[0];
}

async function findDuplicate(studentId, eventId) {
    const [rows] = await db.query(
        'SELECT registration_id FROM registration WHERE student_id = ? AND event_id = ?',
        [studentId, eventId]
    );
    return rows[0];
}

async function searchStudents(term) {
    const like = `%${term}%`;
    const [rows] = await db.query(
        `SELECT student_id, student_number, first_name, last_name, year_level, section
           FROM students
          WHERE student_number LIKE ? OR first_name LIKE ? OR last_name LIKE ?
             OR CONCAT(first_name, ' ', last_name) LIKE ?
          ORDER BY last_name, first_name
          LIMIT 20`,
        [like, like, like, like]
    );
    return rows;
}

async function listEvents() {
    const [rows] = await db.query(
        `SELECT e.event_id, e.event_name,
                DATE_FORMAT(e.event_date, '%Y-%m-%d') AS event_date,
                TIME_FORMAT(e.start_time, '%H:%i') AS start_time,
                TIME_FORMAT(e.end_time, '%H:%i') AS end_time,
                es.status_name
           FROM events e
          INNER JOIN event_statuses es ON es.status_id = e.status_id
          ORDER BY e.event_date DESC, e.start_time`
    );
    return rows;
}

async function createRegistration({ studentId, eventId, registeredBy }) {
    if (studentId == null || eventId == null || registeredBy == null) {
        throw appError('studentId, eventId, and registeredBy are required.', 'VALIDATION', 400);
    }
    const conn = await db.getConnection();
    let started = false;
    try {
        await conn.beginTransaction();
        started = true;

        const [students] = await conn.execute(
            'SELECT student_id FROM students WHERE student_id = ? FOR UPDATE', [studentId]);
        if (!students.length) throw appError('Student not found.', 'STUDENT_NOT_FOUND', 404);

        const [events] = await conn.execute(
            'SELECT event_id FROM events WHERE event_id = ? FOR UPDATE', [eventId]);
        if (!events.length) throw appError('Event not found.', 'EVENT_NOT_FOUND', 404);

        const activeId = await getStatusId(conn, 'Registered');

        const [existing] = await conn.execute(
            `SELECT registration_id, status_id
               FROM registration WHERE student_id = ? AND event_id = ? FOR UPDATE`,
            [studentId, eventId]);

        if (existing.length) {
            if (existing[0].status_id === activeId) {
                throw appError('Student is already registered for this event.', 'REGISTRATION_DUPLICATE', 409);
            }
            if (!ALLOW_REREGISTER) {
                throw appError('A cancelled registration already exists for this student and event.', 'REGISTRATION_DUPLICATE', 409);
            }
            await assertNoOverlap(conn, studentId, eventId, activeId);
            await conn.execute(
                'UPDATE registration SET status_id = ?, registered_by = ? WHERE registration_id = ?',
                [activeId, registeredBy, existing[0].registration_id]);
            await conn.commit(); started = false;
            return { registrationId: existing[0].registration_id, studentId, eventId,
                     statusId: activeId, registeredBy, reactivated: true };
        }

        await assertNoOverlap(conn, studentId, eventId, activeId);

        const [result] = await conn.execute(
            `INSERT INTO registration (student_id, event_id, status_id, registered_by)
             VALUES (?, ?, ?, ?)`,
            [studentId, eventId, activeId, registeredBy]);

        await conn.commit(); started = false;
        return { registrationId: result.insertId, studentId, eventId,
                 statusId: activeId, registeredBy };
    } catch (error) {
        if (started) { try { await conn.rollback(); } catch (_) { /* keep original error */ } }
        if (error && error.code === 'ER_DUP_ENTRY') {
            throw appError('Student is already registered for this event.', 'REGISTRATION_DUPLICATE', 409);
        }
        throw error;
    } finally {
        conn.release();
    }
}

async function updateStatusByName(registrationId, statusName) {
    const conn = await db.getConnection();
    let started = false;
    try {
        await conn.beginTransaction(); started = true;

        const [regs] = await conn.execute(
            'SELECT registration_id, student_id, event_id FROM registration WHERE registration_id = ? FOR UPDATE',
            [registrationId]);
        if (!regs.length) throw appError('Registration not found.', 'REGISTRATION_NOT_FOUND', 404);

        const newStatusId = await getStatusId(conn, statusName);

        if (statusName === 'Registered') {
            await assertNoOverlap(conn, regs[0].student_id, regs[0].event_id, newStatusId);
        }

        await conn.execute(
            'UPDATE registration SET status_id = ? WHERE registration_id = ?',
            [newStatusId, registrationId]);
        await conn.commit(); started = false;
        return { registrationId: Number(registrationId), statusId: newStatusId, statusName };
    } catch (error) {
        if (started) { try { await conn.rollback(); } catch (_) {} }
        throw error;
    } finally {
        conn.release();
    }
}

async function deleteRegistration(registrationId) {
    try {
        const [result] = await db.query(
            'DELETE FROM registration WHERE registration_id = ?', [registrationId]);
        if (result.affectedRows === 0) {
            throw appError('Registration not found.', 'REGISTRATION_NOT_FOUND', 404);
        }
        return true;
    } catch (error) {
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            throw appError('Registration has attendance records. Cancel it instead of deleting.', 'REGISTRATION_IN_USE', 409);
        }
        throw error;
    }
}

module.exports = {
    getRosterByEvent,
    listForStudent,
    getById,
    findDuplicate,
    searchStudents,
    listEvents,
    createRegistration,
    updateStatusByName,
    deleteRegistration
};