USE event_attendance_db;
 
INSERT IGNORE INTO roles (role_name)
VALUES ('admin');
 
INSERT IGNORE INTO departments (department_name)
VALUES
    ('College of Arts and sciences'),
    ('College of Business Administration'),
    ('College of Engineering'),
    ('College of Education');  
 

INSERT IGNORE INTO event_categories (category_name)
VALUES
    ('Seminar'),
    ('Workshop'),
    ('School Activity');
 

INSERT IGNORE INTO event_statuses (status_name)
VALUES
    ('Upcoming'),
    ('Ongoing'),
    ('Completed'),
    ('Cancelled');

INSERT IGNORE INTO registration_statuses (status_name)
VALUES
    ('Registered'),
    ('Cancelled');
 
INSERT IGNORE INTO attendance_statuses (status_name)
VALUES
    ('Present'),
    ('Late'),
    ('Absent');
 
INSERT INTO venues (venue_name, location)
SELECT 'Main Auditorium', 'Main campus, ground floor'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM venues
    WHERE venue_name = 'Main Auditorium'
      AND location = 'Main campus, ground floor'
);
 
INSERT INTO venues (venue_name, location)
SELECT 'Computer Laboratory', 'CAS Building, Room 201'
FROM DUAL 
WHERE NOT EXISTS (
    SELECT 1 FROM venues
    WHERE venue_name = 'Computer Laboratory'
      AND location = 'CAS Building, Room 201'
);
 
INSERT IGNORE INTO academic_terms (term_name)
VALUES ('First Semester 2026-2027');
 

INSERT IGNORE INTO users (username, password_hash, role_id)
SELECT
    'admin',
    'event-attendance-demo-salt:6b7c72790d91d38a567180eeb88c5087206d4eb802f867a7ecaf52ac08a18717c8c4fcd58832a3393f2560e9b9bb9f431a09282dc2bbf08158ccc5be1e625002',
    role_id
FROM roles
WHERE role_name = 'admin';

INSERT IGNORE INTO programs (program_name, department_id)
SELECT 'BS Information Technology', department_id
FROM departments
WHERE department_name = 'College of Arts and sciences';
 
INSERT IGNORE INTO programs (program_name, department_id)
SELECT 'BS Computer Science', department_id
FROM departments
WHERE department_name = 'College of Arts and sciences';  -- 
 
INSERT IGNORE INTO programs (program_name, department_id)
SELECT 'BS Computer Engineering', department_id
FROM departments
WHERE department_name = 'College of Engineering';
 
INSERT IGNORE INTO programs (program_name, department_id)
SELECT 'BS Business Administration', department_id
FROM departments
WHERE department_name = 'College of Business Administration';
 
INSERT IGNORE INTO programs (program_name, department_id)
SELECT 'BS Civil Engineering', department_id
FROM departments
WHERE department_name = 'College of Engineering';
 
INSERT INTO students
    (student_number, first_name, middle_name, last_name, program_id,
     year_level, section, email)
SELECT
    '202521051', 'Christian', 'Cadivida', 'Candia', program_id,
    2, 'A', 'christiancandia@example.edu'
FROM programs
WHERE program_name = 'BS Information Technology'
  AND NOT EXISTS (
      SELECT 1 FROM students WHERE student_number = '202521051'
  )
LIMIT 1;
 
INSERT INTO students
    (student_number, first_name, last_name, program_id,
     year_level, section, email)
SELECT
    '20250002', 'Kim Darrene', 'Deguit', program_id,
    1, 'A', 'kimdeguit@example.edu'
FROM programs
WHERE program_name = 'BS Computer Science'
  AND NOT EXISTS (
      SELECT 1 FROM students WHERE student_number = '20250002'
  );
 
INSERT INTO students
    (student_number, first_name, last_name, program_id,
     year_level, section, email)
SELECT
    '20250003', 'Cham', 'Abejero', program_id,
    3, 'A', 'chamabejero@example.edu'
FROM programs
WHERE program_name = 'BS Computer Engineering'
  AND NOT EXISTS (
      SELECT 1 FROM students WHERE student_number = '20250003'
  );
 

INSERT INTO students
    (student_number, first_name, last_name, program_id,
     year_level, section, email)
SELECT
    '20250005', 'Matt', 'Tulog', program_id,
    2, 'B', 'matttulog@example.edu'
FROM programs
WHERE program_name = 'BS Business Administration'
  AND NOT EXISTS (
      SELECT 1 FROM students WHERE student_number = '20250005'
  );
 
INSERT INTO students
    (student_number, first_name, last_name, program_id,
     year_level, section, email)
SELECT
    '20250004', 'Ana', 'Reyes', NULL,
    1, 'A', 'anareyes@example.edu'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM students WHERE student_number = '20250004'
);
 
INSERT INTO events
    (event_name, event_date, start_time, end_time,
     grace_period_minutes, venue_id, category_id,
     status_id, term_id, created_by)
SELECT
    'IT Orientation',
    '2026-11-10',
    '08:00:00',
    '12:00:00',
    15,
    v.venue_id,
    c.category_id,
    es.status_id,
    t.term_id,
    u.user_id
