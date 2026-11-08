<?php
/* =========================================================
   RANAHCARE - SEED AKUN DEMO
   File: api/seed.php

   Jalankan sekali setelah database diimpor:
   http://localhost/ranahcare/api/seed.php

   Akun yang sudah ada tidak akan diduplikasi.
========================================================= */

declare(strict_types=1);

require __DIR__ . '/config.php';

$demoUsers = array(
    array('role' => 'pasien', 'name' => 'Budi Santoso', 'email' => 'pasien@ranahcare.id', 'username' => 'pasien', 'password' => 'pasien123'),
    array('role' => 'pasien', 'name' => 'Siti Rahma', 'email' => 'siti@ranahcare.id', 'username' => 'siti', 'password' => 'siti123'),
    array('role' => 'dokter', 'name' => 'dr. Sinta Maharani', 'email' => 'dokter@ranahcare.id', 'username' => 'dokter', 'password' => 'dokter123'),
    array('role' => 'dokter', 'name' => 'dr. Andi Pratama', 'email' => 'andi@ranahcare.id', 'username' => 'andi', 'password' => 'andi123'),
    array('role' => 'admin', 'name' => 'Admin RANAHCARE', 'email' => 'admin@ranahcare.id', 'username' => 'admin', 'password' => 'admin123'),
);

try {
    $pdo = db();

    $check = $pdo->prepare('SELECT id FROM users WHERE email = :email OR username = :username LIMIT 1');

    $insert = $pdo->prepare(
        'INSERT INTO users (role, name, email, username, password_hash, created_at)
         VALUES (:role, :name, :email, :username, :password_hash, NOW())'
    );

    $created = array();

    foreach ($demoUsers as $user) {
        $check->execute(array(
            'email' => $user['email'],
            'username' => $user['username'],
        ));

        if ($check->fetch()) {
            continue;
        }

        $insert->execute(array(
            'role' => $user['role'],
            'name' => $user['name'],
            'email' => $user['email'],
            'username' => $user['username'],
            'password_hash' => password_hash($user['password'], PASSWORD_DEFAULT),
        ));

        $created[] = $user['email'];
    }

    respond(array(
        'success' => true,
        'message' => count($created) === 0
            ? 'Semua akun demo sudah ada.'
            : 'Akun demo berhasil dibuat.',
        'created' => $created,
    ));
} catch (PDOException $error) {
    fail('Gagal membuat akun demo. Pastikan database sudah diimpor.', 503, 'database');
}
