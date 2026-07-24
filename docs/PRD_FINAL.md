# PRODUCT REQUIREMENT DOCUMENT (PRD) FINAL
## MahaTeams New Gen — Sistem Manajemen Presensi & Operasional Studio

---

## 1. PENDAHULUAN & KONSEP UTAMA

### 1.1. Latar Belakang
**MahaTeams New Gen** adalah sistem aplikasi presensi web generasi terbaru yang dirancang khusus untuk mengelola kehadiran dan operasional harian di **Mahative Studio** dan **Kipa**. Aplikasi ini dibangun untuk menggantikan sistem presensi lama dengan alur kerja yang lebih terstruktur, aman, serta mendukung pengelolaan multi-studio dalam satu platform terpusat.

### 1.2. Tujuan Proyek
Menyediakan platform manajemen kehadiran karyawan yang akurat, real-time, dan mudah dipantau oleh manajemen (Super Admin & Admin) maupun karyawan (Member), dengan fokus utama pada:
*   Pencatatan presensi fisik (WFO) menggunakan kartu QR statis.
*   Pencatatan presensi jarak jauh (WFH) yang disertai rencana kerja dan laporan harian wajib.
*   Manajemen saldo hari kerja (*workday balance*) untuk melacak utang hari kerja akibat ketidakhadiran (Alpha, Sakit/Izin tanpa bukti).
*   Sistem sinyal harian (*daily signals*) seperti Team Mood, hari ulang tahun, dan kalender acara studio.

---

## 2. MANAJEMEN PENGGUNA & PERAN (ROLES & ACCESS CONTROL)

Sistem membedakan hak akses berdasarkan tiga tingkat peran pengguna utama:

### 2.1. Tingkat Peran (Roles)
1.  **Super Admin (Owner)**
    *   Pemilik studio Mahative & Kipa.
    *   Memiliki hak akses penuh ke seluruh studio, pengaturan sistem global, dan *audit logs*.
    *   Dapat membuat, mengedit, mengarsipkan, atau mengubah status akun seluruh user.
    *   Merupakan satu-satunya peran yang berhak menyetujui pengajuan WFH mandiri dan perubahan status akun aktif/nonaktif.
2.  **Admin**
    *   Pengelola operasional studio tertentu (Mahative atau Kipa).
    *   Dapat memantau kehadiran anggota, memproses izin/sakit, dan mengajukan koreksi presensi untuk anggota di studionya.
    *   Memiliki akses "Dual-View" (dapat absen secara personal sekaligus mengelola studio).
3.  **Member**
    *   Karyawan biasa yang wajib melakukan presensi harian.
    *   Melihat dashboard personal, kalender kerja pribadi, log kehadiran pribadi, dan menu pengajuan request.

### 2.2. Status Anggota (Member Status)
*   **TEAM**: Karyawan tetap/kontrak. Berhak mengajukan cuti tahunan (`LEAVE`) yang mengurangi `annualLeaveBalance` tanpa mengurangi `workDayBalance`.
*   **INTERN**: Anggota magang. Memiliki masa berlaku akun terbatas berdasarkan *Start Date* dan *End Date*. **INTERN diblokir dari pengajuan WFH** dan tidak memiliki fasilitas cuti tahunan (`LEAVE`), melainkan menggunakan dispensation (`DISPENSATION`).

### 2.3. Kebijakan Keamanan Akun
*   **Registrasi Publik Mandiri**: Dinonaktifkan secara permanen untuk umum. Semua akun karyawan baru wajib dibuat secara terpusat oleh Admin atau Super Admin melalui halaman `/roles`.
*   **Sesi Login**: Mendukung opsi **Remember Me**. Jika dicentang, sesi login/cookie aktif selama 30 hari. Jika tidak, cookie kedaluwarsa dalam 24 jam.

---

## 3. SISTEM KEHADIRAN (ATTENDANCE SYSTEM)

Aplikasi membagi metode kehadiran menjadi dua mode kerja:

### 3.1. Work From Office (WFO)
*   **QR Card Statis**: Member mengaktifkan satu QR Card statis di awal pembuatan akun. QR Card ini dapat diunduh (format PNG/JPEG).
*   **Scan QR Presensi Cepat**: Presensi WFO dilakukan dengan mengarahkan QR Card ke webcam pada halaman depan (`/login`).
*   **Quick-Attend Logic**:
    *   Jika user belum check-in hari ini, pemindaian QR otomatis mencatat **Check-in**.
    *   Jika user sudah check-in dan sesi login-nya habis, pemindaian QR di halaman depan akan mendeteksi sesi dan melakukan masuk kembali tanpa meng-check-out presensi harian secara tidak sengaja.
