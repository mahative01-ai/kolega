# Attendance Mood Rules

Dokumen ini merangkum aturan final fitur Mood pada sistem presensi Kolega/MahaTeams.

Tanggal diskusi: 21 Juli 2026.

## Konsep Utama

Mood bukan bagian dari profil permanen user.

Mood adalah bagian dari presensi harian. User memilih mood setelah berhasil melakukan check-in, lalu menulis status singkat tentang kondisi atau fokus kerja hari itu.

Artinya:

- Mood berlaku untuk satu tanggal presensi.
- Mood melekat ke record presensi hari itu.
- Mood tidak boleh dianggap sebagai mood permanen di profil user.
- Page Team Mood harus membaca mood dari attendance hari ini, bukan dari field profil user.

## Flow Utama

1. User melakukan presensi WFO atau WFH.
2. Sistem berhasil membuat atau mengupdate `AttendanceRecord` untuk hari itu.
3. User diarahkan ke halaman atau step Mood.
4. User memilih mood.
5. User mengisi status singkat.
6. Sistem menyimpan mood ke attendance record hari itu.
7. User diarahkan ke dashboard.

Mood dipilih setelah presensi berhasil, bukan sebelum presensi.

## Data Model

Rekomendasi paling sederhana adalah menyimpan mood langsung di `AttendanceRecord`, karena mood adalah bagian dari presensi hari tersebut.

Tambahkan field:

- `mood String?`
- `moodNote String?`

Opsional:

- `moodSubmittedAt DateTime?`

Contoh schema:

```prisma
model AttendanceRecord {
  // existing fields
  mood            String?
  moodNote        String?
  moodSubmittedAt DateTime?
}
```

Field lama pada `User`:

- `currentMood`
- `moodNote`

dapat tetap dipakai sementara sebagai cache/avatar cepat, tetapi bukan sumber kebenaran daily mood. Sumber kebenaran mood harian adalah `AttendanceRecord`.

## Mood Options

Mood key yang valid:

- `HAPPY`
- `CALM`
- `FOCUSED`
- `ENERGETIC`
- `TIRED`
- `STRESSED`
- `EXCITED`
- `SAD`
- `ANGRY`
- `COOL`
- `CAFFEINATED`
- `NEUTRAL`

Server action harus memvalidasi mood key. Jika mood key tidak dikenal, request ditolak.

## Status Singkat

Status singkat adalah catatan pendek yang ditulis setelah check-in.

Contoh:

- `Focusing on dashboard layout.`
- `Continuing attendance report.`
- `Feeling tired, but ready to work.`
- `Working on client revision.`

Aturan:

- Status boleh kosong jika studio mengizinkan.
- Jika dibuat wajib, validasi server harus memastikan minimal 1 karakter setelah trim.
- Maksimal karakter sebaiknya dibatasi, misalnya 160 atau 280 karakter.

## WFO Flow

Setelah QR check-in WFO berhasil:

1. Sistem membuat atau mengupdate `AttendanceRecord`.
2. Jika record belum punya mood, redirect ke `/member/mood`.
3. Setelah mood disimpan, redirect ke dashboard member/admin.

Jika user sudah mengisi mood hari itu:

- Jangan paksa isi ulang.
- Redirect langsung ke dashboard atau halaman presensi sesuai flow saat ini.

## WFH Flow

WFH tidak menggunakan QR.

Setelah user mengirim rencana kerja WFH:

1. Sistem membuat atau mengupdate `AttendanceRecord` dengan `workMode = WFH`.
2. User diarahkan ke step Mood.
3. Mood dan status singkat disimpan pada record WFH hari itu.

Jika WFH sudah punya form rencana kerja dan laporan kerja, mood tetap terpisah:

- WFH plan = pekerjaan yang direncanakan.
- WFH report = hasil pekerjaan.
- Mood note = kondisi/status singkat user saat mulai bekerja.

## Route Rekomendasi

Gunakan route khusus:

`/member/mood`

Route ini hanya bisa dibuka jika:

- User sudah login.
- User punya attendance record untuk tanggal hari ini.
- Attendance record sudah check-in atau sudah submit WFH plan.
- Attendance record belum punya mood, atau user sedang melakukan edit mood yang diizinkan.

Jika tidak ada attendance hari ini:

- Redirect ke halaman presensi.

Jika mood sudah ada:

- Redirect ke dashboard, atau tampilkan mode edit jika fitur edit mood diizinkan.

