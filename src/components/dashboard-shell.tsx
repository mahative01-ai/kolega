import type { LucideIcon } from "lucide-react";
import {
  Archive,
  BarChart3,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  Home,
  LogOut,
  MapPin,
  QrCode,
  Settings,
  ShieldCheck,
  UserCog,
  UserRound,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ROLE_LABEL } from "@/lib/roles";
import { logoutAction } from "@/app/login/actions";

type DashboardUser = {
  name: string;
  email: string;
  role: keyof typeof ROLE_LABEL;
  defaultStudio?: {
    name: string;
  } | null;
};

type MenuItem = {
  label: string;
  href?: string;
  icon: LucideIcon;
  badge?: string;
};

function getPrimaryDashboard(role: DashboardUser["role"]) {
  if (role === "SUPER_ADMIN") {
    return "/super-admin";
  }

  if (role === "ADMIN") {
    return "/admin";
  }

  return "/member";
}

function getMenuGroups(role: DashboardUser["role"]) {
  const main: MenuItem[] = [
    {
      label: "Dashboard",
      href: getPrimaryDashboard(role),
      icon:
        role === "SUPER_ADMIN"
          ? ShieldCheck
          : role === "ADMIN"
            ? UserCog
            : UserRound,
    },
  ];

  if (role === "SUPER_ADMIN") {
    return [
      { label: "Utama", items: main },
      {
        label: "Manajemen",
        items: [
          { label: "User & Role", href: "/roles", icon: UsersRound },
          { label: "Studio & Lokasi", icon: Building2, badge: "Next" },
          { label: "Placement", icon: BriefcaseBusiness, badge: "Next" },
          { label: "Jadwal WFO/WFH", href: "/schedules", icon: CalendarDays },
          { label: "Cuti & Kalender", icon: ClipboardList, badge: "Next" },
        ],
      },
      {
        label: "Monitoring",
        items: [
          {
            label: "Laporan Presensi",
            href: "/laporan-presensi",
            icon: BarChart3,
          },
          { label: "Approval", icon: ClipboardCheck, badge: "Next" },
          { label: "Arsip Akun", icon: Archive, badge: "Next" },
          { label: "Pengaturan", icon: Settings, badge: "Next" },
        ],
      },
    ];
  }

  if (role === "ADMIN") {
  return [
    { label: "Utama", items: main },
    {
      label: "Presensi Saya",
      items: [
        { label: "Scan QR", href: "/member/presensi", icon: QrCode },
        {
          label: "Riwayat Saya",
          href: "/member/presensi/riwayat",
          icon: ClipboardCheck,
        },
      ],
    },
    {
      label: "Operasional",
      items: [
        { label: "User Studio", href: "/roles", icon: UsersRound },
        { label: "Presensi Tim", icon: ClipboardCheck, badge: "Next" },
        { label: "Jadwal Tim", href: "/schedules", icon: CalendarDays },
        {
          label: "Laporan Presensi",
          href: "/laporan-presensi",
          icon: BarChart3,
        },
        { label: "Izin/Sakit/Cuti", icon: ClipboardList, badge: "Next" },
        { label: "Koreksi Presensi", icon: Archive, badge: "Next" },
        { label: "Piket & Pengingat", icon: CalendarDays, badge: "Next" },
      ],
    },
  ];
}

  return [
    { label: "Utama", items: main },
    {
      label: "Presensi",
      items: [
        { label: "Scan QR", href: "/member/presensi", icon: QrCode },
        { label: "Jadwal Saya", icon: CalendarDays, badge: "Next" },
        {
          label: "Riwayat Saya",
          href: "/member/presensi/riwayat",
          icon: ClipboardCheck,
        },
        { label: "Izin/Sakit/Cuti", icon: ClipboardList, badge: "Next" },
        { label: "Laporan WFH", icon: Home, badge: "Next" },
      ],
    },
  ];
}

