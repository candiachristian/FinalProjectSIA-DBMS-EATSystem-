"use strict";

const db = require("../config/db");

const OVERLAP_CHECK_ENABLED = true;
const ALLOW_REREGISTER = true;

function appError(message, code, httpStatus ) {
  const error = new Error(message);
  error.code = code;
  error.httpStatus = httpStatus;
  return error;
}

async function getStatusId(connection, statusName) {
  const [rows] = await connection.execute(
    `
      SELECT status_id
      FROM registration_statuses
      WHERE status_name = ?
      LIMIT 1
    `,
    [statusName]
  );

  if (!rows.length) {
    throw appError(
      `Status "${statusName}" is not configured.`,
      "STATUS_MISSING",
      500
    );
  }

  return rows[0].status_id;
}

async function getDefaultAdminId(connection) {
  const [rows] = await connection.execute(
    `
      SELECT u.user_id
      FROM users AS u
      INNER JOIN roles AS r
        ON r.role_id = u.role_id
      WHERE LOWER(r.role_name) = "admin"
      ORDER BY u.user_id
      LIMIT 1
    `
  );

  if (!rows.length) {
    throw appError(
      "No admin account exists to associate with this registration.",
      "ADMIN_NOT_FOUND",
      500
    );
  }

  return Number(rows[0].user_id);
}

async function getOrCreateStudent(
  connection,
  studentId,
  details
) {
  if (
    studentId !== undefined &&
    studentId !== null &&
    studentId !== ""
  ) {
    const [rows] = await connection.execute(
      `
        SELECT student_id
        FROM students
        WHERE student_id = ?
        FOR UPDATE
      `,
      [studentId]
    );

    if (!rows.length) {
      throw appError(
        "Student not found.",
        "STUDENT_NOT_FOUND",
        404
      );
    }

    return Number(rows[0].student_id);
  }

  if (!details || typeof details !== "object") {
    throw appError(
      "Student details are required when no studentId is supplied.",
      "VALIDATION",
      400
    );
  }

  const studentNumber = String(
    details.studentNumber || ""
  ).trim();

  const firstName = String(
    details.firstName || ""
  ).trim();

  const middleName =
    String(details.middleName || "").trim() ||
    null;

  const lastName = String(
    details.lastName || ""
  ).trim();

  const departmentName = String(
    details.departmentName || ""
  ).trim();

  const programName = String(
    details.programName || ""
  ).trim();

  const yearLevel = Number(details.yearLevel);

  const section = String(
    details.section || ""
  ).trim();

  if (
    !studentNumber ||
    !firstName ||
    !lastName ||
    !departmentName ||
    !programName ||
    !Number.isInteger(yearLevel) ||
    yearLevel < 1 ||
    yearLevel > 5 ||
    !section
  ) {
    throw appError(
      "Enter a student ID, full name, department, program, year (1-5), and section.",
      "VALIDATION",
      400
    );
  }

  const [existing] = await connection.execute(
    `
      SELECT student_id, first_name, last_name
      FROM students
      WHERE student_number = ?
      LIMIT 1
      FOR UPDATE
    `,
    [studentNumber]
  );

  if (existing.length) {
    const existingStudent = existing[0];

    if (
      existingStudent.first_name
        .trim()
        .toLowerCase() !== firstName.toLowerCase() ||
      existingStudent.last_name
        .trim()
        .toLowerCase() !== lastName.toLowerCase()
    ) {
      throw appError(
        "This student ID already exists with a different first or last name.",
        "STUDENT_DETAILS_MISMATCH",
        409
      );
    }

    return Number(existingStudent.student_id);
  }

  const [departments] = await connection.execute(
    `
      SELECT department_id
      FROM departments
      WHERE LOWER(TRIM(department_name)) =
            LOWER(TRIM(?))
      LIMIT 1
    `,
    [departmentName]
  );

  let departmentId;

  if (departments.length) {
    departmentId = Number(
      departments[0].department_id
    );
  } else {
    const [departmentResult] =
      await connection.execute(
        `
          INSERT INTO departments
            (department_name)
          VALUES (?)
        `,
        [departmentName]
      );

    departmentId = Number(
      departmentResult.insertId
    );
  }

  const [programs] = await connection.execute(
    `
      SELECT program_id
      FROM programs
      WHERE department_id = ?
        AND LOWER(TRIM(program_name)) =
            LOWER(TRIM(?))
      LIMIT 1
    `,
    [departmentId, programName]
  );

  let programId;

  if (programs.length) {
    programId = Number(programs[0].program_id);
  } else {
    const [programResult] =
      await connection.execute(
        `
          INSERT INTO programs
            (program_name, department_id)
          VALUES (?, ?)
        `,
        [programName, departmentId]
      );

    programId = Number(programResult.insertId);
  }

  const [studentResult] =
    await connection.execute(
      `
        INSERT INTO students
          (
            student_number,
            first_name,
            middle_name,
            last_name,
            program_id,
            year_level,
            section,
            email
          )
        VALUES (?, ?, ?, ?, ?, ?, ?, NULL)
      `,
      [
        studentNumber,
        firstName,
        middleName,
        lastName,
        programId,
        yearLevel,
        section
      ]
    );

  return Number(studentResult.insertId);
}

