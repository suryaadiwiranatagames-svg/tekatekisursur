# Product Requirements Document (PRD)
## Web App TTS Interaktif Edukasi Anak SD (Kelas 4, 5, 6)

- **Target pengguna**: Siswa SD kelas 4–6 dan guru/admin pembuat materi.
- **Versi**: 1.1.0.
- **Tanggal penyusunan dan revisi**: 10 Oktober 2026.
- **Status**: Acuan kebutuhan MVP berdasarkan hasil diskusi produk.

## 1. Visi dan Tujuan Produk

TTS Interaktif adalah satu aplikasi web untuk belajar melalui teka-teki silang. Aplikasi menyediakan area admin/office dan area user yang menggunakan layanan server serta database bersama.

Admin mengelola akun user, petunjuk soal, kunci jawaban, dan level. User memainkan level secara berurutan dengan progres yang tersimpan di akun. Perubahan materi yang diterbitkan admin tersedia untuk percobaan baru user tanpa pemindahan file antarperangkat.

Keberhasilan MVP diukur dari alur lengkap: admin membuat akun dan menerbitkan materi, user menyelesaikan level, level berikutnya terbuka, dan hasilnya terlihat di laporan admin.

## 2. Tipe Materi dan Struktur Level

| Tipe TTS | Bentuk petunjuk | Format jawaban | Contoh |
|---|---|---|---|
| Bahasa Indonesia (Pengetahuan Umum) | Pertanyaan pengetahuan umum | Kata, huruf A–Z | Planet tempat kita tinggal → BUMI |
| Matematika | Soal matematika | Bilangan bulat ≥ 0, digit 0–9 | 12 × 10 → 120 |
| Bahasa Inggris (Pengetahuan Umum) | Petunjuk berbahasa Indonesia | Kosakata bahasa Inggris, huruf A–Z | Kucing → CAT |

- Setiap tipe memiliki rangkaian level 1, 2, 3, dan seterusnya serta progres yang terpisah.
- Level 1 pada setiap tipe dapat diakses ketika sudah diterbitkan. Jika belum ada level terbit, tampilkan informasi bahwa materi belum tersedia.
- Level baru ditambahkan di akhir urutan tipe tersebut. Pengurutan ulang dan penyisipan level di tengah bukan fitur MVP.
- Kelas 4, 5, dan 6 merupakan metadata materi; tidak membentuk jalur progres berbeda dan tidak membatasi akses user.
- Judul, topik, petunjuk, dan jumlah jawaban disiapkan admin. Materi awal tidak diambil otomatis dari gambar referensi.
- Gambar di folder `Contoh TTS` digunakan sebagai referensi tampilan worksheet dan papan.

## 3. Akun dan Hak Akses

### 3.1. Peran Admin / Office

Admin dan office adalah satu peran dengan hak akses yang sama:

- Login menggunakan username dan kata sandi.
- Membuat akun user dengan username dan kata sandi awal tanpa mewajibkan email siswa.
- Mereset kata sandi user jika diperlukan; kata sandi lama tidak ditampilkan.
- Mengelola materi, menghasilkan grid, memeriksa pratinjau, dan menerbitkan level.
- Melihat progres dan hasil seluruh user.

### 3.2. Peran User

- Login menggunakan akun yang dibuat admin. Pendaftaran mandiri dan login Google bukan fitur MVP.
- Melihat level yang tersedia, melanjutkan percobaan aktif, atau mengulang level yang sudah terbuka.
- Mengakses progres dan hasil miliknya sendiri.
- Tidak dapat mengelola akun, melihat kunci lengkap, atau mengubah materi dan hasil.

Server harus memeriksa peran dan kepemilikan data pada setiap operasi yang membutuhkan autentikasi. Perlindungan halaman admin tidak cukup hanya dengan menyembunyikan menu atau PIN di browser.

## 4. Area Admin: Materi, Generator, dan Publikasi

### 4.1. Pengelolaan Materi

Setiap level memuat:

- Tipe TTS, judul, topik, dan metadata kelas.
- Daftar soal yang masing-masing terdiri dari petunjuk dan kunci jawaban.
- Pengaturan batas waktu dan kuota bantuan.
- Grid hasil generator, penempatan jawaban, serta nomor Mendatar dan Menurun.
- Status `Draft` atau `Published` dan versi materi terbit.

