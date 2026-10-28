CREATE DATABASE event_attendance_db;
USE event_attendance_db;

CREATE TABLE roles (
    role_id INT AUTO_INCREMENT PRIMARY KEY,
    role_name VARCHAR(30) NOT NULL UNIQUE
);

CREATE TABLE departments (
    department_id INT AUTO_INCREMENT PRIMARY KEY,
    department_name VARCHAR(120) NOT NULL UNIQUE
);

CREATE TABLE event_categories (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    category_name VARCHAR(80) NOT NULL UNIQUE
);

CREATE TABLE event_statuses (
    status_id INT AUTO_INCREMENT PRIMARY KEY,
    status_name VARCHAR(40) NOT NULL UNIQUE
);

CREATE TABLE registration_statuses (
    status_id INT AUTO_INCREMENT PRIMARY KEY,
    status_name VARCHAR(40) NOT NULL UNIQUE
);

CREATE TABLE venues (
    venue_id INT AUTO_INCREMENT PRIMARY KEY,
    venue_name VARCHAR(120) NOT NULL,
    location VARCHAR(150) NULL
);

CREATE TABLE academic_terms (
    term_id INT AUTO_INCREMENT PRIMARY KEY,
    term_name VARCHAR(80) NOT NULL UNIQUE
);

CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(80) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role_id INT NOT NULL,
    FOREIGN KEY (role_id) REFERENCES roles(role_id)
);


CREATE TABLE programs (
    program_id INT AUTO_INCREMENT PRIMARY KEY,
    program_name VARCHAR(120) NOT NULL,
    department_id INT NOT NULL,
    UNIQUE (program_name, department_id),
    FOREIGN KEY (department_id) REFERENCES departments(department_id)
);

CREATE TABLE students (
    student_id INT AUTO_INCREMENT PRIMARY KEY,
    student_number VARCHAR(40) NOT NULL UNIQUE,
    first_name VARCHAR(80) NOT NULL,
    last_name VARCHAR(80) NOT NULL,
    program_id INT NULL,
    year_level TINYINT NOT NULL,
    section VARCHAR(20) NOT NULL,
    email VARCHAR(254) NULL,
    FOREIGN KEY (program_id) REFERENCES programs(program_id)
);

CREATE TABLE events (
    event_id INT AUTO_INCREMENT PRIMARY KEY,
    event_name VARCHAR(150) NOT NULL,
    event_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    grace_period_minutes INT NOT NULL DEFAULT 15,
    venue_id INT NOT NULL,
    category_id INT NOT NULL,
    status_id INT NOT NULL,
    term_id INT NULL,
    created_by INT NOT NULL,
    FOREIGN KEY (venue_id) REFERENCES venues(venue_id),
    FOREIGN KEY (category_id) REFERENCES event_categories(category_id),
    FOREIGN KEY (status_id) REFERENCES event_statuses(status_id),
    FOREIGN KEY (term_id) REFERENCES academic_terms(term_id),
    FOREIGN KEY (created_by) REFERENCES users(user_id)
);

CREATE TABLE attendance (
    attendance_id INT AUTO_INCREMENT PRIMARY KEY,
    registration_id INT NOT NULL UNIQUE,
    status_id INT NOT NULL,
    time_in DATETIME NULL,
    recorded_by INT NULL,
    FOREIGN KEY (registration_id) REFERENCES registration(registration_id),
    FOREIGN KEY (status_id) REFERENCES attendance_statuses(status_id),
    FOREIGN KEY (recorded_by) REFERENCES users(user_id)
);

CREATE TABLE event_programs (
    event_id INT NOT NULL,
    program_id INT NOT NULL,
    PRIMARY KEY (event_id, program_id),
    FOREIGN KEY (event_id) REFERENCES events(event_id),
    FOREIGN KEY (program_id) REFERENCES programs(program_id)
);

CREATE TABLE attendance_notes (
    note_id INT AUTO_INCREMENT PRIMARY KEY,
    attendance_id INT NOT NULL,
    note_text VARCHAR(255) NOT NULL,
    added_by INT NOT NULL,
    added_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (attendance_id) REFERENCES attendance(attendance_id),
    FOREIGN KEY (added_by) REFERENCES users(user_id)

CREATE TABLE registration (
    registration_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    event_id INT NOT NULL,
    status_id INT NOT NULL,
    registered_by INT NOT NULL,
    registered_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (student_id, event_id),
    FOREIGN KEY (student_id) REFERENCES students(student_id),
    FOREIGN KEY (event_id) REFERENCES events(event_id),
    FOREIGN KEY (status_id) REFERENCES registration_statuses(status_id),
    FOREIGN KEY (registered_by) REFERENCES users(user_id)
);

