# Daily Signals Rules

Dokumen ini merangkum aturan fitur Daily Signals pada sistem Kolega/MahaTeams.

Tanggal diskusi: 21 Juli 2026.

## Konsep Utama

Daily Signals adalah informasi harian yang membantu anggota studio memahami kondisi tim pada hari itu.

Daily Signals bukan bagian langsung dari presensi, tetapi dapat tampil berdampingan dengan dashboard, team mood, user list, dan halaman monitoring.

Contoh Daily Signals:

- Birthday hari ini.
- Mood/status tim hari ini.
- Event studio hari ini.
- Informasi penting ringan yang relevan untuk satu hari.

## Birthday Signal

Birthday Signal menampilkan user yang sedang ulang tahun pada tanggal hari ini.

Aturan:

- Sistem membaca `birthDate` dari tabel `User`.
- Yang dicocokkan hanya tanggal dan bulan.
- Tahun lahir tidak dipakai untuk menentukan birthday hari ini.
- Timezone yang digunakan adalah Asia/Jakarta.
- User dengan `accountStatus = INACTIVE` atau `ARCHIVED` tidak perlu ditampilkan.
- User tanpa `birthDate` tidak ikut dicek.

Contoh:

Jika hari ini 21 Juli 2026, maka user dengan `birthDate`:

- `2005-07-21`
- `2001-07-21`
- `1998-07-21`

semuanya dianggap ulang tahun hari ini.

## Scope Berdasarkan Role

### Super Admin

Super Admin dapat melihat birthday dari semua studio.

Tampilan boleh dikelompokkan berdasarkan studio:

- Mahative
- Kipa
- Studio lain jika nanti ditambahkan

### Admin

Admin hanya melihat birthday user pada studio yang berada dalam scope-nya.

Scope utama:

- `defaultStudioId` Admin.
- User dengan `defaultStudioId` yang sama.

Jika placement lintas studio aktif dipakai:

- Admin dapat melihat user yang sedang ditempatkan di studionya jika aturan placement mengizinkan.

### Member

Member melihat birthday teman satu studio.

Scope utama:

- User dengan `defaultStudioId` yang sama.

Member tidak perlu melihat birthday lintas studio kecuali ada aturan khusus placement yang nanti disepakati.

## Tempat Tampil

Birthday Signal dapat tampil di:

- Member dashboard.
- Admin dashboard.
- Super Admin dashboard.
- Team Mood page.
- User list.
- User detail dialog.
- Attendance report jika relevan.

Tampilan sebaiknya ringan dan tidak mengganggu flow utama.

Rekomendasi UI:

- Banner kecil: `Today is Asfa's birthday.`
- Card ringkas: `Birthdays Today`.
- Badge kecil pada nama user: `Birthday Today`.
- Icon kecil di avatar atau row user.

Jika tidak ada birthday hari ini:

- Jangan tampilkan section besar.
- Boleh sembunyikan total section.
- Atau tampilkan empty state kecil hanya di dashboard Super Admin/Admin jika dibutuhkan.

## Multiple Birthdays

Jika ada lebih dari satu user ulang tahun hari ini:

- Tampilkan list ringkas.
- Urutkan berdasarkan nama.
- Jika terlalu banyak, tampilkan maksimal beberapa user dan link ke detail.

Contoh:

- `Birthdays Today: Asfa, Hanun, Tri`
- `3 birthdays today`

## Mood Signal

Mood Signal tetap mengikuti aturan pada dokumen:

`docs/ATTENDANCE_MOOD_RULES.md`

Ringkasan:

- Mood adalah bagian dari presensi harian.
- Mood menempel ke `AttendanceRecord` hari ini.
- Mood bukan field permanen profil.
- Team Mood mengambil mood berdasarkan attendance hari ini.

Daily Signals boleh menampilkan ringkasan mood, tetapi sumber kebenarannya tetap attendance harian.

Contoh ringkasan:

- `7 team members shared mood today.`
- `Most common mood: Focused.`

## Event Studio Signal

Event Studio Signal berasal dari kalender studio.

Jenis event yang dapat muncul:

