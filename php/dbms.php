<?php
declare(strict_types=1);
 
require_once __DIR__ . '/dbconfig.php';
 
if (!isset($connection) || !($connection instanceof mysqli)) {
    http_response_code(500);
    exit('Database connection is not available. Check php/dbconfig.php.');
}
 

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
$connection->set_charset('utf8mb4');
 
$columns = [
    'student_number',
    'first_name',
    'last_name',
    'program_name',
    'department_name'
];
 

$emptyLabels = [
    'student_number'  => 'No student',
    'first_name'      => '—',
    'last_name'       => '—',
    'program_name'    => 'No program',
    'department_name' => 'No department'
];
 
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
        SQL
];
 
function escapeCell($value): string
{
    return htmlspecialchars(
        (string) ($value ?? ''),
        ENT_QUOTES | ENT_SUBSTITUTE,
        'UTF-8'
    );
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
        'match the approved schema.'
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
            table-layout: fixed; /* same column widths in all four tables */
            margin: 1rem 0 2rem;
        }
 
        th, td {
            border: 1px solid #bbb;
            padding: .5rem;
            text-align: left;
            overflow-wrap: anywhere;
        }
 
        th {
            background: #eee;
        }
 
        /* Cells left empty by an outer join */
        td.empty {
            color: #888;
            font-style: italic;
        }
 
        /* Rows where at least one side had no match */
        tr.unmatched {
            background: #fff8e1;
        }
 
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
            button {
                display: none;
            }
 
            body {
                margin: 0;
                max-width: none;
            }
 
            tr.unmatched {
                background: #fff8e1;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
        }
    </style>
</head>
<body>
    <h1>Students by Program and Department</h1>
    <button type="button" onclick="window.print()">Print reports</button>
    <p class="legend">
        <span>Highlighted rows</span> have no match on one side of the join
        (shown in grey italics).
    </p>
 
    <?php foreach ($results as $title => $result): ?>
        <section>
            <h2><?= escapeCell($title) ?></h2>
            <table>
                <colgroup>
                    <col style="width: 16%">
                    <col style="width: 16%">
                    <col style="width: 16%">
                    <col style="width: 26%">
                    <col style="width: 26%">
                </colgroup>
                <thead>
                    <tr>
                        <th>Student number</th>
                        <th>First name</th>
                        <th>Last name</th>
                        <th>Program</th>
                        <th>Department</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if ($result->num_rows === 0): ?>
                        <tr>
                            <td colspan="5" class="empty">No records found.</td>
                        </tr>
                    <?php endif; ?>
 
                    <?php while ($row = $result->fetch_assoc()): ?>
                        <?php
                        $unmatched = $row['student_number'] === null
                            || $row['program_name'] === null
                            || $row['department_name'] === null;
                        ?>
                        <tr<?= $unmatched ? ' class="unmatched"' : '' ?>>
                            <?php foreach ($columns as $column): ?>
                                <?php $value = $row[$column] ?? null; ?>
                                <?php if ($value === null || $value === ''): ?>
                                    <td class="empty"><?= escapeCell($emptyLabels[$column]) ?></td>
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
 