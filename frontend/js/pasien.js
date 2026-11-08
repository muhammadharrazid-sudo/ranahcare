/* =========================================================
   RANAHCARE - RUANG PASIEN
   File: js/pasien.js
========================================================= */

document.addEventListener("DOMContentLoaded", function () {
  const Auth = window.RANAH && window.RANAH.Auth;

  if (!Auth) {
    console.error("Modul Auth tidak ditemukan.");
    return;
  }

  const session = Auth.requireRole("pasien");

  if (!session) return;

  const Store = window.AntreanStore;

  // ==========================================
  // 1. SAPAAN & TANGGAL
  // ==========================================

  const firstName = String(session.name || "Pasien").trim().split(/\s+/)[0];

  const greeting = document.getElementById("patientGreeting");
  const dateElement = document.getElementById("patientDate");

  if (greeting) greeting.textContent = firstName;

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

  // ==========================================
  // 3. RENDER ANTREAN & STATISTIK
  // ==========================================

  function render(state) {
    if (!state || !Array.isArray(state.puskesmas)) return;

    const open = state.puskesmas.filter(function (item) {
      return item.status === "buka";
    });

    const totalWaiting = open.reduce(function (total, item) {
      return total + (Number(item.menunggu) || 0);
    }, 0);

    const busiest = open.slice().sort(function (a, b) {
      return (Number(b.menunggu) || 0) - (Number(a.menunggu) || 0);
    })[0];

    const list = document.getElementById("patientQueueList");

    if (list) {
      if (open.length === 0) {
        list.innerHTML =
          '<div class="queue-item"><div><strong>Belum ada puskesmas buka</strong><small>Silakan cek kembali nanti.</small></div></div>';
      } else {
        list.innerHTML = open
          .slice(0, 4)
          .map(function (item) {
            const wait = Store ? Store.estimateWait(item) : 0;

            return (
              '<div class="queue-item">' +
              "<div>" +
              "<strong>" +
              escapeHtml(item.nama) +
              "</strong>" +
              "<small>" +
              escapeHtml(item.alamat) +
              " · " +
              (Number(item.loket) || 0) +
              " loket · ±" +
              wait +
              " menit</small>" +
              "</div>" +
              '<div class="queue-value">' +
              "<strong>" +
              (Number(item.menunggu) || 0) +
              "</strong>" +
              "<span>menunggu</span>" +
              "</div>" +
              "</div>"
            );
          })
          .join("");
      }
    }

    const statQueue = document.getElementById("statQueue");
    const statWait = document.getElementById("statWait");
    const statOpen = document.getElementById("statOpen");
    const statVisits = document.getElementById("statVisits");

    if (statQueue) statQueue.textContent = totalWaiting;

    if (statWait) {
      statWait.textContent =
        (busiest && Store ? Store.estimateWait(busiest) : 0) + " mnt";
    }

    if (statOpen) statOpen.textContent = open.length + "/" + state.puskesmas.length;

    if (statVisits) {
      let visits = 0;

      try {
        visits =
          Number(
            localStorage.getItem(
              "ranahcare_patient_visits_" + (session.username || "pasien"),
            ),
          ) || 0;
      } catch (error) {
        visits = 0;
      }

      statVisits.textContent = visits;
    }
  }

  if (Store) {
    render(Store.getState());
    Store.subscribe(render);
  }

  console.log("RANAHCARE Ruang Pasien dimuat untuk " + session.name + ".");
});
