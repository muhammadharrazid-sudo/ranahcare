/* =========================================
   RANAHCARE - ANTREAN.JS (TAMPILAN MASYARAKAT)

   Fitur:
   1. Render tab puskesmas
   2. Kartu realtime puskesmas terpilih
   3. Grafik tren antrean
   4. Grid seluruh puskesmas
   5. Animasi angka & ring kapasitas
   6. Sinkronisasi realtime dari panel admin
   7. Dropdown profil, tombol kembali, Escape
========================================= */

document.addEventListener("DOMContentLoaded", function () {
  // =====================================
  // 1. CEK DATA STORE
  // =====================================

  if (!window.AntreanStore) {
    console.error("AntreanStore tidak ditemukan.");
    return;
  }

  const Store = window.AntreanStore;

  const RING_CIRCUMFERENCE = 326.73;
  const SELECTED_KEY = "ranahcare_antrean_selected";

  // =====================================
  // 2. ELEMENT HTML
  // =====================================

  const tabsContainer = document.getElementById("antreanTabs");

  const gridContainer = document.getElementById("puskesmasGrid");

  const featuredCard = document.getElementById("featuredCard");

  const featuredNama = document.getElementById("featuredNama");

  const featuredAlamat = document.getElementById("featuredAlamat");

  const featuredCount = document.getElementById("featuredCount");

  const featuredNote = document.getElementById("featuredNote");

  const featuredRing = document.getElementById("featuredRing");

  const featuredRingValue = document.getElementById("featuredRingValue");

  const featuredWait = document.getElementById("featuredWait");

  const featuredLoket = document.getElementById("featuredLoket");

  const featuredDilayani = document.getElementById("featuredDilayani");

  const featuredSelesai = document.getElementById("featuredSelesai");

  const featuredUpdated = document.getElementById("featuredUpdated");

  const featuredStatus = document.getElementById("featuredStatus");

  const trendBars = document.getElementById("trendBars");

  const trendPeak = document.getElementById("trendPeak");

  const trendAverage = document.getElementById("trendAverage");

  const trendMax = document.getElementById("trendMax");

  const puskesmasCount = document.getElementById("puskesmasCount");

  const totalMenunggu = document.getElementById("totalMenunggu");

  const liveBadge = document.getElementById("liveBadge");

  const profileButton = document.querySelector(".profile-button");

  const profileDropdown = document.querySelector(".profile-dropdown");

  const backButton = document.querySelector(".back-button");

  // =====================================
  // 3. STATE
  // =====================================

  let state = Store.getState();

  let currentId = "";

  try {
    currentId = localStorage.getItem(SELECTED_KEY) || "";
  } catch (e) {
    currentId = "";
  }

  function resolveCurrentId() {
    const exists = state.puskesmas.some(function (item) {
      return item.id === currentId;
    });

    if (!exists) {
      currentId = state.puskesmas.length ? state.puskesmas[0].id : "";
    }
  }

  // =====================================
  // 4. UTILITAS
  // =====================================

  function escapeHtml(value) {
    return String(value === undefined || value === null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function clampNumber(value, min, max) {
    const num = Number(value);

    if (!isFinite(num)) {
      return min;
    }

    return Math.min(max, Math.max(min, num));
  }

  function formatWait(minutes) {
    const total = Math.max(0, Math.round(Number(minutes) || 0));

    if (total === 0) {
      return "Tanpa antrean";
    }

    if (total < 60) {
      return "± " + total + " menit";
    }

    const hours = Math.floor(total / 60);
    const rest = total % 60;

    if (rest === 0) {
      return "± " + hours + " jam";
    }

    return "± " + hours + " jam " + rest + " mnt";
  }

  function getRatio(item) {
    if (!item || item.status === "tutup") {
      return 0;
    }

    return clampNumber(
      (Number(item.menunggu) || 0) / Store.CAPACITY,
      0,
      1,
    );
  }

  function getStatusInfo(item) {
    if (!item || item.status === "tutup") {
      return {
        label: "Tutup",
        className: "closed",
        density: "closed",
      };
    }

    const ratio = getRatio(item);

    if (ratio >= 0.8) {
      return {
        label: "Padat",
        className: "warn",
        density: "warn",
      };
    }

    return {
      label: "Buka",
      className: "open",
      density: "normal",
    };
  }

  function getNote(item) {
    if (!item) {
      return "Data antrean belum tersedia.";
    }

    if (item.status === "tutup") {
      return "Puskesmas sedang tutup. Antrean akan dibuka kembali pada jam layanan berikutnya.";
    }

    const waiting = Number(item.menunggu) || 0;

    if (waiting === 0) {
      return "Tidak ada pasien yang menunggu. Anda dapat langsung menuju loket pendaftaran.";
    }

    const ratio = getRatio(item);

    if (ratio >= 0.8) {
      return "Antrean cukup padat. Pertimbangkan datang lebih awal atau memilih puskesmas lain.";
    }

    if (ratio >= 0.5) {
      return "Antrean sedang berjalan. Estimasi waktu tunggu dapat berubah sewaktu-waktu.";
    }

    return "Antrean terpantau lancar. Waktu tunggu relatif singkat.";
  }

  function timeLabel(timestamp) {
    const date = new Date(Number(timestamp));

    if (isNaN(date.getTime())) {
      return "—";
    }

    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");

    return hours + ":" + minutes;
  }

  function animateNumber(element, target, suffix) {
    if (!element) {
      return;
    }

    const safeTarget = Math.max(0, Math.round(Number(target) || 0));

    const from = parseInt(element.textContent.replace(/\D/g, ""), 10) || 0;

    if (from === safeTarget) {
      element.textContent = safeTarget + (suffix || "");
      return;
    }

    const start = performance.now();
    const duration = 650;

    function step(now) {
      const progress = Math.min(1, (now - start) / duration);

      const eased = 1 - Math.pow(1 - progress, 3);

      const value = Math.round(from + (safeTarget - from) * eased);

      element.textContent = value + (suffix || "");

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    }

    requestAnimationFrame(step);
  }

  function setRing(ratio) {
    if (!featuredRing) {
      return;
    }

    const safeRatio = clampNumber(ratio, 0, 1);

    featuredRing.style.strokeDasharray = RING_CIRCUMFERENCE;

    featuredRing.style.strokeDashoffset =
      RING_CIRCUMFERENCE - safeRatio * RING_CIRCUMFERENCE;

    featuredRing.classList.remove("warn", "full");

    if (safeRatio >= 0.8) {
      featuredRing.classList.add("full");
    } else if (safeRatio >= 0.5) {
      featuredRing.classList.add("warn");
    }

    if (featuredRingValue) {
      animateNumber(featuredRingValue, Math.round(safeRatio * 100), "%");
    }
  }

  // =====================================
  // 5. RENDER TAB
  // =====================================

  function renderTabs() {
    if (!tabsContainer) {
      return;
    }

    tabsContainer.innerHTML = state.puskesmas
      .map(function (item) {
        const info = getStatusInfo(item);

        const active = item.id === currentId ? " active" : "";

        const selected = item.id === currentId ? "true" : "false";

        return (
          '<button class="antrean-tab' +
          active +
          '" type="button" role="tab" data-id="' +
          escapeHtml(item.id) +
          '" aria-selected="' +
          selected +
          '">' +
          '<span class="tab-dot ' +
          info.className +
          '"></span>' +
          '<span class="tab-info">' +
          '<span class="tab-name">' +
          escapeHtml(item.nama) +
          "</span>" +
          '<span class="tab-meta">' +
          escapeHtml(info.label) +
          " · " +
          clampNumber(item.loket, 0, 99) +
          " loket</span>" +
          "</span>" +
          '<span class="tab-count">' +
          clampNumber(item.menunggu, 0, 999) +
          "</span>" +
          "</button>"
        );
      })
      .join("");
  }

  // =====================================
  // 6. RENDER FEATURED
  // =====================================

  function renderFeatured() {
    const item = state.puskesmas.find(function (entry) {
      return entry.id === currentId;
    });

    if (!item) {
      return;
    }

    const info = getStatusInfo(item);

    const ratio = getRatio(item);

    const waiting = clampNumber(item.menunggu, 0, 999);

    if (featuredNama) {
      featuredNama.textContent = item.nama;
    }

    if (featuredAlamat) {
      featuredAlamat.textContent = item.alamat || "Alamat belum tersedia";
    }

    animateNumber(featuredCount, waiting, "");

    if (featuredNote) {
      featuredNote.textContent = getNote(item);
    }

    setRing(ratio);

    if (featuredWait) {
      featuredWait.textContent = formatWait(Store.estimateWait(item));
    }

    if (featuredLoket) {
      featuredLoket.textContent = clampNumber(item.loket, 0, 99);
    }

    if (featuredDilayani) {
      featuredDilayani.textContent = clampNumber(item.dilayani, 0, 999);
    }

    if (featuredSelesai) {
      featuredSelesai.textContent = clampNumber(item.selesai, 0, 9999);
    }

    if (featuredUpdated) {
      featuredUpdated.textContent = Store.relativeTime(item.updatedAt);
    }

    if (featuredStatus) {
      featuredStatus.textContent = info.label;

      featuredStatus.className = "status-pill " + info.className;
    }

    if (featuredCard) {
      featuredCard.classList.toggle("closed", item.status === "tutup");
    }
  }

  // =====================================
  // 7. RENDER TREND
  // =====================================

  function renderTrend() {
    if (!trendBars) {
      return;
    }

    const item = state.puskesmas.find(function (entry) {
      return entry.id === currentId;
    });

    if (!item) {
      return;
    }

    const history = Array.isArray(item.riwayat) ? item.riwayat.slice(-16) : [];

    if (history.length === 0) {
      trendBars.innerHTML =
        '<p class="trend-empty">Belum ada riwayat pembaruan.</p>';

      if (trendPeak) {
        trendPeak.textContent = "Belum ada data";
      }

      if (trendAverage) {
        trendAverage.textContent = "0";
      }

      if (trendMax) {
        trendMax.textContent = "0";
      }

      return;
    }

    const values = history.map(function (point) {
      return Math.max(0, Number(point.v) || 0);
    });

    const maxValue = Math.max.apply(null, values);
    const safeMax = Math.max(1, maxValue);

    const total = values.reduce(function (sum, value) {
      return sum + value;
    }, 0);

    const average = Math.round(total / values.length);

    trendBars.innerHTML = history
      .map(function (point, index) {
        const value = Math.max(0, Number(point.v) || 0);

        const height = Math.max(3, Math.round((value / safeMax) * 100));

        return (
          '<div class="trend-bar" title="' +
          value +
          ' pasien">' +
          '<span class="trend-bar-value">' +
          value +
          "</span>" +
          '<span class="trend-bar-fill" style="height:' +
          height +
          '%"></span>' +
          '<span class="trend-bar-time">' +
          (index === history.length - 1
            ? "Kini"
            : escapeHtml(timeLabel(point.t))) +
          "</span>" +
          "</div>"
        );
      })
      .join("");

    if (trendPeak) {
      trendPeak.textContent = "Puncak " + maxValue + " pasien";
    }

    if (trendAverage) {
      trendAverage.textContent = average;
    }

    if (trendMax) {
      trendMax.textContent = maxValue;
    }
  }

  // =====================================
  // 8. RENDER GRID
  // =====================================

  function renderGrid() {
    if (!gridContainer) {
      return;
    }

    gridContainer.innerHTML = state.puskesmas
      .map(function (item) {
        const info = getStatusInfo(item);

        const ratio = getRatio(item);

        const percent = Math.round(ratio * 100);

        const active = item.id === currentId ? " active" : "";

        const closed = item.status === "tutup" ? " closed" : "";

        return (
          '<article class="puskesmas-card' +
          active +
          closed +
          '" data-id="' +
          escapeHtml(item.id) +
          '">' +
          '<div class="card-head">' +
          '<div class="card-icon">' +
          '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
          '<path d="M3 10.5L12 3L21 10.5V20H14V14H10V20H3V10.5Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>' +
          '<path d="M12 8V12M10 10H14" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>' +
          "</svg>" +
          "</div>" +
          '<div class="card-name-wrap">' +
          '<span class="card-name">' +
          escapeHtml(item.nama) +
          "</span>" +
          '<span class="card-address">' +
          escapeHtml(item.alamat || "Alamat belum tersedia") +
          "</span>" +
          "</div>" +
          '<span class="card-status ' +
          info.className +
          '">' +
          escapeHtml(info.label) +
          "</span>" +
          "</div>" +
          '<div class="card-body">' +
          "<div>" +
          '<strong class="card-count-value">' +
          clampNumber(item.menunggu, 0, 999) +
          "</strong>" +
          '<span class="card-count-label">pasien menunggu</span>' +
          "</div>" +
          '<div class="card-capacity">' +
          '<div class="capacity-bar">' +
          '<span class="capacity-fill ' +
          info.density +
          '" style="width:' +
          percent +
          '%"></span>' +
          "</div>" +
          "<span>" +
          percent +
          "% kapasitas</span>" +
          "</div>" +
          "</div>" +
          '<div class="card-meta">' +
          '<span class="card-meta-item">' +
          '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
          '<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8"/>' +
          '<path d="M12 7V12L15 14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>' +
          "</svg>" +
          clampNumber(item.loket, 0, 99) +
          " loket</span>" +
          '<span class="card-meta-item">' +
          '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
          '<circle cx="8" cy="7" r="3" stroke="currentColor" stroke-width="1.8"/>' +
          '<path d="M2 20C2 16.686 4.686 14 8 14C11.314 14 14 16.686 14 20" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>' +
          '<path d="M16 14C19.314 14 22 16.686 22 20" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>' +
          "</svg>" +
          clampNumber(item.dilayani, 0, 999) +
          " dilayani</span>" +
          "</div>" +
          '<div class="card-footer">' +
          '<span class="card-wait">' +
          '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
          '<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8"/>' +
          '<path d="M12 7V12L15 14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>' +
          "</svg>" +
          escapeHtml(formatWait(Store.estimateWait(item))) +
          "</span>" +
          '<button class="card-detail" type="button" data-id="' +
          escapeHtml(item.id) +
          '">Lihat</button>' +
          "</div>" +
          "</article>"
        );
      })
      .join("");
  }

  // =====================================
  // 9. RENDER RINGKASAN
  // =====================================

  function renderSummary() {
    if (puskesmasCount) {
      puskesmasCount.textContent =
        state.puskesmas.length + " puskesmas terdaftar";
    }

    if (totalMenunggu) {
      const total = state.puskesmas.reduce(function (sum, item) {
        return sum + (Number(item.menunggu) || 0);
      }, 0);

      totalMenunggu.textContent = total + " pasien menunggu";
    }

    if (liveBadge) {
      liveBadge.title =
        "Terakhir disinkronkan: " + new Date().toLocaleTimeString("id-ID");
    }
  }

  // =====================================
  // 10. RENDER SEMUA
  // =====================================

  function renderAll() {
    resolveCurrentId();

    renderTabs();
    renderFeatured();
    renderTrend();
    renderGrid();
    renderSummary();
  }

  // =====================================
  // 11. PILIH PUSKESMAS
  // =====================================

  function selectPuskesmas(id, scroll) {
    const exists = state.puskesmas.some(function (item) {
      return item.id === id;
    });

    if (!exists) {
      return;
    }

    currentId = id;

    try {
      localStorage.setItem(SELECTED_KEY, id);
    } catch (e) {
      /* abaikan */
    }

    renderAll();

    if (scroll && featuredCard) {
      const top =
        featuredCard.getBoundingClientRect().top + window.scrollY - 96;

      window.scrollTo({ top: top, behavior: "smooth" });
    }
  }

  if (tabsContainer) {
    tabsContainer.addEventListener("click", function (event) {
      const tab = event.target.closest(".antrean-tab");

      if (!tab) {
        return;
      }

      selectPuskesmas(tab.dataset.id, false);
    });
  }

  if (gridContainer) {
    gridContainer.addEventListener("click", function (event) {
      const button = event.target.closest(".card-detail");

      const card = event.target.closest(".puskesmas-card");

      if (button) {
        selectPuskesmas(button.dataset.id, true);
        return;
      }

      if (card) {
        selectPuskesmas(card.dataset.id, false);
      }
    });
  }

  // =====================================
  // 12. SINKRONISASI REALTIME
  // =====================================

  Store.subscribe(function (nextState) {
    state = nextState;

    renderAll();
  });

  // Perbarui label waktu relatif setiap 10 detik
  setInterval(function () {
    const item = state.puskesmas.find(function (entry) {
      return entry.id === currentId;
    });

    if (item && featuredUpdated) {
      featuredUpdated.textContent = Store.relativeTime(item.updatedAt);
    }
  }, 10000);

  // =====================================
  // 13. DROPDOWN PROFIL
  // =====================================

  function closeProfileDropdown() {
    if (!profileDropdown || !profileButton) {
      return;
    }

    profileDropdown.classList.remove("show");

    profileButton.setAttribute("aria-expanded", "false");
  }

  if (profileButton && profileDropdown) {
    profileButton.addEventListener("click", function (event) {
      event.stopPropagation();

      const isOpen = profileDropdown.classList.toggle("show");

      profileButton.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });

    document.addEventListener("click", function (event) {
      if (
        !profileDropdown.contains(event.target) &&
        !profileButton.contains(event.target)
      ) {
        closeProfileDropdown();
      }
    });
  }

  // =====================================
  // 14. TOMBOL KEMBALI & ESCAPE
  // =====================================

  if (backButton) {
    backButton.addEventListener("click", function () {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.href = "dashboard.html";
      }
    });
  }

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      closeProfileDropdown();
    }
  });

  // =====================================
  // 15. INISIALISASI
  // =====================================

  renderAll();

  console.log("RANAHCARE Antrean (masyarakat) berhasil dijalankan.");
});
