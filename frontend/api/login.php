<?php
/* =========================================================
   RANAHCARE - LOGIN
   File: api/login.php

   Body JSON:
   {
     "identity": "email atau username",
     "password": "password",
     "role": "pasien | dokter | admin"
   }
========================================================= */

declare(strict_types=1);

require __DIR__ . '/config.php';

if (!isset($_SERVER['REQUEST_METHOD']) || $_SERVER['REQUEST_METHOD'] !== 'POST') {
    fail('Gunakan metode POST.', 405, 'method');
}

$data = request_body();

$identity = trim(isset($data['identity']) ? (string) $data['identity'] : '');
$password = isset($data['password']) ? (string) $data['password'] : '';
$role = trim(isset($data['role']) ? (string) $data['role'] : '');

if ($identity === '' || $password === '') {
    fail('Email/username dan password wajib diisi.', 422, 'validation');
}

if (!valid_role($role)) {
    fail('Jenis akun tidak valid.', 422, 'validation');
}

try {
    $pdo = db();

    $statement = $pdo->prepare(
        'SELECT id, role, name, email, username, password_hash, created_at
         FROM users
         WHERE email = :identity OR username = :identity
         LIMIT 1'
    );

    $statement->execute(array('identity' => $identity));
    $user = $statement->fetch();
} catch (PDOException $error) {
    fail('Tidak dapat terhubung ke database. Pastikan MySQL/XAMPP aktif dan database sudah diimpor.', 503, 'database');
}

if (!$user) {
    fail('Akun tidak ditemukan. Periksa email atau username Anda.', 404, 'not-found');
}

if ($user['role'] !== $role) {
    fail(
        'Akun ini terdaftar sebagai ' . role_label($user['role']) .
        ', bukan ' . role_label($role) . '. Pilih jenis akun yang sesuai.',
        403,
        'role-mismatch'
    );
}

if (!password_verify($password, $user['password_hash'])) {
    fail('Password salah. Silakan coba lagi.', 401, 'wrong-password');
}

$userPublic = public_user($user);

$_SESSION['user'] = $userPublic;

respond(array(
    'success' => true,
    'user' => $userPublic,
));