Normalisasi dan validasi kunci:

- Bahasa Indonesia dan Bahasa Inggris: ubah ke huruf kapital dan hilangkan spasi untuk pengisian grid. Setelah normalisasi, jawaban harus berisi huruf A–Z dan tidak boleh kosong.
- Matematika: jawaban hanya digit 0–9; jawaban `0` valid. Pecahan, desimal, tanda minus, dan simbol operasi tidak menjadi isi kotak pada MVP.
- Simbol operasi boleh muncul di petunjuk Matematika.
- Petunjuk wajib diisi. Format yang tidak didukung harus ditolak dengan pesan yang jelas, bukan diam-diam mengubah makna jawaban.

### 4.2. Generator Otomatis

Alur admin: **buat draft → masukkan petunjuk dan kunci → hasilkan grid → periksa pratinjau → terbitkan**.

- Generator mendukung jawaban huruf maupun angka. Satu kotak berisi satu huruf atau satu digit.
- Persilangan hanya valid jika karakter kedua jawaban pada kotak yang sama identik.
- Setiap jawaban harus ditempatkan utuh, berada dalam batas grid, dan memiliki petunjuk yang sesuai. Susunan tidak boleh membentuk rangkaian jawaban tambahan tanpa petunjuk.
- Sistem memberikan nomor awal kata secara otomatis sesuai urutan baris dan kolom. Kotak awal yang sama menggunakan nomor yang sama untuk Mendatar dan Menurun.
- Ukuran grid menyesuaikan hasil susunan; pilihan tetap 8×8 sampai 15×15 dari PRD sebelumnya tidak menjadi batas wajib.
- Pratinjau admin menampilkan grid, penomoran, petunjuk, dan kunci agar materi dapat diperiksa sebelum diterbitkan.
- Jika ada jawaban yang tidak bisa ditempatkan atau persilangan tidak valid, tampilkan daftar masalah dan tahan penerbitan. Tidak boleh ada soal yang dibuang tanpa diketahui admin.
- Admin dapat memperbaiki kumpulan soal dan menjalankan generator kembali. Editor posisi manual bukan fitur MVP.

### 4.3. Publikasi dan Pembaruan

- Draft belum terlihat oleh user. Penerbitan hanya tersedia ketika materi, pengaturan permainan, dan grid valid.
- Mengubah materi terbit dilakukan melalui draft revisi. Versi sebelumnya tetap tersedia untuk percobaan baru sampai revisi diterbitkan.
- Perubahan petunjuk atau kunci harus diikuti regenerasi dan validasi grid sebelum penerbitan revisi.
- Penerbitan revisi menghasilkan versi baru pada identitas level yang sama, tanpa mengubah urutannya.
- Percobaan baru memakai versi terbit terbaru; percobaan aktif tetap memakai versi saat dimulai, termasuk ketika dilanjutkan dari perangkat lain.
- Pembaruan soal atau kunci tidak menghapus hasil maupun mencabut kelulusan sebelumnya.

## 5. Area User: Papan dan Aturan Permainan

### 5.1. Pemilihan Tipe dan Level

- Halaman utama menampilkan pilihan Bahasa Indonesia (Pengetahuan Umum), Matematika, dan Bahasa Inggris (Pengetahuan Umum).
- Daftar level menampilkan judul, metadata kelas, jumlah jawaban, pengaturan waktu, status akses, status selesai, dan skor terbaik jika sudah ada hasil berhasil.
- User dapat membedakan level terkunci, level yang dapat dimainkan, dan level yang sudah selesai.
- Menyelesaikan satu tipe tidak membuka level pada tipe lain.

### 5.2. Input dan Navigasi

- Grid menampilkan karakter besar, nomor petunjuk yang jelas, dan kotak nonjawaban yang berbeda secara visual.
- Kotak aktif memiliki bingkai kontras; seluruh jawaban aktif mendapat sorotan latar.
- Setelah memasukkan karakter, kursor berpindah ke kotak berikutnya dalam jawaban aktif.
- Backspace menghapus karakter aktif; jika kotak kosong, kursor mundur dalam jawaban aktif.
- Mengklik kotak persilangan kembali mengganti arah aktif antara Mendatar dan Menurun.
- Mendukung tombol panah keyboard, klik/sentuhan, dan papan tombol virtual sesuai tipe: huruf untuk Bahasa Indonesia/Bahasa Inggris, angka untuk Matematika.
- Petunjuk aktif selalu terlihat. Memilih petunjuk dari daftar Mendatar atau Menurun memfokuskan jawaban terkait.
- Masukan selain format karakter tipe tersebut ditolak. Huruf kecil diterima dan ditampilkan sebagai huruf kapital.