*   **Notifikasi Layar Scan**: Layar scanner di halaman depan otomatis menampilkan pesan peringatan jika jadwal hari itu bukan WFO (seperti WFH, Cuti, Sakit, atau Libur) beserta tombol langsung untuk menuju ke Dashboard.

### 3.2. Work From Home (WFH)
*   **Tanpa QR Scanner**: WFH tidak menggunakan pemindaian QR di halaman depan.
*   **Persyaratan Dokumen Jurnal**:
    *   **Saat Check-in (Pagi)**: Member wajib mengisi secara tertulis **WFH Work Plan** (rencana kerja hari itu) pada dashboard pribadi sebelum check-in dinyatakan valid.
    *   **Saat Check-out (Sore)**: Member wajib mengisi **WFH Work Report** (laporan hasil kerja harian) sebelum menekan tombol check-out.
*   **Pemberian Izin WFH**: WFH bersifat mandiri namun wajib disetujui (ACC) terlebih dahulu oleh Super Admin agar jadwal kerja harian terbarui menjadi mode WFH.

### 3.3. Sistem Validasi Lokasi (Geofencing)
*   **Radius Koordinat**: Sistem melacak koordinat GPS saat check-in dan check-out WFO.
*   **Toleransi Radius**: Jika koordinat absen berada di luar batas radius aman yang ditentukan untuk studio bersangkutan, presensi tetap diterima namun diberi label status **OUTSIDE_RADIUS** (soft warning) pada log administratif.

---

## 4. KEBIJAKAN JAM KERJA & PENCEGAHAN ERROR

### 4.1. Jam Operasional Default
*   **Jam Check-in**: Pukul **08:00 AM**.
*   **Batas Toleransi Keterlambatan**: **10 menit** (maksimal 08:10 AM). Presensi setelah pukul 08:10 AM otomatis dikategorikan sebagai **LATE** (Terlambat).
*   **Jam Check-out**: Pukul **16:00 PM** (4 sore).

### 4.2. Kebijakan Penguncian Check-out (Early Out Policy)
*   Anggota tidak dapat melakukan check-out lebih awal dari jam pulang yang ditentukan kecuali disetujui secara khusus. Tombol check-out akan terkunci dan menampilkan informasi jam buka check-out.

### 4.3. Pencegahan Overlap Presensi (Absen Menggantung)
*   **Pencegahan Check-in Baru**: Anggota **diblokir dari check-in hari baru** jika catatan kehadiran hari kerja sebelumnya belum melakukan check-out. 
*   **Penyelesaian**: Anggota diharuskan mengajukan koreksi presensi (*Correction Request*) untuk melengkapi jam keluar hari sebelumnya sebelum diperbolehkan melakukan check-in hari ini.

---

## 5. MANAJEMEN SALDO HARI KERJA (WORKDAY BALANCE & DEBT SYSTEM)

`workDayBalance` digunakan untuk menghitung kewajiban hari kerja karyawan secara kumulatif.

### 5.1. Skema Nilai Saldo
*   **Negatif (`< 0`)**: Karyawan memiliki utang hari kerja (misal: `-1` = utang 1 hari).
*   **Nol (`0`)**: Saldo seimbang (lunas).
*   **Positif (`> 0`)**: Karyawan memiliki surplus hari kerja yang bisa disimpan atau dikonversi.

### 5.2. Jadwal Kerja Default & Extra Workday
*   **Hari Kerja Default**: **Selasa s/d Sabtu** (5 hari kerja).
*   **Hari Libur Default**: **Minggu & Senin**.
*   **Aturan Extra Workday (Kompensasi)**:
    *   Jika anggota bekerja pada hari Minggu atau Senin (berdasarkan aturan `WeeklyWorkRule` studio yang menandakan hari tersebut bukan hari kerja) dan melakukan check-out dengan sukses, hari tersebut dihitung sebagai **Extra Workday**.
    *   Setiap Extra Workday yang valid akan menambah saldo `workDayBalance` sebesar **+1** (berfungsi melunasi utang hari kerja atau menambah surplus).
    *   Penghitungan surplus **hanya dilakukan setelah check-out selesai**, tidak boleh saat baru check-in untuk mencegah manipulasi kehadiran.

### 5.3. Aturan Ketidakhadiran & Dampak Saldo
Sistem mencatat lima jenis ketidakhadiran dengan aturan saldo berikut:

