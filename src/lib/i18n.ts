export type Language = "id" | "en";

export const DICTIONARY: Record<string, Record<Language, string>> = {
  // Navigation / Sidebar
  dashboard: { id: "Dasbor", en: "Dashboard" },
  picketSchedule: { id: "Jadwal Piket", en: "Picket Schedule" },
  members: { id: "User", en: "Members" },
  schedules: { id: "Jadwal WFO/WFH", en: "WFO/WFH Schedules" },
  calendar: { id: "Kalender Studio", en: "Studio Calendar" },
  attendanceReport: { id: "Laporan Presensi", en: "Attendance Report" },
  requests: { id: "Izin & Sakit", en: "Requests & Leaves" },
  corrections: { id: "Koreksi Presensi", en: "Attendance Corrections" },
  auditTrail: { id: "Audit Trail", en: "Audit Logs" },
  settings: { id: "Pengaturan", en: "Settings" },
  logout: { id: "Keluar", en: "Sign Out" },
  
  // Dashboard / General
  activeStudio: { id: "Studio Aktif", en: "Active Studio" },
  totalTeam: { id: "Total Team", en: "Total Team" },
  totalIntern: { id: "Total Intern (Magang)", en: "Total Interns" },
  workDayBalance: { id: "Saldo Hari", en: "Day Balance" },
  accountStatus: { id: "Status Akun", en: "Account Status" },
  role: { id: "Role", en: "Role" },
  actions: { id: "Aksi", en: "Actions" },
  detail: { id: "Detail", en: "Detail" },
  edit: { id: "Ubah", en: "Edit" },
  delete: { id: "Hapus", en: "Delete" },
  cancel: { id: "Batal", en: "Cancel" },
  save: { id: "Simpan", en: "Save" },
  submit: { id: "Kirim", en: "Submit" },
  search: { id: "Cari", en: "Search" },
  loading: { id: "Memproses...", en: "Processing..." },
  all: { id: "Semua", en: "All" },
  
  // QR Card
  downloadQrCard: { id: "Unduh QR Card (PNG)", en: "Download QR Card (PNG)" },
  
  // Picket
  unscheduledStaff: { id: "Staf Belum Terjadwal", en: "Unscheduled Staff" },
  picketHint: { id: "Pilih hari piket secara fleksibel sesuai kebutuhan studio.", en: "Select picket days flexibly as required by the studio." },
  picketDay: { id: "Hari Piket", en: "Picket Day" },
  
  // Requests
  requestType: { id: "Tipe Pengajuan", en: "Request Type" },
  startDate: { id: "Mulai Tanggal", en: "Start Date" },
  endDate: { id: "Selesai Tanggal", en: "End Date" },
  reason: { id: "Alasan / Keterangan", en: "Reason / Notes" },
  attachment: { id: "Lampiran Berkas", en: "Attachment File" },
  history: { id: "Riwayat Pengajuan", en: "Request History" },
  
  // Corrections
  correctionHistory: { id: "Riwayat Koreksi", en: "Correction History" },
  proposedCheckIn: { id: "Usulan Jam Masuk", en: "Proposed Check-In" },
  proposedCheckOut: { id: "Usulan Jam Pulang", en: "Proposed Check-Out" },
  
  // Audit Log
  actor: { id: "Aktor", en: "Actor" },
  action: { id: "Aksi / Event", en: "Action / Event" },
  timestamp: { id: "Waktu Kejadian", en: "Timestamp" },
};

export function getLanguage(cookieHeader?: string): Language {
  if (typeof window !== "undefined") {
    const match = document.cookie.match(/(?:^|; )lang=(id|en)/);
    if (match) return match[1] as Language;
    return "id";
  }
  
  if (cookieHeader) {
    const match = cookieHeader.match(/(?:^|; )lang=(id|en)/);
    if (match) return match[1] as Language;
  }
  return "id";
}
