-- =========================================================
-- RANAHCARE - DATABASE AKUN
-- File: api/database.sql
--
-- Cara pakai:
-- 1. Jalankan XAMPP (Apache + MySQL).
-- 2. Buka phpMyAdmin (http://localhost/phpmyadmin).
-- 3. Import file ini.
--
-- Akun demo:
--   pasien@ranahcare.id / pasien123
--   dokter@ranahcare.id / dokter123
--   admin@ranahcare.id  / admin123
-- =========================================================

CREATE DATABASE IF NOT EXISTS `ranahcare`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `ranahcare`;

CREATE TABLE IF NOT EXISTS `users` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `role` ENUM('pasien', 'dokter', 'admin') NOT NULL,
  `name` VARCHAR(120) NOT NULL,
  `email` VARCHAR(160) NOT NULL,
  `username` VARCHAR(60) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_email` (`email`),
  UNIQUE KEY `uniq_username` (`username`),
  KEY `idx_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Akun awal (password sudah di-hash dengan password_hash PHP)
INSERT IGNORE INTO `users` (`role`, `name`, `email`, `username`, `password_hash`) VALUES
('pasien', 'Budi Santoso', 'pasien@ranahcare.id', 'pasien', '$2y$10$wtVwAdiEZUtwIrRG.ZTwYu34uYoB65qmXJLw.EOeh2wL/4XYep2Ry'),
('pasien', 'Siti Rahma', 'siti@ranahcare.id', 'siti', '$2y$10$qOZIdvCzZpqQ9.00i4sWmuFft93Vuv7n9lJuw6m63ixI/uXDBXGSa'),
('dokter', 'dr. Sinta Maharani', 'dokter@ranahcare.id', 'dokter', '$2y$10$YQj8TuokwTFFjvtMBCaHA.yVqlSAsOU4e78rB3LN7GN9avr.qa.wS'),
('dokter', 'dr. Andi Pratama', 'andi@ranahcare.id', 'andi', '$2y$10$G/D96gN9ooNc1RT4QrTz6e135lC/nY97C0hzF/HzknDyByw7H7EDC'),
('admin', 'Admin RANAHCARE', 'admin@ranahcare.id', 'admin', '$2y$10$l67.B0ITZdZ8iaRV1uEBxOrr7U84spoCBpDEuoUOA7djdSUdh8X92');
