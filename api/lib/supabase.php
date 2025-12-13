<?php
// /api/lib/supabase.php
// Centralized Supabase API wrapper (anon vs service role)

function supabase_env(string $key): string {
    $value = getenv($key);
    if ($value === false || $value === '') {
        error_log("Missing environment variable: $key");
        json_error('E_SERVER_CONFIG', 'Server misconfigured', 500);
    }
    return $value;
}

function supabase_request(string $method, string $path, array $options = []): array {
    $url      = rtrim(supabase_env('SUPABASE_URL'), '/') . $path;
    $headers  = $options['headers'] ?? [];
    $body     = $options['body'] ?? null;
    $apiKey   = $options['apiKey'] ?? '';
    $jwt      = $options['jwt'] ?? null;

    // Always send anon key in apikey header (required by Supabase)
    $headers[] = "apikey: $apiKey";

    // Send either JWT (for RLS) or API key (for anon/service)
    if ($jwt) {
        $headers[] = "Authorization: Bearer $jwt";
    } else {
        $headers[] = "Authorization: Bearer $apiKey";
    }

    if ($body !== null && !is_string($body)) {
        $body = json_encode($body, JSON_UNESCAPED_SLASHES);
        $headers[] = 'Content-Type: application/json';
    }

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST  => strtoupper($method),
        CURLOPT_HTTPHEADER     => $headers,
        CURLOPT_TIMEOUT        => 30,
    ]);

    if ($body !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
    }

    $resp = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);

    if ($resp === false) {
        $err = curl_error($ch);
        curl_close($ch);
        error_log("Supabase cURL error: $err");
        json_error('E_UPSTREAM', 'Upstream service error', 502);
    }

    curl_close($ch);
    return [$code, $resp];
}

/**
 * OPTION A (CORRECT): User endpoints with RLS enforcement via JWT
 * 
 * Forwards user's JWT to Supabase. RLS checks auth.uid() from the JWT.
 * auth.uid() = the user's actual UID from Supabase auth.users table.
 * This makes RLS policies like:
 *   USING (auth.uid() = user_id)
 * ...actually work.
 */
function supabase_request_user_data(string $method, string $path, string $jwt, array $options = []): array {
    $options['apiKey'] = supabase_env('SUPABASE_ANON_KEY');
    $options['jwt']    = $jwt;  // Forward JWT for RLS
    return supabase_request($method, $path, $options);
}

// Legacy: Public endpoints (no authentication needed)
function supabase_request_anon(string $method, string $path, array $options = []): array {
    $options['apiKey'] = supabase_env('SUPABASE_ANON_KEY');
    return supabase_request($method, $path, $options);
}

/**
 * OPTION A (CORRECT): Admin operations with role verification
 * 
 * Must only be called AFTER require_admin() has verified the role claim.
 * This bypasses RLS, so it's gated by:
 *   1. JWT 'role' claim check in require_admin()
 *   2. Explicit admin role=true in Supabase auth metadata
 */
function supabase_request_service(string $method, string $path, array $options = []): array {
    $options['apiKey'] = supabase_env('SUPABASE_SERVICE_ROLE_KEY');
    return supabase_request($method, $path, $options);
}

// Helper: Get user ID from JWT
function get_user_id_from_jwt() {
    $token = get_bearer_token();
    if (!$token) {
        return null;
    }
    
    try {
        $payload = decode_jwt_payload($token);
        return $payload['sub'] ?? null;
    } catch (Exception $e) {
        return null;
    }
}