| Status Request | Status Attendance | Target Anggota | Pengurangan Saldo Kerja (`workDayBalance`) | Keterangan Aturan |
| :--- | :--- | :--- | :--- | :--- |
| **SICK** (Ada lampiran) | `SICK` | TEAM & INTERN | **0** (Tidak Mengurangi) | Lampiran surat sakit diunggah saat hari-H. Tidak wajib ganti hari. |
| **SICK** (Tanpa lampiran) | `SICK` | TEAM & INTERN | **-1** (Mengurangi) | Surat sakit tidak diunggah. Dianggap absen sakit biasa dan wajib ganti hari. |
| **PERMISSION** | `PERMISSION` | TEAM & INTERN | **-1** (Mengurangi) | Izin pribadi. Wajib diajukan minimal H-1 sebelum jam kerja. Wajib ganti hari. |
| **LEAVE** | `LEAVE` | Hanya TEAM | **0** (Mengurangi `annualLeaveBalance`) | Cuti resmi tahunan. Mengurangi jatah cuti, tidak mengurangi saldo hari kerja. Intern dilarang mengajukan. |
| **DISPENSATION** | `DISPENSATION` | TEAM & INTERN | **0** (Tidak Mengurangi) | Izin dinas/tugas luar. Tidak mengurangi saldo kerja dan tidak wajib ganti hari. |
| **ALPHA** | `ALPHA` | TEAM & INTERN | **-1** (Mengurangi) | Tidak hadir tanpa request atau presensi sampai batas waktu cutoff. Wajib ganti hari. |

---

## 6. ALUR KOREKSI KEHADIRAN (ATTENDANCE CORRECTION)

Anggota dapat mengajukan koreksi presensi jika terjadi kesalahan pencatatan atau lupa melakukan check-out pada hari sebelumnya.

### 6.1. Batasan Rentang Waktu Pengajuan
*   Koreksi hanya diizinkan untuk catatan kehadiran dengan rentang tanggal **H-2 hingga H-7** dari hari pengajuan.
*   Presensi Hari Ini (H-0) dan Kemarin (H-1) tidak dapat dikoreksi melalui form ini untuk memastikan kedisiplinan pelaporan real-time.

### 6.2. Logika Konversi Status & Dampak Saldo Kerja
Saat Admin menyetujui koreksi dari status **ALPHA** ke status lain, sistem menghitung ulang `workDayBalance` dengan aturan sebagai berikut:

1.  **ALPHA ➔ SICK (Dengan Lampiran)**
    *   Utang hari kerja akibat Alpha dihapus.
    *   Saldo `workDayBalance` bertambah **+1** dari nilai saat berstatus Alpha (kembali netral).
2.  **ALPHA ➔ SICK (Tanpa Lampiran)**
    *   Tetap dianggap memiliki utang hari kerja (wajib ganti hari).
    *   Saldo `workDayBalance` tidak berubah (tetap membawa debt Alpha).
3.  **ALPHA ➔ PERMISSION**
    *   Izin pribadi tetap mewajibkan ganti hari.
    *   Saldo `workDayBalance` tidak berubah.
4.  **ALPHA ➔ LEAVE**
    *   Mengubah Alpha menjadi Cuti Resmi (hanya untuk status `TEAM`).
    *   Utang hari kerja akibat Alpha dihapus (`workDayBalance` naik **+1** dari posisi Alpha).
    *   Jatah cuti tahunan (`annualLeaveBalance`) berkurang **-1**.
5.  **ALPHA ➔ DISPENSATION**
    *   Dispensasi resmi tidak dikenakan utang hari kerja.
    *   Utang hari kerja Alpha dihapus (`workDayBalance` bertambah **+1** dari posisi Alpha).
6.  **ALPHA ➔ ON_TIME / LATE**
    *   Koreksi membuktikan kehadiran fisik secara nyata (wajib melampirkan jam check-in/out).
    *   Utang hari kerja Alpha dihapus (`workDayBalance` bertambah **+1** dari posisi Alpha).

---

## 7. SINYAL HARIAN (DAILY SIGNALS & MOOD)

### 7.1. Pencatatan Mood Presensi
*   **Konseptual**: Mood bukan profil permanen karyawan melainkan indikator kondisi harian. Data mood disimpan langsung pada tabel `AttendanceRecord` harian.
*   **Validasi Pilihan Mood**: Sistem membatasi opsi input mood pada daftar berikut: `HAPPY`, `CALM`, `FOCUSED`, `ENERGETIC`, `TIRED`, `STRESSED`, `EXCITED`, `SAD`, `ANGRY`, `COOL`, `CAFFEINATED`, `NEUTRAL`.
*   **Alur Pengisian**: Setelah sukses melakukan check-in (WFO) atau mengirim rencana kerja (WFH), user otomatis diarahkan ke halaman `/member/mood` untuk memilih mood dan menulis status singkat mengenai fokus kerjanya hari itu.
*   **Halaman Team Mood**: Menampilkan ringkasan mood anggota tim yang sudah check-in pada hari ini (zona waktu Asia/Jakarta). Anggota yang belum check-in ditampilkan pada bagian terpisah.

