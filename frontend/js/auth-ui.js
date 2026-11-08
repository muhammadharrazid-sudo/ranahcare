/* =========================================================
   RANAHCARE - AUTH UI
   File: js/auth-ui.js

   Menyesuaikan tampilan profil (avatar/logo, nama, dan role)
   berdasarkan data akun yang sedang login.
========================================================= */

document.addEventListener("DOMContentLoaded", function () {
  const Auth = window.RANAH && window.RANAH.Auth;

  if (!Auth) {
    console.error("Modul Auth tidak ditemukan. Muat js/auth.js terlebih dahulu.");
    return;
  }

  // ==========================================
  // 1. TOMBOL KELUAR
  // ==========================================

  document.querySelectorAll("[data-logout]").forEach(function (link) {
    link.addEventListener("click", function () {
      Auth.logout();
    });
  });

  // ==========================================
  // 2. SESI AKTIF
  // ==========================================

  const session = Auth.getSession();

  // Jika belum login, tampilan default (Pengguna / Member RANAHCARE)
  // tetap dipertahankan.
  if (!session) return;

  const roleLabel = Auth.getRoleLabel(session.role);
  const initials =
    session.initials || Auth.getInitials(session.name);

  // ==========================================
  // 3. AVATAR / LOGO PROFIL
  // ==========================================

  document.querySelectorAll(".profile-avatar").forEach(function (avatar) {
    avatar.textContent = initials;
    avatar.classList.remove("role-pasien", "role-dokter", "role-admin");
    avatar.classList.add("role-" + session.role);
    avatar.setAttribute("title", session.name + " - " + roleLabel);
  });

  // ==========================================
  // 4. NAMA & ROLE (pelayanan, darurat, antrean, riwayat)
  // ==========================================

  document.querySelectorAll(".profile-info").forEach(function (info) {
    const nameElement = info.querySelector("strong");
    const roleElement = info.querySelector("span");

    if (nameElement) {
      nameElement.textContent = session.name;
    }

    if (roleElement) {
      roleElement.textContent = roleLabel + " RANAHCARE";
    }
  });

  // ==========================================
  // 5. TOMBOL PROFIL GAYA BUTTON (halaman contact)
  // ==========================================

  document.querySelectorAll("button.profile-button").forEach(function (button) {
    if (button.querySelector(".profile-info")) return;

    const nameElement = Array.from(button.children).find(function (child) {
      return (
        child.tagName === "SPAN" &&
        !child.classList.contains("dropdown-arrow")
      );
    });

    if (nameElement) {
      nameElement.textContent = session.name;
    }
  });

  // ==========================================
  // 6. TOMBOL PROFIL DASHBOARD (anchor + ikon)
  // ==========================================

  const dashboardProfile = document.querySelector(
    ".main-navbar a.profile-button",
  );

  if (dashboardProfile) {
    const avatar = document.createElement("div");
    avatar.className = "profile-avatar role-" + session.role;
    avatar.textContent = initials;
    avatar.setAttribute("title", session.name + " - " + roleLabel);

    const name = document.createElement("span");
    name.textContent = session.name;

    dashboardProfile.replaceChildren(avatar, name);
  }

  // ==========================================
  // 7. MENGISI FORM LOGIN (jika sudah pernah login)
  // ==========================================

  const identityInput = document.getElementById("loginIdentity");

  if (identityInput && !identityInput.value) {
    identityInput.value = session.email || session.username || "";
  }

  console.log(
    "RANAHCARE Auth UI aktif untuk " +
      session.name +
      " (" +
      roleLabel +
      ").",
  );
});
