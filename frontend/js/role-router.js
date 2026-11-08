/* =========================================================
   RANAHCARE - ROLE ROUTER
   File: js/role-router.js

   Mengarahkan pengguna yang sudah login ke dashboard sesuai
   role akun: pasien.html, dokter.html, atau admin.html.
========================================================= */

document.addEventListener("DOMContentLoaded", function () {
  const Auth = window.RANAH && window.RANAH.Auth;

  if (!Auth) return;

  const session = Auth.getSession();

  // Belum login: biarkan halaman publik / halaman login tampil.
  if (!session) return;

  const target = Auth.getRolePage(session.role);

  if (!target) return;

  const currentPage = window.location.pathname.split("/").pop();

  // Hanya redirect jika halaman saat ini bukan dashboard role-nya.
  if (currentPage !== target) {
    window.location.replace(target);
  }
});
