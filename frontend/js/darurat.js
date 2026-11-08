/* =========================================
   RANAHCARE - DARURAT.JS

   Fitur:
   1. Pencarian layanan darurat
   2. Filter kategori
   3. Modal detail layanan
   4. Dropdown profil
   5. Tombol Escape
========================================= */

document.addEventListener("DOMContentLoaded", function () {
  // =====================================
  // 1. ELEMENT HTML
  // =====================================

  const searchInput = document.getElementById("searchInput");

  const serviceCards = document.querySelectorAll(".service-card");

  const categoryCards = document.querySelectorAll(".category-card");

  const resultCount = document.querySelector(".result-count");

  const emptyState = document.querySelector(".empty-state");

  const modalOverlay = document.querySelector(".modal-overlay");

  const closeModalButton = document.querySelector(".close-modal");

  const modalTitle = document.querySelector(".modal-title");

  const modalCategory = document.querySelector(".modal-category");

  const modalDescription = document.querySelector(".modal-description");

  const modalNumber = document.querySelector(".modal-number strong");

  const modalCallButton = document.querySelector(".modal-call-button");

  const profileButton = document.querySelector(".profile-button");

  const profileDropdown = document.querySelector(".profile-dropdown");

  // =====================================
  // 2. FILTER CATEGORY
  // =====================================

  let activeCategory = "semua";

  // =====================================
  // 3. SEARCH DAN FILTER
  // =====================================

  function filterServices() {
    const keyword = searchInput ? searchInput.value.toLowerCase().trim() : "";

    let visibleCount = 0;

    serviceCards.forEach(function (card) {
      const cardText = card.textContent.toLowerCase();

      const cardCategory = card.dataset.category;

      const matchesSearch = cardText.includes(keyword);

      const matchesCategory =
        activeCategory === "semua" || cardCategory === activeCategory;

      if (matchesSearch && matchesCategory) {
        card.hidden = false;

        visibleCount++;
      } else {
        card.hidden = true;
      }
    });

    // Update jumlah layanan
    if (resultCount) {
      resultCount.textContent = visibleCount + " layanan ditemukan";
    }

    // Empty state
    if (emptyState) {
      emptyState.hidden = visibleCount !== 0;
    }
  }

  // =====================================
  // 4. EVENT SEARCH
  // =====================================

  if (searchInput) {
    searchInput.addEventListener("input", function () {
      filterServices();
    });
  }

  // =====================================
  // 5. EVENT CATEGORY
  // =====================================

  categoryCards.forEach(function (button) {
    button.addEventListener("click", function () {
      // Hapus active dari semua kategori
      categoryCards.forEach(function (item) {
        item.classList.remove("active");
      });

      // Tambahkan active ke kategori yang dipilih
      this.classList.add("active");

      // Ambil kategori
      activeCategory = this.dataset.category || "semua";

      // Jalankan filter
      filterServices();
    });
  });

  // =====================================
  // 6. MODAL DETAIL LAYANAN
  // =====================================

  function openModal(card) {
    if (!modalOverlay) return;

    const serviceName = card.querySelector("h3");

    const serviceDescription = card.querySelector(".service-description");

    const serviceNumber = card.querySelector(".service-number strong");

    const serviceStatus = card.querySelector(".service-status");

    const name = serviceName
      ? serviceName.textContent.trim()
      : "Layanan Darurat";

    const description = serviceDescription
      ? serviceDescription.textContent.trim()
      : "Informasi layanan belum tersedia.";

    const number = serviceNumber ? serviceNumber.textContent.trim() : "119";

    const category = serviceStatus
      ? serviceStatus.textContent.trim()
      : "Layanan Darurat";

    // Masukkan informasi ke modal
    if (modalTitle) {
      modalTitle.textContent = name;
    }

    if (modalDescription) {
      modalDescription.textContent = description;
    }

    if (modalCategory) {
      modalCategory.textContent = category;
    }

    if (modalNumber) {
      modalNumber.textContent = number;
    }

    if (modalCallButton) {
      modalCallButton.href = "tel:" + number;
    }

    // Tampilkan modal
    modalOverlay.classList.add("show");

    document.body.style.overflow = "hidden";

    if (closeModalButton) {
      closeModalButton.focus();
    }
  }

  // =====================================
  // 7. TUTUP MODAL
  // =====================================

  function closeModal() {
    if (!modalOverlay) return;

    modalOverlay.classList.remove("show");

    document.body.style.overflow = "";
  }

  // =====================================
  // 8. EVENT TOMBOL DETAIL
  // =====================================

  const detailButtons = document.querySelectorAll(
    ".service-card .detail-button",
  );

  detailButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      const card = this.closest(".service-card");

      if (card) {
        openModal(card);
      }
    });
  });

  // =====================================
  // 9. TOMBOL TUTUP MODAL
  // =====================================

  if (closeModalButton) {
    closeModalButton.addEventListener("click", closeModal);
  }

  // Klik area luar modal
  if (modalOverlay) {
    modalOverlay.addEventListener("click", function (event) {
      if (event.target === modalOverlay) {
        closeModal();
      }
    });
  }

  // =====================================
  // 10. DROPDOWN PROFIL
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

    // Klik di luar dropdown
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
  // 11. TOMBOL ESCAPE
  // =====================================

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      closeModal();

      closeProfileDropdown();
    }
  });

  // =====================================
  // 12. ANIMASI KARTU
  // =====================================

  serviceCards.forEach(function (card, index) {
    card.style.animationDelay = index * 0.08 + "s";
  });

  // =====================================
  // 13. INISIALISASI
  // =====================================

  filterServices();

  console.log("RANAHCARE Darurat berhasil dijalankan.");
});
