# Project Context for Codex

Dokumen ini adalah ringkasan konteks agar Codex di laptop lain bisa langsung memahami arah project tanpa history chat.

## Tujuan Project

MahaTeams New Gen adalah aplikasi presensi web untuk Mahative Studio dan Kipa. Project ini adalah generasi baru dari website presensi lama Mahative.

Fokus MVP:

- presensi WFO/WFH
- role Super Admin, Admin, Member
- status member Team dan Intern
- Default Studio dan placement lintas studio Mahative/Kipa
- dashboard presensi
- kalender status
- izin, sakit, cuti, alpha, terlambat
- QR card untuk WFO nanti
- PostgreSQL online agar bisa dipakai dari banyak laptop

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- Prisma
- PostgreSQL via Neon
- GitHub
- Vercel

## Status Terakhir

Sudah ada (Fitur Terimplementasi):

- Project Next.js, TypeScript, Tailwind CSS, dan shadcn/ui.
- Prisma schema di `prisma/schema.prisma` dan database Neon PostgreSQL online.
- Sesi autentikasi aman dengan signed cookie dan middleware proteksi global (`middleware.ts`).
- Registrasi Member Publik (`/register`) dan halaman Login (`/login`).
- Halaman Presensi WFO (`/member/presensi`) menggunakan kartu QR (download PNG/JPEG) dan webcam scan.
- Halaman Presensi WFH (`/member/presensi` dinamis) dengan input rencana kerja (check-in) dan laporan harian (check-out) jika terjadwal WFH.
- Dashboard khusus Super Admin (`/super-admin`), Admin (`/admin`), dan Member (`/member`).
- Integrasi Kalender Kerja Personal di dashboard Member & Admin.
- Modul Pengajuan Izin/Sakit/Cuti (`/member/requests`) dan approval Admin (`/admin/requests`).
- Modul Koreksi Presensi (`/member/corrections`) dan approval Admin (`/admin/corrections`).
- Halaman Laporan Presensi Tim (`/laporan-presensi`) untuk Admin & Super Admin.
- Halaman User & Role (`/roles`) untuk manajemen role, default studio, dan placement user.

Belum ada (Roadmap Fitur Baru):

- Form Tambah User menggunakan Pop-up Modal di `/roles`.
- CRUD manajemen akun per member menggunakan pop-up formulir edit detail di `/roles`.
- Opsi Remember Me pada login (cookie sesi aktif 30 hari vs 24 jam).
- Scan QR Code untuk Login & Presensi cepat langsung dari halaman depan (`/login`).
- Notifikasi jadwal (WFH/Cuti/Sakit/Libur) pada pemindai QR halaman depan.
- Validasi strict pengajuan: Cuti minimal H-1, Sakit hari H maksimal sebelum pukul 07:00 pagi (tidak ada lagi tipe "Izin tidak masuk" biasa).
- Blokir check-in baru jika karyawan belum melakukan check-out pada hari sebelumnya.
- Pengajuan WFH oleh member dan persetujuan otomatis oleh Super Admin (mengupdate `PersonalWorkSchedule`).
- Pembaruan dasbor: Ganti label "Presensi Tim Terbaru" menjadi "Today", hilangkan metrik "Tepat Waktu", dan ganti matriks role di `/roles` menjadi "Total Anggota".
- Validasi geofencing koordinat GPS studio di server-side.
- Halaman edit Studio & Lokasi Geofence.
- Halaman edit Cuti & Kalender Libur Studio (`CalendarEvent`).

## Setup di Laptop Baru

Laptop baru tidak perlu install PostgreSQL lokal. Database utama memakai Neon online.

```bash
git clone https://github.com/USERNAME/mahateams-new-gen.git
cd mahateams-new-gen
npm install
```

Buat file `.env` dari `.env.example`, lalu isi dengan Neon.

```env
DATABASE_URL="postgresql://USER:PASSWORD@EP-pooler.REGION.aws.neon.tech/DBNAME?sslmode=require&channel_binding=require"
DIRECT_URL="postgresql://USER:PASSWORD@EP.REGION.aws.neon.tech/DBNAME?sslmode=require"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
AUTH_SECRET="random-secret-panjang"
```

Jalankan:

```bash
npm run dev
```

Di PowerShell Windows, jika `npm` diblokir oleh policy:

```bash
npm.cmd run dev
```

## Database

Primary database: Neon PostgreSQL.

- `DATABASE_URL`: pooled connection, hostname berisi `-pooler`, dipakai aplikasi dan Vercel.
- `DIRECT_URL`: direct connection, hostname tanpa `-pooler`, dipakai Prisma CLI.

Command database:

```bash
npm.cmd run db:generate
npm.cmd run db:push
npm.cmd run db:seed
npm.cmd run db:studio
```

Catatan:

- Jangan commit `.env`.
- Jangan menaruh password Neon asli di dokumen.
- Jika schema berubah, cukup satu laptop menjalankan `db:push` ke Neon.
- Jangan menjalankan `db:seed` sembarangan jika data sudah bukan preview.

## Akun Preview

```txt
Super Admin
email: owner@mahateams.local
password: owner123

Admin
email: admin.mahative@mahateams.local
password: admin123

Member
email: member@mahateams.local
password: member123
```

Super Admin dibuat manual/sistem, bukan dari registrasi publik.

## Role Rules

Role:

- `SUPER_ADMIN`
- `ADMIN`
- `MEMBER`

Keputusan:

