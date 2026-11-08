<?php
/* =========================================================
   RANAHCARE - KONFIGURASI BACKEND
   File: api/config.php

   Backend PHP + MySQL untuk akun pasien, dokter, dan admin.
   Sesuaikan DB_* dengan pengaturan MySQL/XAMPP Anda.
========================================================= */

declare(strict_types=1);

ini_set('display_errors', '0');
error_reporting(E_ALL);

/* -------------------------
   CORS (untuk pengembangan lokal)
------------------------- */

$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';

if ($origin !== '') {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
} else {
    header('Access-Control-Allow-Origin: *');
}

header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Content-Type: application/json; charset=utf-8');

if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

session_start();

/* -------------------------
   PENGATURAN DATABASE
------------------------- */

define('DB_HOST', '127.0.0.1');
define('DB_PORT', '3306');
define('DB_NAME', 'ranahcare');
define('DB_USER', 'root');
define('DB_PASS', '');

/* -------------------------
   KONEKSI DATABASE
------------------------- */

function db()
{
    static $pdo = null;

    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $dsn = 'mysql:host=' . DB_HOST . ';port=' . DB_PORT . ';dbname=' . DB_NAME . ';charset=utf8mb4';

    $pdo = new PDO($dsn, DB_USER, DB_PASS, array(
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ));

    return $pdo;
}

/* -------------------------
   RESPONS JSON
------------------------- */

function respond(array $payload, $status = 200)
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

function fail($message, $status = 400, $code = 'error')
{
    respond(array(
        'success' => false,
        'message' => $message,
        'code' => $code,
    ), $status);
}

function request_body()
{
    $raw = file_get_contents('php://input');
    $data = json_decode($raw ? $raw : '', true);

    if (!is_array($data)) {
        $data = $_POST;
    }

    return is_array($data) ? $data : array();
}

/* -------------------------
   HELPER AKUN
------------------------- */

function valid_role($role)
{
    return in_array($role, array('pasien', 'dokter', 'admin'), true);
}

function role_label($role)
{
    switch ($role) {
        case 'pasien':
            return 'Pasien';
        case 'dokter':
            return 'Dokter';
        case 'admin':
            return 'Admin';
        default:
            return 'Pengguna';
    }
}

function make_initials($name)
{
    $clean = preg_replace('/^(dr\.|drg\.|prof\.)\s*/i', '', trim($name));
    $words = preg_split('/\s+/', $clean ? $clean : '');

    if (!is_array($words)) {
        return 'U';
    }

    $words = array_values(array_filter($words, function ($word) {
        return $word !== '';
    }));

    if (count($words) === 0) {
        return 'U';
    }

    $letters = array();

    foreach (array_slice($words, 0, 2) as $word) {
        $letters[] = strtoupper(substr($word, 0, 1));
    }

    return implode('', $letters);
}

function public_user(array $user)
{
    return array(
        'id' => isset($user['id']) ? (int) $user['id'] : null,
        'role' => $user['role'],
        'roleLabel' => role_label($user['role']),
        'name' => $user['name'],
        'email' => $user['email'],
        'username' => $user['username'],
        'initials' => make_initials($user['name']),
        'created_at' => isset($user['created_at']) ? $user['created_at'] : null,
    );
}
