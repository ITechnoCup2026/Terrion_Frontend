<div align="center">

# 🌾 Terrion (Frontend)

**Atlas Pasokan Pertanian Nasional & Sistem Manajemen Koperasi Tani Terpadu**

[![Next.js](https://img.shields.io/badge/Next.js-16.3.2-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.8-blue?style=flat-square&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![Vitest](https://img.shields.io/badge/Tests-729%20passed-brightgreen?style=flat-square&logo=vitest)](https://vitest.dev/)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

*Terrion mendemokratisasi rantai pasok pangan Indonesia dengan menghubungkan Koperasi Tani, Petani Anggota, Kader Lapangan, dan Pembeli (Offtaker) melalui data agronomi presisi, proyeksi berbasis suhu (GDD), perencanaan tanam cerdas, dan peta pasokan spasial terbuka.*

</div>

---

## 📋 Daftar Isi

- [Tentang Proyek](#-tentang-proyek)
- [Arsitektur Sistem](#-arsitektur-sistem)
- [Fitur Utama](#-fitur-utama)
  - [1. Perencanaan Tanam Semusim (AI & Solver Optimization)](#1-perencanaan-tanam-semusim-ai--solver-optimization)
  - [2. Model Agronomi Presisi Berbasis GDD](#2-model-agronomi-presisi-berbasis-gdd)
  - [3. Atlas Pasokan Nasional (Peta Spasial Interaktif)](#3-atlas-pasokan-nasional-peta-spasial-interaktif)
  - [4. Agregasi & Dokumen Resmi RDKK Pupuk Bersubsidi](#4-agregasi--dokumen-resmi-rdkk-pupuk-bersubsidi)
  - [5. Kanvas Visual Lahan 2D (Pixel-Art Engine)](#5-kanvas-visual-lahan-2d-pixel-art-engine)
  - [6. B2B Marketplace & Permintaan Pasokan Buyer](#6-b2b-marketplace--permintaan-pasokan-buyer)
  - [7. Portal Akses Mandiri Petani (Token-based)](#7-portal-akses-mandiri-petani-token-based)
- [Matriks Hak Akses & Peran Pengguna](#-matriks-hak-akses--peran-pengguna)
- [Struktur Direktori](#-struktur-direktori)
- [Teknologi & Dependensi](#-teknologi--dependensi)
- [Panduan Instalasi & Penggunaan Lokal](#-panduan-instalasi--penggunaan-lokal)
  - [Prasyarat](#prasyarat)
  - [Langkah Instalasi](#langkah-instalasi)
  - [Variabel Lingkungan](#variabel-lingkungan)
  - [Kompilasi Aset Sprite Kanvas](#kompilasi-aset-sprite-kanvas)
  - [Menjalankan Server Pengembangan](#menjalankan-server-pengembangan)
  - [Pengujian Unit (Vitest)](#pengujian-unit-vitest)
  - [Kompilasi Produksi](#kompilasi-produksi)
- [Daftar Skrip npm / pnpm](#-daftar-skrip-npm--pnpm)
- [Catatan Lisensi & Integritas Aset](#-catatan-lisensi--integritas-aset)

---

## 💡 Tentang Proyek

Sektor pertanian rakyat di Indonesia menghadapi tantangan struktural menahun: ketidakpastian waktu panen, spekulasi tengkulak yang menekan harga jual petani, penumpukan panen raya (*harvest glut*) yang menjatuhkan harga pasar, serta inefisiensi administrasi alokasi pupuk bersubsidi pemerintah (RDKK).

**Terrion** hadir sebagai platform terpadu untuk mendigitalisasi operasional koperasi pertanian:
1. **Transparansi Pasokan Sebelum Panen**: Pembeli dan industri dapat melihat proyeksi pasokan riil hingga 12 minggu ke depan berdasarkan data akumulasi derajat-hari suhu (*Growing Degree Days*), bukan spekulasi kalender.
2. **Optimalisasi Keputusan Tanam**: Menyediakan usulan alokasi komoditas semusim multi-objektif (Ketahanan/Aman, Margin Pendapatan, dan Pemenuhan Pasar) yang memperhitungkan batas kapasitas gudang dan risiko tumbukan panen.
3. **Tertib Regulasi Subsidi**: Menghasilkan dokumen RDKK terverifikasi otomatis lengkap dengan penegakan batasan kuota subsidi resmi pemerintah (maksimal 2 hektare per petani).
4. **Interaksi Visual Ringan & Menyenangkan**: Menghadirkan visualisasi kanvas lahan interaktif bergaya 2D pixel-art untuk memantau fase pertumbuhan tanaman dan petak lahan secara intuitif.

---

## 🏗️ Arsitektur Sistem

Terrion dibangun menggunakan pendekatan arsitektur terdistribusi yang memisahkan tanggung jawab antara antarmuka pengguna, logika bisnis/data, dan komputasi optimasi:

```
┌──────────────────────────────────────────────────────────────────┐
│                       Pengguna / Browser                         │
│   (Pengurus Koperasi · Kader Lapangan · Pembeli · Petani · Tamu) │
└─────────────────────────────────┬────────────────────────────────┘
                                  │
                                  │ HTTPS (HTML / Server Actions / Sesi Cookie)
                                  ▼
┌──────────────────────────────────────────────────────────────────┐
│                   Terrion_Frontend (Next.js 16)                  │
│  - App Router (Server Components & Streaming UI)                 │
│  - Middleware / Proxy Sesi Auto-Refresh (proxy.ts)               │
│  - Agronomi Client-Side & Algoritma GDD (lib/agronomy)           │
│  - Engine Kanvas 2D & Sprite Processor (lib/canvas)              │
│  - Atlas Peta Vektor Spasial SVG / GeoJSON (lib/atlas)           │
│  - Generator Dokumen RDKK (lib/rdkk)                             │
└─────────────────────────────────┬────────────────────────────────┘
                                  │
                                  │ REST API (Cookie terrion_session)
                                  │ NEXT_PUBLIC_API_URL
                                  ▼
┌──────────────────────────────────────────────────────────────────┐
│                    Terrion_Backend (Go REST API)                 │
│  - Autentikasi GoTrue & Manajemen Sesi Redis                     │
│  - Penyimpanan Relasional PostgreSQL                             │
│  - Solver Optimasi Cadangan (Fallback Solver)                    │
└─────────────────────────────────┬────────────────────────────────┘
                                  │
                                  │ gRPC / Internal HTTP (Opsional)
                                  ▼
┌──────────────────────────────────────────────────────────────────┐
│                    Terrion_AI (Python Service)                   │
│  - Mesin Solver Linear / Optimasi Multi-Objektif                 │
│  - Model Kalibrasi Hasil Panen Komoditas                         │
└──────────────────────────────────────────────────────────────────┘
```

### Prinsip Integrasi Frontend:
- **Zero AI Direct Exposure**: Frontend tidak pernah berkomunikasi langsung dengan layanan AI. Seluruh panggilan dilakukan melalui endpoint `/api/plans*` milik backend Go.
- **Graceful Degradation (Fallback Solver)**: Jika layanan AI sedang tidak aktif atau belum terpasang, backend Go secara transparan menjalankan solver lokal bawaan. Respons tetap mengembalikan status `200` dengan hasil rencana yang valid, di mana field `engine` bernilai `"fallback"` (bukan error).
- **Session-Based Stateless Tokens**: Frontend tidak menyimpan JWT secara eksplisit di localStorage; sesi dikelola melalui cookie HTTP-only `terrion_session` yang divalidasi ke backend Redis.

---

## ✨ Fitur Utama

### 1. Perencanaan Tanam Semusim (AI & Solver Optimization)
Pengurus koperasi dapat merumuskan alokasi komoditas terbaik untuk seluruh petak lahan anggotanya dalam satu musim tanam (`/rencana/susun`):
- **3 Opsi Rencana Strategis**:
  - 🛡️ **Aman (Ketahanan & Risiko Rendah)**: Memprioritaskan diversifikasi tanaman pangan tahan risiko dan kestabilan panen.
  - 💰 **Pendapatan (Maksimasi Margin)**: Mengoptimalkan komoditas bernilai ekonomis tinggi untuk mendongkrak pendapatan koperasi.
  - 📈 **Pasar (Targeted Demand)**: Mengutamakan varietas yang telah memiliki pesanan/permintaan aktif dari buyer.
- **Deteksi Lahan Terlewat (*Skipped Plots*)**: Memberikan transparansi jika terdapat lahan anggota yang belum memenuhi syarat rotasi atau kriteria iklim.
- **Ambang Batas Kapasitas Gudang (*Capacity Thresholds*)**: Memastikan total panen tidak melebihi kapasitas gudang pascapanen koperasi.
- **Distribusi Mandiri via WhatsApp**: Rencana tanam yang telah disetujui dapat dibagikan langsung per petani melalui tautan token unik.

### 2. Model Agronomi Presisi Berbasis GDD
Menghitung waktu panen tanaman secara akurat berdasarkan akumulasi energi panas suhu harian (*Growing Degree-Days*):
- **Rentang Keyakinan 80%**: Mengkalkulasi skenario suhu hangat vs dingin (±1.28 Standar Deviasi) dari normal iklim setempat untuk menghasilkan jendela panen probabilistik yang realistis.
- **Deteksi Tumbukan Panen (*Harvest Collision*)**: Menganalisis risiko penumpukan tanggal panen antar blok lahan sejenis pada pekan yang sama.
- **Rekomendasi Penjadwalan Bertahap (*Staggering*)**: Memberikan saran pergeseran tanggal tanam untuk meratakan kurva pasokan dan beban kerja panen.
- **Kalibrasi Model Hasil Mandiri (*Yield Calibration*)**: Setiap realisasi panen yang dicatat oleh kader lapangan secara otomatis mengkalibrasi ulang bobot prediksi hasil untuk musim tanam berikutnya.

### 3. Atlas Pasokan Nasional (Peta Spasial Interaktif)
Eksplorasi spasial pasokan panen seluruh Indonesia (`/atlas`) yang terbuka untuk publik:
- **Hierarki Navigasi 4 Tingkat**: Drilldown mulus dari skala **Nasional** ➔ **Provinsi** ➔ **Kabupaten** ➔ **Lahan Koperasi**.
- **Kamera SVG Berperforma Tinggi**: Perpindahan sudut pandang (*pan & zoom*) dianimasikan melalui kurva *easing* menggunakan `requestAnimationFrame`, tanpa memicu re-render DOM React yang berat.
- **Pewarnaan Intensitas Pasokan Riil**: Setiap wilayah diwarnai berdasarkan tonase komoditas terproyeksi dari data kebun riil, bukan sekadar poligon hiasan.
- **Scrubber Lini Masa 12 Pekan**: Menggeser perkiraan pasokan dari pekan ke pekan untuk memantau waktu ketersediaan komoditas di setiap daerah.

### 4. Agregasi & Dokumen Resmi RDKK Pupuk Bersubsidi
Otomasi penyusunan Rencana Definitif Kebutuhan Kelompok (`/purchases/rdkk`):
- **Agregasi Kebutuhan Riil**: Menghitung kebutuhan pupuk anorganik (Urea, NPK, dsb.) berdasarkan standar dosis resmi per komoditas per luas tanam.
- **Penegakan Aturan Batas Subsidi (2 Hektare Cap)**: Menandai petani yang menanam melebihi batas subsidi pemerintah (`overSubsidyCap` & `excessHa`) secara transparan tanpa memotong data aktual.
- **Tampilan Formulir Siap Cetak**: Tata letak dokumen grid tabular yang menyertakan nomor referensi dokumen sumber dosis resmi pemerintah.

### 5. Kanvas Visual Lahan 2D (Pixel-Art Engine)
Visualisasi interaktif petak kebun berbasis HTML5 Canvas (`/plots/[id]` dan `/garden/[public_id]`):
- **Arsitektur Rendering Multi-Layer**:
  1. *Terrain Layer* (tanah dan batasan ladang prosedural)
  2. *Water Layer* (animasi riak air 6-frame)
  3. *Grid & Selection Layer* (garis petak dan penanda blok aktif)
  4. *Sprite Layer* (tahap pertumbuhan tanaman 5 fase: semai hingga siap panen)
  5. *Farmhouse & Props Layer* (dekorasi gubuk tani dan vegetasi lingkungan)
- **Interaksi Halus**: Mendukung geser kanvas (*pan*), zoom bertahap (*pinch & wheel*), *hit-testing* klik blok untuk melihat detail varietas, serta *time slider* pertumbuhan.
- **Pipeline Sprite Otomatis**: Dilengkapi script berbasis Sharp untuk menyusun lembar sprite dari aset ilustrasi sumber.

### 6. B2B Marketplace & Permintaan Pasokan Buyer
Katalog publik transparan bagi pembeli grosir, horeka, dan industri pengolahan (`/catalog` & `/beranda`):
- Menampilkan jadwal panen, varietas, estimasi tonase, dan lokasi koperasi produsen.
- Pengajuan pesanan pasokan langsung (*Supply Request*) tanpa perantara tengkulak.
- Pemantauan status pemesanan terintegrasi di portal buyer (`/my-requests`).

### 7. Portal Akses Mandiri Petani (Token-based)
Portal jadwal tanam khusus petani anggota (`/rencana-saya/[token]`):
- Petani tidak memerlukan akun login atau sandi rumit.
- Cukup membuka tautan unik yang dikirimkan pengurus koperasi via WhatsApp/SMS.
- Memuat jadwal tanam, rekomendasi pemupukan per petak, perkiraan tanggal panen, dan nomor kontak pengurus.

---

## 👥 Matriks Hak Akses & Peran Pengguna

| Peran | Ruang Lingkup Utama | Izin & Kemampuan Akses |
| :--- | :--- | :--- |
| **Pengurus** (`pengurus`) | Administrasi Koperasi & Rencana Strategis | • Mengusulkan & mengesahkan rencana tanam semusim (`/rencana`)<br>• Mengelola kapasitas gudang (`/kapasitas`)<br>• Mengunduh & mencetak dokumen RDKK pupuk (`/purchases/rdkk`)<br>• Menyetujui atau menolak permintaan pasokan dari buyer (`/requests`)<br>• Mengelola data lahan anggota (`/plots`) |
| **Kader** (`kader`) | Operasional Lapangan & Data Aktual | • Mencatat petak dan blok kebun baru dalam ±40 detik (`/plots/new`)<br>• Mengatur jadwal tanam bertahap (*staggering*) dan cek tumbukan<br>• Mencatat realisasi hasil panen aktual (`/panen`) untuk kalibrasi GDD<br>• Memantau kanvas petak lahan |
| **Pembeli** (`buyer`) | Pengadaan Komoditas & Monitoring | • Mengakses beranda pembeli (`/beranda`)<br>• Menjelajahi katalog hasil panen (`/catalog`)<br>• Mengirimkan permintaan pasokan komoditas ke koperasi<br>• Melacak status persetujuan pesanan (`/my-requests`) |
| **Petani** *(Token)* | Anggota Koperasi Lapangan | • Akses langsung tanpa login via URL bertoken (`/rencana-saya/:token`)<br>• Melihat komoditas yang ditugaskan, dosis pupuk, dan jadwal panen petaknya |
| **Publik / Tamu** | Transparansi Pasokan | • Halaman pendaratan (*landing page*) interaktif (`/`)<br>• Atlas Pasokan Pangan Nasional interaktif (`/atlas`)<br>• Katalog pasokan publik (`/catalog`)<br>• Kanvas kebun terbuka (`/garden/:public_id`) |

---

## 📁 Struktur Direktori

```text
Terrion_Frontend/
├── actions/                   # Server Actions Next.js (mutasi form terproteksi)
│   ├── auth.ts                # Login, signup, dan signout
│   ├── block.ts               # Pembuatan & pemecahan blok petak
│   ├── capacity.ts            # Manajemen kapasitas gudang
│   ├── harvest.ts             # Pencatatan hasil panen aktual
│   ├── plot.ts                # Operasi kebun dan petak
│   ├── stagger.ts             # Penjadwalan tanam bertahap
│   └── supply-request.ts      # Pengajuan permintaan pasokan
├── app/                       # Rute & Tata Letak Next.js (App Router)
│   ├── (app)/                 # Halaman aplikasi terproteksi (Dashboard, Rencana, Plots, dll.)
│   ├── (auth)/                # Halaman login dan signup
│   ├── (public)/              # Beranda umum, katalog, dan beranda pembeli
│   ├── atlas/                 # Halaman Atlas Spasial Nasional
│   ├── garden/[public_id]/    # Kanvas visual kebun publik
│   └── rencana-saya/[token]/  # Portal jadwal tanam petani berbasis token
├── assets/                    # Aset grafis mentah 1080p (crops, farmhouse, terrain)
├── components/                # Komponen antarmuka modular per domain
│   ├── atlas/                 # Komponen peta vektor SVG, scrubber pekan, panel wilayah
│   ├── auth/                  # Form autentikasi dan menu profil
│   ├── buyer/                 # Tampilan beranda pembeli dan ringkasan order
│   ├── canvas/                # Komponen PlotCanvas 2D dan penggeser waktu (TimeSlider)
│   ├── capacity/              # Widget kapasitas penyimpanan gudang
│   ├── commerce/              # Komponen transaksi dan katalog komoditas
│   ├── dashboard/             # Widget statistik dashboard koperasi
│   ├── harvest/               # Form & riwayat pencatatan panen
│   ├── landing/               # Komponen pendaratan (Archipelago, Poster, WindowDiagram)
│   ├── planning/              # Kartu proposal rencana, tabel tugas, dan share list
│   ├── plots/                 # Komponen daftar petak, filter, dan editor blok
│   ├── purchases/             # Tampilan RDKK dan pesanan saprotan
│   ├── requests/              # Manajemen permintaan pasokan
│   └── ui/                    # Komponen primitif UI berbasis Tailwind & Base UI
├── docs/                      # Dokumentasi teknis tambahan
│   └── INTEGRASI_AI_PERENCANAAN.md # Spesifikasi kontrak antarmuka AI Planner
├── lib/                       # Domain logic, algoritma, kalkulasi, dan API client
│   ├── agronomy/              # Perhitungan GDD, mitigasi benturan panen, kalibrasi
│   ├── api/                   # Klien apiFetch, penanganan ApiError, dan timeout
│   ├── atlas/                 # Proyeksi peta koordinat, kamera SVG, dan GeoJSON loader
│   ├── auth/                  # Validasi sesi, cookie, dan pembatasan peran (roles)
│   ├── canvas/                # Renderer kanvas 2D, tile layout, hit-testing, & layers
│   ├── planning/              # Kalkulasi usulan rencana tanam, pembagian token, filter
│   ├── rdkk/                  # Agregasi pupuk subsidi dan pembentukan dokumen resmi
│   └── tilegrid/              # Logika penataan petak kisi (grid placement)
├── public/                    # Aset statis web
│   ├── geo/                   # Berkas GeoJSON spasial batas provinsi & kabupaten
│   └── sprites/               # Lembar sprite kompilasi (crops.png, ground.png, dll.)
├── scripts/                   # Skrip otomasi pengembangan
│   └── build-sprites.ts       # Generator lembar sprite kanvas menggunakan Sharp
├── proxy.ts                   # Middleware Next.js untuk auto-refresh sesi Redis
├── next.config.ts             # Konfigurasi Next.js & aturan pengalihan URL
├── package.json               # Konfigurasi dependensi dan skrip proyek
└── vitest.config.mts          # Konfigurasi runner pengujian unit Vitest
```

---

## 🛠️ Teknologi & Dependensi

| Kategori | Teknologi | Deskripsi |
| :--- | :--- | :--- |
| **Framework** | **Next.js 16.3.2** | React Framework generasi terbaru dengan Server Components, Streaming SSR, dan Server Actions |
| **UI Library** | **React 19.2.8** | Pustaka antarmuka deklaratif terkini |
| **Styling** | **Tailwind CSS v4** | Framework utilitas CSS modern dengan konfigurasi PostCSS terintegrasi |
| **Primitif UI** | **@base-ui/react** & **Lucide React** | Komponen aksesibel nir-gaya dan paket ikon vektor |
| **Form & Validasi** | **React Hook Form** + **Zod 4** | Manajemen state formulir teroptimasi dengan validasi skema ketat |
| **Pemrosesan Gambar** | **Sharp** & **tsx** | Manipulasi citra performa tinggi untuk membangun lembar sprite petak lahan |
| **Testing** | **Vitest 4.1.11** | Runner unit test kilat berbasis ESM (729 test cases lulus) |
| **Package Manager** | **pnpm v11** | Manajemen paket hemat ruang penyimpanan dan resolusi deterministik |

---

## 🚀 Panduan Instalasi & Penggunaan Lokal

### Prasyarat
Sebelum memulai, pastikan perangkat Anda telah terpasang:
- **Node.js**: Versi `20.x` atau lebih baru
- **pnpm**: Versi `10.x` atau `11.x` (`npm install -g pnpm`)
- **Terrion Backend (Go)**: Berjalan di port lokal (default: `http://localhost:8080`)

### Langkah Instalasi

1. **Kloning Repositori**:
   ```bash
   git clone https://github.com/ITechnoCup2026/Terrion_Frontend.git
   cd Terrion_Frontend
   ```

2. **Pasang Dependensi**:
   ```bash
   pnpm install
   ```

3. **Konfigurasi Variabel Lingkungan**:
   Salin berkas contoh konfigurasi `.env.example` ke `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
   Pastikan isi `.env.local` mengarah ke alamat server Terrion Backend Anda:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8080
   ```

4. **Kompilasi Aset Sprite Kanvas**:
   Terrion memerlukan lembar sprite berukuran efisien di direktori `public/sprites/`. Buat lembar sprite tersebut dari aset sumber:
   ```bash
   pnpm build:sprites
   ```

5. **Jalankan Server Pengembangan**:
   ```bash
   pnpm dev
   ```
   Aplikasi akan berjalan di [http://localhost:3000](http://localhost:3000).

---

## 🧪 Pengujian Unit (Vitest)

Terrion dilengkapi dengan cakupan uji unit yang sangat komprehensif (mencakup kalkulasi agronomi, logika pergeseran panen, perhitungan pupuk subsidi, transformasi kamera SVG, hingga rendering kanvas):

```bash
# Menjalankan seluruh pengujian unit sekali jalan (CI mode)
pnpm test

# Menjalankan pengujian dalam mode pantau interaktif (watch mode)
pnpm test:watch
```

> **Status Uji Terkini**: 74 berkas pengujian (729 tes) lulus tanpa kendala.

---

## 📦 Kompilasi Produksi

Untuk membangun aplikasi siap pakai pada lingkungan produksi:

```bash
# Membangun bundel produksi Next.js
pnpm build

# Menjalankan aplikasi hasil kompilasi
pnpm start
```

---

## 📜 Daftar Skrip npm / pnpm

| Perintah | Fungsi |
| :--- | :--- |
| `pnpm dev` | Menjalankan server pengembangan lokal Next.js di port 3000 |
| `pnpm build` | Mengompilasi aplikasi untuk lingkungan produksi |
| `pnpm start` | Menjalankan server produksi dari hasil build |
| `pnpm lint` | Menjalankan pemeriksaan gaya kode dengan ESLint |
| `pnpm test` | Menjalankan 729+ skenario pengujian unit menggunakan Vitest |
| `pnpm test:watch` | Menjalankan Vitest dalam mode watch untuk alur TDD |
| `pnpm build:sprites` | Memproses dan menyusun berkas gambar di `assets/` menjadi sprite sheet di `public/sprites/` |

---

## ⚖️ Catatan Lisensi & Integritas Aset

- **Kode Sumber**: Dilisensikan di bawah lisensi [MIT](LICENSE).
- ⚠️ **Pemberitahuan Lisensi Aset Seni Grafis**: Aset grafis ilustrasi yang terdapat dalam direktori `assets/` (paket grafis *Immunity*) memiliki lisensi pihak ketiga yang membatasi redistribusi publik. Harap memastikan repositori tetap bersifat **PRIVATE** selama aset tersebut berada di dalam pohon kode, dan jangan mempublikasikan aset mentah beresolusi tinggi ke domain terbuka tanpa persetujuan resmi pemegang hak cipta.

---

<div align="center">
  <small>Dikembangkan dengan ❤️ untuk Ketahanan Pangan & Kesejahteraan Petani Indonesia.</small>
</div>
