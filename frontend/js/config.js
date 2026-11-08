/* =========================================
   RANAHCARE - CONFIGURATION
   Regional AI Network for Health Care
========================================= */

// =========================================
// 1. INFORMASI APLIKASI
// =========================================

const APP_NAME = "RANAHCARE";

const APP_DESCRIPTION = "Regional AI Network for Health Care";

const APP_VERSION = "1.0.0";

// =========================================
// 2. BACKEND CONFIGURATION
// =========================================

// Alamat folder backend PHP
// Sesuaikan dengan folder project backend tim.

const API_BASE_URL = "http://localhost/ranahcare/api";

// URL layanan Python LangGraph; API key provider AI tidak pernah ditaruh di sini.
const AI_SERVICE_BASE_URL =
  window.RANAH_AI_SERVICE_URL || "http://127.0.0.1:8765/api";

// =========================================
// 3. API ENDPOINTS
// =========================================

const API_ENDPOINTS = {
  // Autentikasi
  login: "/login.php",
  logout: "/logout.php",

  // Data pasien
  patients: "/pasien.php",

  // Statistik dashboard
  statistics: "/statistik.php",

  // AI Chatbot
  chatbot: "/chat.php",
};

// =========================================
// 4. APPLICATION SETTINGS
// =========================================

const APP_CONFIG = {
  name: APP_NAME,

  description: APP_DESCRIPTION,

  version: APP_VERSION,

  language: "id",

  timezone: "Asia/Jakarta",

  environment: "development",
};

// =========================================
// 5. HELPER API URL
// =========================================

function getAPIUrl(endpoint) {
  return API_BASE_URL + endpoint;
}
