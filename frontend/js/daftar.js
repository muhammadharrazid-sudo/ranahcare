/* =========================================================
   RANAHCARE - REGISTER PAGE (DOKTER / PASIEN / ADMIN)
   File: js/daftar.js
========================================================= */

document.addEventListener("DOMContentLoaded", function () {
  const Auth = window.RANAH && window.RANAH.Auth;

  const registerForm = document.getElementById("registerForm");

  const nameInput = document.getElementById("registerName");
  const emailInput = document.getElementById("registerEmail");
  const usernameInput = document.getElementById("registerUsername");
  const passwordInput = document.getElementById("registerPassword");
  const confirmInput = document.getElementById("registerConfirm");
  const termsCheckbox = document.getElementById("registerTerms");

  const formMessage = document.getElementById("formMessage");
  const registerButton = document.getElementById("registerButton");
  const registerButtonText = document.getElementById("registerButtonText");

  const roleButtons = document.querySelectorAll(".role-option");

  if (!Auth) {
    console.error("Modul Auth tidak ditemukan. Muat js/auth.js terlebih dahulu.");
    return;
  }

  if (!registerForm) {
    console.error("Form pendaftaran tidak ditemukan.");
    return;
  }

  let activeRole = "pasien";
  let defaultButtonText = "Daftar sebagai Pasien";

  // ==========================================
  // 1. PESAN
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
  // 2. PILIH JENIS AKUN
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

    defaultButtonText = "Daftar sebagai " + roleLabel;
    registerButtonText.textContent = defaultButtonText;

    clearMessage();
  }

  roleButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      setRole(button.getAttribute("data-role"));
    });
  });

  // ==========================================
  // 3. TOGGLE PASSWORD
  // ==========================================

  document.querySelectorAll(".toggle-password").forEach(function (button) {
    button.addEventListener("click", function () {
      const targetInput = document.getElementById(
        button.getAttribute("data-target"),
      );

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
  // 4. VALIDASI
  // ==========================================

  function validateName() {
    if (nameInput.value.trim().length < 3) {
      showMessage("Nama lengkap minimal 3 karakter.", "error");
      nameInput.focus();
      return false;
    }

    return true;
  }

  function validateEmail() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value.trim())) {
      showMessage("Format email tidak valid.", "error");
      emailInput.focus();
      return false;
    }

    return true;
  }

  function validateUsername() {
    const username = usernameInput.value.trim();

    if (!/^[a-zA-Z0-9._-]{4,}$/.test(username)) {
      showMessage(
        "Username minimal 4 karakter dan hanya boleh huruf, angka, titik, garis bawah, atau tanda hubung.",
        "error",
      );
      usernameInput.focus();
      return false;
    }

    return true;
  }

  function validatePassword() {
    if (passwordInput.value.length < 6) {
      showMessage("Password minimal 6 karakter.", "error");
      passwordInput.focus();
      return false;
    }

    return true;
  }

  function validateConfirm() {
    if (passwordInput.value !== confirmInput.value) {
      showMessage("Password dan konfirmasi password tidak sama.", "error");
      confirmInput.focus();
      return false;
    }

    return true;
  }

  function validateTerms() {
    if (!termsCheckbox.checked) {
      showMessage("Silakan centang persetujuan syarat dan ketentuan.", "error");
      termsCheckbox.focus();
      return false;
    }

    return true;
  }

  function validateForm() {
    clearMessage();

    if (!validateName()) return false;
    if (!validateEmail()) return false;
    if (!validateUsername()) return false;
    if (!validatePassword()) return false;
    if (!validateConfirm()) return false;
    if (!validateTerms()) return false;

    return true;
  }

  // ==========================================
  // 5. SUBMIT PENDAFTARAN
  // ==========================================

  registerForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    if (registerButton.disabled) return;

    if (!validateForm()) return;

    registerButton.disabled = true;
    registerButtonText.textContent = "Mendaftarkan...";

    let result;

    try {
      // Auth.register menyimpan akun ke database melalui /api,
      // atau ke penyimpanan lokal bila backend belum aktif.
      result = await Auth.register({
        role: activeRole,
        name: nameInput.value,
        email: emailInput.value,
        username: usernameInput.value,
        password: passwordInput.value,
      });
    } catch (error) {
      console.error("Pendaftaran gagal:", error);

      result = {
        ok: false,
        message: "Terjadi kesalahan saat mendaftarkan akun.",
      };
    }

    if (!result.ok) {
      showMessage(result.message, "error");
      registerButton.disabled = false;
      registerButtonText.textContent = defaultButtonText;
      return;
    }

    showMessage(
      "Akun " +
        Auth.getRoleLabel(result.session.role) +
        " berhasil dibuat. Mengarahkan ke halaman " +
        Auth.getRoleLabel(result.session.role) +
        "...",
      "success",
    );

    setTimeout(function () {
      window.location.href = Auth.getRolePage(result.session.role);
    }, 1200);
  });

  // ==========================================
  // 6. HAPUS PESAN SAAT INPUT DIUBAH
  // ==========================================

  registerForm.querySelectorAll("input").forEach(function (input) {
    input.addEventListener("input", function () {
      clearMessage();
    });

    input.addEventListener("change", function () {
      clearMessage();
    });
  });

  // ==========================================
  // 7. INISIALISASI
  // ==========================================

  const requestedRole = new URLSearchParams(window.location.search).get(
    "role",
  );

  if (requestedRole) {
    setRole(requestedRole);
  }

  console.log("RANAHCARE Register JavaScript berhasil dimuat.");
});
