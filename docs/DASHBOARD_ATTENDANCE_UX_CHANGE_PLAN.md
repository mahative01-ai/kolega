# Dashboard, Attendance, QR, and Studio UX Change Plan

Dokumen ini merangkum planning perubahan UX dan fitur untuk Dashboard Team/Intern/Admin, QR Card, Work Calendar, Attendance Report, User Detail, Mentor, Picket, Announcement, dan font.

Tanggal diskusi: 22 Juli 2026.

Catatan bahasa: aplikasi menggunakan English sebagai default UI language. Semua label baru harus memakai English.

## 1. QR Card Placement and Flow

### Masalah Saat Ini

Pada dashboard Team dan Intern terdapat card `My QR Card`.

QR Card sebenarnya hanya dipakai sekali di awal sebagai identitas presensi. Setelah QR aktif atau sudah didownload, card ini tidak perlu terus memenuhi dashboard harian.

### Keputusan

QR tetap menjadi bagian penting dari sistem presensi, tetapi tidak menjadi card utama di dashboard setelah setup selesai.

### Flow Baru

Jika QR belum aktif:

- Dashboard boleh menampilkan small setup card.
- CTA utama: `Activate QR Card`.
- Setelah QR aktif, card setup hilang dari dashboard.

Jika QR sudah aktif:

- Dashboard tidak lagi menampilkan card besar `My QR Card`.
- Akses QR dipindahkan ke page khusus `My QR Card`.
- Di dashboard atau menu user dapat ada shortcut kecil: `View My Card`.

### View My Card Interaction

Ketika user klik `View My Card`:

- Jangan pindah ke page baru.
- Buka dialog/pop-up.
- Dialog menampilkan QR Card digital yang rapi.
- Dialog punya action:
  - `Download PNG`
  - `Download JPEG`
  - `Print`
  - `Close`

### Dedicated Page

Tambahkan page khusus:

`/member/qr-card`

Fungsi page:

- Menampilkan QR Card user secara lengkap.
- Menampilkan status QR: Active/Revoked.
- Menampilkan download actions.
- Menjadi tempat permanen untuk mengakses QR tanpa mengganggu dashboard.

Dashboard behavior:

- Setelah QR aktif atau sudah pernah didownload, card dashboard hilang.
- User tetap bisa membuka QR dari menu/sidebar/page khusus.

## 2. Team/Intern Dashboard Calendar

### Masalah Saat Ini

Card `My Work Calendar` masih kurang informatif.

### Keputusan

Calendar di dashboard Team dan Intern harus lebih fungsional.

Fitur:

- Previous month.
- Next month.
- Current month indicator.
- Setiap tanggal punya indikator attendance/schedule.

Indikator tanggal:

- `WFO`
- `WFH`
- `ON_TIME`
- `LATE`
- `ALPHA`
- `SICK`
- `PERMISSION`
- `LEAVE`
- `DISPENSATION`
- `HOLIDAY`
- `EVENT`
- `CORRECTED`

Jika ada correction, indikator calendar harus mengikuti status attendance terbaru.

### Data Source

Calendar membaca:

- `AttendanceRecord`
- `PersonalWorkSchedule`
- `CalendarEvent`
- `AttendanceCorrection` jika diperlukan untuk marker correction

## 3. Team/Intern Dashboard Layout

### Keputusan Layout

Card `My Attendance Today` dan `My Work Calendar` dibuat dalam satu row.

Desktop:

- `My Attendance Today`: 1/3 width.
- `My Work Calendar`: 2/3 width.

Mobile:

- Stack vertical.
- `My Attendance Today` di atas.
- `My Work Calendar` di bawah.

Tujuan:

- Attendance today tetap cepat terlihat.
- Calendar menjadi konteks bulanan yang lebih luas.

## 4. History Correction Button

### Masalah Saat Ini

Button `Correction` pada page `History` belum mengikuti aturan koreksi baru.

### Keputusan

Correction dari History harus membuka flow/form correction yang sinkron dengan aturan Request dan Workday Balance terbaru.

Aturan:

