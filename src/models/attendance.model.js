'use strict';
const db = require('../config/db');

const VALID_STATUSES = ['Present', 'Late', 'Absent'];

function appError(message, code, httpStatus) {
    const err = new Error(message);
    err.code = code;
    err.httpStatus = httpStatus;
    return err;
}

async function getStatusId(conn, name) {
    const [rows] = await conn.execute(
        'SELECT status_id FROM attendance_statuses WHERE status_name = ? LIMIT 1',
        [name]
    );
    if (!rows.length) throw appError(`Attendance status "${name}" is not configured.`, 'STATUS_MISSING', 500);
    return rows[0].status_id;
}

function normalizeTimeIn(value) {
    if (value === undefined || value === null || value === '') return null;
    const m = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})(:\d{2})?$/.exec(String(value).trim());
    if (!m) throw appError('timeIn must look like YYYY-MM-DD HH:mm.', 'VALIDATION', 400);
    return `${m[1]} ${m[2]}${m[3] || ':00'}`;
}

async function getEventAttendance(eventId) {
    const [rows] = await db.query(
        `SELECT r.registration_id,
                a.attendance_id,
                s.student_id, s.student_number, s.first_name, s.last_name,
                s.year_level, s.section,
                e.event_id, e.event_name,
                DATE_FORMAT(e.event_date, '%Y-%m-%d') AS event_date,
                TIME_FORMAT(e.start_time, '%H:%i') AS start_time,
                rs.status_name AS registration_status,
                ast.status_name AS attendance_status,
                DATE_FORMAT(a.time_in, '%Y-%m-%d %H:%i:%s') AS time_in,
                u.username AS recorded_by_username
           FROM registration r
          INNER JOIN students s ON s.student_id = r.student_id
          INNER JOIN events e ON e.event_id = r.event_id
          INNER JOIN registration_statuses rs ON rs.status_id = r.status_id
           LEFT JOIN attendance a ON a.registration_id = r.registration_id
           LEFT JOIN attendance_statuses ast ON ast.status_id = a.status_id
           LEFT JOIN users u ON u.user_id = a.recorded_by
          WHERE r.event_id = ?
            AND (rs.status_name = 'Registered' OR a.attendance_id IS NOT NULL)
          ORDER BY s.last_name, s.first_name`,
        [eventId]
    );
    return rows;
}

async function recordAttendance({ registrationId, statusName, timeIn, recordedBy }) {
    if (!Number.isInteger(registrationId) || registrationId <= 0) throw appError('registrationId must be a positive integer.', 'VALIDATION', 400);
    if (!Number.isInteger(recordedBy) || recordedBy <= 0) throw appError('recordedBy must be a positive integer.', 'VALIDATION', 400);
    if (statusName !== undefined && !VALID_STATUSES.includes(statusName)) {
        throw appError('status must be Present, Late or Absent.', 'VALIDATION', 400);
    }
    const givenTime = normalizeTimeIn(timeIn);

    const conn = await db.getConnection();
    let started = false;
    try {
        await conn.beginTransaction();
        started = true;

        const [regs] = await conn.execute(
            `SELECT r.registration_id, r.event_id, rs.status_name AS reg_status
               FROM registration r
               JOIN registration_statuses rs ON rs.status_id = r.status_id
              WHERE r.registration_id = ? FOR UPDATE`,
            [registrationId]
        );
        if (!regs.length) throw appError('Registration not found.', 'REGISTRATION_NOT_FOUND', 404);
        if (regs[0].reg_status !== 'Registered') {
            throw appError('Only students with an active registration can be recorded.', 'REGISTRATION_NOT_ACTIVE', 409);
        }

        const [dup] = await conn.execute(
            'SELECT attendance_id FROM attendance WHERE registration_id = ?', [registrationId]);
        if (dup.length) {
            throw appError('Attendance is already recorded for this registration. Use PUT to edit it.', 'ATTENDANCE_DUPLICATE', 409);
        }

        const [calc] = await conn.execute(
            `SELECT e.grace_period_minutes,
                    TIMESTAMPDIFF(MINUTE, TIMESTAMP(e.event_date, e.start_time), COALESCE(?, NOW())) AS minutes_after_start
               FROM events e WHERE e.event_id = ?`,
            [givenTime, regs[0].event_id]
        );
        if (!calc.length) throw appError('Event not found.', 'EVENT_NOT_FOUND', 404);

        const finalStatus = statusName !== undefined
            ? statusName
            : (Number(calc[0].minutes_after_start) <= Number(calc[0].grace_period_minutes) ? 'Present' : 'Late');
        const statusId = await getStatusId(conn, finalStatus);

        const timeExpr = finalStatus === 'Absent' ? 'NULL' : 'COALESCE(?, NOW())';
        const params = finalStatus === 'Absent'
            ? [registrationId, statusId, recordedBy]
            : [registrationId, statusId, givenTime, recordedBy];

        const [result] = await conn.execute(
            `INSERT INTO attendance (registration_id, status_id, time_in, recorded_by)
             VALUES (?, ?, ${timeExpr}, ?)`,
            params
        );

        const [saved] = await conn.execute(
            `SELECT DATE_FORMAT(time_in, '%Y-%m-%d %H:%i:%s') AS time_in FROM attendance WHERE attendance_id = ?`,
            [result.insertId]
        );

        await conn.commit(); started = false;
        return {
            attendanceId: result.insertId, registrationId, status: finalStatus,
            timeIn: saved[0].time_in, minutesAfterStart: Number(calc[0].minutes_after_start),
            gracePeriodMinutes: Number(calc[0].grace_period_minutes), recordedBy
        };
    } catch (error) {
        if (started) { try { await conn.rollback(); } catch (_) { /* keep original error */ } }
        if (error && error.code === 'ER_DUP_ENTRY') {
            throw appError('Attendance is already recorded for this registration.', 'ATTENDANCE_DUPLICATE', 409);
        }
        if (error && error.code === 'ER_NO_REFERENCED_ROW_2') {
            throw appError('Recording user not found.', 'USER_NOT_FOUND', 401);
        }
        throw error;
    } finally {
        conn.release();
    }
}


