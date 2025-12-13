<?php
/**
 * UNIVERSAL DATABASE CONNECTION
 * Auto-detects MySQL (XAMPP) or PostgreSQL (Supabase)
 */

require_once dirname(__FILE__) . '/config-local.php';

/**
 * Get database connection (MySQL or PostgreSQL)
 */
function getDB() {
    static $conn = null;

    if ($conn === null) {
        try {
            if (DB_TYPE === 'mysql') {
                // MySQL connection for XAMPP
                $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME, DB_PORT);

                if ($conn->connect_error) {
                    throw new Exception('MySQL connection failed: ' . $conn->connect_error);
                }

                $conn->set_charset('utf8mb4');

            } else {
                // PostgreSQL connection for production
                $conn_string = sprintf(
                    "host=%s port=%s dbname=%s user=%s password=%s sslmode=%s",
                    DB_HOST,
                    DB_PORT,
                    DB_NAME,
                    DB_USER,
                    DB_PASS,
                    DB_SSLMODE ?? 'prefer'
                );

                $conn = pg_connect($conn_string);

                if (!$conn) {
                    throw new Exception('PostgreSQL connection failed');
                }

                pg_set_client_encoding($conn, 'UTF8');
            }

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
 * Execute a SELECT query (works with both MySQL and PostgreSQL)
 */
function query($sql, $params = []) {
    $conn = getDB();

    try {
        if (DB_TYPE === 'mysql') {
            $stmt = $conn->prepare($sql);
            if (!$stmt) {
                throw new Exception($conn->error);
            }
            if (!empty($params)) {
                $types = str_repeat('s', count($params));
                $stmt->bind_param($types, ...$params);
            }
            if (!$stmt->execute()) {
                throw new Exception($stmt->error ?: $conn->error ?: 'MySQL execute failed');
            }
            $result = $stmt->get_result();
            if ($result === false) {
                throw new Exception($stmt->error ?: $conn->error ?: 'MySQL get_result failed');
            }
            return $result->fetch_all(MYSQLI_ASSOC);

        } else {
            // PostgreSQL
            if (empty($params)) {
                $result = pg_query($conn, $sql);
            } else {
                $result = pg_query_params($conn, $sql, $params);
            }
            if (!$result) {
                throw new Exception(pg_last_error($conn));
            }
            return pg_fetch_all($result) ?: [];
        }

    } catch (Exception $e) {
        error_log('Query Error: ' . $e->getMessage() . ' | SQL: ' . $sql);
        throw $e;
    }
}

/**
 * Execute query and return single row
 */
function queryOne($sql, $params = []) {
    $results = query($sql, $params);
    return !empty($results) ? $results[0] : null;
}

/**
 * Execute INSERT/UPDATE/DELETE query
 */
function execute($sql, $params = []) {
    $conn = getDB();

    try {
        if (DB_TYPE === 'mysql') {
            $stmt = $conn->prepare($sql);

            if (!$stmt) {
                throw new Exception($conn->error);
            }

            if (!empty($params)) {
                $types = str_repeat('s', count($params));
                $stmt->bind_param($types, ...$params);
            }

            $stmt->execute();
            return $stmt->affected_rows;

        } else {
            if (empty($params)) {
                $result = pg_query($conn, $sql);
            } else {
                $result = pg_query_params($conn, $sql, $params);
            }

            if (!$result) {
                throw new Exception(pg_last_error($conn));
            }

            return pg_affected_rows($result);
        }

    } catch (Exception $e) {
        error_log('Execute Error: ' . $e->getMessage());
        throw $e;
    }
}

/**
 * Get last inserted ID
 */
function insertAndGetId($sql, $params = []) {
    $conn = getDB();

    try {
        if (DB_TYPE === 'mysql') {
            $stmt = $conn->prepare($sql);

            if (!$stmt) {
                throw new Exception($conn->error);
            }

            if (!empty($params)) {
                $types = str_repeat('s', count($params));
                $stmt->bind_param($types, ...$params);
            }

            $stmt->execute();
            return $conn->insert_id;

        } else {
            // PostgreSQL with RETURNING clause
            if (empty($params)) {
                $result = pg_query($conn, $sql);
            } else {
                $result = pg_query_params($conn, $sql, $params);
            }

            if (!$result) {
                throw new Exception(pg_last_error($conn));
            }

            $row = pg_fetch_assoc($result);
            return $row['id'] ?? null;
        }

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

    if (DB_TYPE === 'mysql') {
        $conn->begin_transaction();
    } else {
        pg_query($conn, 'BEGIN');
    }
}

/**
 * Commit transaction
 */
function commit() {
    $conn = getDB();

    if (DB_TYPE === 'mysql') {
        $conn->commit();
    } else {
        pg_query($conn, 'COMMIT');
    }
}

/**
 * Rollback transaction
 */
function rollback() {
    $conn = getDB();

    if (DB_TYPE === 'mysql') {
        $conn->rollback();
    } else {
        pg_query($conn, 'ROLLBACK');
    }
}

/**
 * Send JSON response
 */
function sendResponse($data, $status = 200) {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit();
}

/**
 * Get JSON input from request body
 */
function getJSONInput() {
    $input = file_get_contents('php://input');
    return json_decode($input, true) ?? [];
}

/**
 * Sanitize input
 */
function sanitize($str) {
    return htmlspecialchars(trim($str), ENT_QUOTES, 'UTF-8');
}

/**
 * Validate email
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
        if (DB_TYPE === 'mysql') {
            $conn->close();
        } else {
            pg_close($conn);
        }
        $conn = null;
    }
}

// Auto-close connection on script end
register_shutdown_function('closeDB');

/**
 * Check if a column exists in a table
 */
function columnExists($table, $column){
    static $cache = [];
    $key = strtolower($table.'::'.$column);
    if(isset($cache[$key])) return $cache[$key];
    try {
        if (DB_TYPE === 'mysql') {
            $rows = query("SHOW COLUMNS FROM `$table` LIKE ?", [$column]);
            $exists = !empty($rows);
        } else { // postgres
            $sql = "SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = $2 LIMIT 1";
            $rows = query($sql, [$table, $column]);
            $exists = !empty($rows);
        }
        $cache[$key] = $exists;
        return $exists;
    } catch (Exception $e) {
        return false; // fail safe
    }
}

/**
 * Check if a table exists
 */
function tableExists($table){
    try{
        if (DB_TYPE === 'mysql'){
            $rows = query("SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ? LIMIT 1", [$table]);
            return !empty($rows);
        } else {
            $rows = query("SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1 LIMIT 1", [$table]);
            return !empty($rows);
        }
    }catch(Exception $e){ return false; }
}
?>
