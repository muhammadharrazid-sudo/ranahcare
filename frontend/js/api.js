/* =====================================
   RANAHCARE - API CONNECTION
   ===================================== */

// Fungsi utama untuk menghubungkan frontend
// dengan backend PHP

async function apiRequest(endpoint, options = {}) {
  try {
    // Mengirim request ke server
    const response = await fetch(getAPIUrl(endpoint), {
      method: options.method || "GET",

      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },

      body: options.body ? JSON.stringify(options.body) : undefined,

      credentials: "include",
    });

    // Mengambil respons dari PHP
    const result = await response.json();

    // Periksa status HTTP
    if (!response.ok) {
      throw new Error(result.message || `HTTP Error: ${response.status}`);
    }

    return result;
  } catch (error) {
    console.error("API Error:", error);

    throw error;
  }
}

// =====================================
// FUNGSI GET
// Mengambil data dari backend
// =====================================

async function apiGet(endpoint) {
  return await apiRequest(endpoint, {
    method: "GET",
  });
}

// =====================================
// FUNGSI POST
// Mengirim data ke backend
// =====================================

async function apiPost(endpoint, data = {}) {
  return await apiRequest(endpoint, {
    method: "POST",
    body: data,
  });
}

// =====================================
// FUNGSI PUT
// Memperbarui data
// =====================================

async function apiPut(endpoint, data = {}) {
  return await apiRequest(endpoint, {
    method: "PUT",
    body: data,
  });
}

// =====================================
// FUNGSI DELETE
// Menghapus data
// =====================================

async function apiDelete(endpoint) {
  return await apiRequest(endpoint, {
    method: "DELETE",
  });
}
