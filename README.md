# RANAHCARE AI Service (prototype)

Satu halaman resepsionis menggunakan satu API; LangGraph memilih modul resepsionis,
triase awal, jadwal berbasis SQLite, atau pengarah reservasi. Groq (utama) dan
Google Gemini (cadangan) hanya digunakan untuk pertanyaan umum setelah pengguna
memberi persetujuan di halaman. Keluhan triase diproses lokal dengan pencocokan
terbatas, bukan dikirim ke model; jadwal juga selalu dibaca dari database.

> **Bukan layanan medis/diagnosis.** Triage hanya membantu navigasi, seluruh
> hasil wajib divalidasi tenaga medis. Jika ada tanda bahaya, chatbot meminta
> pengguna menghubungi layanan darurat atau pergi ke IGD. Jangan masukkan NIK.
> Reservasi prototipe menyimpan nama, telepon, dan ringkasan keluhan tanpa enkripsi;
> jangan gunakan dengan data pasien nyata atau deploy ke internet sebelum penilaian
> privasi, keamanan, persetujuan, autentikasi pasien, dan perlindungan data dilakukan.

## Menjalankan lokal (PowerShell)

```powershell
cd C:\Coding\frontend._semifinal_beta\ai_service
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
# Isi GROQ_API_KEY dan GOOGLE_API_KEY di .env; jangan menaruhnya di frontend.
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8765
```

Buka dokumentasi API di `http://127.0.0.1:8765/docs`. Untuk frontend statis,
gunakan Live Server pada port 5500 atau Apache, lalu buka
`frontend/pages/resepsionis.html`. Pengaturan `AI_SERVICE_BASE_URL` di
`frontend/js/config.js` harus mengarah ke `http://127.0.0.1:8765/api`.
Jadwal nama dokter dan kapasitas yang dibuat saat startup adalah data demo,
bukan ketersediaan resmi Puskesmas.

Jalankan tes workflow/database dari folder `ai_service`:

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
```

## API

| Metode | Endpoint | Fungsi |
|---|---|---|
| GET | `/api/health` | Pemeriksaan layanan |
| POST | `/api/chat` | Router LangGraph, resepsionis, triase, dan perpindahan mode |
| GET | `/api/schedules?service=umum` | Slot jadwal dari SQLite |
| POST | `/api/reservations` | Konfirmasi booking dan nomor antrean |
| POST | `/api/wearables/trends` | Ringkasan deskriptif data 14–90 hari, bukan prediksi |
| GET | `/api/admin/reservations` | Daftar pasien; Bearer token admin wajib |

Pengiriman pengingat WhatsApp/SMS dan integrasi rekam medis puskesmas belum
diaktifkan. UI reservasi menyatakannya secara eksplisit; jangan menganggap
reservasi demo sebagai jadwal klinis resmi.

Input suara menggunakan `SpeechRecognition` browser dalam mode `id-ID`, bukan
engine Minangkabau khusus. Dukungan dan akurasi bergantung browser; UI meminta
persetujuan sebelum memulai karena audio dapat diproses layanan browser.
Balasan dapat dibacakan melalui `speechSynthesis` jika tersedia.

### Contoh data booking

API jadwal memberi `id`, `service`, `doctor_name`, dan `starts_at`; gunakan
`id` sebagai `schedule_id` ketika memanggil `POST /api/reservations`. Nama dan
telepon hanya dikirim saat pasien menekan konfirmasi. NIK tidak dikumpulkan.

## Tools dan alur

- **LangGraph**: graph router satu pintu lalu conditional edge ke empat node.
- **LangChain tools**: `lookup_schedule`, `assess_symptoms`, `prepare_reservation`.
- **Groq/Gemini**: jawaban administrasi saja, opt-in; urutan fallback bisa
  diatur melalui `AI_PROVIDER_ORDER`. Bila provider yang dikonfigurasi gagal,
  API mengembalikan error alih-alih jawaban sukses palsu.
- **LangSmith**: tracing dinonaktifkan secara default. Jangan aktifkan tracing
  dengan data kesehatan/pasien sebelum memastikan persetujuan, kontrak pemrosesan,
  dan kebijakan privasi yang sesuai.
- **Wearables**: API hanya membandingkan pengukuran pertama/terakhir; tidak
  menyimpulkan penyakit atau risiko metabolik.

## Catatan penjelasan kode

File Python diberi docstring per modul/fungsi dan komentar penjelas pada alur
penting: `app/config.py` memuat pengaturan; `app/database.py` mengelola jadwal,
konteks, dan transaksi booking; `app/safety.py` melakukan pemeriksaan lokal
konservatif; `app/llm.py` mengelola persetujuan, redaksi identitas, dan fallback
provider; `app/workflow.py` mendefinisikan router dan modul LangGraph;
`app/main.py` memvalidasi request dan menyediakan endpoint FastAPI.
