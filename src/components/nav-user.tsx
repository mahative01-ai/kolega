"use client";

import React, { useState, useTransition } from "react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  SidebarMenu,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { ChevronsUpDown, Settings, LogOut, ShieldCheck, MapPin, Smile, Loader2 } from "lucide-react";
import { ROLE_LABEL } from "@/lib/roles";
import { getMood, MOODS } from "@/lib/moods";
import { updateMoodAction } from "@/app/settings/actions";
import { toast } from "sonner";

type SidebarUser = {
  id: string;
  name: string;
  email: string;
  role: keyof typeof ROLE_LABEL;
  currentMood?: string;
  moodNote?: string | null;
  defaultStudio?: {
    name: string;
  } | null;
};

export function NavUser({ user }: { user: SidebarUser }) {
  const { isMobile } = useSidebar();
  const [isPending, startTransition] = useTransition();

  // Mood dialog states
  const [moodOpen, setMoodOpen] = useState(false);
  const [selectedMood, setSelectedMood] = useState(user.currentMood || "NEUTRAL");
  const [moodNote, setMoodNote] = useState(user.moodNote || "");

  const handleSaveMood = () => {
    const formData = new FormData();
    formData.append("currentMood", selectedMood);
    formData.append("moodNote", moodNote);

    startTransition(async () => {
      try {
        await updateMoodAction(formData);
        toast.success("Mood harian berhasil diperbarui.");
        setMoodOpen(false);
        // Refresh page to propagate new mood immediately
        window.location.reload();
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Gagal memperbarui mood.");
      }
    });
  };

  return (
    <>
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
                <DropdownMenuItem onClick={() => setMoodOpen(true)}>
                  <Smile className="size-4 text-blue-600 dark:text-blue-400" />
                  <span>Set Mood Harian</span>
                </DropdownMenuItem>
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

      {/* Quick Set Mood Dialog */}
      <Dialog open={moodOpen} onOpenChange={setMoodOpen}>
        <DialogContent className="max-w-md font-sans">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-1.5">
              <Smile className="size-5 text-blue-650" />
              Bagaimana Kabarmu Hari Ini?
            </DialogTitle>
            <DialogDescription>
              Bagikan suasana hati dan status singkat Anda dengan rekan satu studio.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="grid grid-cols-6 gap-2">
              {MOODS.map((m) => {
                const isSelected = selectedMood === m.key;
                return (
                  <button
                    key={m.key}
                    type="button"
                    title={m.label}
                    onClick={() => setSelectedMood(m.key)}
                    className={`flex aspect-square flex-col items-center justify-center rounded-lg border text-xl transition-all hover:scale-105 ${
                      isSelected
                        ? `${m.bgColor} ${m.borderColor} ring-2 ring-blue-500/20 scale-105`
                        : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:bg-zinc-50"
                    }`}
                  >
                    <span>{m.emoji}</span>
                  </button>
                );
              })}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="mood-note" className="text-xs font-semibold text-zinc-500">
                Pesan Status Singkat (Maks 50 karakter)
              </label>
              <Input
                id="mood-note"
                value={moodNote}
                onChange={(e) => setMoodNote(e.target.value.slice(0, 50))}
                placeholder="Sedang fokus coding... / Ngopi dulu ☕"
                className="h-9"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setMoodOpen(false)} disabled={isPending}>
              Batal
            </Button>
            <Button
              size="sm"
              onClick={handleSaveMood}
              disabled={isPending}
              className="bg-blue-700 hover:bg-blue-800 text-white flex items-center gap-1"
            >
              {isPending && <Loader2 className="size-3 animate-spin" />}
              {isPending ? "Menyimpan..." : "Simpan Mood"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
