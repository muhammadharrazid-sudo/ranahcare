/* =========================================================
   RANAHCARE - RUANG DOKTER
   File: js/dokter.js
========================================================= */

document.addEventListener("DOMContentLoaded", function () {
  const Auth = window.RANAH && window.RANAH.Auth;

  if (!Auth) {
    console.error("Modul Auth tidak ditemukan.");
    return;
  }

  const session = Auth.requireRole("dokter");

  if (!session) return;

  const Store = window.AntreanStore;

  // ==========================================
  // 1. SAPAAN & TANGGAL
  // ==========================================

  const greeting = document.getElementById("doctorGreeting");
  const dateElement = document.getElementById("doctorDate");

  if (greeting) {
    greeting.textContent = session.name.replace(/^(dr\.|drg\.|prof\.)\s*/i, "");
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
  // 2. STATISTIK
  // ==========================================

  function renderStats() {
    if (!Store) return;

    const state = Store.getState();

    const open = state.puskesmas.filter(function (item) {
      return item.status === "buka";
    });

    const totalWaiting = open.reduce(function (total, item) {
      return total + (Number(item.menunggu) || 0);
    }, 0);

    const waitingElement = document.getElementById("doctorWaiting");
    const patientsElement = document.getElementById("doctorPatients");
    const doneElement = document.getElementById("doctorDone");
    const scheduleElement = document.getElementById("doctorSchedule");

    if (waitingElement) waitingElement.textContent = totalWaiting;
    if (patientsElement) patientsElement.textContent = 18 + totalWaiting;
    if (doneElement) doneElement.textContent = 12;
    if (scheduleElement) scheduleElement.textContent = 3;
  }

  if (Store) {
    renderStats();
    Store.subscribe(renderStats);
  }

  console.log("RANAHCARE Ruang Dokter dimuat untuk " + session.name + ".");
});
