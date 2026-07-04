"use client";

import { useState, useTransition } from "react";
import { Loader2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { assignPicketAction } from "./actions";

type Member = { id: string; name: string; defaultStudioId: string | null };
type Studio = { id: string; name: string };

type Props = {
  members: Member[];
  studioId: string;
  studios: Studio[];
  monthKey: string;
  isSuperAdmin: boolean;
};

export function PicketFormClient({ members, studioId, studios, monthKey, isSuperAdmin }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form State
  const [selectedStudioId, setSelectedStudioId] = useState(studioId);
  const [userId, setUserId] = useState("");
  const [picketDate, setPicketDate] = useState(monthKey + "-01");
  const [note, setNote] = useState("");

  // Filter members based on selected studio
  const filteredMembers = members.filter(
    (m) => !selectedStudioId || m.defaultStudioId === selectedStudioId
  );

  function resetForm() {
    setUserId("");
    setPicketDate(monthKey + "-01");
    setNote("");
    setError("");
    setSuccess("");
  }

  function handleSubmit() {
    if (!selectedStudioId) {
      setError("Pilih studio terlebih dahulu.");
      return;
    }
    if (!userId) {
      setError("Pilih petugas piket.");
      return;
    }
    if (!picketDate) {
      setError("Pilih tanggal piket.");
      return;
    }

    startTransition(async () => {
      try {
        await assignPicketAction({
          userId,
          studioId: selectedStudioId,
          picketDate,
          note,
        });
        setSuccess("Tugas piket berhasil ditugaskan!");
        resetForm();
        setTimeout(() => setSuccess(""), 3000);
      } catch (e: any) {
        setError(e.message || "Gagal menugaskan piket.");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <UserPlus className="size-4 text-blue-700" />
          Tugaskan Piket
        </CardTitle>
        <CardDescription>Pilih anggota dan tanggal piket.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {/* Studio Select (Super Admin only) */}
        {isSuperAdmin && (
          <div className="grid gap-1.5">
            <Label>Studio</Label>
            <Select
              value={selectedStudioId}
              onValueChange={(val) => {
                setSelectedStudioId(val || "");
                setUserId("");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih Studio" />
              </SelectTrigger>
              <SelectContent>
                {studios.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Member Select */}
        <div className="grid gap-1.5">
          <Label>Petugas Piket</Label>
          <Select value={userId} onValueChange={(val) => setUserId(val || "")}>
            <SelectTrigger>
              <SelectValue placeholder={filteredMembers.length === 0 ? "Tidak ada anggota aktif" : "Pilih Anggota"} />
            </SelectTrigger>
            <SelectContent>
              {filteredMembers.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date Input */}
        <div className="grid gap-1.5">
          <Label htmlFor="picket-date">Tanggal</Label>
          <Input
            id="picket-date"
            type="date"
            value={picketDate}
            onChange={(e) => setPicketDate(e.target.value)}
          />
        </div>

        {/* Note */}
        <div className="grid gap-1.5">
          <Label htmlFor="picket-note">Catatan (opsional)</Label>
          <Input
            id="picket-note"
            placeholder="cth. Sapu & Matikan AC"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">{error}</p>}
        {success && <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded p-2">{success}</p>}

        <Button onClick={handleSubmit} disabled={isPending || filteredMembers.length === 0} className="w-full mt-2">
          {isPending ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
          Tugaskan
        </Button>
      </CardContent>
    </Card>
  );
}
