# Walkthrough - Perbaikan Otorisasi Super Admin, Koreksi Presensi & Visualisasi Map Studio

Seluruh perbaikan bug dan masukan fitur telah sukses diimplementasikan dan diverifikasi lewat kompilasi build produksi Next.js.

---

## 🛠️ Perubahan yang Dilakukan

### 1. Pengembalian Hak Akses Global Super Admin (Murnian)
*   **Berkas Dimodifikasi**:
    *   [page.tsx (Roles)](file:///C:/Users/zxsyn/Documents/Codex/2026-06-23/aku/mahateams-new-gen/src/app/roles/page.tsx)
    *   [actions.ts (Roles)](file:///C:/Users/zxsyn/Documents/Codex/2026-06-23/aku/mahateams-new-gen/src/app/roles/actions.ts)
    *   [page.tsx (Schedules)](file:///C:/Users/zxsyn/Documents/Codex/2026-06-23/aku/mahateams-new-gen/src/app/schedules/page.tsx)
    *   [page.tsx (Piket)](file:///C:/Users/zxsyn/Documents/Codex/2026-06-23/aku/mahateams-new-gen/src/app/piket/page.tsx)
    *   [actions.ts (Piket)](file:///C:/Users/zxsyn/Documents/Codex/2026-06-23/aku/mahateams-new-gen/src/app/piket/actions.ts)
    *   [actions.ts (Calendar)](file:///C:/Users/zxsyn/Documents/Codex/2026-06-23/aku/mahateams-new-gen/src/app/calendar/actions.ts)
    *   [actions.ts (Settings)](file:///C:/Users/zxsyn/Documents/Codex/2026-06-23/aku/mahateams-new-gen/src/app/settings/actions.ts)
*   **Perubahan**:
    *   Mengembalikan aturan di mana seluruh pengguna ber-role `SUPER_ADMIN` memiliki hak akses global penuh atas semua cabang studio tanpa dibatasi `defaultStudioId`.
    *   Hanya pengguna ber-role `ADMIN` yang dibatasi ruang lingkup data dan aksinya ke studio cabang masing-masing.

### 2. Perbaikan Rentang Hari Pengajuan Cuti/WFH/Sakit
*   **Berkas Dimodifikasi**:
    *   [actions.ts (Requests)](file:///C:/Users/zxsyn/Documents/Codex/2026-06-23/aku/mahateams-new-gen/src/app/member/requests/actions.ts)
*   **Perubahan**:
    *   Memperbaiki query deteksi `overlappingRequest` dengan mengganti operator `OR` menjadi `AND` untuk batas tanggal.
    *   Pengajuan untuk rentang hari yang sama (misal: 08 Juni - 08 Juni) kini diperbolehkan dan tidak lagi terblokir secara keliru oleh pengajuan di hari lain.

### 3. Modul Koreksi Presensi Lampau dengan Jam Masuk
*   **Berkas Dimodifikasi / Baru**:
    *   [schema.prisma](file:///C:/Users/zxsyn/Documents/Codex/2026-06-23/aku/mahateams-new-gen/prisma/schema.prisma) (Menambahkan kolom `proposedCheckInTime String?` ke model `AttendanceCorrection`)
    *   [correction-form-client.tsx (NEW)](file:///C:/Users/zxsyn/Documents/Codex/2026-06-23/aku/mahateams-new-gen/src/app/member/corrections/correction-form-client.tsx) (Komponen klien interaktif untuk form koreksi)
    *   [page.tsx (Corrections)](file:///C:/Users/zxsyn/Documents/Codex/2026-06-23/aku/mahateams-new-gen/src/app/member/corrections/page.tsx) (Integrasi komponen klien dan filter data 2-7 hari)
    *   [actions.ts (Corrections)](file:///C:/Users/zxsyn/Documents/Codex/2026-06-23/aku/mahateams-new-gen/src/app/member/corrections/actions.ts) (Menyimpan usulan jam masuk dan memvalidasi batas waktu)
    *   [actions.ts (Admin Corrections Review)](file:///C:/Users/zxsyn/Documents/Codex/2026-06-23/aku/mahateams-new-gen/src/app/admin/corrections/actions.ts) (Logika persetujuan database)
*   **Perubahan**:
    *   **Dropdown Filter**: Pilihan tanggal yang bisa diajukan koreksi dibatasi secara dinamis hanya berkisar antara **2 hingga 7 hari yang lalu**. Pengajuan di luar itu ditolak oleh backend.
    *   **Input Jam Masuk**: Menambahkan kolom input jam masuk jika status baru yang diusulkan adalah kehadiran fisik (`ON_TIME` atau `LATE`).
    *   **Logika Persetujuan (Approval)**: Saat disetujui admin, `checkInAt` diperbarui dengan mengonversi jam masuk yang diusulkan (Jakarta) ke UTC. Jika statusnya `LATE`, menit keterlambatan (`lateMinutes`) dihitung otomatis berdasarkan selisih jam kebijakan studio. Jika statusnya `ON_TIME` atau non-fisik (`WFH`/`SICK`/dsb.), `lateMinutes` di-reset ke `0`, dan jam masuk/pulang dibersihkan secara konsisten untuk mencegah ketidaksesuaian data.

### 4. Perbaikan Kebocoran Warna Lightmode
*   **Berkas Dimodifikasi**:
    *   [calendar-event-form-client.tsx](file:///C:/Users/zxsyn/Documents/Codex/2026-06-23/aku/mahateams-new-gen/src/app/calendar/calendar-event-form-client.tsx)
    *   [page.tsx (Corrections)](file:///C:/Users/zxsyn/Documents/Codex/2026-06-23/aku/mahateams-new-gen/src/app/member/corrections/page.tsx)
*   **Perubahan**:
    *   Menambahkan kelas `dark:` pada elemen-elemen berlatar belakang abu-abu terang (`bg-zinc-50`), merah (`bg-red-50`), dan hijau (`bg-emerald-50`) agar tampil elegan dan tidak silau dalam darkmode.

### 5. Peta Lokasi Interaktif (Leaflet Map Picker)
*   **Berkas Dimodifikasi**:
    *   [studios-client.tsx](file:///C:/Users/zxsyn/Documents/Codex/2026-06-23/aku/mahateams-new-gen/src/app/super-admin/studios/studios-client.tsx)
*   **Perubahan**:
    *   Mengintegrasikan Leaflet Map Picker interaktif menggunakan ubin OpenStreetMap (gratis dan bebas API Key).
    *   Mendukung dua arah data (two-way binding): pengguna dapat menggeser penunjuk (marker drag) atau mengetuk peta untuk memperbarui input latitude & longitude, dan mengetik koordinat manual untuk memindahkan letak penunjuk di peta.

### 6. Batasan Tombol Koreksi di Riwayat Kehadiran Member
*   **Berkas Dimodifikasi**:
    *   [page.tsx (Riwayat)](file:///C:/Users/zxsyn/Documents/Codex/2026-06-23/aku/mahateams-new-gen/src/app/member/presensi/riwayat/page.tsx)
*   **Perubahan**:
    *   Menghilangkan tombol **Koreksi** pada tabel riwayat absensi jika catatan kehadiran tersebut berada di luar rentang 2 hingga 7 hari yang lalu (misalnya lebih dari 7 hari atau kurang dari 2 hari).

### 7. Alur Masuk Kredensial Langsung ke Dasbor Member
*   **Berkas Dimodifikasi**:
    *   [dashboard-shell.tsx](file:///C:/Users/zxsyn/Documents/Codex/2026-06-23/aku/mahateams-new-gen/src/components/dashboard-shell.tsx)
*   **Perubahan**:
    *   Menghapus logika gatekeeper penguncian dasbor (`need-presence` redirect) pada member.
    *   Pengguna dengan peran Member yang masuk menggunakan email & password (kredensial) kini langsung masuk ke dashboard `/member` dengan status "Belum Presensi" dan dapat berinteraksi penuh tanpa dipaksa redirect ke halaman pemindaian QR.

### 8. Pengaturan Global Super Admin untuk Semua Studio
*   **Berkas Dimodifikasi**:
    *   [page.tsx (Settings)](file:///C:/Users/zxsyn/Documents/Codex/2026-06-23/aku/mahateams-new-gen/src/app/settings/page.tsx)
*   **Perubahan**:
    *   Mengubah `isGlobalSuperAdmin` di halaman pengaturan agar memeriksa status peran `SUPER_ADMIN` saja tanpa memedulikan nilai `defaultStudioId`.
    *   Semua akun dengan peran Super Admin kini dapat secara fleksibel beralih dan mengonfigurasi pengaturan hari kerja, hari libur (days off), dan geofence lokasi untuk seluruh cabang studio secara global.

### 9. Sistem Check-out Otomatis (Auto Check-out Terintegrasi)
*   **Berkas Dimodifikasi**:
    *   [route.ts (Reminders)](file:///C:/Users/zxsyn/Documents/Codex/2026-06-23/aku/mahateams-new-gen/src/app/api/cron/reminders/route.ts) [MODIFY]
    *   [vercel.json](file:///C:/Users/zxsyn/Documents/Codex/2026-06-23/aku/mahateams-new-gen/vercel.json) [MODIFY]
*   **Perubahan**:
    *   Mengintegrasikan logika check-out otomatis ke dalam endpoint API `/api/cron/reminders` untuk kepraktisan pemeliharaan endpoint.
    *   Logika ini diprogram secara aman: **hanya akan berjalan pada eksekusi sore hari (WIB >= 17:00)** untuk mencegah bentrokan check-out prematur di pagi hari.
    *   Secara otomatis mendeteksi member yang lupa check-out, menyetel jam check-out sesuai waktu kebijakan aktif studio (bawaan: 17:00 WIB), dan mengirimkan notifikasi ke dasbor masing-masing anggota.
    *   `vercel.json` dipertahankan ringkas dengan hanya mendaftarkan pemicu reminders harian.

---

## 🔍 Hasil Verifikasi & Kompilasi

*   **Prisma Client**: Sukses diregenerasikan menggunakan perintah `npx prisma generate` untuk memetakan kolom baru `proposedCheckInTime`.
*   **Next.js Production Build**: Perintah `npm run build` berhasil dieksekusi dengan status **SUKSES** tanpa ada masalah tipe data (TypeScript) maupun rendering halaman statis.

### 10. Pengembalian Matriks Dashboard Halaman Member
*   **Berkas Dimodifikasi**:
    *   [page.tsx (Member)](file:///c:/Users/zxsyn/Documents/Codex/2026-06-23/aku/mahateams-new-gen/src/app/member/page.tsx)
*   **Perubahan**:
    *   Mengembalikan visualisasi grid matriks kehadiran bulanan (metrics grid) di bagian atas dashboard halaman Member yang sebelumnya hilang.
    *   Matriks mencakup 8 metrik utama:
        1. **Attendance**: Jumlah total presensi.
        2. **WFH**: Jumlah hari kehadiran WFH.
        3. **Sick Leave**: Jumlah hari absen sakit.
        4. **Leave**: Jumlah hari cuti pengganti.
        5. **Late**: Jumlah hari terlambat (menampilkan sisa utang waktu terlambat jika ada).
        6. **Alpha**: Jumlah hari alpha/tanpa keterangan.
        7. **Annual Leave Balance** (khusus member berstatus `TEAM`): Sisa kuota cuti tahunan.
        8. **Workday Balance**: Sisa/Utang saldo hari kerja.
    *   Setiap metrik dilengkapi dengan indikator warna HSL modern, ikon representatif dari Lucide React, serta `HoverCard` deskripsi tips interaktif.
    *   Seluruh build produksi Next.js terkompilasi dengan **SUKSES** pasca perbaikan.
