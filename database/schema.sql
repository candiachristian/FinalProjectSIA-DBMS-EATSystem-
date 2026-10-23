CREATE DATABASE event_attendance_db;
USE event_attendance_db;

CREATE TABLE roles (
    role_id INT AUTO_INCREMENT PRIMARY KEY,
    role_name VARCHAR(30) NOT NULL UNIQUE
);

CREATE TABLE programs (
    program_id INT AUTO_INCREMENT PRIMARY KEY,
    program_name VARCHAR(120) NOT NULL UNIQUE,
    department VARCHAR(120) NOT NULL
);

CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(80) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role_id INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_users_roles
        FOREIGN KEY (role_id) REFERENCES roles(role_id)
);

CREATE TABLE students (
    student_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    student_number VARCHAR(40) NOT NULL UNIQUE,
    first_name VARCHAR(80) NOT NULL,
    middle_name VARCHAR(80) NULL,
    last_name VARCHAR(80) NOT NULL,
    program_id INT NOT NULL,
    year_level TINYINT NOT NULL,
    section VARCHAR(20) NOT NULL,
    email VARCHAR(254) NOT NULL UNIQUE,
    CONSTRAINT chk_students_year_level CHECK (year_level BETWEEN 1 AND 5),
    CONSTRAINT fk_students_users
        FOREIGN KEY (user_id) REFERENCES users(user_id),
    CONSTRAINT fk_students_programs
        FOREIGN KEY (program_id) REFERENCES programs(program_id)
);