- Sick attachment optional.
- Sick tanpa attachment tetap debt.
- Permission tetap debt.
- Leave mengurangi leave balance dan tidak debt.
- Dispensation tidak debt.
- Alpha correction dihitung memakai helper balance baru.

Referensi:

- `docs/WORKDAY_BALANCE_RULES.md`
- `docs/ATTENDANCE_REPORT_CORRECTION_CHANGE_PLAN.md`

## 5. Global Font

### Keputusan

Semua situs menggunakan font `Inter`.

Yang perlu dicek:

- `src/app/layout.tsx`
- global CSS
- Tailwind/font variable
- class font yang masih memakai Geist atau font lain

Tujuan:

- UI lebih konsisten.
- Tidak ada campuran font.

## 6. Admin Studio Management: Today's Picket Duty

### Masalah Saat Ini

Card `Today's Picket Duty` belum benar-benar menunjukkan siapa yang piket hari ini.

### Keputusan

Card harus query piket berdasarkan tanggal hari ini Asia/Jakarta.

Data source:

- `PicketSchedule.picketDate`
- studio scope Admin

Jika ada piket hari ini:

- Tampilkan nama user.
- Tampilkan studio.
- Tampilkan note jika ada.

Jika tidak ada:

- Tampilkan empty state kecil: `No picket duty today.`

Admin hanya melihat piket sesuai studio scope.

Super Admin dapat melihat semua studio atau grouped by studio.

## 7. Studio Management: Broadcast Announcement

### Masalah Saat Ini

Announcement lama menghilang, dan belum jelas apakah pengumuman hanya berlaku satu hari atau sampai deadline.

### Keputusan

Announcement sebaiknya memakai publish date dan event/deadline date.

Field yang disarankan:

- `title`
- `message`
- `targetStudioId` atau `allStudios`
- `publishAt`
- `eventDate`
- `expiresAt`
- `priority`
- `isActive`
- `createdById`

### Contoh Case

Hari Rabu membuat announcement:

`Saturday Presentation`

Untuk event hari Sabtu.

Maka:

- `publishAt`: Rabu
- `eventDate`: Sabtu
- `expiresAt`: Sabtu malam atau setelah event selesai

Announcement tetap tampil dari Rabu sampai Sabtu, bukan hanya hari Rabu.

### Multiple Announcement in Same Day

Jika ada lebih dari satu announcement pada hari yang sama:

- Jangan overwrite.
- Tampilkan list announcement aktif.
- Urutkan berdasarkan:
  1. priority
  2. eventDate terdekat
  3. createdAt terbaru

Dashboard card:

- Tampilkan maksimal 2-3 announcement aktif.
- Sediakan link `View all`.

## 8. User Detail Trigger

Target page:

- `User` page di Super Admin.
- `User Studio` page di Admin.

### Keputusan

Hilangkan button `Details`.

Detail View dibuka melalui klik pada:

- Name.
- Username.

Hover style:

- Jangan biru.
- Jangan underline.
- Gunakan row hover halus atau text weight change.
- Cursor pointer.

Tujuan:

- Table lebih bersih.
- Interaksi tetap jelas.

## 9. Team Schedule Language

Target:

- Admin page `Team Schedule`.

Masalah:

- Masih memakai bahasa Indonesia: `Sen`, `Sel`, `Rab`, dll.

Keputusan:

- Ubah ke English.

Compact labels:

- `Mon`
- `Tue`
- `Wed`
- `Thu`
- `Fri`
- `Sat`
- `Sun`

Jika butuh full label:

- `Monday`
- `Tuesday`
- `Wednesday`
- `Thursday`
- `Friday`
- `Saturday`
- `Sunday`

## 10. Attendance Report Detail View

### Masalah Saat Ini

UI Detail View pada Attendance Report belum rapi.

### Keputusan

Detail View harus mengikuti pola `User Detail View`.

Attendance Report table juga diringkas:

- Hilangkan field `Action`.
- Klik field `Name` untuk membuka detail.
- Field `Member` diganti menjadi `Name`.
- Email tidak tampil di table utama.

Detail View harus:

- Memiliki header user yang rapi.
- Menampilkan badge status.
- Mengelompokkan data attendance.
- Tidak terasa seperti raw table.

