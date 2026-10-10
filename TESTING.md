# Catatan pengujian

- `npm test`: handler API asli diuji dengan adaptor D1 berbasis SQLite in-memory, sehingga seluruh pengujian terisolasi dari akun dan progres lokal.
- `npm run typecheck`: pemeriksaan TypeScript.
- `npm run build`: build Worker dan antarmuka browser.
- Pengujian Chrome lokal berhasil: login siswa/admin, input dan auto-advance, Cek Kata, penyelesaian Trivia level 1, pembukaan level 2, laporan hasil, pratinjau, generator, dan penerbitan revisi. Bukti layar ada di `outputs/hasil-permainan.png`.

Koneksi diperlukan untuk penyimpanan dan pemeriksaan jawaban. Saat penyimpanan gagal, isian tetap tampil di halaman, status menunjukkan belum tersimpan, dan tombol Simpan jawaban dapat digunakan untuk mencoba lagi. Navigasi keluar dari permainan dengan isian belum tersimpan ditahan; menutup tab memicu peringatan browser. Timer tetap mengikuti tenggat server.

Belum ada deployment internet yang terverifikasi karena proyek Sites sesi awal tidak ditemukan oleh konektor saat dilanjutkan.

Pembaruan responsif: lebar halaman diperiksa pada viewport 320, 390, 768, dan 1366 piksel; tidak ada overflow horizontal halaman. Grid besar bergeser di dalam area papan. Menu mobile, login siswa, papan, serta tampilan laptop diperiksa di Chrome. Akses jaringan lokal http://192.168.100.242:5173/ merespons HTTP 200; akses dari perangkat ponsel fisik belum diuji.

## Cek Kata: penanda jawaban

- API memeriksa semua soal pada versi percobaan yang dimainkan, dengan status benar, salah, dan belum lengkap. Respons hanya memuat ID soal dan status, tanpa kunci jawaban.
- Tes integrasi memverifikasi campuran jawaban benar/salah, kotak kosong, matematika, serta skor dan revision tetap setelah pemeriksaan.
- Chrome: jawaban salah ditandai merah di papan dan daftar petunjuk; hasil menyebut nomor/arah dan dapat diklik untuk memilih soal. Isian terkait yang berubah membatalkan penanda lama, termasuk soal yang bersilangan.
- Chrome: hapus satu karakter lalu Cek Kata menampilkan Belum lengkap; isian pengujian dikembalikan seperti semula.
- Layar 390×844: tombol hasil membungkus ke baris berikutnya dan tidak menimbulkan overflow halaman.
- Screenshot: `outputs/cek-kata-highlight.png` (lokal, tidak masuk Git).

## Input keyboard bawaan perangkat

- Kotak permainan menggunakan input teks asli dengan `inputmode=text` untuk huruf dan `inputmode=numeric` untuk Matematika. Keyboard virtual aplikasi dihapus; preview admin tetap menampilkan sel statis.
- Chrome desktop: ketik `rat` mengisi R/A/T dan memindahkan fokus, mengganti satu karakter lewat input tanpa keydown juga bekerja. Tempel kata, tombol panah, Backspace pada kotak terisi/kosong, penyimpanan, dan Cek Kata diuji.
- Matematika: huruf ditolak, digit 0 diterima, hapus mundur bekerja, atribut `inputmode=numeric` terverifikasi.
- Native `beforeinput` menangani penghapusan dari keyboard perangkat, termasuk kotak kosong, tanpa bergantung pada keydown.
- Layout Chrome pada 390×844 tidak overflow; input menggunakan ukuran huruf minimal 16 px. Screenshot lokal: `outputs/input-native-mobile.png` dan `outputs/input-native-laptop.png`.
- Batas verifikasi: belum diuji dengan keyboard sistem di perangkat Android/iPhone fisik. UAT perangkat: ketuk kotak, pastikan keyboard muncul (angka untuk Matematika), isi berurutan, ganti arah persilangan, hapus kotak kosong/terisi, lalu sembunyikan dan buka kembali keyboard.
