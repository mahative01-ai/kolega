# Workday Balance Rules

Dokumen ini merangkum solusi final dari real case yang muncul pada sistem presensi Kolega/MahaTeams. Tujuannya adalah membuat aturan `workDayBalance` konsisten untuk request, koreksi, alpha otomatis, dan presensi hari libur.

Tanggal diskusi: 21 Juli 2026.

## Konsep Utama

`workDayBalance` adalah saldo hari kerja user.

- Nilai negatif berarti user punya hutang hari kerja.
- Nilai nol berarti saldo seimbang.
- Nilai positif berarti user punya surplus hari kerja.

Contoh:

- `-1` = 1 Day Debt.
- `0` = Clear.
- `+1` = 1 Day Surplus.

## Jadwal Dasar Mahative

Hari kerja default Mahative adalah Selasa sampai Sabtu.

Hari Minggu dan Senin adalah default libur. Namun jika user tetap masuk pada hari Minggu atau Senin dan checkout valid, hari itu dihitung sebagai hari kerja tambahan.

Efeknya:

- Jika user punya debt, hari tambahan melunasi debt.
- Jika user tidak punya debt, hari tambahan menjadi surplus.
- Surplus dihitung setelah checkout sukses, bukan hanya check-in.

Contoh:

- Balance `-1`, masuk Senin dan checkout valid, hasil menjadi `0`.
- Balance `0`, masuk Senin dan checkout valid, hasil menjadi `+1`.
- Balance `+1`, masuk Senin dan checkout valid, hasil menjadi `+2`.

Implementasi tidak boleh hardcode hanya Senin. Sistem harus membaca `WeeklyWorkRule` studio. Jika `isWorkday = false` dan user tetap punya attendance valid dengan checkout lengkap, maka itu adalah extra workday.

## Aturan Request

### SICK

Sick boleh diajukan pada hari-H.

Attachment dibuat opsional.

Jika Sick memakai attachment:

- Status request: `SICK`.
- Status attendance: `SICK`.
- Tidak mengurangi `workDayBalance`.
- Tidak wajib mengganti hari.

Jika Sick tanpa attachment:

- Status request tetap: `SICK`.
- Status attendance tetap: `SICK`.
- Mengurangi `workDayBalance` sebesar `-1`.
- Wajib mengganti hari.

Catatan penting: sistem tidak boleh lagi mengubah Sick tanpa attachment menjadi `PERMISSION`. Tetap simpan sebagai `SICK`, lalu debt ditentukan dari ada atau tidaknya attachment.

### PERMISSION

Permission adalah izin pribadi yang secara sadar diketahui sebelumnya.

Aturan:

- Tetap wajib H-1 atau 24 jam sebelum hari masuk.
- Mengurangi `workDayBalance` sebesar `-1`.
- Wajib mengganti hari.

Jika user mencoba membuat Permission pada hari-H, sistem harus menolak dan menampilkan pesan yang jelas bahwa Permission wajib H-1.

### LEAVE

Leave adalah cuti resmi untuk user dengan status `TEAM`.

Aturan:

- Tidak mengurangi `workDayBalance`.
- Mengurangi `annualLeaveBalance`.
- Tidak wajib mengganti hari.
- Tidak tersedia untuk `INTERN`.

### DISPENSATION

Official Dispensation dipakai untuk izin resmi, terutama untuk Intern.

Aturan:

- Tidak mengurangi `workDayBalance`.
- Tidak wajib mengganti hari.
- Membutuhkan attachment resmi jika aturan form masih mewajibkan bukti.

### ALPHA

Alpha terjadi jika user tidak memiliki attendance atau request valid sampai cutoff alpha.

Aturan:

- Status attendance: `ALPHA`.
- Mengurangi `workDayBalance` sebesar `-1`.
- Wajib mengganti hari.

## Aturan Koreksi Attendance

Koreksi harus mengikuti aturan bisnis baru, bukan hanya melihat apakah status berubah dari `ALPHA` ke non-alpha.

### ALPHA ke SICK

Jika ada attachment:

