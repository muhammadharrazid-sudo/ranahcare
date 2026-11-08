/* =========================================
   RANAHCARE DASHBOARD JAVASCRIPT
========================================= */

document.addEventListener("DOMContentLoaded", function () {
  /* =====================================
       ELEMENT
    ===================================== */

  const searchForm = document.getElementById("searchForm");
  const searchInput = document.getElementById("searchInput");
  const searchFeedback = document.getElementById("searchFeedback");

  const serviceCards = document.querySelectorAll(".service-card");

  const menuDropdown = document.querySelector(".menu-dropdown");

  /* =====================================
       SEARCH SERVICES
    ===================================== */

  function searchServices() {
    const keyword = searchInput.value.trim().toLowerCase();

    let totalFound = 0;

    serviceCards.forEach(function (card) {
      const cardTitle = card.querySelector("h3");
      const cardDescription = card.querySelector("p");

      const title = cardTitle ? cardTitle.textContent.toLowerCase() : "";

      const description = cardDescription
        ? cardDescription.textContent.toLowerCase()
        : "";

      const isMatch = title.includes(keyword) || description.includes(keyword);

      if (keyword === "" || isMatch) {
        card.classList.remove("search-hidden");

        totalFound++;
      } else {
        card.classList.add("search-hidden");
      }
    });

    /* SEARCH FEEDBACK */

    if (keyword === "") {
      searchFeedback.textContent = "";
    } else if (totalFound > 0) {
      searchFeedback.textContent =
        totalFound +
        ' layanan ditemukan untuk "' +
        searchInput.value.trim() +
        '".';
    } else {
      searchFeedback.textContent =
        'Maaf, layanan "' + searchInput.value.trim() + '" tidak ditemukan.';
    }
  }

  /* =====================================
       SEARCH FORM SUBMIT
    ===================================== */

  if (searchForm) {
    searchForm.addEventListener("submit", function (event) {
      event.preventDefault();

      searchServices();

      // Arahkan perhatian ke daftar layanan
      const servicesSection = document.querySelector(".services-section");

      if (servicesSection && searchInput.value.trim() !== "") {
        servicesSection.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    });
  }

  /* =====================================
       LIVE SEARCH
    ===================================== */

  if (searchInput) {
    searchInput.addEventListener("input", function () {
      searchServices();
    });
  }

  /* =====================================
       CLOSE DROPDOWN WHEN CLICKING OUTSIDE
    ===================================== */

  document.addEventListener("click", function (event) {
    if (
      menuDropdown &&
      menuDropdown.open &&
      !menuDropdown.contains(event.target)
    ) {
      menuDropdown.open = false;
    }
  });

  /* =====================================
       CLOSE DROPDOWN WITH ESCAPE
    ===================================== */

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && menuDropdown) {
      menuDropdown.open = false;
    }
  });

  /* =====================================
       PREVENT EMPTY SEARCH FEEDBACK
    ===================================== */

  if (searchInput && searchFeedback) {
    searchInput.addEventListener("search", function () {
      if (searchInput.value.trim() === "") {
        serviceCards.forEach(function (card) {
          card.classList.remove("search-hidden");
        });

        searchFeedback.textContent = "";
      }
    });
  }
});