async function editAttendance({ attendanceId, statusName, timeIn }) {
    if (!Number.isInteger(attendanceId) || attendanceId <= 0) throw appError('attendanceId must be a positive integer.', 'VALIDATION', 400);
    if (statusName !== undefined && !VALID_STATUSES.includes(statusName)) {
        throw appError('status must be Present, Late or Absent.', 'VALIDATION', 400);
    }
    if (statusName === undefined && (timeIn === undefined || timeIn === null || timeIn === '')) {
        throw appError('Send a status, a timeIn, or both.', 'VALIDATION', 400);
    }
    const givenTime = normalizeTimeIn(timeIn);

    const conn = await db.getConnection();
    let started = false;
    try {
        await conn.beginTransaction();
        started = true;

        const [rows] = await conn.execute(
            `SELECT a.status_id, ast.status_name,
                    DATE_FORMAT(a.time_in, '%Y-%m-%d %H:%i:%s') AS time_in
               FROM attendance a
               JOIN attendance_statuses ast ON ast.status_id = a.status_id
              WHERE a.attendance_id = ? FOR UPDATE`,
            [attendanceId]
        );
        if (!rows.length) throw appError('Attendance record not found.', 'ATTENDANCE_NOT_FOUND', 404);

        const old = rows[0];
        const newStatus = statusName !== undefined ? statusName : old.status_name;
        const newStatusId = await getStatusId(conn, newStatus);

        let newTimeIn;
        if (newStatus === 'Absent') {
            newTimeIn = null;
        } else {
            newTimeIn = givenTime !== null ? givenTime : old.time_in;
            if (newTimeIn === null) {
                throw appError('timeIn is required for Present or Late.', 'VALIDATION', 400);
            }
        }

        if (newStatusId === old.status_id && newTimeIn === old.time_in) {
            throw appError('Nothing to change: the status and time are the same.', 'NO_CHANGE', 400);
        }

        await conn.execute(
            'UPDATE attendance SET status_id = ?, time_in = ? WHERE attendance_id = ?',
            [newStatusId, newTimeIn, attendanceId]
        );

        await conn.commit(); started = false;
        return {
            attendanceId, oldStatus: old.status_name, newStatus,
            oldTimeIn: old.time_in, newTimeIn
        };
    } catch (error) {
        if (started) { try { await conn.rollback(); } catch (_) { /* keep original error */ } }
        throw error;
    } finally {
        conn.release();
    }
}

module.exports = {
    VALID_STATUSES,
    getEventAttendance,
    recordAttendance,
    editAttendance
};