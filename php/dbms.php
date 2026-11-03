<?php
declare(strict_types=1);

require_once __DIR__ . '/dbconfig.php';

if (!isset($connection) || !($connection instanceof mysqli)) {
    http_response_code(500);
    exit('Database connection is not available. Check php/dbconfig.php.');
}

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
$connection->set_charset('utf8mb4');

$reports = [
    'INNER JOIN — students with a program and department' => <<<'SQL'
        SELECT
            s.student_number,
            s.first_name,
            s.last_name,
            p.program_name,
            d.department_name
        FROM students AS s
        INNER JOIN programs AS p
            ON p.program_id = s.program_id
        INNER JOIN departments AS d
            ON d.department_id = p.department_id
        ORDER BY s.student_number
        SQL,

    'LEFT JOIN — keep every student' => <<<'SQL'
        SELECT
            s.student_number,
            s.first_name,
            s.last_name,
            p.program_name,
            d.department_name
        FROM students AS s
        LEFT JOIN programs AS p
            ON p.program_id = s.program_id
        LEFT JOIN departments AS d
            ON d.department_id = p.department_id
        ORDER BY s.student_number
        SQL,

    'RIGHT JOIN — keep every program' => <<<'SQL'
        SELECT
            s.student_number,
            s.first_name,
            s.last_name,
            p.program_name,
            d.department_name
        FROM students AS s
        RIGHT JOIN programs AS p
            ON p.program_id = s.program_id
        LEFT JOIN departments AS d
            ON d.department_id = p.department_id
        ORDER BY p.program_name, s.student_number
        SQL,

    'FULL OUTER JOIN equivalent — students, programs, and departments' => <<<'SQL'
        SELECT *
        FROM (
            SELECT
                s.student_number,
                s.first_name,
                s.last_name,
                p.program_name,
                d.department_name
            FROM students AS s
            LEFT JOIN programs AS p
                ON p.program_id = s.program_id
            LEFT JOIN departments AS d
                ON d.department_id = p.department_id

            UNION

            SELECT
                s.student_number,
                s.first_name,
                s.last_name,
                p.program_name,
                d.department_name
            FROM programs AS p
            LEFT JOIN students AS s
                ON s.program_id = p.program_id
            LEFT JOIN departments AS d
                ON d.department_id = p.department_id

            UNION

            SELECT
                s.student_number,
                s.first_name,
                s.last_name,
                p.program_name,
                d.department_name
            FROM departments AS d
            LEFT JOIN programs AS p
                ON p.department_id = d.department_id
            LEFT JOIN students AS s
                ON s.program_id = p.program_id
        ) AS full_join
        ORDER BY
            (student_number IS NULL),
            student_number,
            (program_name IS NULL),
            program_name,
            department_name
        SQL,

    'INNER / LEFT JOIN — event schedule, venue, category, status, and term' => <<<'SQL'
        SELECT
            e.event_id,
            e.event_name,
            DATE_FORMAT(e.event_date, '%Y-%m-%d') AS event_date,
            TIME_FORMAT(e.start_time, '%H:%i') AS start_time,
            TIME_FORMAT(e.end_time, '%H:%i') AS end_time,
            v.venue_name,
            c.category_name,
            es.status_name AS event_status,
            t.term_name
        FROM events AS e
        INNER JOIN venues AS v
            ON v.venue_id = e.venue_id
        INNER JOIN event_categories AS c
            ON c.category_id = e.category_id
        INNER JOIN event_statuses AS es
            ON es.status_id = e.status_id
        LEFT JOIN academic_terms AS t
            ON t.term_id = e.term_id
        ORDER BY e.event_date, e.start_time, e.event_name
        SQL,

    'INNER / LEFT JOIN — attendance roster with registered students and time-in' => <<<'SQL'
        SELECT
            e.event_name,
            DATE_FORMAT(e.event_date, '%Y-%m-%d') AS event_date,
            s.student_number,
            s.first_name,
            s.last_name,
            r.proof_image_path,
            d.department_name,
            p.program_name,
            s.year_level,
            s.section,
            rs.status_name AS registration_status,
            ast.status_name AS attendance_status,
            DATE_FORMAT(a.time_in, '%Y-%m-%d %H:%i:%s') AS time_in
        FROM registration AS r
        INNER JOIN students AS s
            ON s.student_id = r.student_id
        INNER JOIN events AS e
            ON e.event_id = r.event_id
        INNER JOIN registration_statuses AS rs
            ON rs.status_id = r.status_id
        LEFT JOIN programs AS p
            ON p.program_id = s.program_id
        LEFT JOIN departments AS d
            ON d.department_id = p.department_id
        LEFT JOIN attendance AS a
            ON a.registration_id = r.registration_id
        LEFT JOIN attendance_statuses AS ast
            ON ast.status_id = a.status_id
        ORDER BY
            e.event_date,
            e.event_name,
            p.program_name,
            s.year_level,
            s.section,
            s.last_name,
            s.first_name
        SQL,
];

