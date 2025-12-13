<?php
// TEMPORARY DEBUG ENDPOINT - REMOVE IN PRODUCTION
header('Content-Type: text/plain');
$logFile = __DIR__ . '/logs/error.log';
if (!file_exists($logFile)) {
    echo "No error.log file found"; exit;
}
$contents = @file_get_contents($logFile);
if ($contents === false) { echo "Cannot read error.log"; exit; }
// Show last 200 lines
$lines = explode("\n", $contents);
$tail = array_slice($lines, -200);
echo implode("\n", $tail);
?>

