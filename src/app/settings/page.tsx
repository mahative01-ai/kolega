import {
  CalendarDays,
  Clock,
  XCircle,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  MapPin,
  User as UserIcon,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { DashboardShell } from "@/components/dashboard-shell";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { WorkdaySettingsClient } from "./workday-settings-client";
import { GeofenceSettingsClient } from "./geofence-settings-client";
import { createCalendarEventAction, deleteCalendarEventAction } from "../calendar/actions";
import { ProfileSettingsClient } from "./profile-settings-client";
import Link from "next/link";

export const dynamic = "force-dynamic";

const TZ = "Asia/Jakarta";

function getMonthKey(date = new Date()) {
  const p = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ, year: "numeric", month: "2-digit",
  }).formatToParts(date);
  return `${p.find((x) => x.type === "year")?.value}-${p.find((x) => x.type === "month")?.value}`;
}

function parseMonthKey(key?: string) {
  const raw = key ?? getMonthKey();
  const [y, m] = raw.split("-").map(Number);
  const year = Number.isFinite(y) ? y : new Date().getFullYear();
  const month = Number.isFinite(m) && m >= 1 && m <= 12 ? m : new Date().getMonth() + 1;
  return { year, month };
}

function prevMonthKey(year: number, month: number) {
  const d = new Date(year, month - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function nextMonthKey(year: number, month: number) {
  const d = new Date(year, month, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLabel(year: number, month: number) {
  return new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(
    new Date(year, month - 1, 1)
  );
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  NATIONAL_HOLIDAY: "Libur Nasional",
  COMPANY_LEAVE: "Cuti Bersama",
  REGULAR_OFF_DAY: "Libur Final",
  REPLACEMENT_WORKDAY: "Hari Pengganti",
  STUDIO_EVENT: "Kegiatan Studio",
};

const EVENT_TYPE_COLORS: Record<string, string> = {
  NATIONAL_HOLIDAY: "bg-red-100 text-red-700 border-red-200",
  COMPANY_LEAVE: "bg-orange-100 text-orange-700 border-orange-200",
  REGULAR_OFF_DAY: "bg-zinc-100 text-zinc-600 border-zinc-200",
  REPLACEMENT_WORKDAY: "bg-emerald-100 text-emerald-700 border-emerald-200",
  STUDIO_EVENT: "bg-blue-100 text-blue-700 border-blue-200",
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; month?: string }>;
}) {
  const [user, params] = await Promise.all([requireUser(), searchParams]);
  const isSuperAdmin = user.role === "SUPER_ADMIN";
  const isGlobalSuperAdmin = user.role === "SUPER_ADMIN";

  const activeTab = isSuperAdmin ? (params.tab ?? "profile") : "profile";

  const { year, month } = parseMonthKey(params.month);
  const startDate = new Date(Date.UTC(year, month - 1, 1));
  const endDate = new Date(Date.UTC(year, month, 0));

  // Only query system configurations if user is SUPER_ADMIN
  const [studios, daysOffEvents] = isSuperAdmin
    ? await Promise.all([
        prisma.studio.findMany({
          where: {
            isActive: true,
            ...(isGlobalSuperAdmin ? {} : { id: user.defaultStudioId ?? "__none__" })
          },
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
            latitude: true,
            longitude: true,
            radiusMeters: true,
            weekStartDay: true,
            weeklyWorkRules: {
              select: {
                dayOfWeek: true,
                isWorkday: true,
                isOptional: true,
                workStartTime: true,
                workEndTime: true,
              },
              orderBy: { dayOfWeek: "asc" },
            },
            policies: {
              where: { isActive: true },
              select: {
                checkInTime: true,
                checkOutTime: true,
                graceMinutes: true,
                alphaCutoffTime: true,
              },
              take: 1,
            },
          },
        }),
        prisma.calendarEvent.findMany({
          where: {
            startDate: { lte: endDate },
            endDate: { gte: startDate },
            ...(isGlobalSuperAdmin
              ? {}
              : {
                  OR: [
                    { studioId: null },
                    { studioId: user.defaultStudioId ?? "__none__" }
                  ]
                }),
          },
          include: { studio: { select: { name: true } } },
          orderBy: { startDate: "asc" },
        }),
      ])
    : [[], []];

  // ── Days Off Add Action ──────────────────────────────────────────────────
  async function addDaysOffAction(formData: FormData) {
    "use server";
    const rawDate = formData.get("date") as string;
    const label = (formData.get("label") as string)?.trim() || "Hari Libur";
    const studioId = (formData.get("studioId") as string) || null;

    if (!rawDate) return;

    await createCalendarEventAction({
      type: "COMPANY_LEAVE",
      title: label,
      startDate: rawDate,
      endDate: rawDate,
      studioId,
    });
  }

  async function removeDaysOffAction(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    if (id) await deleteCalendarEventAction(id);
  }

  return (
    <DashboardShell
      user={user}
      currentPath="/settings"
      badge="Pengaturan"
      title="Pengaturan"
      description={
        isSuperAdmin
          ? "Kelola kata sandi profil, hari kerja, hari libur, dan geofence lokasi studio."
          : "Kelola profil pribadi dan kata sandi akun Kolega Anda."
      }
    >
      <Tabs value={activeTab}>
        {isSuperAdmin ? (
          <TabsList className="mb-6">
            <TabsTrigger
              value="profile"
              render={
                <Link href="/settings?tab=profile">
                  <UserIcon className="size-4 mr-1.5" />
                  Profil Saya
                </Link>
              }
            />
            <TabsTrigger
              value="workday"
              render={
                <Link href="/settings?tab=workday">
                  <Clock className="size-4 mr-1.5" />
                  Hari Kerja
                </Link>
              }
            />

            <TabsTrigger
              value="locations"
              render={
                <Link href="/settings?tab=locations">
                  <MapPin className="size-4 mr-1.5" />
                  Lokasi
                </Link>
              }
            />
          </TabsList>
        ) : null}

        {/* ── Tab: Profil Saya ────────────────────────────────────────────── */}
        <TabsContent value="profile" className="mt-0">
          <ProfileSettingsClient initialUser={user} />
        </TabsContent>

        {isSuperAdmin ? (
          <>
            {/* ── Tab: Hari Kerja ────────────────────────────────────────────── */}
            <TabsContent value="workday" className="mt-0">
              <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-none">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-zinc-900 dark:text-zinc-50">
                    <Clock className="size-5 text-blue-700" />
                    Pengaturan Hari Kerja
                  </CardTitle>
                  <CardDescription>
                    Konfigurasikan hari mana yang dihitung sebagai hari kerja dan batas jam masuk/pulang.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <WorkdaySettingsClient studios={studios} />
                </CardContent>
              </Card>
            </TabsContent>



            {/* ── Tab: Lokasi ────────────────────────────────────────────────── */}
            <TabsContent value="locations" className="mt-0">
              <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-none">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-zinc-900 dark:text-zinc-50">
                    <MapPin className="size-5 text-emerald-700" />
                    Studio & Geofence
                  </CardTitle>
                  <CardDescription>
                    Atur koordinat GPS dan radius geofence untuk studio Anda. Digunakan untuk validasi lokasi WFO.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <GeofenceSettingsClient studios={studios} />
                </CardContent>
              </Card>
            </TabsContent>
          </>
        ) : null}
      </Tabs>
    </DashboardShell>
  );
}
