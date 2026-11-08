// ===================================
// PROFILE DROPDOWN
// ===================================

const profileButton = document.getElementById("profileButton");
const profileDropdown = document.getElementById("profileDropdown");

profileButton.addEventListener("click", function (event) {
  event.stopPropagation();

  profileDropdown.classList.toggle("show");
});

document.addEventListener("click", function (event) {
  if (
    !profileButton.contains(event.target) &&
    !profileDropdown.contains(event.target)
  ) {
    profileDropdown.classList.remove("show");
  }
});

// ===================================
// CONTACT FORM
// ===================================

const contactForm = document.getElementById("contactForm");
const formMessage = document.getElementById("formMessage");

contactForm.addEventListener("submit", function (event) {
  event.preventDefault();

  const nama = document.getElementById("nama").value.trim();
  const email = document.getElementById("email").value.trim();
  const kategori = document.getElementById("kategori").value;
  const subjek = document.getElementById("subjek").value.trim();
  const pesan = document.getElementById("pesan").value.trim();

  // Validasi input

  if (
    nama === "" ||
    email === "" ||
    kategori === "" ||
    subjek === "" ||
    pesan === ""
  ) {
    showMessage("Mohon lengkapi semua kolom formulir.", "error");

    return;
  }

  // Validasi email sederhana

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(email)) {
    showMessage("Format alamat email tidak valid.", "error");

    return;
  }

  // Simulasi pengiriman pesan

  const submitButton = contactForm.querySelector(".submit-button");

  submitButton.disabled = true;
  submitButton.querySelector("span:first-child").textContent = "Memproses...";

  setTimeout(function () {
    showMessage(
      "Terima kasih, " +
        nama +
        "! Formulir berhasil divalidasi. Fitur pengiriman pesan akan aktif setelah backend terhubung.",
      "success",
    );

    contactForm.reset();

    submitButton.disabled = false;
    submitButton.querySelector("span:first-child").textContent = "Kirim Pesan";
  }, 1000);
});

// ===================================
// MESSAGE NOTIFICATION
// ===================================

function showMessage(message, type) {
  formMessage.textContent = message;

  formMessage.className = "form-message " + type;
}

// ===================================
// FAQ ACCORDION
// ===================================

const faqItems = document.querySelectorAll(".faq-item");

faqItems.forEach(function (item) {
  const question = item.querySelector(".faq-question");
  const answer = item.querySelector(".faq-answer");

  question.addEventListener("click", function () {
    const isOpen = item.classList.contains("open");

    // Tutup semua FAQ

    faqItems.forEach(function (otherItem) {
      otherItem.classList.remove("open");

      otherItem.querySelector(".faq-answer").style.maxHeight = null;
    });

    // Buka FAQ yang diklik

    if (!isOpen) {
      item.classList.add("open");

      answer.style.maxHeight = answer.scrollHeight + "px";
    }
  });
});