async function assertNoOverlap(
  connection,
  studentId,
  eventId,
  activeStatusId
) {
  if (!OVERLAP_CHECK_ENABLED) {
    return;
  }

  const [rows] = await connection.execute(
    `
      SELECT 1
      FROM registration AS r
      INNER JOIN events AS oldEvent
        ON oldEvent.event_id = r.event_id
      INNER JOIN events AS newEvent
        ON newEvent.event_id = ?
      WHERE r.student_id = ?
        AND r.status_id = ?
        AND r.event_id <> newEvent.event_id
        AND oldEvent.event_date = newEvent.event_date
        AND oldEvent.start_time < newEvent.end_time
        AND oldEvent.end_time > newEvent.start_time
      LIMIT 1
    `,
    [
      eventId,
      studentId,
      activeStatusId
    ]
  );

  if (rows.length) {
    throw appError(
      "Student has another active registration that overlaps this event.",
      "REGISTRATION_OVERLAP",
      409
    );
  }
}

async function assertProgramEligibility(
  connection,
  studentId,
  eventId
) {
  const [allowedPrograms] =
    await connection.execute(
      `
        SELECT program_id
        FROM event_programs
        WHERE event_id = ?
      `,
      [eventId]
    );

  if (!allowedPrograms.length) {
    return;
  }

  const [students] = await connection.execute(
    `
      SELECT program_id
      FROM students
      WHERE student_id = ?
      LIMIT 1
    `,
    [studentId]
  );

  if (
    !students.length ||
    students[0].program_id === null
  ) {
    throw appError(
      "This student has no program assigned and cannot register for this event.",
      "PROGRAM_NOT_ELIGIBLE",
      409
    );
  }

  const eligible = allowedPrograms.some(
    (program) =>
      Number(program.program_id) ===
      Number(students[0].program_id)
  );

  if (!eligible) {
    throw appError(
      "This student's program is not eligible for this event.",
      "PROGRAM_NOT_ELIGIBLE",
      409
    );
  }
}

async function getRosterByEvent(eventId) {
  const [rows] = await db.query(
    `
      SELECT
        r.registration_id,
        r.proof_image_path,
        DATE_FORMAT(
          r.registered_at,
          "%Y-%m-%d %H:%i"
        ) AS registered_at,

        s.student_id,
        s.student_number,
        s.first_name,
        s.last_name,
        s.year_level,
        s.section,

        e.event_id,
        e.event_name,
        DATE_FORMAT(
          e.event_date,
          "%Y-%m-%d"
        ) AS event_date,
        TIME_FORMAT(
          e.start_time,
          "%H:%i"
        ) AS start_time,
        TIME_FORMAT(
          e.end_time,
          "%H:%i"
        ) AS end_time,

        rs.status_name

      FROM registration AS r
      INNER JOIN students AS s
        ON s.student_id = r.student_id
      INNER JOIN events AS e
        ON e.event_id = r.event_id
      INNER JOIN registration_statuses AS rs
        ON rs.status_id = r.status_id

      WHERE r.event_id = ?

      ORDER BY
        s.last_name,
        s.first_name
    `,
    [eventId]
  );

  return rows;
}