- Debt dari Alpha boleh dihapus.
- Hasil balance naik `+1` dari posisi Alpha sebelumnya.

Jika tidak ada attachment:

- Tetap wajib mengganti hari.
- Debt tidak boleh dihapus.
- Hasil balance tetap sama.

### ALPHA ke PERMISSION

Permission tetap wajib mengganti hari.

Aturan:

- Debt tidak boleh dihapus.
- Hasil balance tetap sama.

### ALPHA ke LEAVE

Leave adalah cuti resmi.

Aturan:

- Debt dari Alpha boleh dihapus.
- `annualLeaveBalance` berkurang.
- Hasil balance naik `+1` dari posisi Alpha sebelumnya.

### ALPHA ke DISPENSATION

Official Dispensation tidak debt.

Aturan:

- Debt dari Alpha boleh dihapus.
- Hasil balance naik `+1` dari posisi Alpha sebelumnya.

### ALPHA ke ON_TIME atau LATE

Jika koreksi membuktikan user sebenarnya hadir:

- Debt dari Alpha boleh dihapus.
- Hasil balance naik `+1` dari posisi Alpha sebelumnya.

## Aturan Extra Workday

Extra workday adalah hari ketika user masuk di luar hari kerja default studio.

Syarat dihitung:

- Hari tersebut menurut `WeeklyWorkRule` adalah bukan hari kerja, atau kalender studio menandai hari itu sebagai off day.
- User memiliki attendance valid: `ON_TIME`, `LATE`, atau `PRESENT`.
- User sudah checkout.

Efek:

- Tambah `workDayBalance` sebesar `+1`.
- Berlaku untuk melunasi debt atau menambah surplus.

Extra workday tidak boleh dihitung saat user baru check-in, karena bisa saja user tidak menyelesaikan checkout.

## Real Case dan Solusi

### Hanun Sabihis

Kasus:

- Sabtu, 18 Juli 2026, Hanun izin atau leave.
- Senin, 20 Juli 2026, Hanun masuk dan checkout.
- Sistem sekarang masih menampilkan `1 Day Debt`.

Expected:

- Jika izin Sabtu dihitung sebagai kewajiban ganti hari, Sabtu membuat balance `-1`.
- Senin adalah hari default libur.
- Hanun masuk Senin dan checkout valid, maka balance naik `+1`.
- Hasil akhir harus `0`.

Solusi:

- Implementasikan extra workday payoff pada checkout.
- Jalankan recalculation untuk membersihkan saldo Hanun dari aturan lama.

### Rigan Zabarzah Azza Allyanti

Kasus:

- Sabtu, 18 Juli 2026, awalnya tercatat `ALPHA`.
- Lalu dikoreksi menjadi `LEAVE`.
- Sistem sekarang menampilkan balance `0`.

Expected tergantung status koreksinya:

- Jika benar `LEAVE`, maka debt Alpha boleh hilang dan leave balance harus berkurang.
- Jika sebenarnya itu izin pribadi yang wajib ganti hari, seharusnya statusnya bukan `LEAVE`, tetapi `PERMISSION`, dan debt tetap ada.

Solusi:

- Koreksi harus membedakan `LEAVE` dan `PERMISSION` dengan jelas.
- `ALPHA -> LEAVE` menghapus debt dan mengurangi annual leave.
- `ALPHA -> PERMISSION` tetap debt.

### Tri Nur Azizah

Kasus:

- Senin, 20 Juli 2026, Tri masuk.
- Karena Senin default libur, seharusnya sistem memberi `+1 Surplus`.
- Sistem sekarang tidak menambah surplus.

Expected:

- Jika Tri tidak punya debt, masuk Senin dan checkout valid harus menghasilkan `+1 Surplus`.
- Jika Tri punya debt, masuk Senin melunasi debt terlebih dahulu.

Solusi:

- Extra workday harus menambah `workDayBalance +1`, bukan hanya melunasi debt.
- Logika ini harus berjalan setelah checkout sukses.

### Inti Indriyani

Kasus:

- Inti memiliki `+1 Surplus`.
- Surplus ini berasal dari history izin pada sistem lama.
- Berdasarkan aturan baru, Inti seharusnya `0 Debt`.

