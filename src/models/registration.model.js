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

async function getDefaultAdminId(conn) {
    const [rows] = await conn.execute(
        `SELECT u.user_id
           FROM users AS u
           INNER JOIN roles AS r ON r.role_id = u.role_id
          WHERE LOWER(r.role_name) = 'admin'
          ORDER BY u.user_id
          LIMIT 1`
    );
    if (!rows.length) {
        throw appError('No admin account exists to associate with this registration.', 'ADMIN_NOT_FOUND', 500);
    }
    return Number(rows[0].user_id);
}

async function getOrCreateStudent(conn, studentId, details) {
    if (studentId !== undefined && studentId !== null && studentId !== '') {
        const [rows] = await conn.execute(
            'SELECT student_id FROM students WHERE student_id = ? FOR UPDATE',
            [studentId]
        );
        if (!rows.length) throw appError('Student not found.', 'STUDENT_NOT_FOUND', 404);
        return Number(rows[0].student_id);
    }

    if (!details || typeof details !== 'object') {
        throw appError('Student details are required when no studentId is supplied.', 'VALIDATION', 400);
    }

    const studentNumber = String(details.studentNumber || '').trim();
    const firstName = String(details.firstName || '').trim();
    const middleName = String(details.middleName || '').trim() || null;
    const lastName = String(details.lastName || '').trim();
    const departmentName = String(details.departmentName || '').trim();
    const programName = String(details.programName || '').trim();
    const yearLevel = Number(details.yearLevel);
    const section = String(details.section || '').trim();

    if (!studentNumber || studentNumber.length > 40 || !firstName || firstName.length > 80 ||
        !lastName || lastName.length > 80 || (middleName && middleName.length > 80) ||
        !departmentName || departmentName.length > 120 || !programName || programName.length > 120 ||
        !Number.isInteger(yearLevel) || yearLevel < 1 || yearLevel > 5 || !section || section.length > 20) {
        throw appError('Enter a student ID, full name, department, program, year (1-5), and section using valid lengths.', 'VALIDATION', 400);
    }

    const [existing] = await conn.execute(
        `SELECT student_id, first_name, last_name
           FROM students
          WHERE student_number = ?
          LIMIT 1 FOR UPDATE`,
        [studentNumber]
    );
    if (existing.length) {
        const existingStudent = existing[0];
        if (existingStudent.first_name.trim().toLowerCase() !== firstName.toLowerCase() ||
            existingStudent.last_name.trim().toLowerCase() !== lastName.toLowerCase()) {
            throw appError('This student ID already exists with a different first or last name.', 'STUDENT_DETAILS_MISMATCH', 409);
        }
        return Number(existingStudent.student_id);
    }

    let [departments] = await conn.execute(
        `SELECT department_id FROM departments
          WHERE LOWER(TRIM(department_name)) = LOWER(TRIM(?))
          LIMIT 1`,
        [departmentName]
    );
    let departmentId;
    if (departments.length) {
        departmentId = Number(departments[0].department_id);
    } else {
        const [departmentResult] = await conn.execute(
            'INSERT INTO departments (department_name) VALUES (?)',
            [departmentName]
        );
        departmentId = Number(departmentResult.insertId);
    }

    const [programs] = await conn.execute(
        `SELECT program_id FROM programs
          WHERE department_id = ?
            AND LOWER(TRIM(program_name)) = LOWER(TRIM(?))
          LIMIT 1`,
        [departmentId, programName]
    );
    let programId;
    if (programs.length) {
        programId = Number(programs[0].program_id);
    } else {
        const [programResult] = await conn.execute(
            'INSERT INTO programs (program_name, department_id) VALUES (?, ?)',
            [programName, departmentId]
        );
        programId = Number(programResult.insertId);
    }

    const [studentResult] = await conn.execute(
        `INSERT INTO students
            (student_number, first_name, middle_name, last_name, program_id,
             year_level, section, email)
         VALUES (?, ?, ?, ?, ?, ?, ?, NULL)`,
        [studentNumber, firstName, middleName, lastName, programId, yearLevel, section]
    );
    return Number(studentResult.insertId);
}