### 5.3. Kelulusan dan Progres

- Server memeriksa penyelesaian setelah isian tersimpan. Level selesai jika semua jawaban benar dan, untuk level berbatas waktu, belum mencapai tenggat.
- Isian penuh yang masih salah tidak menyelesaikan level.
- Kelulusan membuka level berikutnya pada tipe yang sama, jika sudah diterbitkan. Jika belum terbit, aksesnya tersedia ketika admin menerbitkannya.
- Penggunaan bantuan dan skor rendah tidak menghalangi kelulusan.
- User dapat mengulang level yang sudah terbuka. Percobaan ulang tidak menghapus hasil atau mengunci kembali level yang sudah terbuka.

### 5.4. Waktu dan Percobaan

Admin memilih satu mode untuk setiap level:

| Mode | Perilaku |
|---|---|
| Tanpa batas waktu | User boleh mengerjakan sampai selesai; durasi tetap dicatat. |
| Dengan batas waktu | Admin menetapkan durasi positif; server menetapkan tenggat saat percobaan dimulai. |

- Waktu dan status percobaan ditentukan server. Mengubah jam perangkat tidak memperpanjang tenggat.
- Timer berbatas terus berjalan ketika tab ditinggalkan, browser ditutup, atau perangkat diganti. Melanjutkan percobaan tidak mereset waktu.
- Saat tenggat tercapai, percobaan berakhir dengan status waktu habis. Isian setelah tenggat tidak dapat membuat percobaan tersebut lulus.
- User dapat memulai percobaan baru dengan isian, skor, kuota bantuan, dan waktu yang direset; percobaan baru memakai versi terbit terbaru.
- Hasil percobaan yang berakhir tetap disimpan. Durasi hasil tidak terus bertambah setelah percobaan berakhir.
- Tanpa koneksi, aplikasi tidak boleh menyatakan kelulusan atau pemberian bantuan berhasil sebelum server mengonfirmasinya. Tenggat tetap berlaku.

### 5.5. Bantuan dan Skor

- **Buka 1 Huruf / Buka 1 Digit** membuka karakter benar pada kotak aktif, memakai satu kuota, dan mengurangi skor 5 poin.
- Kuota bantuan ditetapkan admin per level sebagai bilangan bulat ≥ 0. Kuota 0 berarti bantuan pembukaan karakter tidak tersedia.
- Karakter yang sudah dibuka tetap terlihat benar dan tidak dapat diedit. Mengulang permintaan untuk kotak tersebut tidak memakai kuota atau mengurangi skor lagi.
- Jika kuota habis, tombol pembukaan karakter tidak dapat digunakan.
- **Cek Kata** memeriksa jawaban aktif di server, menampilkan benar, salah, atau belum lengkap, tanpa membocorkan kunci jawaban lengkap.
- Cek Kata gratis, tanpa batas penggunaan, dan tidak memakai kuota bantuan.
- Skor awal setiap percobaan adalah **100**. Rumus skor: **maksimum(0, 100 − 5 × jumlah karakter yang dibuka melalui bantuan)**.
- Waktu dan penggunaan Cek Kata tidak memberi penalti tambahan. Tidak ada bobot nilai berbeda per kata pada MVP.

### 5.6. Hasil Permainan

- Setelah berhasil, tampilkan skor, durasi, jumlah bantuan, serta pilihan mengulang atau melanjutkan ke level berikutnya yang tersedia.
- Setelah waktu habis, tampilkan status percobaan dan pilihan mencoba lagi; level berikutnya tidak terbuka dari percobaan tersebut.
- Bintang, efek suara, dan konfeti dikembangkan setelah MVP.

## 6. Penyimpanan, Sinkronisasi, dan Antarmuka Data

### 6.1. Data Terpusat

Server dan database menyimpan:

- Akun dan peran.
- Level, urutan per tipe, draft, versi terbit, petunjuk, kunci, grid, dan konfigurasi permainan.
- Percobaan milik user, versi level yang dimainkan, waktu mulai/tenggat, isian, penggunaan bantuan, status, skor, dan durasi hasil.
- Kelulusan serta akses level per user dan per tipe.

