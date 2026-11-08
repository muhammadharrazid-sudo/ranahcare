<?php
/* =========================================================
   RANAHCARE - SESI AKTIF
   File: api/me.php
========================================================= */

declare(strict_types=1);

require __DIR__ . '/config.php';

if (empty($_SESSION['user'])) {
    fail('Belum ada sesi login.', 401, 'unauthorized');
}

respond(array(
    'success' => true,
    'user' => $_SESSION['user'],
));
