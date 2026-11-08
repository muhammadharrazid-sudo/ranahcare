/* =====================================
   RANAHCARE - APP JAVASCRIPT
===================================== */

// Ambil elemen
const sidebar = document.getElementById("sidebar");
const menuToggle = document.getElementById("menuToggle");
const closeSidebar = document.getElementById("closeSidebar");
const sidebarOverlay = document.getElementById("sidebarOverlay");

// =====================================
// BUKA SIDEBAR
// =====================================

function openSidebar() {
  sidebar.classList.add("open");
  sidebarOverlay.classList.add("show");

  menuToggle.setAttribute("aria-expanded", "true");
}

// =====================================
// TUTUP SIDEBAR
// =====================================

function hideSidebar() {
  sidebar.classList.remove("open");
  sidebarOverlay.classList.remove("show");

  menuToggle.setAttribute("aria-expanded", "false");
}

// Klik hamburger
menuToggle.addEventListener("click", function () {
  if (sidebar.classList.contains("open")) {
    hideSidebar();
  } else {
    openSidebar();
  }
});

// Klik tombol kembali
closeSidebar.addEventListener("click", hideSidebar);

// Klik area luar sidebar
sidebarOverlay.addEventListener("click", hideSidebar);

// Tekan Escape
document.addEventListener("keydown", function (event) {
  if (event.key === "Escape") {
    hideSidebar();
  }
});

// =====================================
// TANGGAL NAVBAR
// =====================================

const currentDate = document.getElementById("currentDate");

currentDate.textContent = new Date().toLocaleDateString("id-ID", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

// =====================================
// NAVIGASI HALAMAN
// =====================================

const menuLinks = document.querySelectorAll(".menu-link");

const dashboardContent = document.getElementById("dashboardContent");
const placeholderContent = document.getElementById("placeholderContent");

const pageTitle = document.getElementById("pageTitle");
const placeholderTitle = document.getElementById("placeholderTitle");
const placeholderDescription = document.getElementById(
  "placeholderDescription",
);

const pageInformation = {
  dashboard: {
    title: "Dashboard",
    description: "Ringkasan informasi sistem RANAHCARE.",
  },

  resepsionis: {
    title: "Resepsionis",
    description:
      "Halaman pengelolaan informasi dan pelayanan pasien sedang disiapkan.",
  },

  "ranah-ai": {
    title: "Ranah AI",
    description:
      "Asisten informasi kesehatan berbasis kecerdasan buatan sedang disiapkan.",
  },

  developer: {
    title: "Developer",
    description: "Informasi tim pengembang RANAHCARE sedang disiapkan.",
  },
};

// Fungsi menampilkan halaman
function showPage(page) {
  const information = pageInformation[page];

  if (!information) return;

  // Ubah judul
  pageTitle.textContent = information.title;

  // Atur menu aktif
  menuLinks.forEach(function (link) {
    link.classList.remove("active");

    if (link.dataset.page === page) {
      link.classList.add("active");
    }
  });

  // Tampilkan konten
  if (page === "dashboard") {
    dashboardContent.hidden = false;
    placeholderContent.hidden = true;
  } else {
    dashboardContent.hidden = true;
    placeholderContent.hidden = false;

    placeholderTitle.textContent = information.title;

    placeholderDescription.textContent = information.description;
  }

  // Tutup sidebar setelah memilih menu
  hideSidebar();
}

// Klik menu sidebar
menuLinks.forEach(function (link) {
  link.addEventListener("click", function (event) {
    event.preventDefault();

    showPage(this.dataset.page);
  });
});

// =====================================
// AKSES CEPAT
// =====================================

document.querySelectorAll("[data-page]").forEach(function (button) {
  if (button.classList.contains("menu-link")) return;

  button.addEventListener("click", function () {
    showPage(this.dataset.page);
  });
});

// =====================================
// KEMBALI KE DASHBOARD
// =====================================

document.getElementById("backDashboard").addEventListener("click", function () {
  showPage("dashboard");
});

// =====================================
// LOGOUT
// =====================================

document.getElementById("logoutButton").addEventListener("click", function () {
  const confirmLogout = confirm(
    "Apakah kamu yakin ingin keluar dari RANAHCARE?",
  );

  if (confirmLogout) {
    window.location.href = "../index.html";
  }
});

// =====================================
// NOTIFIKASI DEMO
// =====================================

document
  .querySelector(".notification-button")
  .addEventListener("click", function () {
    alert("Belum ada notifikasi baru.");
  });

console.log("RANAHCARE Dashboard berhasil dimuat!");
