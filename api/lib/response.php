<?php
// /api/lib/response.php - Standard JSON response helpers

function json_success($data = null, int $status = 200) {
    http_response_code($status);
    echo json_encode([
        'success' => true,
        'data'    => $data,
    ], JSON_UNESCAPED_SLASHES);
    exit;
}

function json_error(string $code, string $message, int $status = 400, array $extra = []) {
    http_response_code($status);
    echo json_encode(array_merge([
        'success' => false,
        'error'   => $code,
        'message' => $message,
    ], $extra), JSON_UNESCAPED_SLASHES);
    exit;
}

function json_validation_error(string $field, string $message) {
    json_error('E_VALIDATION_FAILED', 'Invalid input', 422, [
        'field' => $field,
        'field_message' => $message,
    ]);
}

function json_unauthorized() {
    json_error('E_UNAUTHORIZED', 'Authentication required', 401);
}

function json_forbidden() {
    json_error('E_FORBIDDEN', 'You are not allowed to perform this action', 403);
}

function json_not_found() {
    json_error('E_NOT_FOUND', 'Resource not found', 404);
}

function json_conflict() {
    json_error('E_CONFLICT', 'Resource already exists', 409);
}

function json_internal_error() {
    json_error('E_INTERNAL_ERROR', 'Internal server error', 500);
}
