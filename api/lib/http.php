<?php
// /api/lib/http.php - HTTP utilities (request parsing, method enforcement)

/**
 * Require specific HTTP method or exit with 405
 */
function require_method(string $method): void {
    if ($_SERVER['REQUEST_METHOD'] !== strtoupper($method)) {
        json_error('E_METHOD_NOT_ALLOWED', "Method {$method} required", 405);
    }
}

/**
 * Require one of multiple HTTP methods or exit with 405
 */
function require_methods(array $methods): void {
    $methods = array_map('strtoupper', $methods);
    if (!in_array($_SERVER['REQUEST_METHOD'], $methods, true)) {
        json_error('E_METHOD_NOT_ALLOWED', 'Method not allowed', 405);
    }
}

/**
 * Get JSON input from request body
 * Cached after first call to avoid multiple file_get_contents()
 */
function get_json_input(): array {
    static $input = null;
    if ($input === null) {
        $raw = file_get_contents('php://input');
        $input = $raw ? (json_decode($raw, true) ?: []) : [];
    }
    return $input;
}

/**
 * Get query parameter (GET) or return default
 */
function get_query(string $key, $default = null) {
    return $_GET[$key] ?? $default;
}

/**
 * Get header value (case-insensitive)
 */
function get_header(string $key): ?string {
    $key = 'HTTP_' . strtoupper(str_replace('-', '_', $key));
    return $_SERVER[$key] ?? null;
}

/**
 * Get remote IP address (respects X-Forwarded-For if behind proxy)
 * WARNING: Only trust X-Forwarded-For if behind a trusted proxy!
 */
function get_client_ip(): string {
    // If behind a trusted proxy, use X-Forwarded-For
    // WARNING: Only enable if you're behind YOUR OWN proxy (nginx, apache, etc)
    // DO NOT trust X-Forwarded-For from untrusted sources
    $xForwardedFor = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? null;
    if ($xForwardedFor && strpos($xForwardedFor, ',') === false) {
        // Single IP in X-Forwarded-For (trusted)
        return trim($xForwardedFor);
    }

    // Direct connection
    return $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
}
