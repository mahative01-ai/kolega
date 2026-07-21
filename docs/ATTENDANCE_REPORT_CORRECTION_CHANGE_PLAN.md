# Attendance Report and Correction Change Plan

Dokumen ini merangkum planning perubahan baru untuk Attendance Report, Attendance Correction, dan Request Form.

Tanggal diskusi: 21 Juli 2026.

Catatan bahasa: aplikasi menggunakan English sebagai default UI language. Semua label, helper text, error message, dan dialog baru harus memakai English.

## Scope Perubahan

Perubahan ini mencakup:

- Attendance Report table untuk Super Admin dan Admin.
- Attendance Detail View.
- Attendance Correction form.
- Workday balance behavior pada correction.
- Request form helper note.

## 1. Simplify Attendance Report Table

Target page:

- Attendance Report untuk Super Admin.
- Attendance Report untuk Admin.

Masalah saat ini:

- Tabel terlalu padat.
- Banyak informasi teknis seperti distance, validation, late, early out, dan email tampil langsung di tabel.
- Tabel sulit discan untuk monitoring cepat.

Solusi:

Tabel utama dibuat lebih ringkas. Data detail dipindahkan ke Detail View.

### Kolom Tabel Utama

Kolom yang tetap tampil:

- Member
- Date
- Studio
- Mode
- Status
- In
- Out
- Action

### Kolom yang Dipindahkan ke Detail View

Data berikut tidak perlu tampil di tabel utama:

- Email.
- Default Studio detail.
- Location Studio detail.
- Location validation status.
- Distance.
- Late minutes.
- Early out minutes.
- Check-in latitude.
- Check-in longitude.
- Check-out latitude.
- Check-out longitude.
- WFH work plan.
- WFH work report.
- Mood harian jika sudah masuk `AttendanceRecord`.
- Mood note harian jika sudah masuk `AttendanceRecord`.
- Manual correction flag.
- Created timestamp.
- Updated timestamp.
- Created by.

## 2. Attendance Detail View

Tambahkan fitur Detail View pada Attendance Report.

Interaksi:

- Klik nama member membuka Detail View.
- Klik tombol `Details` di kolom Action membuka Detail View yang sama.

Detail View menggunakan dialog/modal seperti pola di page User.

### Isi Detail View

Header:

- Mood/avatar user.
- Full name.
- Email.
- Role.
- Member status.
- Default Studio.

Attendance summary:

- Date.
- Work mode.
- Attendance status.
- Check-in time.
- Check-out time.
- Owner/default studio.
- Location studio.

Location section:

- Location validation status.
- Distance in meters.
- Check-in coordinates jika ada.
- Check-out coordinates jika ada.

Time policy section:

- Late minutes.
- Early out minutes.

WFH section:

- Work plan.
- Work report.

Section ini hanya muncul jika record adalah WFH atau field WFH tersedia.

Correction/admin section:

- Manual correction flag.
- Created by.
- Created at.
- Updated at.

Footer:

- Close button.
- Optional future shortcut to correction.

## 3. Sync Attendance Correction Form With Request Rules

Attendance Correction harus mengikuti aturan yang sama dengan Request.

Masalah saat ini:

- Correction masih berpotensi memakai aturan lama.
- Contoh: jika `ALPHA` diganti ke `SICK`, sistem perlu tahu apakah ada attachment atau tidak.
- Debt/workday balance tidak bisa lagi dihitung hanya dari perubahan `ALPHA -> non-ALPHA`.

### Correction Type Rules

#### ALPHA to SICK

Jika ada attachment:

- Status menjadi `SICK`.
- Debt dari Alpha hilang.
- `workDayBalance +1` dari posisi Alpha sebelumnya.

Jika tanpa attachment:

- Status tetap bisa menjadi `SICK`.
- Tetap wajib replacement day.
- Debt tetap ada.
- `workDayBalance` tidak berubah dari posisi Alpha sebelumnya.

#### ALPHA to PERMISSION

Aturan:

- Status menjadi `PERMISSION`.
- Tetap wajib replacement day.
- Debt tetap ada.
- `workDayBalance` tidak berubah dari posisi Alpha sebelumnya.

#### ALPHA to LEAVE

Aturan:

- Status menjadi `LEAVE`.
- Debt dari Alpha hilang.
- `annualLeaveBalance` berkurang.
- Hanya untuk user dengan member status `TEAM`.

#### ALPHA to DISPENSATION

Aturan:

- Status menjadi `DISPENSATION`.
- Tidak debt.
- Debt dari Alpha hilang.
- Attachment resmi dibutuhkan jika form mensyaratkan bukti.

#### ALPHA to ON_TIME or LATE

Aturan:

- Status menjadi hadir.
- Debt dari Alpha hilang.
- Check-in/check-out yang diajukan harus valid.

## 4. Correction Form UX

Correction form harus disamakan dengan Request form.

Kebutuhan UI:

- Type/status choices memakai label English yang sama.
- Helper text per type seperti Request form.
- `SICK` attachment optional.
- `DISPENSATION` attachment required.
- `LEAVE` hanya tersedia untuk Team.
- `PERMISSION` dijelaskan sebagai replacement-required/debt.