Setiap percobaan terikat pada versi yang mencakup petunjuk, kunci, grid, pengaturan waktu, dan kuota bantuan. Versi yang sudah dipakai percobaan tidak diubah oleh revisi admin.

### 6.2. Kebutuhan Antarmuka Server

Antarmuka server harus mendukung autentikasi, pengelolaan akun oleh admin, pengelolaan draft/publikasi, generator dan pratinjau, daftar level berdasarkan akses user, mulai/lanjut percobaan, simpan isian, cek jawaban, buka karakter, pemeriksaan penyelesaian, serta laporan admin.

- Respons permainan untuk user memuat grid, posisi jawaban, petunjuk, status, dan informasi permainan yang diperlukan; tidak memuat kunci lengkap.
- Kunci hanya tersedia untuk operasi admin yang berwenang dan pemeriksaan di server. Bantuan hanya mengembalikan karakter yang dibuka.
- Pembaruan isian, penggunaan kuota, pengurangan skor, dan kelulusan diproses konsisten agar permintaan ulang tidak menggandakan hasil atau biaya bantuan.
- Progres dan isian tersimpan dapat dilanjutkan setelah login di perangkat lain. Data browser bukan sumber kebenaran progres.
- `localStorage` boleh digunakan sebagai cache isian sementara. Ketika dilanjutkan, data disesuaikan dengan identitas percobaan dan status server; cache tidak mereset tenggat atau menimpa hasil akhir.
- Pembaruan tersedia saat user memuat daftar level atau memulai percobaan baru. Pembaruan langsung atas papan yang sedang dimainkan bukan kebutuhan MVP.

## 7. Laporan Admin dan Kebutuhan Non-Fungsional

### 7.1. Laporan Admin

- Daftar user beserta level yang terbuka dan level yang selesai pada masing-masing tipe.
- Riwayat percobaan per user: tipe, level, versi materi, status, waktu mulai/selesai, skor, durasi, dan jumlah bantuan.
- Hasil lama tetap dapat dibaca setelah level diperbarui.
- Analisis kesalahan per soal dan statistik kesulitan lintas user bukan fitur MVP.

### 7.2. Kebutuhan Non-Fungsional

- **Responsivitas**: nyaman pada laptop/Chromebook dan tablet; grid besar tetap dapat dinavigasi tanpa membuat karakter terlalu kecil.
- **Kinerja**: target pemuatan awal di bawah 2 detik pada koneksi pengujian yang disepakati saat implementasi; optimalkan aset dan ukuran respons.
- **Keamanan akun**: simpan kata sandi sebagai hash, lindungi sesi, dan tegakkan autentikasi serta otorisasi di server. Kata sandi dan kunci lengkap tidak masuk cache user.
- **Privasi dan kenyamanan**: bebas iklan pihak ketiga, tidak mewajibkan email siswa, dan batasi data akun pada kebutuhan penggunaan aplikasi.
- **Kejelasan interaksi**: status simpan, gangguan koneksi, generator gagal, level terkunci, serta waktu habis ditampilkan dengan bahasa yang mudah dipahami.

## 8. Kriteria Pengujian Penerimaan MVP

