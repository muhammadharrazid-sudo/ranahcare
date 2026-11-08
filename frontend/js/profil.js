/* =========================================================
   RANAHCARE - LOGIN PAGE (DOKTER / PASIEN / ADMIN)
   File: js/profil.js
========================================================= */

document.addEventListener("DOMContentLoaded", function () {
  // ==========================================
  // 1. AMBIL ELEMENT HTML & MODUL AUTH
  // ==========================================

  const Auth = window.RANAH && window.RANAH.Auth;

  const loginForm = document.getElementById("roleLoginForm");

  const identityInput = document.getElementById("loginIdentity");
  const passwordInput = document.getElementById("loginPassword");
  const rememberCheckbox = document.getElementById("rememberMe");

  const formMessage = document.getElementById("formMessage");
  const loginButton = document.getElementById("loginButton");
  const loginButtonText = document.getElementById("loginButtonText");

  const roleButtons = document.querySelectorAll(".role-option");

  if (!Auth) {
    console.error("Modul Auth tidak ditemukan. Muat js/auth.js terlebih dahulu.");
    return;
  }

  if (!loginForm) {
    console.error("Form login tidak ditemukan.");
    return;
  }

  const REMEMBER_KEY = "ranahcare_identity";

  let activeRole = "pasien";
  let defaultButtonText = "Masuk sebagai Pasien";

  // ==========================================
  // 2. FUNGSI MENAMPILKAN PESAN
  // ==========================================

  function showMessage(message, type) {
    formMessage.textContent = message;
    formMessage.className = "form-message " + type;

    formMessage.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }

  function clearMessage() {
    formMessage.textContent = "";
    formMessage.className = "form-message";
  }

  // ==========================================
  // 3. PILIH JENIS AKUN
  // ==========================================

  function setRole(role) {
    const roleLabel = Auth.getRoleLabel(role);

    if (!role || roleLabel === "Pengguna") return;

    activeRole = role;

    roleButtons.forEach(function (button) {
      const isActive = button.getAttribute("data-role") === role;

      button.classList.toggle("active", isActive);
      button.setAttribute("aria-pressed", isActive ? "true" : "false");
    });

    defaultButtonText = "Masuk sebagai " + roleLabel;
    loginButtonText.textContent = defaultButtonText;

    clearMessage();
  }

  roleButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      setRole(button.getAttribute("data-role"));
    });
  });

  // ==========================================
  // 4. TOGGLE PASSWORD
  // ==========================================

  document.querySelectorAll(".toggle-password").forEach(function (button) {
    button.addEventListener("click", function () {
      const targetId = button.getAttribute("data-target");
      const targetInput = document.getElementById(targetId);

      if (!targetInput) return;

      if (targetInput.type === "password") {
        targetInput.type = "text";
        button.setAttribute("aria-label", "Sembunyikan password");
      } else {
        targetInput.type = "password";
        button.setAttribute("aria-label", "Tampilkan password");
      }
    });
  });

  // ==========================================
  // 5. VALIDASI EMAIL / USERNAME
  // ==========================================

  function validateIdentity() {
    const identity = identityInput.value.trim();

    if (identity === "") {
      showMessage("Email atau username wajib diisi.", "error");
      identityInput.focus();
      return false;
    }

    if (identity.includes("@")) {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailPattern.test(identity)) {
        showMessage("Format email tidak valid.", "error");
        identityInput.focus();
        return false;
      }

      return true;
    }

    if (identity.length < 4) {
      showMessage("Username minimal 4 karakter.", "error");
      identityInput.focus();
      return false;
    }

    return true;
  }

  // ==========================================
  // 6. VALIDASI PASSWORD
  // ==========================================

  function validatePassword() {
    const password = passwordInput.value;

    if (password === "") {
      showMessage("Password wajib diisi.", "error");
      passwordInput.focus();
      return false;
    }

    if (password.length < 6) {
      showMessage("Password minimal 6 karakter.", "error");
      passwordInput.focus();
      return false;
    }

    return true;
  }

  // ==========================================
  // 7. PROSES SUBMIT LOGIN
  // ==========================================

  loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    clearMessage();

    if (loginButton.disabled) return;

    if (!validateIdentity()) return;

    if (!validatePassword()) return;

    loginButton.disabled = true;
    loginButtonText.textContent = "Memproses...";

    let result;

    try {
      // Auth.login memeriksa database terlebih dahulu, lalu
      // memakai penyimpanan lokal bila backend tidak aktif.
      // Akun dengan role berbeda akan ditolak di sini.
      result = await Auth.login(
        identityInput.value,
        passwordInput.value,
        activeRole,
      );
    } catch (error) {
      console.error("Login gagal:", error);

      result = {
        ok: false,
        message: "Terjadi kesalahan saat memproses login.",
      };
    }

    if (!result.ok) {
      showMessage(result.message, "error");
      loginButton.disabled = false;
      loginButtonText.textContent = defaultButtonText;
      return;
    }

    try {
      if (rememberCheckbox.checked) {
        localStorage.setItem(REMEMBER_KEY, identityInput.value.trim());
      } else {
        localStorage.removeItem(REMEMBER_KEY);
      }
    } catch (error) {
      console.warn("Penyimpanan lokal tidak tersedia.", error);
    }

    showMessage(
      "Login berhasil sebagai " +
        Auth.getRoleLabel(result.session.role) +
        " (" +
        result.session.name +
        "). Mengarahkan ke halaman " +
        Auth.getRoleLabel(result.session.role) +
        "...",
      "success",
    );

    setTimeout(function () {
      window.location.href = Auth.getRolePage(result.session.role);
    }, 1000);
  });

  // ==========================================
  // 8. HAPUS PESAN SAAT INPUT DIUBAH
  // ==========================================

  loginForm.querySelectorAll("input").forEach(function (input) {
    input.addEventListener("input", function () {
      clearMessage();
    });

    input.addEventListener("change", function () {
      clearMessage();
    });
  });

  // ==========================================
  // 9. INISIALISASI
  // ==========================================

  const params = new URLSearchParams(window.location.search);
  const requestedRole = params.get("role");

  if (requestedRole && requestedRole !== "pengguna") {
    setRole(requestedRole);
  }

  const activeSession = Auth.getSession();

  if (activeSession) {
    identityInput.value = activeSession.email || activeSession.username || "";
    setRole(activeSession.role);

    showMessage(
      "Anda sudah masuk sebagai " +
        Auth.getRoleLabel(activeSession.role) +
        " (" +
        activeSession.name +
        "). Masuk kembali untuk mengganti akun.",
      "success",
    );
  } else {
    try {
      const savedIdentity = localStorage.getItem(REMEMBER_KEY);

      if (savedIdentity) {
        identityInput.value = savedIdentity;
        rememberCheckbox.checked = true;
      }
    } catch (error) {
      console.warn("Penyimpanan lokal tidak tersedia.", error);
    }
  }

  console.log("RANAHCARE Login JavaScript berhasil dimuat.");
});
