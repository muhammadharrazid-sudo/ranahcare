/* =========================================
   RANAHCARE - ADMIN ANTREAN.JS

   Fitur:
   1. Pilih puskesmas
   2. Atur status buka / tutup
   3. Stepper & tombol cepat jumlah antrean
   4. Validasi & simpan ke store realtime
   5. Pratinjau kartu masyarakat
   6. Log aktivitas pembaruan
   7. Sinkronisasi antar-tab
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

  const SELECTED_KEY = "ranahcare_antrean_selected";
  const LOG_KEY = "ranahcare_antrean_log_v1";
  const MAX_LOG = 12;

  // =====================================
  // 2. ELEMENT HTML
  // =====================================

  const form = document.getElementById("antreanForm");

  const select = document.getElementById("puskesmasSelect");

  const menungguInput = document.getElementById("menungguInput");

  const dilayaniInput = document.getElementById("dilayaniInput");

  const selesaiInput = document.getElementById("selesaiInput");

  const loketInput = document.getElementById("loketInput");

  const rataRataInput = document.getElementById("rataRataInput");

  const btnMinus = document.getElementById("btnMinus");

  const btnPlus = document.getElementById("btnPlus");

  const statusBuka = document.getElementById("statusBuka");

  const statusTutup = document.getElementById("statusTutup");

  const quickButtons = document.querySelectorAll(".quick-button");

  const reloadButton = document.getElementById("reloadButton");

  const feedback = document.getElementById("feedback");

  const adminTotalMenunggu = document.getElementById("adminTotalMenunggu");

  const adminBuka = document.getElementById("adminBuka");

  const adminTotalSelesai = document.getElementById("adminTotalSelesai");

  const adminLastUpdate = document.getElementById("adminLastUpdate");

  const previewNama = document.getElementById("previewNama");

  const previewCount = document.getElementById("previewCount");

  const previewNote = document.getElementById("previewNote");

  const previewWait = document.getElementById("previewWait");

  const previewLoket = document.getElementById("previewLoket");

  const previewDilayani = document.getElementById("previewDilayani");

  const previewBar = document.getElementById("previewBar");

  const previewUpdated = document.getElementById("previewUpdated");

  const previewStatus = document.getElementById("previewStatus");

  const activityLog = document.getElementById("activityLog");

  const clearLogButton = document.getElementById("clearLog");

  const profileButton = document.querySelector(".profile-button");

  const profileDropdown = document.querySelector(".profile-dropdown");

  const backButton = document.querySelector(".back-button");

  // =====================================
  // 3. STATE
  // =====================================

  let state = Store.getState();

  let currentId = "";

  let formStatus = "buka";

  let isDirty = false;

  let feedbackTimer = null;

  try {
    currentId = localStorage.getItem(SELECTED_KEY) || "";
  } catch (e) {
    currentId = "";
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

    return Math.min(max, Math.max(min, Math.round(num)));
  }

  function formatWait(minutes) {
    const total = Math.max(0, Math.round(Number(minutes) || 0));

    if (total === 0) {
      return "Tanpa antrean";
    }

    if (total < 60) {
      return "± " + total + " mnt";
    }

    const hours = Math.floor(total / 60);
    const rest = total % 60;

    if (rest === 0) {
      return "± " + hours + " jam";
    }

    return "± " + hours + " jam " + rest + " mnt";
  }

  function getItem() {
    return state.puskesmas.find(function (item) {
      return item.id === currentId;
    });
  }

  function resolveCurrentId() {
    const exists = state.puskesmas.some(function (item) {
      return item.id === currentId;
    });

    if (!exists) {
      currentId = state.puskesmas.length ? state.puskesmas[0].id : "";
    }
  }

  function getPreviewNote(status, waiting) {
    if (status === "tutup") {
      return "Puskesmas ditandai tutup. Kartu masyarakat akan menampilkan status tutup tanpa antrean.";
    }

    if (waiting === 0) {
      return "Tidak ada pasien menunggu. Masyarakat dapat langsung menuju loket.";
    }

    const ratio = waiting / Store.CAPACITY;

    if (ratio >= 0.8) {
      return "Antrean padat. Masyarakat akan melihat peringatan kepadatan pada kartu.";
    }

    if (ratio >= 0.5) {
      return "Antrean sedang berjalan dan masih dalam kapasitas normal.";
    }

    return "Antrean lancar. Waktu tunggu relatif singkat.";
  }

  // =====================================
  // 5. FEEDBACK
  // =====================================

  function showFeedback(message, type) {
    if (!feedback) {
      return;
    }

    feedback.textContent = message;

    feedback.className = "form-feedback show " + (type || "success");

    if (feedbackTimer) {
      clearTimeout(feedbackTimer);
    }

    feedbackTimer = setTimeout(function () {
      feedback.className = "form-feedback";
    }, 4200);
  }

  // =====================================
  // 6. POPULATE SELECT
  // =====================================

  function populateSelect() {
    if (!select) {
      return;
    }

    resolveCurrentId();

    select.innerHTML = state.puskesmas
      .map(function (item) {
        const label =
          item.nama +
          " — " +
          clampNumber(item.menunggu, 0, 999) +
          " menunggu";

        return (
          '<option value="' +
          escapeHtml(item.id) +
          '">' +
          escapeHtml(label) +
          "</option>"
        );
      })
      .join("");

    select.value = currentId;
  }

  // =====================================
  // 7. SET STATUS
  // =====================================

  function setStatus(status) {
    formStatus = status === "tutup" ? "tutup" : "buka";

    [statusBuka, statusTutup].forEach(function (button) {
      if (!button) {
        return;
      }

      const isActive = button.dataset.status === formStatus;

      button.classList.toggle("active", isActive);

      button.setAttribute("aria-pressed", isActive ? "true" : "false");
    });

    updatePreview();
  }

  // =====================================
  // 8. LOAD FORM
  // =====================================

  function loadForm() {
    const item = getItem();

    if (!item) {
      return;
    }

    if (select) {
      select.value = item.id;
    }

    if (menungguInput) {
      menungguInput.value = clampNumber(item.menunggu, 0, 999);
    }

    if (dilayaniInput) {
      dilayaniInput.value = clampNumber(item.dilayani, 0, 999);
    }

    if (selesaiInput) {
      selesaiInput.value = clampNumber(item.selesai, 0, 9999);
    }

    if (loketInput) {
      loketInput.value = clampNumber(item.loket, 1, 20);
    }

    if (rataRataInput) {
      rataRataInput.value = clampNumber(item.rataRata, 1, 120);
    }

    setStatus(item.status === "tutup" ? "tutup" : "buka");

    isDirty = false;

    updatePreview();
  }

  // =====================================
  // 9. BACA FORM
  // =====================================

  function readForm() {
    return {
      menunggu: clampNumber(menungguInput ? menungguInput.value : 0, 0, 999),
      dilayani: clampNumber(
        dilayaniInput ? dilayaniInput.value : 0,
        0,
        999,
      ),
      selesai: clampNumber(selesaiInput ? selesaiInput.value : 0, 0, 9999),
      loket: clampNumber(loketInput ? loketInput.value : 1, 1, 20),
      rataRata: clampNumber(
        rataRataInput ? rataRataInput.value : 10,
        1,
        120,
      ),
      status: formStatus,
    };
  }

  // =====================================
  // 10. PREVIEW
  // =====================================

  function updatePreview() {
    const item = getItem();

    if (!item) {
      return;
    }

    const values = readForm();

    const ratio =
      values.status === "tutup"
        ? 0
        : clampNumber(values.menunggu / Store.CAPACITY, 0, 1);

    const percent = Math.round(ratio * 100);

    if (previewNama) {
      previewNama.textContent = item.nama;
    }

    if (previewCount) {
      previewCount.textContent =
        values.status === "tutup" ? 0 : values.menunggu;
    }

    if (previewNote) {
      previewNote.textContent = getPreviewNote(values.status, values.menunggu);
    }

    if (previewWait) {
      previewWait.textContent = formatWait(
        Store.estimateWait({
          menunggu: values.status === "tutup" ? 0 : values.menunggu,
          loket: values.loket,
          rataRata: values.rataRata,
          status: values.status,
        }),
      );
    }

    if (previewLoket) {
      previewLoket.textContent = values.loket;
    }

    if (previewDilayani) {
      previewDilayani.textContent = values.dilayani;
    }

    if (previewBar) {
      previewBar.style.width = percent + "%";

      previewBar.classList.remove("warn", "full");

      if (percent >= 80) {
        previewBar.classList.add("full");
      } else if (percent >= 50) {
        previewBar.classList.add("warn");
      }
    }

    if (previewStatus) {
      let label = "Buka";
      let className = "open";

      if (values.status === "tutup") {
        label = "Tutup";
        className = "closed";
      } else if (percent >= 80) {
        label = "Padat";
        className = "warn";
      }

      previewStatus.textContent = label;

      previewStatus.className = "status-pill " + className;
    }

    if (previewUpdated) {
      previewUpdated.textContent = isDirty
        ? "Belum disimpan"
        : Store.relativeTime(item.updatedAt);
    }
  }

  // =====================================
  // 11. STATISTIK ADMIN
  // =====================================

  function renderStats() {
    const totalMenunggu = state.puskesmas.reduce(function (sum, item) {
      return sum + (Number(item.menunggu) || 0);
    }, 0);

    const totalSelesai = state.puskesmas.reduce(function (sum, item) {
      return sum + (Number(item.selesai) || 0);
    }, 0);

    const totalBuka = state.puskesmas.filter(function (item) {
      return item.status !== "tutup";
    }).length;

    const lastUpdate = state.puskesmas.reduce(function (latest, item) {
      return Math.max(latest, Number(item.updatedAt) || 0);
    }, 0);

    if (adminTotalMenunggu) {
      adminTotalMenunggu.textContent = totalMenunggu;
    }

    if (adminBuka) {
      adminBuka.textContent = totalBuka;
    }

    if (adminTotalSelesai) {
      adminTotalSelesai.textContent = totalSelesai;
    }

    if (adminLastUpdate) {
      adminLastUpdate.textContent = lastUpdate
        ? Store.relativeTime(lastUpdate)
        : "—";
    }
  }

  // =====================================
  // 12. LOG AKTIVITAS
  // =====================================

  function readLog() {
    try {
      const raw = localStorage.getItem(LOG_KEY);

      if (!raw) {
        return [];
      }

      const parsed = JSON.parse(raw);

      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function writeLog(entries) {
    try {
      localStorage.setItem(LOG_KEY, JSON.stringify(entries.slice(0, MAX_LOG)));
    } catch (e) {
      /* abaikan */
    }
  }

  function addLogEntry(item, values) {
    const entries = readLog();

    entries.unshift({
      id: item.id,
      nama: item.nama,
      menunggu: values.menunggu,
      dilayani: values.dilayani,
      loket: values.loket,
      status: values.status,
      at: Date.now(),
    });

    writeLog(entries);
  }

  function renderLog() {
    if (!activityLog) {
      return;
    }

    const entries = readLog();

    if (entries.length === 0) {
      activityLog.innerHTML =
        '<p class="log-empty">Belum ada aktivitas. Perubahan yang Anda simpan akan tampil di sini.</p>';

      return;
    }

    activityLog.innerHTML = entries
      .map(function (entry) {
        const closed = entry.status === "tutup";

        const warn = !closed && entry.menunggu >= Store.CAPACITY * 0.8;

        const iconClass = closed ? "closed" : warn ? "warn" : "";

        return (
          '<div class="log-item">' +
          '<div class="log-icon ' +
          iconClass +
          '">' +
          '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
          '<path d="M5 12L10 17L20 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
          "</svg>" +
          "</div>" +
          '<div class="log-body">' +
          '<p class="log-title">' +
          (closed ? "Antrean " : "Antrean ") +
          "<strong>" +
          escapeHtml(entry.nama) +
          "</strong> diperbarui menjadi <strong>" +
          (closed ? 0 : clampNumber(entry.menunggu, 0, 999)) +
          " pasien</strong>" +
          (closed ? " (tutup)" : "") +
          "</p>" +
          '<p class="log-meta">' +
          clampNumber(entry.loket, 1, 20) +
          " loket · " +
          clampNumber(entry.dilayani, 0, 999) +
          " dilayani · " +
          escapeHtml(Store.relativeTime(entry.at)) +
          "</p>" +
          "</div>" +
          "</div>"
        );
      })
      .join("");
  }

  // =====================================
  // 13. EVENT: PILIH PUSKESMAS
  // =====================================

  if (select) {
    select.addEventListener("change", function () {
      const nextId = this.value;

      if (isDirty) {
        const proceed = window.confirm(
          "Perubahan yang belum disimpan akan hilang. Lanjutkan?",
        );

        if (!proceed) {
          this.value = currentId;
          return;
        }
      }

      currentId = nextId;

      try {
        localStorage.setItem(SELECTED_KEY, currentId);
      } catch (e) {
        /* abaikan */
      }

      loadForm();
    });
  }

  // =====================================
  // 14. EVENT: STATUS
  // =====================================

  [statusBuka, statusTutup].forEach(function (button) {
    if (!button) {
      return;
    }

    button.addEventListener("click", function () {
      setStatus(this.dataset.status);

      isDirty = true;

      updatePreview();
    });
  });

  // =====================================
  // 15. EVENT: STEPPER & QUICK BUTTON
  // =====================================

  function adjustWaiting(delta) {
    if (!menungguInput) {
      return;
    }

    const current = clampNumber(menungguInput.value, 0, 999);

    menungguInput.value = clampNumber(current + delta, 0, 999);

    isDirty = true;

    updatePreview();
  }

  if (btnMinus) {
    btnMinus.addEventListener("click", function () {
      adjustWaiting(-1);
    });
  }

  if (btnPlus) {
    btnPlus.addEventListener("click", function () {
      adjustWaiting(1);
    });
  }

  quickButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      adjustWaiting(Number(this.dataset.quick) || 0);
    });
  });

  // =====================================
  // 16. EVENT: INPUT FORM
  // =====================================

  [menungguInput, dilayaniInput, selesaiInput, loketInput, rataRataInput].forEach(
    function (input) {
      if (!input) {
        return;
      }

      input.addEventListener("input", function () {
        isDirty = true;

        updatePreview();
      });

      input.addEventListener("blur", function () {
        const min = Number(this.min) || 0;
        const max = Number(this.max) || 999;

        this.value = clampNumber(this.value, min, max);

        updatePreview();
      });
    },
  );

  // =====================================
  // 17. EVENT: SIMPAN
  // =====================================

  if (form) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();

      const item = getItem();

      if (!item) {
        showFeedback("Puskesmas tidak ditemukan.", "error");
        return;
      }

      const values = readForm();

      if (values.status === "tutup" && values.menunggu > 0) {
        showFeedback(
          "Saat status tutup, jumlah pasien menunggu harus 0.",
          "error",
        );

        return;
      }

      if (values.loket < 1) {
        showFeedback("Jumlah loket aktif minimal 1.", "error");

        return;
      }

      if (values.rataRata < 1) {
        showFeedback("Rata-rata layanan minimal 1 menit.", "error");

        return;
      }

      Store.updatePuskesmas(item.id, {
        menunggu: values.menunggu,
        dilayani: values.dilayani,
        selesai: values.selesai,
        loket: values.loket,
        rataRata: values.rataRata,
        status: values.status,
      });

      addLogEntry(item, values);

      state = Store.getState();

      isDirty = false;

      populateSelect();
      renderStats();
      renderLog();
      loadForm();

      showFeedback(
        "Data antrean " + item.nama + " berhasil disimpan dan disiarkan.",
        "success",
      );
    });
  }

  // =====================================
  // 18. EVENT: MUAT ULANG
  // =====================================

  if (reloadButton) {
    reloadButton.addEventListener("click", function () {
      resolveCurrentId();

      loadForm();

      renderStats();

      showFeedback("Form dimuat ulang dari data tersimpan.", "success");
    });
  }

  // =====================================
  // 19. EVENT: BERSIHKAN LOG
  // =====================================

  if (clearLogButton) {
    clearLogButton.addEventListener("click", function () {
      writeLog([]);

      renderLog();
    });
  }

  // =====================================
  // 20. SINKRONISASI REALTIME
  // =====================================

  Store.subscribe(function (nextState) {
    state = nextState;

    const previousId = currentId;

    resolveCurrentId();

    populateSelect();
    renderStats();

    if (previousId === currentId) {
      if (!isDirty) {
        loadForm();
      } else {
        updatePreview();
      }
    }

    renderLog();
  });

  // Perbarui label waktu relatif
  setInterval(function () {
    renderStats();

    if (!isDirty && previewUpdated) {
      const item = getItem();

      if (item) {
        previewUpdated.textContent = Store.relativeTime(item.updatedAt);
      }
    }
  }, 10000);

  // =====================================
  // 21. DROPDOWN PROFIL
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
  // 22. TOMBOL KEMBALI & ESCAPE
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
  // 23. INISIALISASI
  // =====================================

  resolveCurrentId();

  populateSelect();
  loadForm();
  renderStats();
  renderLog();

  console.log("RANAHCARE Panel Admin Antrean berhasil dijalankan.");
});