async function listForStudent(studentId) {
  const [rows] = await db.query(
    `
      SELECT
        r.registration_id,
        DATE_FORMAT(
          r.registered_at,
          "%Y-%m-%d %H:%i"
        ) AS registered_at,
        rs.status_name,
        e.event_id,
        e.event_name,
        DATE_FORMAT(
          e.event_date,
          "%Y-%m-%d"
        ) AS event_date,
        TIME_FORMAT(
          e.start_time,
          "%H:%i"
        ) AS start_time,
        TIME_FORMAT(
          e.end_time,
          "%H:%i"
        ) AS end_time,
        v.venue_name

      FROM registration AS r
      INNER JOIN registration_statuses AS rs
        ON rs.status_id = r.status_id
      INNER JOIN events AS e
        ON e.event_id = r.event_id
      INNER JOIN venues AS v
        ON v.venue_id = e.venue_id

      WHERE r.student_id = ?

      ORDER BY
        e.event_date,
        e.start_time
    `,
    [studentId]
  );

  return rows;
}

async function getById(registrationId) {
  const [rows] = await db.query(
    `
      SELECT
        r.registration_id,
        r.student_id,
        r.event_id,
        r.status_id,
        r.registered_by,
        rs.status_name,
        e.event_name

      FROM registration AS r
      INNER JOIN registration_statuses AS rs
        ON rs.status_id = r.status_id
      INNER JOIN events AS e
        ON e.event_id = r.event_id

      WHERE r.registration_id = ?
    `,
    [registrationId]
  );

  return rows[0];
}

async function findDuplicate(
  studentId,
  eventId
) {
  const [rows] = await db.query(
    `
      SELECT registration_id
      FROM registration
      WHERE student_id = ?
        AND event_id = ?
    `,
    [studentId, eventId]
  );

  return rows[0];
}

async function searchStudents(term) {
  const like = `%${term}%`;

  const [rows] = await db.query(
    `
      SELECT
        s.student_id,
        s.student_number,
        s.first_name,
        s.middle_name,
        s.last_name,
        s.program_id,
        p.program_name,
        d.department_name,
        s.year_level,
        s.section

      FROM students AS s
      LEFT JOIN programs AS p
        ON p.program_id = s.program_id
      LEFT JOIN departments AS d
        ON d.department_id = p.department_id

      WHERE
        s.student_number LIKE ?
        OR s.first_name LIKE ?
        OR s.last_name LIKE ?
        OR CONCAT(
          s.first_name,
          " ",
          s.last_name
        ) LIKE ?

      ORDER BY
        s.last_name,
        s.first_name

      LIMIT 20
    `,
    [
      like,
      like,
      like,
      like
    ]
  );

  return rows;
}

