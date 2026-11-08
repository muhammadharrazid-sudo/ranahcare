# RANAHCARE - Backend Akun (PHP + MySQL)

Folder `api/` berisi backend sederhana untuk akun **pasien, dokter, dan admin**.

## Cara menjalankan (XAMPP)

1. Install/nyalakan **XAMPP**, lalu aktifkan **Apache** dan **MySQL**.
2. Salin seluruh folder project ke `C:\xampp\htdocs\ranahcare`.
   Struktur yang diharapkan:
   ```
   htdocs/
     ranahcare/
       api/
       pages/
       js/
       css/
       assets/
   ```
3. Buka **phpMyAdmin** (`http://localhost/phpmyadmin`), lalu **Import** file
   `api/database.sql`.
4. Sesuaikan kredensial database di `api/config.php` bila perlu
   (default: host `127.0.0.1`, user `root`, password kosong).
5. Buka halaman pendaftaran/login:
   - `http://localhost/ranahcare/pages/profil.html` (login)
   - `http://localhost/ranahcare/pages/daftar.html` (daftar akun)
6. (Opsional) Buka `http://localhost/ranahcare/api/seed.php` sekali untuk
   memastikan akun demo tersedia.

Setelah login, pengguna diarahkan ke halaman sesuai role:

| Role   | Halaman       |
| ------ | ------------- |
| Pasien | `pages/pasien.html` |
| Dokter | `pages/dokter.html` |
| Admin  | `pages/admin.html`  |

## Akun demo

| Role   | Email                  | Password   |
| ------ | ---------------------- | ---------- |
| Pasien | `pasien@ranahcare.id`  | `pasien123` |
| Dokter | `dokter@ranahcare.id`  | `dokter123` |
| Admin  | `admin@ranahcare.id`   | `admin123`  |

## Endpoint

| File            | Metode | Fungsi                          |
| --------------- | ------ | ------------------------------- |
| `login.php`     | POST   | Login sesuai role akun          |
| `register.php`  | POST   | Membuat akun baru               |
| `logout.php`    | POST   | Menghapus sesi                  |
| `me.php`        | GET    | Mengambil sesi aktif            |
| `seed.php`      | GET    | Membuat akun demo (sekali saja) |

## Catatan

- Akun disimpan di tabel `users` dengan password yang di-hash
  (`password_hash`), bukan plaintext.
- Login akan menolak akun yang role-nya tidak sesuai
  (mis. akun dokter tidak bisa login sebagai pasien).
- Jika backend belum aktif, frontend otomatis memakai penyimpanan lokal
  browser sebagai fallback (khusus demo). Agar akun benar-benar tersimpan
  di database dan bisa dipakai di perangkat lain, pastikan XAMPP/MySQL aktif.
- Untuk produksi, batasi pendaftaran role `admin` dan hapus `seed.php`.
