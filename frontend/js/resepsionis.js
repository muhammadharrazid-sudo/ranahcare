/* =====================================================
   RANAHCARE - RESEPSIONIS JAVASCRIPT
   Chat AI dengan efek mengetik (streaming)
==================================================== */

document.addEventListener("DOMContentLoaded", function () {
  const chatForm = document.getElementById("chatForm");
  const messageInput = document.getElementById("messageInput");
  const chatBody = document.getElementById("chatBody");
  const inputWrapper = document.querySelector(".input-wrapper");
  const sendButton = document.querySelector(".send-button");
  const voiceButton = document.getElementById("voiceInput");
  const aiConsent = document.getElementById("aiConsent");

  const quickButtons = document.querySelectorAll(".quick-btn");

  const chatStatus = document.getElementById("chatStatus");
  const chatStatusText = document.getElementById("chatStatusText");

  const mobileMenu = document.getElementById("mobileMenu");
  const navMenu = document.querySelector(".nav-menu");

  let isResponding = false;
  let conversationId = localStorage.getItem("rc_conversation_id");

  if (!conversationId) {
    conversationId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : "rc-" + Date.now() + "-" + Math.random().toString(16).slice(2);
    localStorage.setItem("rc_conversation_id", conversationId);
  }

  /* =================================================
       1. TIME FORMAT
    ================================================= */

  function getCurrentTime() {
    return new Intl.DateTimeFormat("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date());
  }

  /* =================================================
       2. SCROLL CHAT
    ================================================= */

  function scrollToBottom(smooth) {
    chatBody.scrollTo({
      top: chatBody.scrollHeight,
      behavior: smooth === false ? "auto" : "smooth",
    });
  }

  /* =================================================
       3. CREATE MESSAGE ELEMENT
    ================================================= */

  function createMessageRow(sender) {
    const messageRow = document.createElement("div");

    messageRow.classList.add(
      "message-row",
      sender === "user" ? "user-message" : "bot-message",
    );

    const avatar = document.createElement("div");

    avatar.className = "message-avatar";
    avatar.textContent = sender === "user" ? "YA" : "RC";

    const content = document.createElement("div");

    content.className = "message-content";

    const bubble = document.createElement("div");

    bubble.className = "message-bubble";

    const paragraph = document.createElement("p");

    // Gunakan textContent agar pesan pengguna tidak dieksekusi sebagai HTML.
    paragraph.textContent = "";

    bubble.appendChild(paragraph);

    if (sender === "bot" && "speechSynthesis" in window) {
      const readButton = document.createElement("button");
      readButton.className = "voice-read";
      readButton.type = "button";
      readButton.textContent = "Dengarkan balasan";
      readButton.addEventListener("click", function () {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(paragraph.textContent);
        utterance.lang = "id-ID";
        window.speechSynthesis.speak(utterance);
      });
      bubble.appendChild(readButton);
    }

    const time = document.createElement("span");

    time.className = "message-time";
    time.textContent = getCurrentTime();

    content.appendChild(bubble);
    content.appendChild(time);

    messageRow.appendChild(avatar);
    messageRow.appendChild(content);

    chatBody.appendChild(messageRow);

    return { bubble: bubble, paragraph: paragraph, time: time };
  }

  /* =================================================
       4. ADD MESSAGE + STREAMING EFFECT
    ================================================= */

  function addMessage(message, sender, options) {
    const elements = createMessageRow(sender);
    const shouldStream = options && options.stream;

    if (shouldStream) {
      streamMessage(elements, message, options.action);
    } else {
      elements.paragraph.textContent = message;
      scrollToBottom();
    }
  }

  function streamMessage(elements, text, action) {
    const paragraph = elements.paragraph;
    const bubble = elements.bubble;

    let index = 0;

    bubble.classList.add("streaming");

    const timer = setInterval(function () {
      index += 1 + Math.floor(Math.random() * 2);

      paragraph.textContent = text.slice(0, index);

      // Saat streaming, gunakan scroll instan agar tidak terasa berat.
      chatBody.scrollTop = chatBody.scrollHeight;

      if (index >= text.length) {
        clearInterval(timer);

        paragraph.textContent = text;
        bubble.classList.remove("streaming");
        elements.time.textContent = getCurrentTime();

        addActionLink(bubble, action);
        isResponding = false;
        setHeaderStatus(false);
        setQuickButtonsDisabled(false);
        sendButton.disabled = false;

        scrollToBottom();
      }
    }, 16);
  }

  /* =================================================
       5. HEADER STATUS
    ================================================= */

  function setHeaderStatus(isBusy) {
    if (!chatStatus || !chatStatusText) {
      return;
    }

    chatStatus.classList.toggle("is-busy", isBusy);
    chatStatusText.textContent = isBusy ? "Mengetik…" : "Aktif";
  }

  /* =================================================
       6. TYPING INDICATOR
    ================================================= */

  function showTyping() {
    const typingRow = document.createElement("div");

    typingRow.className = "message-row bot-message";
    typingRow.id = "typingIndicator";

    const avatar = document.createElement("div");

    avatar.className = "message-avatar";
    avatar.textContent = "RC";

    const typing = document.createElement("div");

    typing.className = "typing-indicator";

    const dots = document.createElement("div");

    dots.className = "typing-dots";

    for (let i = 0; i < 3; i++) {
      const dot = document.createElement("span");

      dots.appendChild(dot);
    }

    const label = document.createElement("span");

    label.className = "typing-label";
    label.textContent = "Asisten sedang mengetik";

    typing.appendChild(dots);
    typing.appendChild(label);

    typingRow.appendChild(avatar);
    typingRow.appendChild(typing);

    chatBody.appendChild(typingRow);

    scrollToBottom();
  }

  function removeTyping() {
    const typing = document.getElementById("typingIndicator");

    if (typing) {
      typing.remove();
    }
  }

  /* =================================================
       8. INPUT HELPERS
    ================================================= */

  function resizeInput() {
    messageInput.style.height = "auto";
    messageInput.style.height =
      Math.min(messageInput.scrollHeight, 120) + "px";
  }

  function resetInput() {
    messageInput.value = "";
    messageInput.style.height = "auto";
    inputWrapper.classList.remove("has-value");
  }

  function setQuickButtonsDisabled(disabled) {
    quickButtons.forEach(function (button) {
      button.disabled = disabled;
    });
  }

  function addActionLink(bubble, action) {
    const destinations = {
      reservasi: {
        href: "reservasi.html",
        label: "Lanjut ke reservasi",
      },
    };
    const destination = destinations[action];

    if (!destination) return;

    const link = document.createElement("a");
    link.className = "chat-action";
    link.href = destination.href;
    link.textContent = destination.label + " →";
    bubble.appendChild(link);
  }

  async function requestAssistantReply(message) {
    const response = await fetch(AI_SERVICE_BASE_URL + "/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversation_id: conversationId,
        message: message,
        allow_ai: Boolean(aiConsent && aiConsent.checked),
      }),
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.detail || "Layanan AI gagal memproses pesan.");
    }

    if (result.context && result.context.symptoms.length) {
      localStorage.setItem(
        "rc_gejala",
        JSON.stringify({
          gejala: result.context.symptoms,
          waktu: new Date().toISOString(),
          sumber: "Triase awal resepsionis",
        }),
      );
    }

    return result;
  }

  /* =================================================
       9. SEND MESSAGE
    ================================================= */

  async function sendMessage(message) {
    const cleanMessage = message.trim();

    if (cleanMessage === "" || isResponding) {
      return;
    }

    isResponding = true;

    // Tampilkan pesan pengguna.
    addMessage(cleanMessage, "user");

    // Kosongkan input.
    resetInput();

    // Status & indikator mengetik.
    setHeaderStatus(true);
    setQuickButtonsDisabled(true);
    sendButton.disabled = true;
    showTyping();

    try {
      const result = await requestAssistantReply(cleanMessage);
      removeTyping();
      addMessage(result.reply, "bot", {
        stream: true,
        action: result.action,
      });
    } catch (error) {
      removeTyping();
      console.error("Permintaan layanan AI gagal:", error);
      addMessage(
        "Maaf, layanan AI belum dapat dihubungi. Periksa apakah ai_service sedang berjalan, lalu coba lagi. Untuk keadaan darurat, segera cari pertolongan langsung.",
        "bot",
      );
      isResponding = false;
      setHeaderStatus(false);
      setQuickButtonsDisabled(false);
      sendButton.disabled = false;
    }
  }

  /* =================================================
       10. FORM SUBMIT + RIPPLE
    ================================================= */

  function createRipple(event) {
    const rect = sendButton.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);

    const ripple = document.createElement("span");

    ripple.className = "ripple";
    ripple.style.width = size + "px";
    ripple.style.height = size + "px";

    const hasPointer =
      typeof event.clientX === "number" && typeof event.clientY === "number";

    ripple.style.left =
      (hasPointer ? event.clientX - rect.left : rect.width / 2) -
      size / 2 +
      "px";
    ripple.style.top =
      (hasPointer ? event.clientY - rect.top : rect.height / 2) -
      size / 2 +
      "px";

    sendButton.appendChild(ripple);

    setTimeout(function () {
      ripple.remove();
    }, 650);
  }

  sendButton.addEventListener("click", function (event) {
    createRipple(event);
  });

  chatForm.addEventListener("submit", function (event) {
    event.preventDefault();

    sendMessage(messageInput.value);

    messageInput.focus();
  });

  // Enter untuk kirim, Shift + Enter untuk baris baru.
  messageInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      chatForm.requestSubmit();
    }
  });

  messageInput.addEventListener("input", function () {
    resizeInput();

    inputWrapper.classList.toggle(
      "has-value",
      messageInput.value.trim() !== "",
    );
  });

  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    voiceButton.hidden = true;
  } else {
    const recognition = new SpeechRecognition();
    let voiceConsentGranted = false;
    let isVoiceListening = false;

    recognition.lang = "id-ID";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = function () {
      isVoiceListening = true;
      voiceButton.setAttribute("aria-pressed", "true");
    };
    recognition.onresult = function (event) {
      messageInput.value = event.results[0][0].transcript;
      resizeInput();
      inputWrapper.classList.add("has-value");
      chatForm.requestSubmit();
    };
    recognition.onerror = function (event) {
      console.error("Input suara gagal:", event.error);
      voiceButton.setAttribute("aria-pressed", "false");
      messageInput.placeholder = "Input suara gagal; silakan ketik pesan.";
    };
    recognition.onend = function () {
      isVoiceListening = false;
      voiceButton.setAttribute("aria-pressed", "false");
    };
    voiceButton.addEventListener("click", function () {
      if (isVoiceListening) {
        recognition.stop();
        return;
      }

      if (!voiceConsentGranted) {
        voiceConsentGranted = window.confirm(
          "Pengenalan suara Bahasa Indonesia dapat mengirim audio ke penyedia browser. Lanjutkan?",
        );
        if (!voiceConsentGranted) return;
      }

      try {
        voiceButton.setAttribute("aria-pressed", "true");
        recognition.start();
      } catch (error) {
        isVoiceListening = false;
        voiceButton.setAttribute("aria-pressed", "false");
        console.error("Input suara tidak dapat dimulai:", error);
      }
    });
  }

  /* =================================================
       11. QUICK QUESTIONS
    ================================================= */

  quickButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      sendMessage(button.dataset.message);
    });
  });

  /* =================================================
       12. PLACEHOLDER ROTATION
    ================================================= */

  const placeholders = [
    "Tanya apa saja ke asisten AI...",
    "Contoh: bagaimana cara membuat reservasi?",
    "Contoh: gejala apa yang perlu diperiksa?",
    "Contoh: layanan apa saja yang tersedia?",
  ];

  let placeholderIndex = 0;

  setInterval(function () {
    if (messageInput.value.trim() !== "" || isResponding) {
      return;
    }

    placeholderIndex = (placeholderIndex + 1) % placeholders.length;
    messageInput.placeholder = placeholders[placeholderIndex];
  }, 4500);

  /* =================================================
       13. MOBILE NAVIGATION
    ================================================= */

  mobileMenu.addEventListener("click", function () {
    const isOpen = navMenu.classList.toggle("open");

    mobileMenu.setAttribute("aria-expanded", isOpen);
  });

  // Tutup menu setelah memilih navigasi.
  document.querySelectorAll(".nav-link").forEach(function (link) {
    link.addEventListener("click", function () {
      navMenu.classList.remove("open");

      mobileMenu.setAttribute("aria-expanded", "false");
    });
  });

  // Tutup menu jika klik di luar navbar.
  document.addEventListener("click", function (event) {
    const clickedInsideMenu = navMenu.contains(event.target);

    const clickedMenuButton = mobileMenu.contains(event.target);

    if (!clickedInsideMenu && !clickedMenuButton) {
      navMenu.classList.remove("open");

      mobileMenu.setAttribute("aria-expanded", "false");
    }
  });

  /* =================================================
       14. INITIAL STATE
    ================================================= */

  resizeInput();
  mobileMenu.setAttribute("aria-expanded", "false");
});
