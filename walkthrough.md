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

### 5. Preview Google Maps untuk Studio Baru
*   **Berkas Dimodifikasi**:
    *   [studios-client.tsx](file:///C:/Users/zxsyn/Documents/Codex/2026-06-23/aku/mahateams-new-gen/src/app/super-admin/studios/studios-client.tsx)
*   **Perubahan**:
    *   Menyematkan Google Maps Embed iframe di bawah kolom Latitude & Longitude pada form Tambah Cabang Studio dan Edit Cabang Studio.
    *   Peta visual akan langsung muncul secara interaktif begitu pengguna memasukkan nilai koordinat yang valid.

---

## 🔍 Hasil Verifikasi & Kompilasi

*   **Prisma Client**: Sukses diregenerasikan menggunakan perintah `npx prisma generate` untuk memetakan kolom baru `proposedCheckInTime`.
*   **Next.js Production Build**: Perintah `npm run build` berhasil dieksekusi dengan status **SUKSES** tanpa ada masalah tipe data (TypeScript) maupun rendering halaman statis.
