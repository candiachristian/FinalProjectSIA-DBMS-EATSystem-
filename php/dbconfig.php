<?php
declare(strict_types=1);

$envPath = dirname(__DIR__) . DIRECTORY_SEPARATOR . '.env';

if (!is_readable($envPath)) {
    http_response_code(500);
    exit('Cannot read the project .env file. Check that it is in the project root.');
}

$settings = [];
$envLines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);

if ($envLines === false) {
    http_response_code(500);
    exit('Could not read the project .env file.');
}

foreach ($envLines as $line) {
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

foreach (['DB_HOST', 'DB_USER', 'DB_NAME'] as $requiredKey) {
    if (!isset($settings[$requiredKey]) || $settings[$requiredKey] === '') {
        http_response_code(500);
        exit('A required database setting is missing from .env.');
    }
}

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    $connection = new mysqli(
        $settings['DB_HOST'],
        $settings['DB_USER'],
        $settings['DB_PASSWORD'] ?? '',
        $settings['DB_NAME'],
        (int) ($settings['DB_PORT'] ?? 3306)
    );

    $connection->set_charset('utf8mb4');
} catch (mysqli_sql_exception $error) {
    error_log('PHP MySQL connection failed: ' . $error->getMessage());
    http_response_code(500);
    exit('Could not connect to MySQL. Check the database settings and confirm MySQL is running.');
}
