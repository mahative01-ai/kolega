"use client";

import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { ChevronsUpDown, Settings, LogOut, ShieldCheck, MapPin } from "lucide-react";
import { ROLE_LABEL } from "@/lib/roles";
import { getMood } from "@/lib/moods";

type SidebarUser = {
  id: string;
  name: string;
  email: string;
  role: keyof typeof ROLE_LABEL;
  currentMood?: string;
  defaultStudio?: {
    name: string;
  } | null;
};

export function NavUser({ user }: { user: SidebarUser }) {
  const { isMobile } = useSidebar();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                className="group/menu-button flex h-12 w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm ring-sidebar-ring outline-hidden transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 data-popup-open:bg-sidebar-accent data-popup-open:text-sidebar-accent-foreground group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-0!"
              />
            }
          >
            <Avatar className="h-8 w-8 rounded-full shrink-0">
              <AvatarFallback className={`rounded-full text-base font-semibold select-none flex items-center justify-center ${getMood(user.currentMood).bgColor} border ${getMood(user.currentMood).borderColor}`}>
                {getMood(user.currentMood).emoji}
              </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
              <span className="truncate font-medium text-zinc-900 dark:text-zinc-100">{user.name}</span>
              <span className="truncate text-xs text-zinc-500 dark:text-zinc-400">{user.email}</span>
            </div>
            <ChevronsUpDown className="ml-auto size-4 text-zinc-500 group-data-[collapsible=icon]:hidden" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-56 font-sans"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-full">
                  <AvatarFallback className={`rounded-full text-base font-semibold select-none flex items-center justify-center ${getMood(user.currentMood).bgColor} border ${getMood(user.currentMood).borderColor}`}>
                    {getMood(user.currentMood).emoji}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold text-zinc-900 dark:text-zinc-100">{user.name}</span>
                  <span className="truncate text-xs text-zinc-500 dark:text-zinc-400">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <div className="px-2 py-1.5 flex flex-wrap gap-1">
                <span className="inline-flex items-center rounded-md bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 text-[9px] font-medium text-zinc-800 dark:text-zinc-200">
                  <ShieldCheck className="size-2.5 mr-1" />
                  {ROLE_LABEL[user.role]}
                </span>
                {user.defaultStudio?.name && (
                  <span className="inline-flex items-center rounded-md border border-zinc-200 dark:border-zinc-800 px-1.5 py-0.5 text-[9px] font-medium text-zinc-700 dark:text-zinc-300">
                    <MapPin className="size-2.5 mr-1" />
                    {user.defaultStudio.name}
                  </span>
                )}
              </div>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => { window.location.href = "/settings"; }}>
                <Settings className="size-4" />
                <span>Pengaturan</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => {
                window.location.href = "/api/auth/logout";
              }}
            >
              <LogOut className="size-4" />
              <span>Keluar</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
