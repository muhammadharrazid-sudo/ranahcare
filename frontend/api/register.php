<?php
/* =========================================================
   RANAHCARE - REGISTER
   File: api/register.php

   Body JSON:
   {
     "role": "pasien | dokter | admin",
     "name": "Nama Lengkap",
     "email": "nama@email.com",
     "username": "username",
     "password": "password"
   }
========================================================= */

declare(strict_types=1);

require __DIR__ . '/config.php';

if (!isset($_SERVER['REQUEST_METHOD']) || $_SERVER['REQUEST_METHOD'] !== 'POST') {
    fail('Gunakan metode POST.', 405, 'method');
}

$data = request_body();

$role = trim(isset($data['role']) ? (string) $data['role'] : '');
$name = trim(isset($data['name']) ? (string) $data['name'] : '');
$email = strtolower(trim(isset($data['email']) ? (string) $data['email'] : ''));
$username = trim(isset($data['username']) ? (string) $data['username'] : '');
$password = isset($data['password']) ? (string) $data['password'] : '';

if (!valid_role($role)) {
    fail('Jenis akun tidak valid.', 422, 'validation');
}

if (strlen($name) < 3) {
    fail('Nama lengkap minimal 3 karakter.', 422, 'validation');
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    fail('Format email tidak valid.', 422, 'validation');
}

if (!preg_match('/^[a-zA-Z0-9._-]{4,}$/', $username)) {
    fail('Username minimal 4 karakter dan hanya boleh huruf, angka, titik, garis bawah, atau tanda hubung.', 422, 'validation');
}

if (strlen($password) < 6) {
    fail('Password minimal 6 karakter.', 422, 'validation');
}

try {
    $pdo = db();

    $check = $pdo->prepare(
        'SELECT id, email, username FROM users WHERE email = :email OR username = :username LIMIT 1'
    );

    $check->execute(array(
        'email' => $email,
        'username' => $username,
    ));

    $existing = $check->fetch();

    if ($existing) {
        if (strtolower($existing['email']) === $email) {
            fail('Email sudah terdaftar. Gunakan email lain atau masuk.', 409, 'email-taken');
        }

        fail('Username sudah dipakai. Gunakan username lain.', 409, 'username-taken');
    }

    $insert = $pdo->prepare(
        'INSERT INTO users (role, name, email, username, password_hash, created_at)
         VALUES (:role, :name, :email, :username, :password_hash, NOW())'
    );

    $insert->execute(array(
        'role' => $role,
        'name' => $name,
        'email' => $email,
        'username' => $username,
        'password_hash' => password_hash($password, PASSWORD_DEFAULT),
    ));

    $user = array(
        'id' => $pdo->lastInsertId(),
        'role' => $role,
        'name' => $name,
        'email' => $email,
        'username' => $username,
        'created_at' => date('Y-m-d H:i:s'),
    );
} catch (PDOException $error) {
    if ((int) $error->getCode() === 23000) {
        fail('Email atau username sudah terdaftar.', 409, 'duplicate');
    }

    fail('Tidak dapat menyimpan akun ke database. Pastikan MySQL/XAMPP aktif.', 503, 'database');
}

$userPublic = public_user($user);

$_SESSION['user'] = $userPublic;

respond(array(
    'success' => true,
    'user' => $userPublic,
), 201);