## Team Mood Page

Page `Team Mood` harus menampilkan mood berdasarkan attendance hari ini.

Sumber data:

- `AttendanceRecord` untuk tanggal hari ini berdasarkan timezone Asia/Jakarta.

Yang ditampilkan:

- User yang sudah presensi hari ini.
- Mood hari ini.
- Mood note hari ini.
- Studio user.
- Status attendance hari ini.

Jika user belum presensi:

- Tidak perlu dihitung sebagai shared mood.
- Bisa tidak ditampilkan, atau ditampilkan dalam section terpisah `Not checked in yet`.

Jika user sudah presensi tetapi belum mengisi mood:

- Tampilkan `Not shared yet`.
- Jangan hitung sebagai sharing mood.

## Dashboard dan Laporan

Mood dapat muncul di:

- Member dashboard.
- Admin dashboard.
- Super Admin attendance report.
- User detail dialog.
- Team Mood page.
- Attendance history.

Namun semua tampilan harus mengambil mood dari attendance record tanggal terkait.

Contoh:

- Attendance history tanggal 18 Juli menampilkan mood tanggal 18 Juli.
- Team Mood hari ini menampilkan mood hari ini saja.
- Dashboard hari ini menampilkan mood hari ini saja.

## Settings Page

Form mood di Settings sebaiknya tidak menjadi flow utama.

Opsinya:

1. Hilangkan form `Daily Mood` dari Settings.
2. Atau ubah menjadi shortcut edit mood hari ini, dengan validasi bahwa user sudah presensi hari ini.

Yang tidak boleh:

- Settings mengubah mood permanen tanpa tanggal.
- Settings membuat Team Mood menampilkan mood lama sebagai mood hari ini.

## Sidebar Avatar

Sidebar avatar boleh menampilkan mood terakhir hari ini.

Aturan:

- Jika user sudah presensi dan mengisi mood hari ini, tampilkan mood hari ini.
- Jika belum mengisi mood hari ini, tampilkan default user initial atau `NEUTRAL`.

Jangan menampilkan mood kemarin sebagai mood hari ini.

## Validasi Server

Server action untuk submit mood wajib:

- Memastikan user login.
- Mengambil tanggal hari ini berdasarkan Asia/Jakarta.
- Mencari attendance record user pada tanggal hari ini.
- Menolak jika attendance record tidak ditemukan.
- Menolak mood key tidak valid.
- Menyimpan mood ke attendance record hari ini.
- Revalidate halaman terkait.

Halaman yang perlu direvalidate:

- `/member`
- `/admin`
- `/super-admin`
- `/member/team`
- `/laporan-presensi`
- `/member/presensi/riwayat`

## Legacy Data

Saat ini mood tersimpan pada `User.currentMood` dan `User.moodNote`.

Masalah legacy:

- Mood tidak punya tanggal.
- Mood kemarin bisa tampil sebagai mood hari ini.
- Team Mood menghitung mood lama sebagai mood hari ini.

Strategi migrasi:

1. Tambahkan field mood ke `AttendanceRecord`.
2. Ubah flow check-in agar mengarah ke submit mood.
3. Ubah Team Mood agar membaca mood dari attendance hari ini.
4. Biarkan field `User.currentMood` sementara sebagai cache.
5. Setelah sistem stabil, pertimbangkan untuk menghapus atau mengabaikan field mood di User.

## QA Checklist

Gunakan checklist berikut setelah implementasi:

- User WFO check-in berhasil lalu diarahkan ke step mood.
- User WFH submit plan berhasil lalu diarahkan ke step mood.
- Mood tersimpan di attendance record hari ini.
- Mood tidak tersimpan sebagai mood permanen profil.
- User tanpa attendance hari ini tidak bisa submit mood.
- User dengan attendance hari ini bisa submit mood.
- Team Mood hanya menampilkan mood hari ini.
- Mood kemarin tidak muncul sebagai mood hari ini.
- Attendance history menampilkan mood sesuai tanggal record.
- Sidebar tidak menampilkan mood lama sebagai mood hari ini.
- Mood key invalid ditolak server.
- Mood note terlalu panjang ditolak atau dipotong sesuai aturan.

## Keputusan Final

Mood adalah bagian dari presensi harian.

Mood dipilih setelah presensi berhasil dan melekat ke `AttendanceRecord`, bukan ke profil user permanen.
