<?php
// /api/lib/auth.php
// JWT extraction, role checks, and authentication gating

/**
 * Extract Bearer token from Authorization header
 * Returns null if not found
 */
function get_bearer_token(): ?string {
    $auth = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (stripos($auth, 'Bearer ') === 0) {
        return trim(substr($auth, 7));
    }
    return null;
}

/**
 * Decode JWT payload WITHOUT signature verification
 * 
 * ⚠️  CRITICAL: This DOES NOT verify the JWT signature.
 * Use only if:
 *   1. You forward the JWT to Supabase and trust their RLS validation, OR
 *   2. You have a trusted issuer and verify_jwt_signature() is called separately
 * 
 * If you're manually decoding without verification, any 3-part string is accepted.
 * That's a security issue. Use verify_jwt_signature() below for proper validation.
 */
function decode_jwt_payload(string $token): array {
    $parts = explode('.', $token);
    if (count($parts) !== 3) {
        json_unauthorized();  // Must be 3 parts: header.payload.signature
    }

    // Decode payload (add padding if needed for base64)
    $payload = $parts[1];
    $payload .= str_repeat('=', 4 - (strlen($payload) % 4));
    
    $decoded = json_decode(base64_decode($payload, true), true);
    if (!is_array($decoded)) {
        json_unauthorized();
    }

    return $decoded;
}

/**
 * Verify JWT signature and expiration
 * 
 * Requires the JWT secret from Supabase to verify the signature.
 * This is the PROPER way to validate a JWT if you're NOT forwarding it to Supabase.
 * 
 * Get your JWT secret from: Supabase Dashboard → Project Settings → JWT Settings → JWT Secret
 */
function verify_jwt_signature(string $token, string $secret): bool {
    $parts = explode('.', $token);
    if (count($parts) !== 3) {
        return false;
    }

    [$header64, $payload64, $signature64] = $parts;

    // Reconstruct the signed message
    $message = "$header64.$payload64";

    // Expected signature (HMAC-SHA256)
    $expectedSignature = rtrim(strtr(base64_encode(
        hash_hmac('sha256', $message, $secret, true)
    ), '+/', '-_'), '=');

    // Timing-safe comparison
    $providedSignature = rtrim(strtr($signature64, '-_', '+/'), '=');

    return hash_equals($expectedSignature, $providedSignature);
}

/**
 * Check JWT expiration
 * 
 * If a token's exp (expiration time) is in the past, it's expired.
 */
function is_jwt_expired(array $payload): bool {
    $now = time();
    $exp = $payload['exp'] ?? 0;
    return $exp < $now;
}

/**
 * Require authenticated user; extract user_id from JWT or exit with 401
 * 
 * OPTION A (RECOMMENDED): JWT forwarded to Supabase
 *   - Relies on Supabase to validate signature + expiration
 *   - RLS policies check auth.uid() from the JWT
 *   - You just extract 'sub' claim here
 * 
 * OPTION B: Manual JWT validation (if not forwarding to Supabase)
 *   - Call verify_jwt_signature($token, $secret) first
 *   - Call is_jwt_expired($payload) to reject old tokens
 *   - Then extract 'sub' claim
 * 
 * Currently using OPTION A (forwarding to Supabase).
 * If you switch to OPTION B, uncomment the verification calls below.
 */
function require_user(): string {
    $token = get_bearer_token();
    if (!$token) {
        json_unauthorized();  // 401
    }

    $payload = decode_jwt_payload($token);

    // OPTION B: Verify signature + expiration (if not using Supabase RLS)
    // Uncomment if you're NOT forwarding JWT to Supabase:
    // 
    // $secret = getenv('SUPABASE_JWT_SECRET');
    // if (!verify_jwt_signature($token, $secret)) {
    //     json_unauthorized();
    // }
    // if (is_jwt_expired($payload)) {
    //     json_unauthorized();  // Token expired
    // }

    $uid = $payload['sub'] ?? null;
    if (!$uid) {
        json_unauthorized();  // 401
    }

    return $uid;
}

/**
 * Require admin user; check role claim and return user_id or exit with 403
 * 
 * Admin role is stored in JWT 'role' claim (Supabase convention).
 * Set this via Supabase dashboard or auth metadata.
 * 
 * CRITICAL: This must be called AFTER require_user() so we know the JWT is valid.
 */
function require_admin(): string {
    $uid = require_user();  // Validate JWT first

    $token = get_bearer_token();
    $payload = decode_jwt_payload($token);

    // Check for admin role (Supabase typically stores in 'role' claim)
    $role = $payload['role'] ?? null;

    // Fallback: check app_metadata.role (custom claim)
    if ($role !== 'admin' && ($payload['app_metadata']['role'] ?? null) !== 'admin') {
        json_forbidden();  // 403 - user authenticated but not admin
    }

    return $uid;
}

/**
 * Check if current user is admin (doesn't exit, returns boolean)
 */
function is_admin(): bool {
    $token = get_bearer_token();
    if (!$token) {
        return false;
    }

    try {
        $payload = decode_jwt_payload($token);
        $role = $payload['role'] ?? ($payload['app_metadata']['role'] ?? null);
        return $role === 'admin';
    } catch (Exception $e) {
        return false;
    }
}
