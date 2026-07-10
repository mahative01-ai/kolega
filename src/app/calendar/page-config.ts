import {
  Flag,
  Star,
  XCircle,
  RefreshCw,
  Building2,
} from "lucide-react";

export const EVENT_TYPE_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; icon: React.ElementType }
> = {
  NATIONAL_HOLIDAY: { label: "Libur Nasional", color: "text-red-700 dark:text-red-300", bg: "bg-red-100 dark:bg-red-950/50", icon: Flag },
  COMPANY_LEAVE: { label: "Cuti Bersama", color: "text-orange-700 dark:text-orange-300", bg: "bg-orange-100 dark:bg-orange-950/50", icon: Star },
  REGULAR_OFF_DAY: { label: "Libur Final", color: "text-zinc-600 dark:text-zinc-300", bg: "bg-zinc-100 dark:bg-zinc-800", icon: XCircle },
  REPLACEMENT_WORKDAY: { label: "Hari Pengganti", color: "text-emerald-700 dark:text-emerald-300", bg: "bg-emerald-100 dark:bg-emerald-950/50", icon: RefreshCw },
  STUDIO_EVENT: { label: "Kegiatan Studio", color: "text-blue-700 dark:text-blue-300", bg: "bg-blue-100 dark:bg-blue-950/50", icon: Building2 },
};