Referensi planning detail:

- `docs/ATTENDANCE_REPORT_CORRECTION_CHANGE_PLAN.md`

## 11. Mentor Candidate Rules

### Masalah Saat Ini

Pada Form CRUD User, mentor saat ini diasumsikan Admin.

### Keputusan

Mentor candidates adalah:

- User dengan `role = ADMIN`
- User dengan `role = MEMBER` dan `memberStatus = TEAM`

Intern tidak menjadi mentor.

Super Admin dapat memilih mentor dari semua studio atau sesuai scope yang disepakati.

Admin hanya dapat memilih mentor dari studio scope-nya.

### Label UI

Gunakan English:

- `Mentor`
- `Select mentor`
- `No mentor assigned`

### Catatan

Untuk MVP, tidak perlu menambah role baru `MENTOR`.

Mentor adalah pilihan relasional dari user yang memenuhi syarat:

- Admin.
- Team member.

Jika nanti perlu granular, baru pertimbangkan field `isMentor`.

## 12. Request Form Mentor Note

Tambahkan info di Request form:

`If you cannot attend, please contact your mentor first.`

Opsi lebih fleksibel:

`If you cannot attend, please contact your mentor or lead first.`

Letak:

- Di bawah terms/helper box.
- Atau sebelum reason field.

UI:

- Small info alert.
- Tidak mengganggu form.

## 13. Related Correction Rule Sync

Semua flow correction harus mengikuti aturan baru:

- Sick attachment optional.
- Sick tanpa attachment tetap debt.
- Permission tetap debt.
- Leave mengurangi annual leave.
- Dispensation tidak debt.
- Alpha otomatis debt.

History correction button dan Attendance Correction page harus memakai behavior yang sama.

## Recommended Implementation Order

1. Update global font to Inter.
2. Remove QR card from daily dashboard when QR is active.
3. Add `My QR Card` page.
4. Change `View My Card` to dialog/pop-up.
5. Rebuild Team/Intern dashboard layout: attendance 1/3 and calendar 2/3.
6. Upgrade My Work Calendar with prev/next month and indicators.
7. Fix History correction button to use new correction rules.
8. Fix Today's Picket Duty query.
9. Redesign Broadcast Announcement behavior.
10. Remove Details button from User/User Studio tables and use Name/Username click.
11. Convert Team Schedule day labels to English.
12. Redesign Attendance Report Detail View and simplify table.
13. Update mentor candidates in CRUD User form.
14. Add mentor note to Request form.
15. Run lint for touched files.
16. QA per role: Super Admin, Admin, Team, Intern.

## QA Checklist

QR:

- QR setup card appears only when QR is not active.
- QR setup card disappears after QR is active/downloaded.
- `View My Card` opens dialog, not a new page.
- `/member/qr-card` page exists and is clean.

Dashboard:

- My Attendance Today and My Work Calendar are in one row on desktop.
- Layout stacks properly on mobile.
- Calendar supports previous and next month.
- Calendar indicators match attendance data.
- Calendar updates after correction.

History/Correction:

- Correction button follows new rules.
- Sick without attachment remains debt.
- Sick with attachment can remove debt.
- Permission remains debt.
- Leave affects annual leave, not workday balance.

Font:

- Site uses Inter consistently.
- No Geist/cross-font visual mismatch remains.

Picket:

- Today's Picket Duty shows users assigned today.
- Empty state appears when no picket exists.

Announcement:

- Announcement supports publish and expiry/deadline.
- Multiple active announcements can appear.
- Old announcement does not disappear incorrectly.

User tables:

- Details button removed.
- Clicking Name/Username opens detail.
- Hover is subtle, not blue underline.

Team Schedule:

- Day labels are English.

Attendance Report:

- Table is simplified.
- `Member` renamed to `Name`.
- Email hidden from table.
- No action column.
- Clicking Name opens clean detail view.

Mentor:

- Mentor dropdown includes Admin.
- Mentor dropdown includes Member with Team status.
- Mentor dropdown excludes Intern.

Request:

- Mentor note appears in English.
