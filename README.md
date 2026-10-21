# Sistem Inventory: versi UI (demo)

Salinan antarmuka dari StokOp tanpa database. Semua halaman memakai data contoh dari `lib/mock/data.ts`;
perubahan (tambah, ubah, hapus, persetujuan, dst.) divalidasi seperti aslinya tetapi **tidak disimpan**.
Unggah foto tidak tersedia.

## Menjalankan

    npm install
    npm run dev      # http://localhost:3000
    npm run build && npm start

Halaman masuk menampilkan lima akun demo (Hyper Admin, Super Admin, Admin BMN, Admin ATK, Staf) untuk
melihat tampilan tiap peran. Sesi hanya berupa cookie `demo_user`.

## Deploy (Vercel)

Import folder ini sebagai proyek Next.js. Tidak ada variabel lingkungan yang dibutuhkan.

## Struktur

- `app/`, `components/`: UI (sama dengan aplikasi asli).
- `lib/mock/data.ts`: data contoh. Ubah di sini untuk mengganti isi demo.
- `lib/*/service.ts`: pengganti layer data asli; bentuk keluarannya sama dengan aslinya.
- `lib/auth/`: sesi demo berbasis cookie.
