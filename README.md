# Jelajah TTS

Aplikasi web TTS edukasi SD dengan area admin dan siswa, tiga jalur level (Bahasa Indonesia (Pengetahuan Umum), Matematika, Bahasa Inggris (Pengetahuan Umum)), generator otomatis, penyimpanan server, dan laporan.

## Menjalankan lokal

Memerlukan Node.js 22.13+ (pengujian menggunakan Node.js 24).

```sh
npm run install:ci
cp .env.example .dev.vars
```

Isi kata sandi berbeda untuk `BOOTSTRAP_ADMIN_PASSWORD` dan `DEMO_USER_PASSWORD` di `.dev.vars`. File ini tidak masuk Git. Kata sandi bootstrap hanya digunakan ketika database masih kosong. Jika `DEMO_USER_PASSWORD` diisi, aplikasi membuat akun `siswa` dan enam level contoh. Jika tidak diisi, admin membuat akun dan materi sendiri.

```sh
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_bored_wilson_fisk.sql
npm run dev
```

Buka alamat Local yang dicetak server (default http://localhost:5173). Username admin: `admin`; username siswa contoh: `siswa`. Kata sandi sesuai `.dev.vars`. Migrasi di atas hanya dijalankan sekali pada database lokal kosong. Database lokal tersimpan di `.wrangler/state`; jangan hapus direktori itu jika ingin mempertahankan progres. Dev server dan preview build memakai database yang sama.

Jika aplikasi sudah disiapkan, cukup jalankan `npm run dev` dari folder `tts-web` untuk membuka kembali.

## Menguji

```sh
npm test
npm run typecheck
npm run build
```

Tes integrasi menggunakan database SQLite sementara dan menjalankan handler API yang sama dengan aplikasi. Mencakup autentikasi dan isolasi data user, reset sandi, generator huruf/angka/0, publikasi, revisi, kuota bantuan dan skor, progres terpisah, tenggat di server, percobaan ulang, dan laporan. Tidak mengubah database pengujian manual.

## Alur pengujian manual

1. Login admin; buka Kelola level. Tersedia dua level contoh per tipe.
2. Buat draft berisi petunjuk dan kunci, pilih mode waktu/kuota, lalu Buat grid otomatis. Jika semua soal terpasang, periksa dan Terbitkan.
3. Buka Akun siswa untuk membuat siswa baru atau mereset sandinya.
4. Login siswa melalui browser lain atau jendela privat. Buka level 1; ketuk kotak dan ketik melalui keyboard laptop atau keyboard bawaan HP (keypad angka untuk Matematika). Gunakan petunjuk untuk mengganti jawaban aktif.
5. Uji Buka 1 huruf/digit dan Cek Kata. Semua jawaban benar membuka level berikutnya pada tipe yang sama.
6. Untuk menguji timer, admin dapat membuat level dengan batas 10 detik. Tutup tab lalu buka kembali setelah tenggat; hasil menjadi Waktu habis.
7. Saat siswa sedang bermain, admin mengubah dan menerbitkan materi. Permainan aktif tetap pada versi lama; percobaan baru memakai versi baru.
8. Lihat Progres & hasil pada akun admin. Hasil dan versi lama tetap tersimpan.

## Teknis

React + Vinext/Vite, Cloudflare Worker, database D1/SQLite, migrasi Drizzle. Kunci lengkap hanya tersedia bagi admin dan pemeriksaan server. Password di-hash PBKDF2; sesi cookie HttpOnly; mutasi memeriksa origin dan header aplikasi. Konflik penyimpanan antarperangkat menggunakan revision agar isian lama tidak menimpa yang baru secara diam-diam.

Batas generator: 1–20 soal, maksimal 24 karakter per jawaban, grid maksimal 40×40. Matematika hanya digit 0–9. Jawaban perlu karakter persilangan yang cocok; jika tidak berhasil disusun, publikasi ditahan dan admin memperbaiki kumpulan soal. Generator melakukan pencarian terbatas; kegagalan tidak berarti secara matematis tidak ada susunan yang mungkin.

## Vercel

Versi dalam repository ini belum kompatibel untuk deployment langsung ke Vercel. Script `build` menghasilkan Cloudflare Worker melalui Vinext, dan `app/api/[...path]/route.ts` mengimpor `cloudflare:workers` untuk database D1. Mengubah preset Vercel saja belum cukup.

Sebelum memakai Vercel, perlu mengubah runtime/build menjadi Next.js, mengganti akses D1 dengan database persisten yang dapat diakses dari Vercel, menjalankan migrasi, dan mengatur secret `BOOTSTRAP_ADMIN_PASSWORD` serta opsional `DEMO_USER_PASSWORD`. Jangan gunakan SQLite file lokal sebagai database produksi serverless. Data pengujian lokal tidak disertakan dalam Git; deployment baru memakai database terpisah.

## Hosting Cloudflare/Sites

`.openai/hosting.json` mempertahankan ID proyek Sites yang dibuat pada sesi awal. Saat sesi dilanjutkan, konektor mengembalikan `project_not_found` untuk ID tersebut; publikasi belum berhasil. Jangan membuat identitas pengganti secara otomatis. Aplikasi lokal tetap dapat dipakai untuk pengujian. Untuk deployment, pulihkan akses proyek dan konfigurasikan kedua variabel lingkungan sebagai secret; database hosting terpisah dari database lokal.

Fitur lanjutan di luar MVP: editor manual, bintang, audio, konfeti, ekspor PDF, dan impor/ekspor JSON.

## Membuka dari ponsel di Wi-Fi yang sama

Jalankan `npm run dev -- --hostname 0.0.0.0` di Mac. Hubungkan ponsel ke Wi-Fi yang sama dan buka `http://<IP-Wi-Fi-Mac>:5173/`. Baca IP dengan `ipconfig getifaddr en0`. Alamat IP dapat berubah ketika jaringan berubah; Mac dan server harus tetap menyala. `localhost` pada ponsel menunjuk ke ponsel itu sendiri. Akses Wi-Fi ini untuk pengujian lokal, bukan publikasi internet.
