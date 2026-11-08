/* =========================================================
   RANAHCARE - RUANG ADMIN
   File: js/admin.js
========================================================= */

document.addEventListener("DOMContentLoaded", function () {
  const Auth = window.RANAH && window.RANAH.Auth;

  if (!Auth) {
    console.error("Modul Auth tidak ditemukan.");
    return;
  }

  const session = Auth.requireRole("admin");

  if (!session) return;

  const Store = window.AntreanStore;

  const LOG_KEY = "ranahcare_antrean_log_v1";

  // ==========================================
  // 1. SAPAAN & TANGGAL
  // ==========================================

  const greeting = document.getElementById("adminGreeting");
  const dateElement = document.getElementById("adminDate");

  if (greeting) {
    greeting.textContent = session.name;
  }

  if (dateElement) {
    dateElement.textContent = new Date().toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  // ==========================================
  // 2. HELPER
  // ==========================================

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function readLog() {
    try {
      const parsed = JSON.parse(localStorage.getItem(LOG_KEY) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function relativeTime(timestamp) {
    if (Store) return Store.relativeTime(timestamp);

    const minutes = Math.floor((Date.now() - Number(timestamp)) / 60000);
    return minutes + " menit lalu";
  }

  // ==========================================
  // 3. RENDER STATISTIK & TABEL
  // ==========================================

  function render(state) {
    if (!state || !Array.isArray(state.puskesmas)) return;

    const open = state.puskesmas.filter(function (item) {
      return item.status === "buka";
    });

    const totalWaiting = state.puskesmas.reduce(function (total, item) {
      return total + (Number(item.menunggu) || 0);
    }, 0);

    const totalDone = state.puskesmas.reduce(function (total, item) {
      return total + (Number(item.selesai) || 0);
    }, 0);

    const totalLoket = state.puskesmas.reduce(function (total, item) {
      return total + (Number(item.loket) || 0);
    }, 0);

    const waitingElement = document.getElementById("adminWaiting");
    const openElement = document.getElementById("adminOpen");
    const doneElement = document.getElementById("adminDone");
    const loketElement = document.getElementById("adminLoket");
    const updatedElement = document.getElementById("adminUpdated");

    if (waitingElement) waitingElement.textContent = totalWaiting;
    if (openElement) openElement.textContent = open.length;
    if (doneElement) doneElement.textContent = totalDone;
    if (loketElement) loketElement.textContent = totalLoket;

    if (updatedElement) {
      updatedElement.textContent = Store
        ? Store.relativeTime(state.updatedAt)
        : "baru saja";
    }

    const table = document.getElementById("adminPuskesmasTable");

    if (table) {
      table.innerHTML = state.puskesmas
        .map(function (item) {
          const isOpen = item.status === "buka";

          return (
            "<tr>" +
            "<td>" +
            '<div class="patient-cell">' +
            '<span class="mini-avatar ' +
            (isOpen ? "" : "orange") +
            '">' +
            escapeHtml(String(item.nama || "P").charAt(0)) +
            "</span>" +
            "<div><strong>" +
            escapeHtml(item.nama) +
            "</strong><br><small>" +
            escapeHtml(item.alamat) +
            "</small></div>" +
            "</div>" +
            "</td>" +
            "<td><strong>" +
            (Number(item.menunggu) || 0) +
            "</strong></td>" +
            "<td>" +
            (Number(item.dilayani) || 0) +
            "</td>" +
            "<td>" +
            '<span class="status-pill ' +
            (isOpen ? "open" : "closed") +
            '">' +
            (isOpen ? "Buka" : "Tutup") +
            "</span>" +
            "</td>" +
            "</tr>"
          );
        })
        .join("");
    }

    renderLog();
  }

  function renderLog() {
    const list = document.getElementById("adminActivityList");

    if (!list) return;

    const entries = readLog().slice(0, 4);

    if (entries.length === 0) {
      list.innerHTML =
        '<div class="schedule-item">' +
        '<span class="schedule-time">—</span>' +
        "<div><strong>Belum ada aktivitas</strong>" +
        "<small>Perubahan antrean akan tampil di sini.</small></div>" +
        "</div>";
      return;
    }

    list.innerHTML = entries
      .map(function (entry) {
        const time = new Date(Number(entry.at)).toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
        });

        return (
          '<div class="schedule-item">' +
          '<span class="schedule-time">' +
          escapeHtml(time) +
          "</span>" +
          "<div><strong>" +
          escapeHtml(entry.nama) +
          "</strong>" +
          "<small>" +
          (Number(entry.menunggu) || 0) +
          " menunggu · " +
          (Number(entry.dilayani) || 0) +
          " dilayani · " +
          escapeHtml(relativeTime(entry.at)) +
          "</small></div>" +
          "</div>"
        );
      })
      .join("");
  }

  if (Store) {
    render(Store.getState());
    Store.subscribe(render);
  } else {
    renderLog();
  }

  console.log("RANAHCARE Ruang Admin dimuat untuk " + session.name + ".");
});