- Super Admin adalah owner studio Mahative/Kipa.
- **Pembuatan Akun Terpusat**: Semua akun karyawan (`MEMBER` status `TEAM` atau `INTERN`) dibuat langsung oleh Admin/Super Admin (Form input: Full Name, Username, Password, Email, Birth Date, Status Active, Default Studio, Placement, dan Start/End magang jika Intern).
- **Registrasi Mandiri Publik**: Dinonaktifkan dan diredirect untuk keamanan sistem.
- Member login awal menggunakan kredensial yang diberikan dan didukung checkbox **Remember Me** (masa aktif cookie diset 30 hari).
- Super Admin tidak boleh diubah perannya dari halaman role.

Status member:

- `TEAM`
- `INTERN`

Intern memiliki program magang dengan data Start Date dan End Date yang terkonfigurasi.

## Studio dan Placement

Konsep:

- `defaultStudio` adalah studio asal user.
- `placement` adalah lokasi kerja aktif jika user dipindah sementara ke studio lain.
- Presensi tetap masuk owner/default studio, tetapi lokasi presensi bisa mengikuti placement.

## Attendance Rules MVP

Metrik dipisah:

- Jumlah Presensi
- Cuti (LEAVE)
- Sakit (SICK)
- WFH
- Terlambat
- Alpha

Aturan Waktu & Kehadiran:

- **Jam Kerja**: Jam masuk pukul 08:00 dan jam pulang pukul 16:00.
- **Check-out Manual**: Anggota diharuskan melakukan check-out secara manual di dashboard/scan QR.
- **Pencegahan Keterlambatan Check-out**: Anggota tidak bisa melakukan check-in baru hari ini jika catatan presensi hari sebelumnya masih belum di-check-out.
- **Aturan Pengajuan Ketidakhadiran**:
  - Tidak ada lagi *"Izin tidak masuk"* biasa. Hanya ada **Cuti** dan **Sakit**.
  - **Cuti (`LEAVE`)**: Hanya bisa diajukan dan disetujui minimal **H-1** (tanggal mulai >= besok).
  - **Sakit (`SICK`)**: Diajukan pada hari H maksimal **1 jam sebelum jam masuk** (sebelum pukul 07:00 pagi).

## WFO, WFH, dan QR

WFO:

- Menggunakan kartu QR (personal QR Card statis) yang diaktifkan sekali di awal akun.
- **Quick Login & Presensi QR**: Member bisa memindai QR Card mereka di webcam halaman depan (`/login`) laptop pribadi untuk otomatis login + absen check-in/out.
- **Notifikasi Layar Scan**: Jika jadwal hari itu bukan WFO (seperti WFH, Cuti, Sakit, Libur), layar scan di depan menampilkan notifikasi sesuai jadwal beserta tombol pengalihan ("Masuk ke Dashboard").

WFH:

- Tidak menggunakan pemindaian QR di halaman depan untuk absen.
- Pengajuan WFH dapat diajukan secara mandiri oleh Member/Admin dan memerlukan persetujuan (acc) oleh Super Admin.
- Member wajib mengisi rencana kerja (saat check-in) dan laporan harian (saat check-out) secara tertulis di dashboard.

Geofence:

- Titik koordinat dan radius studio dikonfigurasi.
- Jika presensi dilakukan di luar jangkauan radius, sistem memberikan status `OUTSIDE_RADIUS` (soft warning).

## Kalender

Kalender dashboard saat ini:

- kalender bulan berjalan
- highlight hari ini
- warna mengikuti status presensi
- data diambil dari PostgreSQL

Rencana:

- Dashboard Super Admin: kalender libur/cuti dan kalender aktivitas studio.
- Jadwal kerja: kalender personal WFO/WFH per member.
- Cuti/libur: kalender editable untuk libur nasional, cuti bersama, hari pengganti, libur final.
- Member: kalender pribadi.

## File Penting

```txt
src/app/page.tsx              Dashboard dynamic
src/app/super-admin/page.tsx  Dashboard khusus Super Admin
src/app/login/page.tsx        Halaman login
src/app/login/actions.ts      Login/logout actions
src/app/roles/page.tsx        Role management MVP
src/lib/auth.ts               Session auth dan password verify
src/lib/roles.ts              Rule role MVP
src/lib/prisma.ts             Prisma client
prisma/schema.prisma          Database schema
prisma/seed.mjs               Seed data preview
docs/NEON_DATABASE.md         Panduan Neon
docs/LOCAL_DATABASE.md        Panduan lokal lama, optional
```

## Vercel

Vercel sudah pernah berhasil deploy dari GitHub.

Environment variables di Vercel:

```env
DATABASE_URL="Neon pooled URL"
DIRECT_URL="Neon direct URL"
AUTH_SECRET="random-secret-panjang"
NEXT_PUBLIC_APP_URL="https://domain-vercel-project"
```

Jika deploy gagal karena env, cek Vercel Project Settings > Environment Variables.

## Next Step Disarankan

1. Rapikan flow auth dan route guard.
2. Buat halaman register Member.
3. Buat dashboard role-aware:
   - Super Admin melihat semua studio.
   - Admin melihat scope studionya.
   - Member melihat data dirinya.
4. Buat halaman user/member management.
5. Buat presensi WFO/WFH.
6. Buat request izin/sakit/cuti.
7. Rapikan UI final setelah flow inti jalan.

## Catatan Untuk Codex Berikutnya

- Baca dokumen ini sebelum coding.
- Jangan commit `.env`.
- Jangan menaruh password Neon asli di dokumen.
- Jangan menghapus keputusan PRD lama tanpa konfirmasi user.
- Fokus implementasi mengikuti pola existing Next.js + shadcn + Prisma.
- Saat memakai PowerShell Windows, gunakan `npm.cmd` jika `npm` diblokir execution policy.
