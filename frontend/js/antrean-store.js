/* =========================================
   RANAHCARE - ANTREAN STORE (SHARED)
   Lapisan data antrean realtime.

   Mekanisme realtime:
   1. localStorage sebagai sumber data
   2. BroadcastChannel untuk update instan antar-tab
   3. Event "storage" sebagai fallback
   4. Polling ringan sebagai pengaman

   Dipakai oleh:
   - antrean.js        (tampilan masyarakat)
   - admin-antrean.js  (panel admin)
========================================= */

(function (global) {
  "use strict";

  const KEY = "ranahcare_antrean_v1";
  const CHANNEL_NAME = "ranahcare-antrean";
  const CAPACITY = 30;
  const MAX_HISTORY = 16;
  const POLL_INTERVAL = 2000;

  /* =====================================
     DATA AWAL
  ===================================== */

  function seedHistory(base) {
    const result = [];
    const now = Date.now();

    for (let i = MAX_HISTORY - 1; i >= 0; i--) {
      const wave = Math.round(Math.sin(i / 2) * 3) + (i % 3);

      result.push({
        t: now - i * 60000,
        v: Math.max(0, base + wave - 2),
      });
    }

    result[result.length - 1].v = base;

    return result;
  }

  function buildSeed() {
    const now = Date.now();

    const list = [
      {
        id: "padang",
        nama: "Puskesmas Padang",
        alamat: "Jl. Sawahan No. 1, Padang",
        menunggu: 12,
        dilayani: 3,
        selesai: 48,
        loket: 3,
        rataRata: 8,
        status: "buka",
      },
      {
        id: "kuranji",
        nama: "Puskesmas Kuranji",
        alamat: "Jl. Raya Kuranji No. 24, Padang",
        menunggu: 7,
        dilayani: 2,
        selesai: 31,
        loket: 2,
        rataRata: 10,
        status: "buka",
      },
      {
        id: "lubuk-buaya",
        nama: "Puskesmas Lubuk Buaya",
        alamat: "Jl. Adinegoro No. 8, Padang",
        menunggu: 21,
        dilayani: 4,
        selesai: 67,
        loket: 4,
        rataRata: 7,
        status: "buka",
      },
      {
        id: "andalas",
        nama: "Puskesmas Andalas",
        alamat: "Jl. Andalas No. 15, Padang",
        menunggu: 0,
        dilayani: 0,
        selesai: 55,
        loket: 2,
        rataRata: 9,
        status: "tutup",
      },
    ];

    return {
      version: 1,
      updatedAt: now,
      puskesmas: list.map(function (item) {
        return Object.assign({}, item, {
          updatedAt: now,
          riwayat: seedHistory(item.menunggu),
        });
      }),
    };
  }

  /* =====================================
     BACA / TULIS
  ===================================== */

  function readState() {
    try {
      const raw = global.localStorage.getItem(KEY);

      if (!raw) {
        const seeded = buildSeed();

        global.localStorage.setItem(KEY, JSON.stringify(seeded));

        return seeded;
      }

      const parsed = JSON.parse(raw);

      if (!parsed || !Array.isArray(parsed.puskesmas)) {
        throw new Error("Struktur data antrean tidak valid");
      }

      return parsed;
    } catch (error) {
      const seeded = buildSeed();

      try {
        global.localStorage.setItem(KEY, JSON.stringify(seeded));
      } catch (e) {
        /* abaikan bila storage tidak tersedia */
      }

      return seeded;
    }
  }

  let channel = null;

  if ("BroadcastChannel" in global) {
    try {
      channel = new global.BroadcastChannel(CHANNEL_NAME);
    } catch (e) {
      channel = null;
    }
  }

  function writeState(state) {
    state.updatedAt = Date.now();

    try {
      global.localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      /* abaikan bila storage penuh/tidak tersedia */
    }

    if (channel) {
      channel.postMessage({ type: "update", at: state.updatedAt });
    }

    return state;
  }

  /* =====================================
     API PUBLIK
  ===================================== */

  function getState() {
    return readState();
  }

  function getPuskesmas(id) {
    const state = readState();

    return state.puskesmas.find(function (item) {
      return item.id === id;
    });
  }

  function updatePuskesmas(id, patch) {
    const state = readState();

    const target = state.puskesmas.find(function (item) {
      return item.id === id;
    });

    if (!target) {
      return state;
    }

    Object.keys(patch).forEach(function (key) {
      target[key] = patch[key];
    });

    target.updatedAt = Date.now();

    if (!Array.isArray(target.riwayat)) {
      target.riwayat = [];
    }

    target.riwayat.push({ t: target.updatedAt, v: Number(target.menunggu) || 0 });

    if (target.riwayat.length > MAX_HISTORY) {
      target.riwayat = target.riwayat.slice(-MAX_HISTORY);
    }

    state.updatedAt = target.updatedAt;

    return writeState(state);
  }

  function estimateWait(item) {
    if (!item || item.status === "tutup") {
      return 0;
    }

    const loket = Math.max(1, Number(item.loket) || 1);
    const rataRata = Math.max(1, Number(item.rataRata) || 1);
    const menunggu = Math.max(0, Number(item.menunggu) || 0);

    if (menunggu === 0) {
      return 0;
    }

    return Math.ceil(menunggu / loket) * rataRata;
  }

  function relativeTime(timestamp) {
    if (!timestamp) {
      return "belum tersedia";
    }

    const diff = Math.max(0, Date.now() - Number(timestamp));
    const seconds = Math.floor(diff / 1000);

    if (seconds < 5) {
      return "baru saja";
    }

    if (seconds < 60) {
      return seconds + " detik lalu";
    }

    const minutes = Math.floor(seconds / 60);

    if (minutes < 60) {
      return minutes + " menit lalu";
    }

    const hours = Math.floor(minutes / 60);

    if (hours < 24) {
      return hours + " jam lalu";
    }

    const days = Math.floor(hours / 24);

    return days + " hari lalu";
  }

  function subscribe(callback) {
    let lastRaw = "";

    try {
      lastRaw = global.localStorage.getItem(KEY) || "";
    } catch (e) {
      lastRaw = "";
    }

    function notify() {
      let raw = "";

      try {
        raw = global.localStorage.getItem(KEY) || "";
      } catch (e) {
        raw = "";
      }

      if (raw && raw !== lastRaw) {
        lastRaw = raw;
        callback(readState());
      }
    }

    function onStorage(event) {
      if (event.key === KEY) {
        notify();
      }
    }

    function onChannel() {
      notify();
    }

    global.addEventListener("storage", onStorage);

    if (channel) {
      channel.addEventListener("message", onChannel);
    }

    const timer = global.setInterval(notify, POLL_INTERVAL);

    return function unsubscribe() {
      global.removeEventListener("storage", onStorage);

      if (channel) {
        channel.removeEventListener("message", onChannel);
      }

      global.clearInterval(timer);
    };
  }

  global.AntreanStore = {
    KEY: KEY,
    CAPACITY: CAPACITY,
    getState: getState,
    getPuskesmas: getPuskesmas,
    updatePuskesmas: updatePuskesmas,
    estimateWait: estimateWait,
    relativeTime: relativeTime,
    subscribe: subscribe,
  };
})(window);