Expected:

- Saldo lama tidak boleh dianggap valid jika lahir dari aturan lama.
- Harus dilakukan recalculation berdasarkan aturan final.

Solusi:

- Buat proses recalculation untuk semua user.
- Recalculation menghitung ulang saldo dari attendance, request, correction, dan extra workday.
- Setelah recalculation, Inti harus mengikuti hasil aturan baru, bukan saldo legacy.

## Rekomendasi Implementasi

### 1. Buat Helper Workday Balance

Buat helper terpusat, misalnya:

`src/lib/workday-balance.ts`

Helper ini bertugas menentukan:

- Apakah sebuah attendance/request menambah debt.
- Apakah sebuah attendance/request menghapus debt.
- Apakah sebuah hari termasuk extra workday.
- Berapa delta balance dari sebuah event.

Jangan lagi menyebar logic `workDayBalance increment/decrement` di banyak action tanpa helper.

### 2. Update Request Action

Perubahan yang diperlukan:

- `SICK` tanpa attachment tetap disimpan sebagai `SICK`.
- `SICK` dengan attachment tidak debt.
- `SICK` tanpa attachment debt `-1`.
- `PERMISSION` tetap H-1 dan debt `-1`.
- `LEAVE` mengurangi `annualLeaveBalance`, bukan `workDayBalance`.
- `DISPENSATION` tidak debt.

### 3. Update Correction Action

Perubahan yang diperlukan:

- Jangan otomatis menghapus debt hanya karena `previousStatus = ALPHA` dan `newStatus != ALPHA`.
- Hitung ulang delta berdasarkan status lama, status baru, dan attachment.

### 4. Update Checkout Action

Perubahan yang diperlukan:

- Setelah checkout sukses, cek apakah tanggal attendance adalah extra workday.
- Jika extra workday, tambah `workDayBalance +1`.
- Pastikan tidak dobel increment jika user checkout action dipanggil ulang.

Butuh guard agar extra workday hanya dihitung sekali. Jika belum ada field khusus, dapat dipertimbangkan menambah audit atau field penanda seperti `balanceAppliedAt`/`balanceDelta`.

### 5. Buat Recalculation Script

Buat script admin/internal untuk menghitung ulang `workDayBalance` semua user berdasarkan aturan final.

Script ini diperlukan karena data lama sudah terpengaruh aturan yang belum konsisten.

Minimal output script:

- Nama user.
- Balance lama.
- Balance hasil recalculation.
- Daftar event yang membuat delta.

Mode awal harus dry-run. Setelah hasilnya disetujui, baru jalankan apply.

## QA Checklist

Gunakan case berikut setelah implementasi:

- Sick dengan attachment hari-H tidak membuat debt.
- Sick tanpa attachment hari-H membuat debt `-1`.
- Permission H-1 membuat debt `-1`.
- Permission hari-H ditolak.
- Leave Team mengurangi annual leave, tidak mengubah workday balance.
- Leave Intern ditolak.
- Dispensation Intern tidak membuat debt.
- Alpha otomatis membuat debt `-1`.
- User dengan debt `-1` masuk Senin dan checkout, hasil `0`.
- User dengan balance `0` masuk Senin dan checkout, hasil `+1 Surplus`.
- Koreksi `ALPHA -> PERMISSION` tetap debt.
- Koreksi `ALPHA -> LEAVE` menghapus debt dan mengurangi annual leave.
- Koreksi `ALPHA -> SICK` dengan attachment menghapus debt.
- Koreksi `ALPHA -> SICK` tanpa attachment tetap debt.

## Keputusan Final

Workday balance harus menjadi hasil dari aturan bisnis, bukan nilai manual yang berubah-ubah.

Mulai dari implementasi berikutnya:

- Request membuat delta sesuai jenis request.
- Alpha membuat debt.
- Extra workday membuat surplus.
- Koreksi menghitung ulang dampak status lama dan status baru.
- Data lama harus direkalkulasi agar tidak membawa sisa aturan lama.
