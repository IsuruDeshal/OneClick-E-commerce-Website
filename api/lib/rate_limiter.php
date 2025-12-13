<?php
// /api/lib/rate_limiter.php
// Simple file-based rate limiter (per IP/minute)
// 
// IMPORTANT: This is a basic best-effort limiter suitable for small deployments.
// For serious traffic, use Redis or NGINX-level rate limiting.
// 
// Known limitations:
// - File cleanup: old bucket files accumulate (run cleanup monthly)
// - Race conditions: LOCK_EX helps but not bulletproof under extreme load
// - X-Forwarded-For: Only trusted if you're behind YOUR OWN proxy
// - No distributed: Can't enforce limits across multiple servers

/**
 * Check rate limit for action/user
 * 
 * $key: unique identifier (e.g., 'login', 'cart_add', 'upload')
 * $maxPerMinute: max requests allowed per minute
 * 
 * Exits with 429 if exceeded
 */
function rate_limit(string $key, int $maxPerMinute): void {
    $ip = get_client_ip();

    // Create bucket key per minute (YmdHi = year/month/day/hour/minute)
    $bucketKey = $key . ':' . $ip . ':' . date('YmdHi');
    $dir = sys_get_temp_dir() . '/oneclick_rate/';

    if (!is_dir($dir)) {
        @mkdir($dir, 0700, true);
    }

    $file = $dir . md5($bucketKey) . '.cnt';
    $count = 0;

    if (file_exists($file)) {
        $count = (int)file_get_contents($file);
    }

    $count++;
    @file_put_contents($file, (string)$count, LOCK_EX);

    if ($count > $maxPerMinute) {
        json_error('E_RATE_LIMIT', 'Too many requests, try again later', 429);
    }
}

/**
 * Cleanup old rate limit bucket files
 * 
 * Run this monthly (via cron) to prevent disk buildup:
 *   php -r 'include "api/_bootstrap.php"; rate_limit_cleanup();'
 * 
 * Or in a cron job:
 *   0 0 1 * * php -r 'include "/var/www/html/api/_bootstrap.php"; rate_limit_cleanup();'
 */
function rate_limit_cleanup(int $olderThanMinutes = 60): void {
    $dir = sys_get_temp_dir() . '/oneclick_rate/';
    if (!is_dir($dir)) {
        return;
    }

    $now = time();
    $cutoff = $now - ($olderThanMinutes * 60);

    foreach (glob($dir . '*.cnt') as $file) {
        if (filemtime($file) < $cutoff) {
            @unlink($file);
        }
    }
}