Label yang dipakai:

- `Personal Leave`
- `Sick Leave`
- `Official Dispensation`
- `Annual Leave`
- `On Time`
- `Late`

Helper text contoh:

- `Sick Leave: Attachment is optional. Without an attachment, this still requires a replacement workday.`
- `Personal Leave: This correction still requires a replacement workday.`
- `Official Dispensation: Requires an official support document and does not affect workday balance.`
- `Annual Leave: Uses annual leave balance and does not create workday debt.`

## 5. Correction Attachment Support

Perlu cek schema saat implementasi.

Jika `AttendanceCorrection` belum punya attachment field, tambahkan:

- `attachmentUrl String?`

Alasan:

- Rule `SICK` membutuhkan pembeda antara sick dengan attachment dan sick tanpa attachment.
- Tanpa field ini, sistem tidak bisa menghitung debt dengan benar.

Jika belum memungkinkan menambah field:

- Temporary behavior: correction `SICK` tanpa attachment dianggap tetap debt.
- Namun solusi final tetap harus menambah attachment support.

## 6. Workday Balance Helper

Workday balance tidak boleh lagi dihitung secara tersebar dengan logic sederhana.

Hindari logic seperti:

```ts
if (previousStatus === "ALPHA" && newStatus !== "ALPHA") {
  workDayBalance += 1;
}
```

Gunakan helper terpusat berdasarkan dokumen:

`docs/WORKDAY_BALANCE_RULES.md`

Rekomendasi helper:

`src/lib/workday-balance.ts`

Helper harus bisa menentukan:

- Dampak status lama terhadap balance.
- Dampak status baru terhadap balance.
- Apakah attachment membuat sick menjadi non-debt.
- Apakah leave mengurangi annual leave.
- Delta balance yang harus diterapkan dalam transaction.

## 7. Request Form Mentor Note

Tambahkan keterangan di form Request:

`If you cannot attend, please contact your mentor first.`

Letak rekomendasi:

- Di bawah terms/helper box.
- Atau sebelum field Reason/Description.

UI rekomendasi:

- Small alert/info box.
- Tidak terlalu mencolok.
- Tetap terlihat sebelum submit.

Catatan:

- Karena default UI adalah English, jangan gunakan teks Indonesia.
- Jika nanti role Team/Admin tidak punya mentor, teks bisa disesuaikan menjadi `mentor or lead`.

Opsi teks yang lebih fleksibel:

`If you cannot attend, please contact your mentor or lead first.`

## 8. Validation and Transaction

Semua approval/correction yang mengubah attendance dan balance harus berjalan dalam transaction.

Transaction harus mencakup:

- Update attendance record.
- Update correction status.
- Update workday balance.
- Update annual leave balance jika `LEAVE`.
- Audit log.

Tujuan:

- Tidak ada data setengah jalan.
- Balance tidak mismatch dengan attendance.

## 9. Role Scope

Super Admin:

- Melihat semua attendance report.
- Bisa membuka detail semua studio.

Admin:

- Melihat attendance report sesuai studio scope.
- Bisa membuka detail sesuai studio scope.
- Tidak boleh melihat data lintas studio di luar scope.

Member:

- Tidak termasuk scope perubahan Attendance Report ini, kecuali perubahan correction/request form yang memang dipakai member.

## 10. QA Checklist

Gunakan checklist berikut setelah implementasi:

- Attendance Report table lebih ringkas.
- Klik nama member membuka Detail View.
- Klik tombol `Details` membuka Detail View yang sama.
- Detail View menampilkan data lengkap attendance.
- Detail View tidak memindahkan user ke page baru.
- Admin hanya melihat attendance sesuai scope.
- Super Admin melihat semua attendance.
- Correction form memakai helper text yang sama dengan Request.
- Correction `ALPHA -> SICK` dengan attachment menghapus debt.
- Correction `ALPHA -> SICK` tanpa attachment tetap debt.
- Correction `ALPHA -> PERMISSION` tetap debt.
- Correction `ALPHA -> LEAVE` menghapus workday debt dan mengurangi annual leave.
- Correction `ALPHA -> DISPENSATION` menghapus debt.
- Correction `ALPHA -> ON_TIME/LATE` menghapus debt.
- Request form menampilkan note: `If you cannot attend, please contact your mentor first.`
- Semua teks baru memakai English.

## Recommended Implementation Order

1. Tambahkan mentor note di Request form.
2. Ringkas Attendance Report table.
3. Tambahkan Attendance Detail View.
4. Cek dan tambahkan attachment support untuk Attendance Correction jika belum ada.
5. Sinkronkan Correction form dengan Request rules.
6. Buat atau pakai helper workday balance.
7. Ubah correction approval agar memakai transaction dan helper.
8. Jalankan lint untuk file yang disentuh.
9. QA manual pada role Super Admin dan Admin.

## Related Docs

- `docs/WORKDAY_BALANCE_RULES.md`
- `docs/ATTENDANCE_MOOD_RULES.md`
- `docs/DAILY_SIGNALS_RULES.md`