| ID | Skenario | Hasil yang diharapkan |
|---|---|---|
| UAT-01 | Admin membuat akun dan mereset kata sandi user. | User dapat login dengan kredensial berlaku; kata sandi lama tidak ditampilkan dan tidak berlaku setelah reset. |
| UAT-02 | User mencoba operasi admin atau membaca percobaan user lain. | Server menolak akses tanpa membocorkan data. |
| UAT-03 | Admin menyimpan draft lalu menerbitkan level valid. | Draft tidak terlihat oleh user; level terbit muncul pada daftar tipe yang sesuai. |
| UAT-04 | Generator memproses huruf dan angka, termasuk jawaban 0 serta jawaban beberapa digit. | Semua jawaban terpasang utuh, persilangan identik, penomoran sesuai petunjuk, dan tidak ada rangkaian tanpa petunjuk. |
| UAT-05 | Ada jawaban tidak terpasang, persilangan tidak valid, atau format kunci salah. | Masalah dijelaskan; penerbitan ditolak tanpa membuang soal diam-diam. |
| UAT-06 | User memainkan ketiga tipe dengan keyboard dan sentuhan. | Navigasi bekerja; Matematika menerima digit, Bahasa Indonesia/Bahasa Inggris menerima huruf, dan petunjuk mengikuti jawaban aktif. |
| UAT-07 | Semua kotak terisi tetapi ada jawaban salah, lalu user memperbaikinya. | Level berikutnya tetap terkunci sampai semua jawaban benar. |
| UAT-08 | User menyelesaikan level 1 Bahasa Indonesia (Pengetahuan Umum). | Level 2 Bahasa Indonesia (Pengetahuan Umum) terbuka jika terbit; progres Matematika dan Bahasa Inggris tidak berubah. |
| UAT-09 | User lulus memakai bantuan dengan skor rendah atau 0. | Kelulusan tetap membuka level berikutnya; skor dihitung sesuai jumlah karakter yang dibuka. |
| UAT-10 | Kuota bantuan habis, kotak bantuan diminta ulang, atau Cek Kata dipakai berulang. | Kuota tidak terlampaui, bantuan yang sama tidak dikenai biaya ulang, dan Cek Kata tidak mengurangi skor/kuota. |
| UAT-11 | User bermain tanpa batas waktu. | Durasi tercatat; tidak ada kegagalan karena waktu. |
| UAT-12 | User menutup tab pada level berbatas waktu lalu membukanya setelah tenggat. | Percobaan berstatus waktu habis; timer tidak direset dan level berikutnya tidak terbuka. |
| UAT-13 | User mencoba mengirim jawaban setelah tenggat atau mengubah jam perangkat. | Server menolak kelulusan percobaan kedaluwarsa; hanya percobaan baru yang dapat dimainkan kembali. |
| UAT-14 | User melanjutkan percobaan tersimpan dari perangkat lain. | Isian, versi level, sisa kuota, skor, dan tenggat tetap konsisten. |
| UAT-15 | Admin memperbarui soal, kunci, atau konfigurasi ketika user sedang bermain. | Percobaan aktif tetap memakai versi awal; percobaan baru memakai versi revisi setelah diterbitkan. |
| UAT-16 | Admin memperbarui level yang sudah diselesaikan user. | Kelulusan, akses level, dan riwayat hasil lama tetap tersimpan bersama versi asalnya. |
| UAT-17 | Admin menambah level berikutnya setelah user lulus level terakhir yang tersedia. | Level baru berada di akhir urutan dan dapat diakses user yang sudah memenuhi prasyarat. |
| UAT-18 | Admin membuka laporan setelah user berhasil atau kehabisan waktu. | Progres dan riwayat menampilkan status, versi materi, skor, durasi, serta jumlah bantuan yang sesuai. |
| UAT-19 | Respons permainan, cache, dan kode klien diperiksa dari akun user. | Tidak terdapat kunci lengkap; validasi dan skor ditentukan server. |
| UAT-20 | Koneksi terputus saat menyimpan jawaban atau meminta bantuan. | Tidak ada kelulusan palsu atau biaya bantuan ganda; saat tersambung, status mengikuti server dan tenggat tetap berlaku. |

## 9. Roadmap dan Batas MVP

| Fase | Fokus | Target luaran |
|---|---|---|
| Fase 1 — MVP | Akun dan hak akses, data terpusat, admin materi, generator otomatis, tiga tipe TTS, publikasi/versioning, permainan user, progres, timer, bantuan, skor, dan laporan. | Alur admin–user lengkap yang memenuhi seluruh kriteria penerimaan MVP. |
| Fase 2 — Pengayaan | Editor grid manual, bintang, efek suara, dan konfeti. | Pengalaman penyusunan dan permainan yang lebih kaya tanpa mengubah hasil MVP yang sudah tersimpan. |
| Fase 3 — Ekspor | PDF worksheet dan impor/ekspor JSON. | Materi dapat dicetak dan dipindahkan melalui format ekspor yang ditentukan pada fase tersebut. |

MVP tidak mencakup login Google, pendaftaran mandiri user, jalur level terpisah per kelas, jawaban matematika negatif/desimal, analisis per jawaban, atau ekspor. Materi disiapkan admin; stack teknologi, endpoint API terperinci, dan metode deployment ditentukan dalam desain teknis implementasi aplikasi.