FROM venues v
JOIN event_categories c ON c.category_name = 'Seminar'
JOIN event_statuses es ON es.status_name = 'Upcoming'
JOIN academic_terms t ON t.term_name = 'First Semester 2026-2027'
JOIN users u ON u.username = 'admin'
WHERE v.venue_name = 'Main Auditorium'
  AND NOT EXISTS (
      SELECT 1 FROM events
      WHERE event_name = 'IT Orientation'
        AND event_date = '2026-11-10'
  );
 
INSERT INTO events
    (event_name, event_date, start_time, end_time,
     grace_period_minutes, venue_id, category_id,
     status_id, term_id, created_by)
SELECT
    'Database Workshop',
    '2026-11-12',
    '13:00:00',
    '16:00:00',
    10,
    v.venue_id,
    c.category_id,
    es.status_id,
    t.term_id,
    u.user_id
FROM venues v
JOIN event_categories c ON c.category_name = 'Workshop'
JOIN event_statuses es ON es.status_name = 'Upcoming'
JOIN academic_terms t ON t.term_name = 'First Semester 2026-2027'
JOIN users u ON u.username = 'admin'
WHERE v.venue_name = 'Computer Laboratory'
  AND NOT EXISTS (
      SELECT 1 FROM events
      WHERE event_name = 'Database Workshop'
        AND event_date = '2026-11-12'
  );
 

INSERT INTO registration
    (student_id, event_id, status_id, registered_by)
SELECT s.student_id, e.event_id, rs.status_id, u.user_id
FROM students s
JOIN events e ON e.event_name = 'IT Orientation'
JOIN registration_statuses rs ON rs.status_name = 'Registered'
JOIN users u ON u.username = 'admin'
WHERE s.student_number IN ('202521051', '20250002')
  AND NOT EXISTS (
      SELECT 1 FROM registration r
      WHERE r.student_id = s.student_id
        AND r.event_id = e.event_id
  );
 
INSERT INTO registration
    (student_id, event_id, status_id, registered_by)
SELECT s.student_id, e.event_id, rs.status_id, u.user_id
FROM students s
JOIN events e ON e.event_name = 'Database Workshop'
JOIN registration_statuses rs ON rs.status_name = 'Registered'
JOIN users u ON u.username = 'admin'
WHERE s.student_number = '20250003'
  AND NOT EXISTS (
      SELECT 1 FROM registration r
      WHERE r.student_id = s.student_id
        AND r.event_id = e.event_id
  );
 

INSERT INTO attendance
    (registration_id, status_id, time_in, recorded_by)
SELECT r.registration_id, ast.status_id, '2026-11-10 08:05:00', u.user_id
FROM registration r
JOIN students s ON s.student_id = r.student_id
JOIN events e ON e.event_id = r.event_id
JOIN attendance_statuses ast ON ast.status_name = 'Present'
JOIN users u ON u.username = 'admin'
WHERE s.student_number = '202521051'
  AND e.event_name = 'IT Orientation'
  AND NOT EXISTS (
      SELECT 1 FROM attendance a
      WHERE a.registration_id = r.registration_id
  );
 
INSERT INTO attendance
    (registration_id, status_id, time_in, recorded_by)
SELECT r.registration_id, ast.status_id, '2026-11-10 08:25:00', u.user_id
FROM registration r
JOIN students s ON s.student_id = r.student_id
JOIN events e ON e.event_id = r.event_id
JOIN attendance_statuses ast ON ast.status_name = 'Late'
JOIN users u ON u.username = 'admin'
WHERE s.student_number = '20250002'
  AND e.event_name = 'IT Orientation'
  AND NOT EXISTS (
      SELECT 1 FROM attendance a
      WHERE a.registration_id = r.registration_id
  );
 
INSERT IGNORE INTO event_programs (event_id, program_id)
SELECT e.event_id, p.program_id
FROM events e
JOIN programs p ON p.program_name IN (
    'BS Information Technology',
    'BS Computer Science'
)
WHERE e.event_name = 'IT Orientation';
 
INSERT IGNORE INTO event_programs (event_id, program_id)
SELECT e.event_id, p.program_id
FROM events e
JOIN programs p ON p.program_name = 'BS Information Technology'
WHERE e.event_name = 'Database Workshop';
 

INSERT INTO attendance_notes
    (attendance_id, note_text, added_by)
SELECT a.attendance_id,
       'Sample record for testing the attendance notes feature',
       u.user_id
FROM attendance a
JOIN registration r ON r.registration_id = a.registration_id
JOIN students s ON s.student_id = r.student_id
JOIN events e ON e.event_id = r.event_id
JOIN users u ON u.username = 'admin'
WHERE s.student_number = '202521051'
  AND e.event_name = 'IT Orientation'
  AND NOT EXISTS (
      SELECT 1
      FROM attendance_notes n
      WHERE n.attendance_id = a.attendance_id
        AND n.note_text = 'Sample record for testing the attendance notes feature'
  );
