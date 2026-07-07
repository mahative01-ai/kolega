"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
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
  Settings,
  ShieldCheck,
  UserCog,
  UserRound,
  UsersRound,
  Terminal,
} from "lucide-react";
import { logoutAction } from "@/app/login/actions";
import { ROLE_LABEL } from "@/lib/roles";

type SidebarUser = {
  id: string;
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
  icon: React.ComponentType<any>;
  badge?: string;
};

type MenuGroup = {
  label: string;
  items: MenuItem[];
};

function getPrimaryDashboard(role: SidebarUser["role"]) {
  if (role === "SUPER_ADMIN") return "/super-admin";
  if (role === "ADMIN") return "/admin";
  return "/member";
}

function getMenuGroups(role: SidebarUser["role"]): MenuGroup[] {
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
          { label: "Studio & Lokasi", href: "/super-admin/studios", icon: Building2 },
          { label: "Placement", href: "/super-admin/placements", icon: BriefcaseBusiness },
          { label: "Jadwal WFO/WFH", href: "/schedules", icon: CalendarDays },
          { label: "Cuti & Kalender", href: "/calendar", icon: ClipboardList },
          { label: "Jadwal Piket", href: "/piket", icon: ClipboardList },
        ],
      },
      {
        label: "Monitoring",
        items: [
          { label: "Laporan Presensi", href: "/laporan-presensi", icon: BarChart3 },
          { label: "Approval Izin", href: "/admin/requests", icon: ClipboardCheck },
          { label: "Approval Koreksi", href: "/admin/corrections", icon: Archive },
          { label: "Audit Trail", href: "/super-admin/audit-logs", icon: ShieldCheck },
          { label: "Arsip Akun", href: "/super-admin/archived-accounts", icon: Archive },
          { label: "Pengaturan", href: "/settings", icon: Settings },
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
          { label: "Riwayat Saya", href: "/member/presensi/riwayat", icon: ClipboardCheck },
          { label: "Ajukan Izin Saya", href: "/member/requests", icon: ClipboardList },
          { label: "Koreksi Presensi Saya", href: "/member/corrections", icon: Archive },
          { label: "Laporan WFH Saya", href: "/member/laporan-wfh", icon: Home },
        ],
      },
      {
        label: "Operasional",
        items: [
          { label: "User Studio", href: "/roles", icon: UsersRound },
          { label: "Presensi Tim", icon: ClipboardCheck, badge: "Next" },
          { label: "Jadwal Tim", href: "/schedules", icon: CalendarDays },
          { label: "Laporan Presensi", href: "/laporan-presensi", icon: BarChart3 },
          { label: "Izin/Sakit/Cuti", href: "/admin/requests", icon: ClipboardList },
          { label: "Koreksi Presensi", href: "/admin/corrections", icon: Archive },
          { label: "Piket & Pengingat", href: "/piket", icon: CalendarDays },
        ],
      },
    ];
  }

  return [
    { label: "Utama", items: main },
    {
      label: "Presensi",
      items: [
        { label: "Jadwal Saya", icon: CalendarDays, badge: "Next" },
        { label: "Riwayat Saya", href: "/member/presensi/riwayat", icon: ClipboardCheck },
        { label: "Izin/Sakit/Cuti", href: "/member/requests", icon: ClipboardList },
        { label: "Koreksi Presensi", href: "/member/corrections", icon: Archive },
        { label: "Jadwal Piket Saya", href: "/piket", icon: ClipboardList },
        { label: "Laporan WFH", href: "/member/laporan-wfh", icon: Home },
      ],
    },
  ];
}

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user: SidebarUser;
}

export function AppSidebar({ user, ...props }: AppSidebarProps) {
  const currentPath = usePathname();
  const groups = getMenuGroups(user.role);

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-3 px-2 py-3">
              <div className="flex aspect-square size-9 items-center justify-center rounded-lg bg-zinc-950 dark:bg-zinc-100 text-zinc-50 dark:text-zinc-950">
                <Terminal className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold text-zinc-900 dark:text-zinc-100">Kolega</span>
                <span className="truncate text-xs text-zinc-500 dark:text-zinc-400">New Gen</span>
              </div>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="px-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              {group.label}
            </SidebarGroupLabel>
            <SidebarMenu>
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = item.href === currentPath;

                return (
                  <SidebarMenuItem key={item.label}>
                    {item.href ? (
                      <SidebarMenuButton
                        isActive={isActive}
                        render={<Link href={item.href} />}
                        className={isActive ? "bg-zinc-950 dark:bg-zinc-100 text-white dark:text-zinc-950 font-medium" : "text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white"}
                      >
                        <Icon className="size-4 shrink-0" />
                        <span className="truncate flex-1">{item.label}</span>
                        {item.badge && (
                          <Badge
                            variant="outline"
                            className={
                              isActive
                                ? "border-white/40 dark:border-zinc-800 text-white dark:text-zinc-950 text-[9px] px-1 py-0"
                                : "text-zinc-700 dark:text-zinc-300 text-[9px] px-1 py-0"
                            }
                          >
                            {item.badge}
                          </Badge>
                        )}
                      </SidebarMenuButton>
                    ) : (
                      <SidebarMenuButton
                        disabled
                        className="opacity-55 cursor-not-allowed text-zinc-700 dark:text-zinc-300 flex w-full items-center gap-2"
                      >
                        <Icon className="size-4 shrink-0" />
                        <span className="truncate flex-1">{item.label}</span>
                        {item.badge && (
                          <Badge
                            variant="outline"
                            className="text-zinc-700 dark:text-zinc-300 text-[9px] px-1 py-0"
                          >
                            {item.badge}
                          </Badge>
                        )}
                      </SidebarMenuButton>
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <div className="border-t border-zinc-200 dark:border-zinc-800 p-2.5 space-y-2.5">
          <div className="rounded-lg bg-zinc-50 dark:bg-zinc-900 p-2.5">
            <div className="flex items-center gap-2">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-zinc-200 dark:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                {user.name.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-zinc-900 dark:text-zinc-100">{user.name}</p>
                <p className="truncate text-[10px] text-zinc-500 dark:text-zinc-400">{user.email}</p>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              <Badge variant="secondary" className="text-[9px] px-1 py-0">
                {ROLE_LABEL[user.role]}
              </Badge>
              {user.defaultStudio?.name && (
                <Badge variant="outline" className="bg-white dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 text-[9px] px-1 py-0">
                  <MapPin className="size-2.5 mr-0.5" />
                  {user.defaultStudio.name}
                </Badge>
              )}
            </div>
          </div>

          <form action={logoutAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors font-medium"
            >
              <LogOut className="size-3.5" />
              <span>Keluar</span>
            </button>
          </form>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
