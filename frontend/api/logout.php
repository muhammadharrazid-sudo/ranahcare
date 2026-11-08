<?php
/* =========================================================
   RANAHCARE - LOGOUT
   File: api/logout.php
========================================================= */

declare(strict_types=1);

require __DIR__ . '/config.php';

$_SESSION = array();

if (ini_get('session.use_cookies')) {
    $params = session_get_cookie_params();

    setcookie(
        session_name(),
        '',
        time() - 42000,
        $params['path'],
        $params['domain'],
        $params['secure'],
        $params['httponly']
    );
}

session_destroy();

respond(array(
    'success' => true,
    'message' => 'Berhasil keluar.',
));
