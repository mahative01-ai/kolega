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
  useSidebar,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Archive,
  CalendarClock,
  Settings,
  UserRound,
  LayoutGrid,
  BrushCleaning,
  MessageSquare,
  FileCheck,
  FileWarning,
  ClipboardCheck,
  Clipboard,
  History,
  MapPin,
  BriefcaseBusiness,
  Terminal,
  Search,
} from "lucide-react";
import { ROLE_LABEL } from "@/lib/roles";
import { NavUser } from "@/components/nav-user";

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
  icon: React.ComponentType<{ className?: string }>;
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
      icon: LayoutGrid,
    },
  ];

  if (role === "SUPER_ADMIN") {
    return [
      { label: "Utama", items: main },
      {
        label: "Manajemen",
        items: [
          { label: "User & Role", href: "/roles", icon: UserRound },
          { label: "Studio & Lokasi", href: "/super-admin/studios", icon: MapPin },
          { label: "Placement", href: "/super-admin/placements", icon: BriefcaseBusiness },
          { label: "Jadwal WFO/WFH", href: "/schedules", icon: CalendarClock },
          { label: "Cuti & Kalender", href: "/calendar", icon: CalendarClock },
          { label: "Jadwal Piket", href: "/piket", icon: BrushCleaning },
          { label: "Slip Gaji", href: "/super-admin/payslips", icon: ClipboardCheck },
        ],
      },
      {
        label: "Monitoring",
        items: [
          { label: "Laporan Presensi", href: "/laporan-presensi", icon: Clipboard },
          { label: "Persetujuan", href: "/admin/requests", icon: MessageSquare },
          { label: "Audit Trail", href: "/super-admin/audit-logs", icon: FileWarning },
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
          { label: "Riwayat Saya", href: "/member/presensi/riwayat", icon: History },
          { label: "Ajukan Izin Saya", href: "/member/requests", icon: MessageSquare },
          { label: "Koreksi Presensi Saya", href: "/member/corrections", icon: ClipboardCheck },
          { label: "Laporan WFH Saya", href: "/member/laporan-wfh", icon: Clipboard },
        ],
      },
      {
        label: "Operasional",
        items: [
          { label: "User Studio", href: "/roles", icon: UserRound },
          { label: "Jadwal Tim", href: "/schedules", icon: CalendarClock },
          { label: "Persetujuan", href: "/admin/requests", icon: MessageSquare },
          { label: "Piket & Pengingat", href: "/piket", icon: BrushCleaning },
        ],
      },
    ];
  }

  return [
    { label: "Utama", items: main },
    {
      label: "Presensi",
      items: [
        { label: "Jadwal Saya", icon: CalendarClock, badge: "Next" },
        { label: "Riwayat Saya", href: "/member/presensi/riwayat", icon: History },
        { label: "Izin/Sakit/Cuti", href: "/member/requests", icon: MessageSquare },
        { label: "Koreksi Presensi", href: "/member/corrections", icon: ClipboardCheck },
        { label: "Jadwal Piket Saya", href: "/piket", icon: BrushCleaning },
        { label: "Laporan WFH", href: "/member/laporan-wfh", icon: Clipboard },
        { label: "Slip Gaji Saya", href: "/member/payslips", icon: ClipboardCheck },
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
  const { state } = useSidebar();
  const isMember = user.role === "MEMBER";

  return (
    <Sidebar collapsible={isMember ? undefined : "icon"} variant="inset" {...props}>
      <SidebarHeader className="relative overflow-visible">
        {state === "collapsed" && !isMember ? (
          <div className="relative h-12 w-full flex items-center justify-center overflow-visible">
            {/* The Logo container that extends (memanjangkan) on hover to the right using the terminal logo */}
            <div className="group absolute left-1.5 flex items-center h-10 w-9 hover:w-44 rounded-lg bg-white dark:bg-zinc-950 border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800 hover:shadow-md hover:z-50 transition-all duration-300 overflow-hidden cursor-pointer p-0.5">
              <div className="flex aspect-square size-8 items-center justify-center shrink-0 rounded-lg bg-zinc-950 dark:bg-zinc-100 text-zinc-50 dark:text-zinc-950">
                <Terminal className="size-4" />
              </div>
              <div className="flex flex-col ml-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
                <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-xs">Kolega</span>
                <span className="text-[9px] text-zinc-500 dark:text-zinc-400">New Gen</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
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
            {/* Search Input Box below the logo for MEMBER role to match sidebar-01 specifications */}
            {isMember && (
              <div className="px-2 pb-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
                  <Input
                    type="search"
                    placeholder="Cari menu..."
                    className="pl-8 h-9 text-xs bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.label} className="group-data-[collapsible=icon]:p-2">
            <SidebarGroupLabel className="px-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 group-data-[collapsible=icon]:hidden">
              {group.label}
            </SidebarGroupLabel>
            <SidebarMenu>
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = item.href ? item.href === currentPath : false;

                return (
                  <SidebarMenuItem key={item.label}>
                    {item.href ? (
                      <SidebarMenuButton
                        isActive={isActive}
                        render={<Link href={item.href} />}
                        tooltip={isMember ? undefined : item.label}
                        className={isActive ? "bg-zinc-950 dark:bg-zinc-100 text-white dark:text-zinc-950 font-medium group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2!" : "text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2!"}
                      >
                        <Icon className="size-4 shrink-0" />
                        <span className="truncate flex-1 group-data-[collapsible=icon]:hidden">{item.label}</span>
                        {item.badge && (
                          <Badge
                            variant="outline"
                            className={
                              "group-data-[collapsible=icon]:hidden " +
                              (isActive
                                ? "border-white/40 dark:border-zinc-800 text-white dark:text-zinc-950 text-[9px] px-1 py-0"
                                : "text-zinc-700 dark:text-zinc-300 text-[9px] px-1 py-0")
                            }
                          >
                            {item.badge}
                          </Badge>
                        )}
                      </SidebarMenuButton>
                    ) : (
                      <SidebarMenuButton
                        disabled
                        tooltip={isMember ? undefined : item.label}
                        className="opacity-55 cursor-not-allowed text-zinc-700 dark:text-zinc-300 flex w-full items-center gap-2 group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2!"
                      >
                        <Icon className="size-4 shrink-0" />
                        <span className="truncate flex-1 group-data-[collapsible=icon]:hidden">{item.label}</span>
                        {item.badge && (
                          <Badge
                            variant="outline"
                            className="text-zinc-700 dark:text-zinc-300 text-[9px] px-1 py-0 group-data-[collapsible=icon]:hidden"
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
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
