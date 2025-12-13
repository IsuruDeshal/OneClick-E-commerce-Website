<?php
/**
 * PostgreSQL Database Connection
 * EC2 + Supabase Backend
 *
 * This replaces MySQL/mysqli with PostgreSQL/pg_connect
 */

require_once 'config.php';

/**
 * Get PostgreSQL database connection
 *
 * @return resource PostgreSQL connection resource
 */
function getDB() {
    static $conn = null;

    if ($conn === null) {
        try {
            // Build PostgreSQL connection string
            $conn_string = sprintf(
                "host=%s port=%s dbname=%s user=%s password=%s sslmode=%s",
                DB_HOST,
                DB_PORT,
                DB_NAME,
                DB_USER,
                DB_PASS,
                DB_SSLMODE
            );

            // Connect to PostgreSQL
            $conn = pg_connect($conn_string);

            if (!$conn) {
                throw new Exception('Failed to connect to Supabase PostgreSQL');
            }

            // Set client encoding to UTF-8
            pg_set_client_encoding($conn, 'UTF8');

        } catch (Exception $e) {
            error_log('Database Connection Error: ' . $e->getMessage());

            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error' => 'Database connection failed',
                'message' => DEBUG_MODE ? $e->getMessage() : 'Please try again later'
            ]);
            exit();
        }
    }

    return $conn;
}

/**
 * Execute a prepared query (SELECT)
 *
 * @param string $query SQL query with $1, $2, etc. placeholders
 * @param array $params Parameters to bind
 * @return array Result rows as associative array
 */
function query($query, $params = []) {
    $conn = getDB();

    try {
        if (empty($params)) {
            $result = pg_query($conn, $query);
        } else {
            $result = pg_query_params($conn, $query, $params);
        }

        if (!$result) {
            throw new Exception(pg_last_error($conn));
        }

        return pg_fetch_all($result) ?: [];

    } catch (Exception $e) {
        error_log('Query Error: ' . $e->getMessage());
        throw $e;
    }
}

/**
 * Execute a query and return single row
 *
 * @param string $query SQL query
 * @param array $params Parameters to bind
 * @return array|null Single row or null
 */
function queryOne($query, $params = []) {
    $conn = getDB();

    try {
        if (empty($params)) {
            $result = pg_query($conn, $query);
        } else {
            $result = pg_query_params($conn, $query, $params);
        }

        if (!$result) {
            throw new Exception(pg_last_error($conn));
        }

        return pg_fetch_assoc($result) ?: null;

    } catch (Exception $e) {
        error_log('Query Error: ' . $e->getMessage());
        throw $e;
    }
}

/**
 * Execute INSERT/UPDATE/DELETE query
 *
 * @param string $query SQL query
 * @param array $params Parameters to bind
 * @return int Number of affected rows
 */
function execute($query, $params = []) {
    $conn = getDB();

    try {
        if (empty($params)) {
            $result = pg_query($conn, $query);
        } else {
            $result = pg_query_params($conn, $query, $params);
        }

        if (!$result) {
            throw new Exception(pg_last_error($conn));
        }

        return pg_affected_rows($result);

    } catch (Exception $e) {
        error_log('Execute Error: ' . $e->getMessage());
        throw $e;
    }
}

/**
 * Get last inserted ID (PostgreSQL RETURNING clause)
 *
 * @param string $query INSERT query with RETURNING id
 * @param array $params Parameters to bind
 * @return int Last inserted ID
 */
function insertAndGetId($query, $params = []) {
    $conn = getDB();

    try {
        if (empty($params)) {
            $result = pg_query($conn, $query);
        } else {
            $result = pg_query_params($conn, $query, $params);
        }

        if (!$result) {
            throw new Exception(pg_last_error($conn));
        }

        $row = pg_fetch_assoc($result);
        return $row['id'] ?? null;

    } catch (Exception $e) {
        error_log('Insert Error: ' . $e->getMessage());
        throw $e;
    }
}

/**
 * Begin transaction
 */
function beginTransaction() {
    $conn = getDB();
    pg_query($conn, 'BEGIN');
}

/**
 * Commit transaction
 */
function commit() {
    $conn = getDB();
    pg_query($conn, 'COMMIT');
}

/**
 * Rollback transaction
 */
function rollback() {
    $conn = getDB();
    pg_query($conn, 'ROLLBACK');
}

/**
 * Send JSON response
 *
 * @param array $data Response data
 * @param int $status HTTP status code
 */
function sendResponse($data, $status = 200) {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit();
}

/**
 * Get JSON input from request body
 *
 * @return array Decoded JSON data
 */
function getJSONInput() {
    $input = file_get_contents('php://input');
    return json_decode($input, true) ?? [];
}

/**
 * Sanitize input (basic XSS prevention)
 *
 * @param string $str Input string
 * @return string Sanitized string
 */
function sanitize($str) {
    return htmlspecialchars(trim($str), ENT_QUOTES, 'UTF-8');
}

/**
 * Validate email
 *
 * @param string $email Email address
 * @return string|false Valid email or false
 */
function validateEmail($email) {
    return filter_var($email, FILTER_VALIDATE_EMAIL);
}

/**
 * Close database connection
 */
function closeDB() {
    static $conn = null;
    if ($conn !== null) {
        pg_close($conn);
        $conn = null;
    }
}

// Auto-close connection on script end
register_shutdown_function('closeDB');

?>