async function assertNoOverlap(conn, studentId, eventId, activeStatusId) {
    if (!OVERLAP_CHECK_ENABLED) return;

    const [rows] = await conn.execute(
        `SELECT 1
           FROM registration r
           JOIN events old_e
             ON old_e.event_id = r.event_id
           JOIN events new_e
             ON new_e.event_id = ?
           LEFT JOIN attendance a
             ON a.registration_id = r.registration_id
           LEFT JOIN attendance_statuses ast
             ON ast.status_id = a.status_id
          WHERE r.student_id = ?
            AND r.status_id = ?
            AND r.event_id <> new_e.event_id
            AND old_e.event_date = new_e.event_date
            AND old_e.start_time < new_e.end_time
            AND old_e.end_time > new_e.start_time
            AND (
                a.attendance_id IS NULL
                OR ast.status_name = 'Absent'
            )
          LIMIT 1`,
        [eventId, studentId, activeStatusId]
    );

    if (rows.length) {
        throw appError(
            'Student has another active registration that overlaps this event.',
            'REGISTRATION_OVERLAP',
            409
        );
    }
}


async function getRosterByEvent(eventId) {
    const [rows] = await db.query(
        `SELECT r.registration_id,
                r.proof_image_path,
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

async function createRegistration({ studentId, studentDetails, eventId, registeredBy, proofImagePath }) {
    if (eventId == null) {
        throw appError('eventId is required.', 'VALIDATION', 400);
    }
    if (!proofImagePath) {
        throw appError('An event proof image is required.', 'PROOF_REQUIRED', 400);
    }
    const conn = await db.getConnection();
    let started = false;
    try {
        await conn.beginTransaction();
        started = true;

        let actorId = registeredBy;
        if (actorId === undefined || actorId === null || actorId === '') {
            actorId = await getDefaultAdminId(conn);
        }
        if (!Number.isInteger(Number(actorId)) || Number(actorId) <= 0) {
            throw appError('registeredBy must be a positive integer.', 'VALIDATION', 400);
        }
        actorId = Number(actorId);

        const [events] = await conn.execute(
            'SELECT event_id FROM events WHERE event_id = ? FOR UPDATE', [eventId]);
        if (!events.length) throw appError('Event not found.', 'EVENT_NOT_FOUND', 404);

        const resolvedStudentId = await getOrCreateStudent(conn, studentId, studentDetails);

        const activeId = await getStatusId(conn, 'Registered');

        const [existing] = await conn.execute(
            `SELECT registration_id, status_id, proof_image_path
               FROM registration WHERE student_id = ? AND event_id = ? FOR UPDATE`,
            [resolvedStudentId, eventId]);

        if (existing.length) {
            if (existing[0].status_id === activeId) {
                throw appError('Student is already registered for this event.', 'REGISTRATION_DUPLICATE', 409);
            }
            if (!ALLOW_REREGISTER) {
                throw appError('A cancelled registration already exists for this student and event.', 'REGISTRATION_DUPLICATE', 409);
            }
            await assertNoOverlap(conn, resolvedStudentId, eventId, activeId);
            await conn.execute(
                `UPDATE registration
                    SET status_id = ?, registered_by = ?, proof_image_path = ?
                  WHERE registration_id = ?`,
                [activeId, actorId, proofImagePath, existing[0].registration_id]);
            await conn.commit(); started = false;
            return { registrationId: existing[0].registration_id, studentId: resolvedStudentId, eventId,
                     statusId: activeId, registeredBy: actorId, reactivated: true,
                     oldProofImagePath: existing[0].proof_image_path };
        }

        await assertNoOverlap(conn, resolvedStudentId, eventId, activeId);

        const [result] = await conn.execute(
            `INSERT INTO registration
                (student_id, event_id, status_id, registered_by, proof_image_path)
             VALUES (?, ?, ?, ?, ?)`,
            [resolvedStudentId, eventId, activeId, actorId, proofImagePath]);

        await conn.commit(); started = false;
        return { registrationId: result.insertId, studentId: resolvedStudentId, eventId,
                 statusId: activeId, registeredBy: actorId };
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
        const [rows] = await db.execute(
            'SELECT proof_image_path FROM registration WHERE registration_id = ?',
            [registrationId]
        );
        if (!rows.length) {
            throw appError('Registration not found.', 'REGISTRATION_NOT_FOUND', 404);
        }
        const [result] = await db.query(
            'DELETE FROM registration WHERE registration_id = ?', [registrationId]);
        if (result.affectedRows === 0) {
            throw appError('Registration not found.', 'REGISTRATION_NOT_FOUND', 404);
        }
        return rows[0].proof_image_path;
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