# Kayu & Ruang — Aplikasi PWA Toko Furniture Nusantara (Modul 5 PPB)

Aplikasi **Progressive Web App (PWA)** bertema **Toko & Katalog Furniture Artisan ("Kayu & Ruang")** yang dibangun menggunakan teknologi sesuai **Modul 5 Praktikum Pemrograman Perangkat Bergerak (PPB)**:
- **React 19 + Vite**
- **vite-plugin-pwa (Workbox Service Worker & Web App Manifest)**
- **Axios + Integrasi RESTful API / Supabase + Offline LocalStorage Persistence**
- **Tailwind CSS & Lucide Icons**

---

## Fitur Utama (Memenuhi Seluruh Kriteria Tugas)

1. **Navigasi Multi-Halaman (4 Halaman Utama + 3 Sub-Halaman CRUD/Detail)**:
   - **Katalog & CRUD (`CatalogPage.jsx`)**: Menampilkan daftar produk furniture dengan fitur pencarian real-time, filter kategori (`Semua`, `Kursi`, `Meja`, `Sofa`, `Kabinet`, `Tempat Tidur`, `Meja Kerja`), dan pengurutan harga/nama.
   - **Koleksi Favorit (`FavoritesPage.jsx`)**: Menyimpan produk furniture pilihan beserta kalkulasi otomatis total estimasi anggaran ruang.
   - **Showroom & Workshop (`ShowroomPage.jsx`)**: Informasi lokasi galeri, workshop produksi, dan keunggulan teknis PWA.
   - **Profil Praktikan (`ProfilePage.jsx`)**: Menampilkan dan mengedit **Nama Lengkap**, **NIM**, **Kelompok**, Program Studi, Avatar, dan UUID Pengguna.
2. **Halaman dengan CRUD Fungsional Penuh**:
   - **Create (`CreateFurniturePage.jsx`)**: Tambah produk furniture baru dengan 2 tahap (Upload foto / pilih preset studio + input spesifikasi dimensi, material, langkah perakitan, dan fitur **Auto-Save Draft Offline** setiap 30 detik).
   - **Read (`CatalogPage.jsx` & `FurnitureDetail.jsx`)**: Lihat katalog, spesifikasi detail, langkah perakitan, serta tambah ulasan & rating bintang 1–5.
   - **Update (`EditFurniturePage.jsx`)**: Ubah detail produk, harga, material, maupun spesifikasi dimensi.
   - **Delete (`ConfirmModal.jsx`)**: Hapus produk dengan dialog konfirmasi aman.
3. **Fungsionalitas PWA (Installable & Offline-Ready)**:
   - Dilengkapi `manifest.webmanifest`, ikon `192x192` & `512x512`, Service Worker `vite-plugin-pwa` (`registerType: 'autoUpdate'`), deteksi status jaringan real-time (`PWABadge.jsx`), serta *dual-mode persistence* (Supabase API + `localStorage` fallback).

---

## Cara Menjalankan di Komputer Lokal

1. Ekstrak file ZIP proyek ini, lalu buka terminal di dalam folder proyek:
   ```bash
   npm install
   ```
2. Jalankan mode pengembangan (Development):
   ```bash
   npm run dev
   ```
3. Untuk menguji build produksi & Service Worker PWA:
   ```bash
   npm run build
   npm run preview
   ```

---

## Cara Deploy ke Vercel (Sesuai Modul 5)

1. Buat repository baru di GitHub (misalnya `Modul5PWA2_Furniture`).
2. Inisialisasi Git dan push kode ke GitHub:
   ```bash
   git init
   git branch -M main
   git add .
   git commit -m "Initial commit PWA Toko Furniture Kayu & Ruang"
   git remote add origin https://github.com/<username-anda>/<nama-repo-anda>.git
   git push -u origin main
   ```
3. Buka [Vercel](https://vercel.com), login dengan akun GitHub Anda, lalu klik **Add New... → Project → Import Git Repository**.
4. Pilih repository yang baru saja dibuat, biarkan Framework Preset pada **Vite**, lalu klik **Deploy**.
5. Setelah selesai, salin link domain `.vercel.app` Anda dan kumpulkan pada link pengumpulan tugas.
