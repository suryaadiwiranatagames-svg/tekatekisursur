# Catatan pengujian

- `npm test`: handler API asli diuji dengan adaptor D1 berbasis SQLite in-memory, sehingga seluruh pengujian terisolasi dari akun dan progres lokal.
- `npm run typecheck`: pemeriksaan TypeScript.
- `npm run build`: build Worker dan antarmuka browser.
- Pengujian Chrome lokal berhasil: login siswa/admin, input dan auto-advance, Cek Kata, penyelesaian Trivia level 1, pembukaan level 2, laporan hasil, pratinjau, generator, dan penerbitan revisi. Bukti layar ada di `outputs/hasil-permainan.png`.

Koneksi diperlukan untuk penyimpanan dan pemeriksaan jawaban. Saat penyimpanan gagal, isian tetap tampil di halaman, status menunjukkan belum tersimpan, dan tombol Simpan jawaban dapat digunakan untuk mencoba lagi. Navigasi keluar dari permainan dengan isian belum tersimpan ditahan; menutup tab memicu peringatan browser. Timer tetap mengikuti tenggat server.

Belum ada deployment internet yang terverifikasi karena proyek Sites sesi awal tidak ditemukan oleh konektor saat dilanjutkan.

Pembaruan responsif: lebar halaman diperiksa pada viewport 320, 390, 768, dan 1366 piksel; tidak ada overflow horizontal halaman. Grid besar bergeser di dalam area papan. Menu mobile, login siswa, papan, serta tampilan laptop diperiksa di Chrome. Akses jaringan lokal http://192.168.100.242:5173/ merespons HTTP 200; akses dari perangkat ponsel fisik belum diuji.