async function checkProgramEligibility(
  studentId,
  eventId
) {
  const [students] = await db.query(
    `
      SELECT
        s.student_id,
        s.student_number,
        s.first_name,
        s.last_name,
        s.program_id,
        p.program_name,
        d.department_name,
        s.year_level,
        s.section

      FROM students AS s
      LEFT JOIN programs AS p
        ON p.program_id = s.program_id
      LEFT JOIN departments AS d
        ON d.department_id = p.department_id

      WHERE s.student_id = ?

      LIMIT 1
    `,
    [studentId]
  );

  if (!students.length) {
    throw appError(
      "Student not found.",
      "STUDENT_NOT_FOUND",
      404
    );
  }

  const [allowedPrograms] =
    await db.query(
      `
        SELECT
          p.program_id,
          p.program_name,
          d.department_name

        FROM event_programs AS ep
        INNER JOIN programs AS p
          ON p.program_id = ep.program_id
        INNER JOIN departments AS d
          ON d.department_id = p.department_id

        WHERE ep.event_id = ?

        ORDER BY
          d.department_name,
          p.program_name
      `,
      [eventId]
    );

  const eligible =
    allowedPrograms.length === 0 ||
    allowedPrograms.some(
      (program) =>
        Number(program.program_id) ===
        Number(students[0].program_id)
    );

  return {
    eligible,
    student: students[0],
    allowedPrograms
  };
}

async function listEvents() {
  const [rows] = await db.query(
    `
      SELECT
        e.event_id,
        e.event_name,
        DATE_FORMAT(
          e.event_date,
          "%Y-%m-%d"
        ) AS event_date,
        TIME_FORMAT(
          e.start_time,
          "%H:%i"
        ) AS start_time,
        TIME_FORMAT(
          e.end_time,
          "%H:%i"
        ) AS end_time,
        es.status_name

      FROM events AS e
      INNER JOIN event_statuses AS es
        ON es.status_id = e.status_id

      ORDER BY
        e.event_date DESC,
        e.start_time
    `
  );

  return rows;
}

async function createRegistration({
  studentId,
  studentDetails,
  eventId,
  registeredBy,
  proofImagePath
}) {
  if (
    eventId === null ||
    eventId === undefined
  ) {
    throw appError(
      "eventId is required.",
      "VALIDATION",
      400
    );
  }

  if (!proofImagePath) {
    throw appError(
      "An event proof image is required.",
      "PROOF_REQUIRED",
      400
    );
  }

  const connection = await db.getConnection();
  let started = false;

  try {
    await connection.beginTransaction();
    started = true;

    let actorId = registeredBy;

    if (
      actorId === undefined ||
      actorId === null ||
      actorId === ""
    ) {
      actorId =
        await getDefaultAdminId(connection);
    }

    actorId = Number(actorId);

    if (!Number.isInteger(actorId) || actorId <= 0) {
      throw appError(
        "registeredBy must be a positive integer.",
        "VALIDATION",
        400
      );
    }

    const [events] =
      await connection.execute(
        `
          SELECT event_id
          FROM events
          WHERE event_id = ?
          FOR UPDATE
        `,
        [eventId]
      );

    if (!events.length) {
      throw appError(
        "Event not found.",
        "EVENT_NOT_FOUND",
        404
      );
    }

    const resolvedStudentId =
      await getOrCreateStudent(
        connection,
        studentId,
        studentDetails
      );

    await assertProgramEligibility(
      connection,
      resolvedStudentId,
      eventId
    );

    const activeStatusId =
      await getStatusId(
        connection,
        "Registered"
      );

    const [existing] =
      await connection.execute(
        `
          SELECT
            registration_id,
            status_id,
            proof_image_path

          FROM registration

          WHERE student_id = ?
            AND event_id = ?

          FOR UPDATE
        `,
        [
          resolvedStudentId,
          eventId
        ]
      );

    if (existing.length) {
      if (
        existing[0].status_id ===
        activeStatusId
      ) {
        throw appError(
          "Student is already registered for this event.",
          "REGISTRATION_DUPLICATE",
          409
        );
      }

      if (!ALLOW_REREGISTER) {
        throw appError(
          "A cancelled registration already exists for this student and event.",
          "REGISTRATION_DUPLICATE",
          409
        );
      }

      await assertNoOverlap(
        connection,
        resolvedStudentId,
        eventId,
        activeStatusId
      );

      await connection.execute(
        `
          UPDATE registration
          SET
            status_id = ?,
            registered_by = ?,
            proof_image_path = ?
          WHERE registration_id = ?
        `,
        [
          activeStatusId,
          actorId,
          proofImagePath,
          existing[0].registration_id
        ]
      );

      await connection.commit();
      started = false;

      return {
        registrationId:
          existing[0].registration_id,
        studentId: resolvedStudentId,
        eventId,
        statusId: activeStatusId,
        registeredBy: actorId,
        reactivated: true,
        oldProofImagePath:
          existing[0].proof_image_path
      };
    }

    await assertNoOverlap(
      connection,
      resolvedStudentId,
      eventId,
      activeStatusId
    );

    const [result] =
      await connection.execute(
        `
          INSERT INTO registration
            (
              student_id,
              event_id,
              status_id,
              registered_by,
              proof_image_path
            )
          VALUES (?, ?, ?, ?, ?)
        `,
        [
          resolvedStudentId,
          eventId,
          activeStatusId,
          actorId,
          proofImagePath
        ]
      );

    await connection.commit();
    started = false;

    return {
      registrationId: result.insertId,
      studentId: resolvedStudentId,
      eventId,
      statusId: activeStatusId,
      registeredBy: actorId
    };
  } catch (error) {
    if (started) {
      try {
        await connection.rollback();
      } catch (_) {
        // Keep original error.
      }
    }

    if (error.code === "ER_DUP_ENTRY") {
      throw appError(
        "Student is already registered for this event.",
        "REGISTRATION_DUPLICATE",
        409
      );
    }

    throw error;
  } finally {
    connection.release();
  }
}

