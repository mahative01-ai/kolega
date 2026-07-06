import React from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ROLE_LABEL } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import {
  dateOnlyFromKey,
  getDayOfWeek,
  getJakartaDateKey,
} from "@/lib/attendance-time";
import { NotificationBellClient } from "@/app/notifications/notification-bell-client";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { AppSidebar } from "@/components/app-sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

type DashboardUser = {
  id: string;
  name: string;
  email: string;
  role: keyof typeof ROLE_LABEL;
  defaultStudioId?: string | null;
  defaultStudio?: {
    name: string;
  } | null;
};

const BREADCRUMB_MAP: Record<string, string> = {
  member: "Member",
  admin: "Admin",
  "super-admin": "Super Admin",
  roles: "User & Role",
  schedules: "Jadwal",
  calendar: "Cuti & Kalender",
  piket: "Jadwal Piket",
  "laporan-presensi": "Laporan Presensi",
  requests: "Izin & Sakit",
  corrections: "Koreksi Presensi",
  "audit-logs": "Audit Trail",
  settings: "Pengaturan",
  presensi: "Presensi",
  riwayat: "Riwayat",
  "laporan-wfh": "Laporan WFH",
};

export async function DashboardShell({
  user,
  currentPath,
  badge,
  title,
  description,
  children,
}: {
  user: DashboardUser;
  currentPath: string;
  badge: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  // Fetch unread notifications for bell
  const [unreadNotificationsList, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.notification.count({
      where: { userId: user.id, readAt: null },
    }),
  ]);

  const unreadNotifications = unreadNotificationsList.map((n) => ({
    id: n.id,
    title: n.title,
    message: n.message,
    readAt: n.readAt ? n.readAt.toISOString() : null,
    createdAt: n.createdAt.toISOString(),
  }));

  // Gatekeeper check: Super Admin is always allowed
  if (user.role === "ADMIN" || user.role === "MEMBER") {
    const cookieStore = await cookies();
    const isUnlockedForRequests = cookieStore.get("kolega_unlocked_requests")?.value === "1";

    const todayKey = getJakartaDateKey();
    const todayDate = dateOnlyFromKey(todayKey);
    const dayOfWeek = getDayOfWeek(todayKey);

    const [attendanceRecord, personalSchedule, weeklyRule, holiday] = await Promise.all([
      prisma.attendanceRecord.findUnique({
        where: {
          userId_attendanceDate: {
            userId: user.id,
            attendanceDate: todayDate,
          },
        },
        select: { id: true },
      }),
      prisma.personalWorkSchedule.findUnique({
        where: {
          userId_workDate: {
            userId: user.id,
            workDate: todayDate,
          },
        },
        select: { workMode: true },
      }),
      user.defaultStudioId
        ? prisma.weeklyWorkRule.findUnique({
            where: {
              studioId_dayOfWeek: {
                studioId: user.defaultStudioId,
                dayOfWeek,
              },
            },
            select: { isWorkday: true },
          })
        : null,
      prisma.calendarEvent.findFirst({
        where: {
          OR: [{ studioId: null }, { studioId: user.defaultStudioId || undefined }],
          type: { in: ["NATIONAL_HOLIDAY", "COMPANY_LEAVE"] },
          startDate: { lte: todayDate },
          endDate: { gte: todayDate },
        },
        select: { id: true },
      }),
    ]);

    const isWeekendOrHoliday = holiday || (weeklyRule?.isWorkday === false && personalSchedule?.workMode !== "WFO");
    const isWfh = personalSchedule?.workMode === "WFH";

    const isAllowed =
      attendanceRecord ||
      isWeekendOrHoliday ||
      isWfh ||
      isUnlockedForRequests;

    if (!isAllowed) {
      redirect("/login?error=need-presence");
    }
  }

  // Generate breadcrumb list dynamically
  const dashboardBase = user.role === "SUPER_ADMIN" ? "super-admin" : user.role === "ADMIN" ? "admin" : "member";
  const pathSegments = currentPath.split("/").filter(Boolean);
  const filteredSegments = pathSegments.filter((segment, index) => {
    return !(index === 0 && segment === dashboardBase);
  });

  const breadcrumbs = filteredSegments.map((segment, index) => {
    const originalIndex = pathSegments.indexOf(segment);
    const href = "/" + pathSegments.slice(0, originalIndex + 1).join("/");
    const label = BREADCRUMB_MAP[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
    const isLast = index === filteredSegments.length - 1;
    return { href, label, isLast };
  });

  const hasSubpages = breadcrumbs.length > 0;

  return (
    <SidebarProvider className="bg-zinc-100 dark:bg-zinc-950">
      <AppSidebar user={user} />
      <SidebarInset className="flex flex-col bg-white dark:bg-background border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-none m-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:peer-data-[state=collapsed]:ml-2 text-zinc-950 dark:text-zinc-50">
        {/* Navbar */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-4 sticky top-0 z-10 transition-colors">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4 self-center bg-zinc-200 dark:bg-zinc-800" />
            
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  {hasSubpages ? (
                    <BreadcrumbLink href={user.role === "SUPER_ADMIN" ? "/super-admin" : user.role === "ADMIN" ? "/admin" : "/member"}>
                      Kolega
                    </BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage>Kolega</BreadcrumbPage>
                  )}
                </BreadcrumbItem>
                {breadcrumbs.map((item) => (
                  <React.Fragment key={item.href}>
                    <BreadcrumbSeparator className="hidden md:block" />
                    <BreadcrumbItem>
                      {item.isLast ? (
                        <BreadcrumbPage>{item.label}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink href={item.href} className="hidden md:block">
                          {item.label}
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                  </React.Fragment>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <NotificationBellClient
              key={`${unreadCount}:${unreadNotifications.map((item) => `${item.id}:${item.readAt ?? "unread"}`).join("|")}`}
              initialNotifications={unreadNotifications}
              initialUnreadCount={unreadCount}
            />
          </div>
        </header>

        {/* Main Content Area */}
        <div className="flex-1 p-6 lg:p-8">
          <div className="mx-auto w-full max-w-7xl">
            {/* Page Header */}
            <div className="mb-6">
              <Badge variant="outline" className="mb-2 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 border-zinc-200 dark:border-zinc-800">
                {badge}
              </Badge>
              <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
              <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
                {description}
              </p>
            </div>
            
            {/* Child content page */}
            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
