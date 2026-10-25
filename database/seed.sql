USE event_attendance_db;

INSERT IGNORE INTO roles (role_name)
VALUES ('student'), ('admin');

INSERT IGNORE INTO programs (program_name, department)
VALUES ('BS Information Technology', 'College of Technology');
