USE event_attendance_db;

INSERT IGNORE INTO roles (role_name)
VALUES ('admin');

INSERT IGNORE INTO departments (department_name)
VALUES
    ('College of Arts and Sciences'),
    ('College of Business Administration');

INSERT IGNORE INTO event_categories (category_name)
VALUES
    ('Code Connect Workshop'),
    ('Founders Day'),
    ('Hackathon'),
    ('IT Fest');