function MenuLink({
  item,
  currentPath,
}: {
  item: MenuItem;
  currentPath: string;
}) {
  const Icon = item.icon;
  const isActive = item.href === currentPath;
  const className = cn(
    "flex h-9 w-full items-center gap-2 rounded-md px-2.5 text-sm transition",
    isActive
      ? "bg-zinc-950 text-white shadow-sm"
      : "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950",
    !item.href && "cursor-not-allowed opacity-55 hover:bg-transparent"
  );

  const content = (
    <>
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {item.badge ? (
        <Badge
          variant="outline"
          className={cn(
            "h-5 shrink-0 px-1.5 text-[10px]",
            isActive ? "border-white/40 text-white" : "bg-white"
          )}
        >
          {item.badge}
        </Badge>
      ) : null}
    </>
  );

  if (!item.href) {
    return (
      <div className={className} aria-disabled="true">
        {content}
      </div>
    );
  }

  return (
    <Link href={item.href} className={className}>
      {content}
    </Link>
  );
}

function SidebarNav({
  user,
  currentPath,
}: {
  user: DashboardUser;
  currentPath: string;
}) {
  const groups = getMenuGroups(user.role);

  return (
    <aside className="hidden h-screen w-72 shrink-0 border-r border-zinc-200 bg-white lg:sticky lg:top-0 lg:flex lg:flex-col">
      <div className="flex h-full flex-col">
        <div className="border-b border-zinc-200 p-5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-md bg-zinc-950 text-sm font-semibold text-white">
              MT
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">MahaTeams</p>
              <p className="truncate text-xs text-zinc-500">New Gen</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-4 overflow-y-auto p-3">
          {groups.map((group) => (
            <div key={group.label}>
              <p className="px-2.5 py-2 text-xs font-medium text-zinc-500">
                {group.label}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => (
                  <MenuLink
                    key={item.label}
                    item={item}
                    currentPath={currentPath}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-zinc-200 p-3">
          <div className="mb-3 rounded-md bg-zinc-50 p-3">
            <div className="flex items-center gap-2">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-zinc-200 text-xs font-semibold text-zinc-700">
                {user.name.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{user.name}</p>
                <p className="truncate text-xs text-zinc-500">{user.email}</p>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge variant="secondary">{ROLE_LABEL[user.role]}</Badge>
              {user.defaultStudio?.name ? (
                <Badge variant="outline" className="bg-white">
                  <MapPin className="size-3" aria-hidden="true" />
                  {user.defaultStudio.name}
                </Badge>
              ) : null}
            </div>
          </div>
          <form action={logoutAction}>
            <Button
              type="submit"
              variant="ghost"
              className="w-full justify-start"
            >
              <LogOut aria-hidden="true" />
              Logout
            </Button>
          </form>
        </div>
      </div>
    </aside>
  );
}

function MobileNav({
  user,
  currentPath,
}: {
  user: DashboardUser;
  currentPath: string;
}) {
  const groups = getMenuGroups(user.role);
  const items = groups.flatMap((group) => group.items).filter((item) => item.href);

  return (
    <nav className="flex gap-2 overflow-x-auto pb-2 lg:hidden">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = item.href === currentPath;

        return (
          <Link
            key={item.label}
            href={item.href ?? "/"}
            className={cn(
              "flex h-9 shrink-0 items-center gap-2 rounded-md border px-3 text-sm",
              isActive
                ? "border-zinc-950 bg-zinc-950 text-white"
                : "border-zinc-200 bg-white text-zinc-700"
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function DashboardShell({
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
  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-950">
      <div className="flex min-h-screen">
        <SidebarNav user={user} currentPath={currentPath} />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="border-b border-zinc-200 bg-zinc-50/90 px-6 py-5 backdrop-blur lg:px-8">
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
              <MobileNav user={user} currentPath={currentPath} />
              <div>
                <Badge variant="outline" className="mb-3 bg-white">
                  {badge}
                </Badge>
                <h1 className="text-2xl font-semibold">{title}</h1>
                <p className="mt-2 max-w-2xl text-sm text-zinc-600">
                  {description}
                </p>
              </div>
            </div>
          </header>
          <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-6 py-6 lg:px-8">
            {children}
          </div>
        </div>
      </div>
    </main>
  );
}
