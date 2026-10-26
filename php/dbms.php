<?php
$envPath = dirname(__DIR__) . '/.env';

if (!is_readable($envPath)) {
    exit('Could not find the project .env file.');
}

$settings = [];

foreach (file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
    $line = trim($line);

    if ($line === '' || str_starts_with($line, '#')) {
        continue;
    }

    $separator = strpos($line, '=');
    if ($separator === false) {
        continue;
    }

    $key = trim(substr($line, 0, $separator));
    $value = trim(substr($line, $separator + 1));
    $settings[$key] = trim($value, "\"'");
}

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    $connection = new mysqli(
        $settings['DB_HOST'] ?? 'localhost',
        $settings['DB_USER'] ?? 'root',
        $settings['DB_PASSWORD'] ?? '',
        $settings['DB_NAME'] ?? 'event_attendance_db',
        (int) ($settings['DB_PORT'] ?? 3306)
    );

    $connection->set_charset('utf8mb4');

    $sql = "
        SELECT
            students.student_number,
            students.first_name,
            students.middle_name,
            students.last_name,
            students.email,
            students.year_level,
            students.section,
            programs.program_name,
            programs.department,
            users.username,
            roles.role_name
        FROM students
        INNER JOIN users
            ON students.user_id = users.user_id
        INNER JOIN roles
            ON users.role_id = roles.role_id
        INNER JOIN programs
            ON students.program_id = programs.program_id
        ORDER BY students.last_name, students.first_name
    ";

    $result = $connection->query($sql);
} catch (Throwable $error) {
    http_response_code(500);
    exit('Could not load the report. Check the database connection and table setup.');
}

function escapeHtml($value): string
{
    return htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8');
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Student Accounts Report</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 30px;
            color: #222;
        }

        h1, p {
            margin-bottom: 10px;
        }

        button {
            padding: 10px 16px;
            margin: 10px 0 18px;
            cursor: pointer;
        }

        table {
            width: 100%;
            border-collapse: collapse;
        }

        th, td {
            border: 1px solid #999;
            padding: 8px;
            text-align: left;
        }

        th {
            background: #eee;
        }

        @media print {
            button {
                display: none;
            }

            body {
                margin: 10mm;
            }
        }
    </style>
</head>
<body>
    <h1>Student Accounts Report</h1>
    <p>Report includes student, program, account, and role details.</p>
    <button type="button" onclick="window.print()">Print report</button>

    <?php if ($result->num_rows === 0): ?>
        <p>No student records found. Add sample data before demonstrating the report.</p>
    <?php else: ?>
        <table>
            <thead>
                <tr>
                    <th>Student Number</th>
                    <th>Student Name</th>
                    <th>Email</th>
                    <th>Program</th>
                    <th>Department</th>
                    <th>Year</th>
                    <th>Section</th>
                    <th>Username</th>
                    <th>Role</th>
                </tr>
            </thead>
            <tbody>
                <?php while ($row = $result->fetch_assoc()): ?>
                    <tr>
                        <td><?= escapeHtml($row['student_number']) ?></td>
                        <td>
                            <?= escapeHtml($row['first_name']) ?>
                            <?= escapeHtml($row['middle_name']) ?>
                            <?= escapeHtml($row['last_name']) ?>
                        </td>
                        <td><?= escapeHtml($row['email']) ?></td>
                        <td><?= escapeHtml($row['program_name']) ?></td>
                        <td><?= escapeHtml($row['department']) ?></td>
                        <td><?= escapeHtml($row['year_level']) ?></td>
                        <td><?= escapeHtml($row['section']) ?></td>
                        <td><?= escapeHtml($row['username']) ?></td>
                        <td><?= escapeHtml($row['role_name']) ?></td>
                    </tr>
                <?php endwhile; ?>
            </tbody>
        </table>
    <?php endif; ?>

    <?php
    $result->free();
    $connection->close();
    ?>
</body>
</html>