### 7.2. Birthday Signal (Ulang Tahun Hari Ini)
*   Sistem membandingkan tanggal dan bulan hari ini dengan `User.birthDate` (mengabaikan tahun lahir).
*   **Scope Visibilitas**:
    *   *Super Admin*: Dapat melihat ulang tahun seluruh anggota di semua studio.
    *   *Admin*: Hanya melihat ulang tahun anggota di studio yang dikelolanya.
    *   *Member*: Hanya melihat ulang tahun rekan kerja di studio asal yang sama.
*   Pengguna dengan status akun `INACTIVE` atau `ARCHIVED` otomatis dikecualikan.

### 7.3. Event Studio Signal
*   Menampilkan informasi dari kalender studio (`CalendarEvent`) jika hari ini bertepatan dengan rentang waktu acara seperti `STUDIO_EVENT`, `NATIONAL_HOLIDAY`, `COMPANY_LEAVE`, atau `REPLACEMENT_WORKDAY`.

---

## 8. INTEGRASI ANTARMUKA & DASBOR (UX & REPORTS)

### 8.1. Dasbor Super Admin (Live Monitor)
*   Menampilkan ringkasan data operasional lintas studio (Mahative vs Kipa).
*   Dilengkapi monitor live untuk: total antrean pengajuan yang tertunda (*pending requests*), log peringatan geofencing (*geofence warnings*), dan jadwal piket harian seluruh studio.
*   Akses ke halaman *Audit Trail* (`/super-admin/audit-logs`) untuk memantau aktivitas konfigurasi para admin.

### 8.2. Dasbor Admin (Dual-View)
*   Menggunakan tab switcher di halaman `/admin` untuk memisahkan kebutuhan operasional:
    *   **Tab My Activity**: Layanan mandiri bagi Admin untuk check-in, check-out, melihat kalender pribadi, dan mengisi jurnal piket/mood harian.
    *   **Tab Studio Management**: Panel pemantauan studio, persetujuan cepat pengajuan izin/koreksi staf, serta pembuatan pengumuman studio.

### 8.3. Tabel Laporan Dua Tab (`/laporan-presensi`)
Halaman pemantauan presensi tim oleh Admin/Super Admin disederhanakan menjadi dua tab utama untuk kemudahan pemantauan cepat:
1.  **Tab Log Kehadiran**: Menampilkan log umum kedatangan dan kepulangan tim hari ini. Kolom teknis seperti detail koordinat GPS, lat/long, jarak meter, dan status verifikasi dipindahkan ke **Detail View Modal** agar tabel tetap bersih. Filter kategori "Izin" ditiadakan untuk menjaga keakuratan log kehadiran fisik.
2.  **Tab Jurnal & Hasil WFH**: Menampilkan rekapitulasi rencana kerja (WFH Plan) pagi hari bersandingan dengan laporan hasil kerja sore hari (WFH Report) anggota tim secara transparan.

---

## 9. FITUR EKSTRA & LOG OPERASIONAL

### 9.1. Ekspor Dokumen
*   Mendukung pengunduhan data presensi bulanan ke dalam format berkas **Excel (.xlsx)**.
*   Tata letak cetak dokumen dirancang khusus agar rapi saat dicetak atau disimpan ke dalam format **PDF** dengan menyembunyikan elemen navigasi menu samping (*sidebar*) dan atas (*header*).

### 9.2. Pengingat & Notifikasi Email (Cron Job)
*   Sistem menjalankan tugas terjadwal (*cron jobs*) otomatis di `/api/cron/reminders` untuk memicu notifikasi:
    *   **Pagi**: Pengingat check-in presensi.
    *   **Sore**: Pengingat check-out presensi.
    *   **Hari-H**: Pengingat penugasan piket kebersihan studio.
*   Notifikasi dikirim secara real-time ke kotak masuk dalam aplikasi (Bell notification badge) dan juga diteruskan ke alamat email terdaftar pengguna menggunakan Nodemailer (dengan fallback konsol pada lingkungan pengembangan).

### 9.3. Audit Trail Administrator
*   Setiap tindakan kritis (seperti pembuatan akun, pengubahan default studio, placement lintasan, persetujuan cuti, perubahan status akun) otomatis dicatat dalam tabel audit log database untuk menjamin akuntabilitas manajemen studio.