async function updateStatusByName(
  registrationId,
  statusName
) {
  const connection = await db.getConnection();
  let started = false;

  try {
    await connection.beginTransaction();
    started = true;

    const [registrations] =
      await connection.execute(
        `
          SELECT
            registration_id,
            student_id,
            event_id

          FROM registration

          WHERE registration_id = ?

          FOR UPDATE
        `,
        [registrationId]
      );

    if (!registrations.length) {
      throw appError(
        "Registration not found.",
        "REGISTRATION_NOT_FOUND",
        404
      );
    }

    const newStatusId =
      await getStatusId(
        connection,
        statusName
      );

    if (statusName === "Registered") {
      await assertProgramEligibility(
        connection,
        registrations[0].student_id,
        registrations[0].event_id
      );

      await assertNoOverlap(
        connection,
        registrations[0].student_id,
        registrations[0].event_id,
        newStatusId
      );
    }

    await connection.execute(
      `
        UPDATE registration
        SET status_id = ?
        WHERE registration_id = ?
      `,
      [
        newStatusId,
        registrationId
      ]
    );

    await connection.commit();
    started = false;

    return {
      registrationId: Number(
        registrationId
      ),
      statusId: newStatusId,
      statusName
    };
  } catch (error) {
    if (started) {
      try {
        await connection.rollback();
      } catch (_) {
        // Keep original error.
      }
    }

    throw error;
  } finally {
    connection.release();
  }
}

async function deleteRegistration(
  registrationId
) {
  try {
    const [rows] = await db.execute(
      `
        SELECT proof_image_path
        FROM registration
        WHERE registration_id = ?
      `,
      [registrationId]
    );

    if (!rows.length) {
      throw appError(
        "Registration not found.",
        "REGISTRATION_NOT_FOUND",
        404
      );
    }

    const [result] = await db.query(
      `
        DELETE FROM registration
        WHERE registration_id = ?
      `,
      [registrationId]
    );

    if (result.affectedRows === 0) {
      throw appError(
        "Registration not found.",
        "REGISTRATION_NOT_FOUND",
        404
      );
    }

    return rows[0].proof_image_path;
  } catch (error) {
    if (
      error.code === "ER_ROW_IS_REFERENCED_2"
    ) {
      throw appError(
        "Registration has attendance records. Cancel it instead of deleting.",
        "REGISTRATION_IN_USE",
        409
      );
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
  checkProgramEligibility,
  listEvents,
  createRegistration,
  updateStatusByName,
  deleteRegistration
};