function escapeCell(mixed $value): string
{
    return htmlspecialchars(
        (string) ($value ?? ''),
        ENT_QUOTES | ENT_SUBSTITUTE,
        'UTF-8'
    );
}

function labelForColumn(string $column): string
{
    return ucwords(str_replace('_', ' ', $column));
}

function emptyLabel(string $column): string
{
    return match ($column) {
        'student_number' => 'No student',
        'first_name', 'last_name' => '—',
        'program_name' => 'No program',
        'department_name' => 'No department',
        'proof_image_path' => 'No proof photo',
        'term_name' => 'No term assigned',
        'attendance_status' => 'Not recorded',
        default => '—',
    };
}

$results = [];

try {
    foreach ($reports as $title => $sql) {
        $results[$title] = $connection->query($sql);
    }
} catch (mysqli_sql_exception $error) {
    error_log('DBMS report query failed: ' . $error->getMessage());
    http_response_code(500);
    exit(
        'A report query failed. Check that the database tables and column names ' .
        'match the project schema.'
    );
}
?>
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Event Attendance — Join Reports</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 1000px;
            margin: 2rem auto;
            padding: 0 1rem;
        }

        table {
            border-collapse: collapse;
            width: 100%;
            table-layout: auto;
            margin: 1rem 0 2rem;
        }

        th, td {
            border: 1px solid #bbb;
            padding: .5rem;
            text-align: left;
            overflow-wrap: anywhere;
        }

        th { background: #eee; }

        td.empty {
            color: #888;
            font-style: italic;
        }

        tr.unmatched { background: #fff8e1; }

        .legend {
            font-size: .9rem;
            color: #555;
            margin: .75rem 0 0;
        }

        .legend span {
            background: #fff8e1;
            border: 1px solid #bbb;
            padding: 0 .4rem;
        }

        @media print {
            button { display: none; }
            body { margin: 0; max-width: none; }
            tr.unmatched {
                background: #fff8e1;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
        }
    </style>
</head>
<body>
    <h1>Event Attendance System — Database Join Reports</h1>
    <button type="button" onclick="window.print()">Print reports</button>
    <p class="legend">
        <span>Highlighted rows</span> contain a NULL result from an outer join;
        empty values are shown in grey italics.
    </p>

    <?php foreach ($results as $title => $result): ?>
        <?php $fields = $result->fetch_fields(); ?>
        <section>
            <h2><?= escapeCell($title) ?></h2>
            <table>
                <thead>
                    <tr>
                        <?php foreach ($fields as $field): ?>
                            <th><?= escapeCell(labelForColumn($field->name)) ?></th>
                        <?php endforeach; ?>
                    </tr>
                </thead>
                <tbody>
                    <?php if ($result->num_rows === 0): ?>
                        <tr>
                            <td colspan="<?= count($fields) ?>" class="empty">No records found.</td>
                        </tr>
                    <?php endif; ?>

                    <?php while ($row = $result->fetch_assoc()): ?>
                        <?php $unmatched = in_array(null, $row, true); ?>
                        <tr<?= $unmatched ? ' class="unmatched"' : '' ?>>
                            <?php foreach ($fields as $field): ?>
                                <?php $value = $row[$field->name] ?? null; ?>
                                <?php if ($value === null || $value === ''): ?>
                                    <td class="empty"><?= escapeCell(emptyLabel($field->name)) ?></td>
                                <?php elseif ($field->name === 'proof_image_path' && preg_match('~^/uploads/proofs/[A-Za-z0-9._-]+$~', (string) $value) === 1): ?>
                                    <td><a href="/public<?= escapeCell($value) ?>" target="_blank" rel="noopener">View photo</a></td>
                                <?php else: ?>
                                    <td><?= escapeCell($value) ?></td>
                                <?php endif; ?>
                            <?php endforeach; ?>
                        </tr>
                    <?php endwhile; ?>
                </tbody>
            </table>
        </section>
    <?php endforeach; ?>
</body>
</html>
<?php
foreach ($results as $result) {
    $result->free();
}

$connection->close();
?>
