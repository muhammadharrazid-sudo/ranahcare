/* =========================================
   RANAHCARE - PELAYANAN.JS
   Fitur:
   1. Pencarian fasilitas kesehatan
   2. Filter kategori fasilitas
   3. Modal detail fasilitas
   4. Dropdown profil
   5. Tombol kembali
========================================= */

document.addEventListener("DOMContentLoaded", function () {
  // =====================================
  // 1. ELEMENT HTML
  // =====================================

  const searchInput = document.getElementById("searchInput");

  const serviceCards = document.querySelectorAll(".service-card");

  const categoryCards = document.querySelectorAll(".category-card");

  const emptyState = document.querySelector(".empty-state");

  const resultCount = document.querySelector(".result-count");

  const modalOverlay = document.querySelector(".modal-overlay");

  const closeModalButton = document.querySelector(".close-modal");

  const profileButton = document.querySelector(".profile-button");

  const profileDropdown = document.querySelector(".profile-dropdown");

  const backButton = document.querySelector(".back-button");

  // =====================================
  // 2. VARIABEL FILTER
  // =====================================

  let activeCategory = "semua";

  // =====================================
  // 3. FUNGSI PENCARIAN DAN FILTER
  // =====================================

  function filterFacilities() {
    const searchValue = searchInput
      ? searchInput.value.toLowerCase().trim()
      : "";

    let visibleCount = 0;

    serviceCards.forEach(function (card) {
      // Mengambil seluruh teks dalam kartu
      const cardText = card.textContent.toLowerCase();

      // Mengambil kategori berdasarkan class
      const cardCategory = getCardCategory(card);

      // Mengecek pencarian
      const matchesSearch = cardText.includes(searchValue);

      // Mengecek kategori
      const matchesCategory =
        activeCategory === "semua" || cardCategory === activeCategory;

      // Menentukan apakah kartu ditampilkan
      if (matchesSearch && matchesCategory) {
        card.hidden = false;
        visibleCount++;
      } else {
        card.hidden = true;
      }
    });

    // Memperbarui jumlah fasilitas
    if (resultCount) {
      resultCount.textContent = visibleCount + " fasilitas ditemukan";
    }

    // Menampilkan pesan jika tidak ada hasil
    if (emptyState) {
      emptyState.hidden = visibleCount !== 0;
    }
  }

  // =====================================
  // 4. MENGAMBIL KATEGORI KARTU
  // =====================================

  function getCardCategory(card) {
    if (card.classList.contains("hospital")) {
      return "rumah-sakit";
    }

    if (card.classList.contains("puskesmas")) {
      return "puskesmas";
    }

    if (card.classList.contains("clinic")) {
      return "klinik";
    }

    if (card.classList.contains("pharmacy")) {
      return "apotek";
    }

    // Alternatif: membaca atribut data-category
    if (card.dataset.category) {
      return card.dataset.category;
    }

    return "lainnya";
  }

  // =====================================
  // 5. EVENT PENCARIAN
  // =====================================

  if (searchInput) {
    searchInput.addEventListener("input", function () {
      filterFacilities();
    });
  }

  // =====================================
  // 6. EVENT KATEGORI
  // =====================================

  categoryCards.forEach(function (category) {
    category.addEventListener("click", function () {
      // Menghapus class active dari semua kategori
      categoryCards.forEach(function (item) {
        item.classList.remove("active");
      });

      // Menambahkan active pada kategori terpilih
      this.classList.add("active");

      // Mengambil kategori dari atribut data-category
      const selectedCategory = this.dataset.category;

      if (selectedCategory) {
        activeCategory = selectedCategory;
      } else {
        // Alternatif berdasarkan teks kategori
        const categoryText = this.textContent.toLowerCase();

        if (categoryText.includes("rumah sakit")) {
          activeCategory = "rumah-sakit";
        } else if (categoryText.includes("puskesmas")) {
          activeCategory = "puskesmas";
        } else if (categoryText.includes("klinik")) {
          activeCategory = "klinik";
        } else if (categoryText.includes("apotek")) {
          activeCategory = "apotek";
        } else {
          activeCategory = "semua";
        }
      }

      // Jalankan filter
      filterFacilities();
    });
  });

  // =====================================
  // 7. MODAL DETAIL FASILITAS
  // =====================================

  const modalCategory = document.querySelector(".modal-category");

  const modalNumber = document.getElementById("modalNumber");

  const modalCallButton = document.getElementById("modalCallButton");

  const modalDescription = document.querySelector(".modal-description");

  function openModal(card) {
    if (!modalOverlay) return;

    // Mengambil informasi dari kartu
    const facilityTitle = card.querySelector("h3");

    const facilityPhone = card.dataset.phone || "#";

    const facilityDescription = card.querySelector(".description");

    // Mengisi informasi modal
    if (modalCategory) {
      modalCategory.textContent = facilityTitle
        ? facilityTitle.textContent.trim()
        : "Fasilitas Kesehatan";
    }

    if (modalNumber) {
      modalNumber.textContent = facilityPhone;
    }

    if (modalCallButton) {
      modalCallButton.href = facilityPhone;
    }

    if (modalDescription) {
      modalDescription.textContent = facilityDescription
        ? facilityDescription.textContent.trim()
        : "Informasi fasilitas belum tersedia.";
    }

    // Menampilkan modal
    modalOverlay.classList.add("show");

    document.body.style.overflow = "hidden";

    // Fokus ke tombol tutup
    if (closeModalButton) {
      closeModalButton.focus();
    }
  }

  function closeModal() {
    if (!modalOverlay) return;

    modalOverlay.classList.remove("show");

    document.body.style.overflow = "";
  }

  // Event tombol detail
  const detailButtons = document.querySelectorAll(".detail-button");

  detailButtons.forEach(function (button) {
    button.addEventListener("click", function (event) {
      event.preventDefault();

      const card = this.closest(".service-card");

      if (card) {
        openModal(card);
      }
    });
  });

  // Event tombol tutup modal
  if (closeModalButton) {
    closeModalButton.addEventListener("click", closeModal);
  }

  // Tutup modal ketika klik area luar
  if (modalOverlay) {
    modalOverlay.addEventListener("click", function (event) {
      if (event.target === modalOverlay) {
        closeModal();
      }
    });
  }

  // Tutup modal dengan tombol Escape
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      closeModal();

      closeProfileDropdown();
    }
  });

  // =====================================
  // 8. DROPDOWN PROFIL
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

    // Menutup dropdown jika klik di luar
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
  // 9. TOMBOL KEMBALI
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
  // 10. INISIALISASI HALAMAN
  // =====================================

  filterFacilities();

  // =====================================
  // 11. ANIMASI KARTU
  // =====================================

  serviceCards.forEach(function (card, index) {
    card.style.animationDelay = index * 0.08 + "s";
  });

  console.log("RANAHCARE Pelayanan berhasil dijalankan.");
});