- `STUDIO_EVENT`
- `NATIONAL_HOLIDAY`
- `COMPANY_LEAVE`
- `REPLACEMENT_WORKDAY`

Aturan:

- Event ditampilkan jika tanggal hari ini berada di rentang event.
- Event ditampilkan sesuai scope studio user.
- Super Admin dapat melihat event semua studio.
- Admin dan Member hanya melihat event studio yang relevan.

Contoh:

- `Studio Event: Monthly Review`
- `Replacement Workday Today`
- `National Holiday`

## Sumber Data

Birthday Signal:

- `User.birthDate`
- `User.accountStatus`
- `User.defaultStudioId`
- Placement aktif jika scope placement dipakai

Mood Signal:

- `AttendanceRecord.mood`
- `AttendanceRecord.moodNote`
- `AttendanceRecord.attendanceDate`
- `AttendanceRecord.userId`

Event Signal:

- `CalendarEvent`
- `CalendarEvent.type`
- `CalendarEvent.startDate`
- `CalendarEvent.endDate`
- `CalendarEvent.studioId`

## Helper Rekomendasi

Buat helper terpusat:

`src/lib/daily-signals.ts`

Fungsi yang disarankan:

- `getTodayBirthdaySignals(user)`
- `getTodayMoodSignals(user)`
- `getTodayEventSignals(user)`
- `getDailySignals(user)`

Helper harus:

- Menggunakan timezone Asia/Jakarta.
- Menghormati role scope.
- Tidak menampilkan inactive/archived user.
- Mengembalikan data dalam format siap pakai untuk dashboard.

## Query Birthday

Query birthday harus membandingkan tanggal dan bulan dari `birthDate`.

Catatan:

- Hindari membandingkan tahun.
- Pastikan timezone Asia/Jakarta dipakai untuk menentukan hari ini.
- Untuk PostgreSQL, dapat memakai extract month/day, atau query range tanggal yang dinormalisasi di app layer.

Contoh konsep:

```ts
const today = getJakartaDateParts();

const birthdays = users.filter((user) => {
  if (!user.birthDate) return false;
  return (
    user.birthDate.getUTCDate() === today.day &&
    user.birthDate.getUTCMonth() + 1 === today.month
  );
});
```

Implementasi final boleh menggunakan SQL agar lebih efisien.

## Notifikasi

Birthday Signal tidak wajib mengirim notifikasi.

Jika nanti notifikasi ditambahkan:

- In-app notification boleh dibuat di pagi hari.
- Email tidak wajib.
- Hindari spam ulang tahun setiap refresh page.
- Jika menggunakan notifikasi otomatis, perlu idempotency agar tidak dobel.

Untuk MVP:

- Cukup tampil di dashboard/page.
- Tidak perlu cron.

## Privacy

Birthday Signal hanya menampilkan bahwa user sedang ulang tahun.

Tidak perlu menampilkan:

- Tahun lahir.
- Umur.
- Tanggal lahir lengkap jika tidak dibutuhkan.

Tampilan cukup:

- Nama user.
- Studio.
- Badge birthday.

## QA Checklist

Gunakan checklist berikut setelah implementasi:

- User dengan birthday hari ini muncul di dashboard.
- User dengan birthday besok tidak muncul hari ini.
- User dengan birthday kemarin tidak muncul hari ini.
- User inactive tidak muncul.
- User archived tidak muncul.
- Super Admin melihat semua birthday dari semua studio.
- Admin hanya melihat birthday dari studio scope-nya.
- Member hanya melihat birthday teman satu studio.
- Birthday tidak menampilkan umur atau tahun lahir.
- Jika tidak ada birthday, section tidak mengganggu layout.
- Team Mood tetap membaca mood dari attendance hari ini, bukan dari User profile.
- Event hari ini muncul sesuai scope studio.

## Keputusan Final

Daily Signals adalah lapisan informasi harian tim.

Birthday termasuk Daily Signals karena bukan bagian dari presensi langsung, tetapi tetap relevan untuk dashboard dan halaman tim.

Untuk MVP, Daily Signals cukup dihitung saat page dibuka dan tidak membutuhkan cron.
