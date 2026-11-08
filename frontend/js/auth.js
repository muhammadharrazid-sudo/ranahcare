/* =========================================================
   RANAHCARE - AUTH STORE
   File: js/auth.js

   Sistem akun dengan dua sumber data:
   1. Database (backend PHP + MySQL di folder /api)
   2. Penyimpanan lokal browser (fallback bila backend offline)

   Semua akun memiliki role tetap: pasien, dokter, atau admin.
========================================================= */

(function (window) {
  "use strict";

  const SESSION_KEY = "ranahcare_session";
  const LOCAL_DB_KEY = "ranahcare_users_v1";
  const LEGACY_ROLE_KEY = "ranahcare_role";

  // Base URL API. Semua halaman berada di folder /pages,
  // sedangkan backend berada di /api.
  const API_BASE = window.RANAH_API_BASE || "../api";

  const ROLES = ["pasien", "dokter", "admin"];

  const ROLE_LABEL = {
    pasien: "Pasien",
    dokter: "Dokter",
    admin: "Admin",
  };

  const ROLE_PAGE = {
    pasien: "pasien.html",
    dokter: "dokter.html",
    admin: "admin.html",
  };

  // ==========================================
  // AKUN AWAL (SEED)
  // ==========================================

  const DEFAULT_USERS = [
    {
      role: "pasien",
      name: "Budi Santoso",
      email: "pasien@ranahcare.id",
      username: "pasien",
      password: "pasien123",
    },
    {
      role: "pasien",
      name: "Siti Rahma",
      email: "siti@ranahcare.id",
      username: "siti",
      password: "siti123",
    },
    {
      role: "dokter",
      name: "dr. Sinta Maharani",
      email: "dokter@ranahcare.id",
      username: "dokter",
      password: "dokter123",
    },
    {
      role: "dokter",
      name: "dr. Andi Pratama",
      email: "andi@ranahcare.id",
      username: "andi",
      password: "andi123",
    },
    {
      role: "admin",
      name: "Admin RANAHCARE",
      email: "admin@ranahcare.id",
      username: "admin",
      password: "admin123",
    },
  ];

  // ==========================================
  // HELPER UMUM
  // ==========================================

  function normalize(value) {
    return String(value || "")
      .trim()
      .toLowerCase();
  }

  function getRoleLabel(role) {
    return ROLE_LABEL[role] || "Pengguna";
  }

  function getRolePage(role) {
    return ROLE_PAGE[role] || "dashboard.html";
  }

  function getInitials(name) {
    const words = String(name || "")
      .replace(/^(dr\.|drg\.|prof\.)\s*/i, "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (words.length === 0) return "U";

    return words
      .slice(0, 2)
      .map(function (word) {
        return word.charAt(0);
      })
      .join("")
      .toUpperCase();
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ""));
  }

  // Hash sederhana hanya untuk fallback lokal (bukan pengganti
  // password_hash milik PHP pada database asli).
  function hashPassword(password) {
    const text = "ranahcare:" + String(password);
    let hash = 5381;

    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) + hash + text.charCodeAt(i)) >>> 0;
    }

    return "local$" + hash.toString(16).padStart(8, "0");
  }

  // ==========================================
  // DATABASE LOKAL (FALLBACK)
  // ==========================================

  function publicLocalUser(user) {
    return {
      id: user.id,
      role: user.role,
      name: user.name,
      email: user.email,
      username: user.username,
      created_at: user.createdAt || null,
    };
  }

  function writeLocalUsers(users) {
    try {
      localStorage.setItem(LOCAL_DB_KEY, JSON.stringify(users));
    } catch (error) {
      console.warn("Gagal menyimpan database lokal.", error);
    }
  }

  function buildSeedUsers() {
    return DEFAULT_USERS.map(function (user, index) {
      return {
        id: "seed-" + (index + 1),
        role: user.role,
        name: user.name,
        email: user.email,
        username: user.username,
        passwordHash: hashPassword(user.password),
        createdAt: new Date().toISOString(),
      };
    });
  }

  function readLocalUsers() {
    try {
      const raw = localStorage.getItem(LOCAL_DB_KEY);

      if (raw) {
        const parsed = JSON.parse(raw);

        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (error) {
      console.warn("Gagal membaca database lokal.", error);
    }

    const seeded = buildSeedUsers();
    writeLocalUsers(seeded);

    return seeded;
  }

  function findLocalUser(identity) {
    const value = normalize(identity);

    if (!value) return null;

    return (
      readLocalUsers().find(function (user) {
        return (
          normalize(user.email) === value ||
          normalize(user.username) === value
        );
      }) || null
    );
  }

  function loginLocal(identity, password, role) {
    const user = findLocalUser(identity);

    if (!user) {
      return {
        ok: false,
        code: "not-found",
        message: "Akun tidak ditemukan. Periksa email atau username Anda.",
      };
    }

    if (role && user.role !== role) {
      return {
        ok: false,
        code: "role-mismatch",
        message:
          "Akun ini terdaftar sebagai " +
          getRoleLabel(user.role) +
          ", bukan " +
          getRoleLabel(role) +
          ". Pilih jenis akun yang sesuai.",
      };
    }

    if (user.passwordHash !== hashPassword(password)) {
      return {
        ok: false,
        code: "wrong-password",
        message: "Password salah. Silakan coba lagi.",
      };
    }

    return { ok: true, user: publicLocalUser(user), source: "local" };
  }

  function registerLocal(data) {
    const users = readLocalUsers();

    const emailTaken = users.some(function (user) {
      return normalize(user.email) === normalize(data.email);
    });

    if (emailTaken) {
      return {
        ok: false,
        code: "email-taken",
        message: "Email sudah terdaftar. Gunakan email lain atau masuk.",
      };
    }

    const usernameTaken = users.some(function (user) {
      return normalize(user.username) === normalize(data.username);
    });

    if (usernameTaken) {
      return {
        ok: false,
        code: "username-taken",
        message: "Username sudah dipakai. Gunakan username lain.",
      };
    }

    const newUser = {
      id: "local-" + Date.now(),
      role: data.role,
      name: data.name,
      email: data.email,
      username: data.username,
      passwordHash: hashPassword(data.password),
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    writeLocalUsers(users);

    return { ok: true, user: publicLocalUser(newUser), source: "local" };
  }

  // ==========================================
  // REQUEST KE BACKEND (DATABASE)
  // ==========================================

  async function requestAPI(path, payload) {
    const response = await fetch(API_BASE + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    let data = null;

    try {
      data = await response.json();
    } catch (error) {
      data = null;
    }

    if (!response.ok) {
      const error = new Error(
        (data && data.message) || "Permintaan gagal (" + response.status + ").",
      );

      error.status = response.status;
      error.code = (data && data.code) || "error";

      throw error;
    }

    return data;
  }

  async function callAPI(path, payload) {
    try {
      const data = await requestAPI(path, payload);
      return { ok: true, data: data };
    } catch (error) {
      // Error jaringan / backend tidak aktif -> pakai database lokal.
      if (!error.status) {
        return { ok: false, offline: true, error: error };
      }

      return { ok: false, offline: false, error: error };
    }
  }

  // ==========================================
  // SESI
  // ==========================================

  function startSession(user, source) {
    const session = {
      id: user.id || null,
      role: user.role,
      roleLabel: getRoleLabel(user.role),
      name: user.name,
      email: user.email,
      username: user.username,
      initials: getInitials(user.name),
      source: source || "local",
      loginAt: new Date().toISOString(),
    };

    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      localStorage.setItem(LEGACY_ROLE_KEY, session.role);
    } catch (error) {
      console.warn("Gagal menyimpan sesi login.", error);
    }

    return session;
  }

  function getSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);

      if (!raw) return null;

      const session = JSON.parse(raw);

      if (!session || ROLES.indexOf(session.role) === -1) {
        return null;
      }

      return session;
    } catch (error) {
      console.warn("Gagal membaca sesi login.", error);
      return null;
    }
  }

  function clearSession() {
    try {
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(LEGACY_ROLE_KEY);
    } catch (error) {
      console.warn("Gagal menghapus sesi login.", error);
    }
  }

  function requireRole(role) {
    const session = getSession();

    if (!session) {
      window.location.replace(
        "profil.html?role=" + encodeURIComponent(role || ""),
      );
      return null;
    }

    // Sudah login dengan role lain: arahkan ke dashboard role-nya
    // sendiri, bukan ke halaman login.
    if (session.role !== role) {
      window.location.replace(getRolePage(session.role));
      return null;
    }

    return session;
  }

  // ==========================================
  // LOGIN & REGISTER (API DULU, LOKAL SEBAGAI FALLBACK)
  // ==========================================

  async function login(identity, password, role) {
    if (!identity || !password) {
      return {
        ok: false,
        code: "validation",
        message: "Email/username dan password wajib diisi.",
      };
    }

    if (ROLES.indexOf(role) === -1) {
      return {
        ok: false,
        code: "validation",
        message: "Jenis akun tidak valid.",
      };
    }

    const api = await callAPI("/login.php", {
      identity: identity,
      password: password,
      role: role,
    });

    if (api.ok && api.data && api.data.user) {
      return {
        ok: true,
        session: startSession(api.data.user, "database"),
      };
    }

    if (!api.ok && !api.offline) {
      return {
        ok: false,
        code: api.error.code,
        message: api.error.message,
      };
    }

    const local = loginLocal(identity, password, role);

    if (!local.ok) return local;

    return { ok: true, session: startSession(local.user, local.source) };
  }

  async function register(data) {
    const payload = {
      role: data.role,
      name: String(data.name || "").trim(),
      email: String(data.email || "").trim(),
      username: String(data.username || "").trim(),
      password: String(data.password || ""),
    };

    if (!ROLE_LABEL[payload.role]) {
      return {
        ok: false,
        code: "validation",
        message: "Jenis akun tidak valid.",
      };
    }

    if (payload.name.length < 3) {
      return {
        ok: false,
        code: "validation",
        message: "Nama lengkap minimal 3 karakter.",
      };
    }

    if (!isValidEmail(payload.email)) {
      return {
        ok: false,
        code: "validation",
        message: "Format email tidak valid.",
      };
    }

    if (!/^[a-zA-Z0-9._-]{4,}$/.test(payload.username)) {
      return {
        ok: false,
        code: "validation",
        message:
          "Username minimal 4 karakter dan hanya boleh huruf, angka, titik, garis bawah, atau tanda hubung.",
      };
    }

    if (payload.password.length < 6) {
      return {
        ok: false,
        code: "validation",
        message: "Password minimal 6 karakter.",
      };
    }

    const api = await callAPI("/register.php", payload);

    if (api.ok && api.data && api.data.user) {
      return {
        ok: true,
        session: startSession(api.data.user, "database"),
      };
    }

    if (!api.ok && !api.offline) {
      return {
        ok: false,
        code: api.error.code,
        message: api.error.message,
      };
    }

    const local = registerLocal(payload);

    if (!local.ok) return local;

    return { ok: true, session: startSession(local.user, local.source) };
  }

  // ==========================================
  // EXPORT
  // ==========================================

  window.RANAH = window.RANAH || {};

  window.RANAH.Auth = {
    login: login,
    register: register,
    logout: clearSession,
    getSession: getSession,
    requireRole: requireRole,
    getRoleLabel: getRoleLabel,
    getRolePage: getRolePage,
    getInitials: getInitials,
    listDemoAccounts: function () {
      return DEFAULT_USERS.map(function (user) {
        return {
          role: user.role,
          roleLabel: getRoleLabel(user.role),
          name: user.name,
          email: user.email,
          password: user.password,
        };
      });
    },
  };
})(window);
