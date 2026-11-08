/* =========================================
   RANAHCARE - RIWAYAT.JS

   Fitur:
   1. Statistik aktivitas otomatis
   2. Pencarian riwayat
   3. Filter kategori
   4. Modal detail riwayat
   5. Dropdown profil
   6. Tombol kembali & tombol Escape
========================================= */

document.addEventListener("DOMContentLoaded", function () {
  // =====================================
  // 1. ELEMENT HTML
  // =====================================

  const searchInput = document.getElementById("searchInput");

  const historyItems = document.querySelectorAll(".history-item");

  const filterChips = document.querySelectorAll(".filter-chip");

  const resultCount = document.querySelector(".result-count");

  const emptyState = document.querySelector(".empty-state");

  const modalOverlay = document.querySelector(".modal-overlay");

  const closeModalButton = document.querySelector(".close-modal");

  const closeModalButtons = document.querySelectorAll(".close-modal");

  const modalCategory = document.querySelector(".modal-category");

  const modalTitle = document.getElementById("modalTitle");

  const modalDate = document.getElementById("modalDate");

  const modalTime = document.getElementById("modalTime");

  const modalLocation = document.getElementById("modalLocation");

  const modalStatus = document.getElementById("modalStatus");

  const modalDescription = document.getElementById("modalDescription");

  const profileButton = document.querySelector(".profile-button");

  const profileDropdown = document.querySelector(".profile-dropdown");

  const backButton = document.querySelector(".back-button");

  const statTotal = document.getElementById("statTotal");

  const statConsultation = document.getElementById("statConsultation");

  const statReservation = document.getElementById("statReservation");

  const statEmergency = document.getElementById("statEmergency");

  // =====================================
  // 2. VARIABEL FILTER
  // =====================================

  let activeCategory = "semua";

  // =====================================
  // 3. STATISTIK AKTIVITAS
  // =====================================

  function countByCategory(category) {
    let total = 0;

    historyItems.forEach(function (item) {
      if (item.dataset.category === category) {
        total++;
      }
    });

    return total;
  }

  function updateStatistics() {
    if (statTotal) {
      statTotal.textContent = historyItems.length;
    }

    if (statConsultation) {
      statConsultation.textContent = countByCategory("konsultasi");
    }

    if (statReservation) {
      statReservation.textContent = countByCategory("reservasi");
    }

    if (statEmergency) {
      statEmergency.textContent = countByCategory("darurat");
    }
  }

  // =====================================
  // 4. PENCARIAN DAN FILTER
  // =====================================

  function filterHistory() {
    const keyword = searchInput
      ? searchInput.value.toLowerCase().trim()
      : "";

    let visibleCount = 0;

    historyItems.forEach(function (item) {
      const itemText = item.textContent.toLowerCase();

      const itemCategory = item.dataset.category;

      const matchesSearch = itemText.includes(keyword);

      const matchesCategory =
        activeCategory === "semua" || itemCategory === activeCategory;

      if (matchesSearch && matchesCategory) {
        item.hidden = false;
        visibleCount++;
      } else {
        item.hidden = true;
      }
    });

    // Perbarui jumlah hasil
    if (resultCount) {
      resultCount.textContent = visibleCount + " aktivitas ditemukan";
    }

    // Tampilkan empty state bila kosong
    if (emptyState) {
      emptyState.hidden = visibleCount !== 0;
    }
  }

  // =====================================
  // 5. EVENT PENCARIAN
  // =====================================

  if (searchInput) {
    searchInput.addEventListener("input", function () {
      filterHistory();
    });
  }

  // =====================================
  // 6. EVENT FILTER KATEGORI
  // =====================================

  filterChips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      // Hapus active dari semua chip
      filterChips.forEach(function (item) {
        item.classList.remove("active");
      });

      // Tandai chip yang dipilih
      this.classList.add("active");

      // Ambil kategori
      activeCategory = this.dataset.category || "semua";

      // Jalankan filter
      filterHistory();
    });
  });

  // =====================================
  // 7. MODAL DETAIL RIWAYAT
  // =====================================

  function openModal(item) {
    if (!modalOverlay) return;

    const type = item.dataset.type || "Riwayat";
    const title = item.dataset.title || "Detail Riwayat";
    const date = item.dataset.date || "—";
    const time = item.dataset.time || "—";
    const location = item.dataset.location || "—";
    const status = item.dataset.status || "—";
    const description =
      item.dataset.description || "Informasi riwayat belum tersedia.";

    if (modalCategory) {
      modalCategory.textContent = type;
    }

    if (modalTitle) {
      modalTitle.textContent = title;
    }

    if (modalDate) {
      modalDate.textContent = date;
    }

    if (modalTime) {
      modalTime.textContent = time;
    }

    if (modalLocation) {
      modalLocation.textContent = location;
    }

    if (modalStatus) {
      modalStatus.textContent = status;
    }

    if (modalDescription) {
      modalDescription.textContent = description;
    }

    // Tampilkan modal
    modalOverlay.classList.add("show");

    document.body.style.overflow = "hidden";

    if (closeModalButton) {
      closeModalButton.focus();
    }
  }

  // =====================================
  // 8. TUTUP MODAL
  // =====================================

  function closeModal() {
    if (!modalOverlay) return;

    modalOverlay.classList.remove("show");

    document.body.style.overflow = "";
  }

  // =====================================
  // 9. EVENT TOMBOL DETAIL
  // =====================================

  const detailButtons = document.querySelectorAll(
    ".history-item .detail-button",
  );

  detailButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      const item = this.closest(".history-item");

      if (item) {
        openModal(item);
      }
    });
  });

  // =====================================
  // 10. TOMBOL TUTUP MODAL
  // =====================================

  closeModalButtons.forEach(function (button) {
    button.addEventListener("click", closeModal);
  });

  // Klik di luar modal
  if (modalOverlay) {
    modalOverlay.addEventListener("click", function (event) {
      if (event.target === modalOverlay) {
        closeModal();
      }
    });
  }

  // =====================================
  // 11. DROPDOWN PROFIL
  // =====================================

  function closeProfileDropdown() {
    if (!profileDropdown || !profileButton) return;

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
  // 12. TOMBOL KEMBALI
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

  // =====================================
  // 13. TOMBOL ESCAPE
  // =====================================

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      closeModal();
      closeProfileDropdown();
    }
  });

  // =====================================
  // 14. ANIMASI KARTU
  // =====================================

  historyItems.forEach(function (item, index) {
    item.style.animationDelay = index * 0.07 + "s";
  });

  // =====================================
  // 15. INISIALISASI
  // =====================================

  updateStatistics();
  filterHistory();

  console.log("RANAHCARE Riwayat berhasil dijalankan.");
});
