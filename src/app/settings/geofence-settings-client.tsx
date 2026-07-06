"use client";

import { useState, useTransition } from "react";
import { Loader2, Navigation, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateStudioGeofenceAction } from "./actions";

type Studio = {
  id: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  radiusMeters: number;
};

type Props = {
  studios: Studio[];
};

export function GeofenceSettingsClient({ studios }: Props) {
  const [selectedStudioId, setSelectedStudioId] = useState(studios[0]?.id ?? "");
  const [isPending, startTransition] = useTransition();
  const [savedMsg, setSavedMsg] = useState("");
  const [error, setError] = useState("");
  const [gpsLoading, setGpsLoading] = useState(false);

  // Local state map for studio geofence values
  const [geofenceMap, setGeofenceMap] = useState<Record<string, { latitude: string; longitude: string; radiusMeters: number }>>(() => {
    const map: Record<string, { latitude: string; longitude: string; radiusMeters: number }> = {};
    for (const studio of studios) {
      map[studio.id] = {
        latitude: studio.latitude !== null ? String(studio.latitude) : "",
        longitude: studio.longitude !== null ? String(studio.longitude) : "",
        radiusMeters: studio.radiusMeters ?? 100,
      };
    }
    return map;
  });

  const currentGeofence = geofenceMap[selectedStudioId] ?? {
    latitude: "",
    longitude: "",
    radiusMeters: 100,
  };

  function updateField<K extends keyof typeof currentGeofence>(key: K, value: (typeof currentGeofence)[K]) {
    setGeofenceMap((prev) => ({
      ...prev,
      [selectedStudioId]: {
        ...prev[selectedStudioId],
        [key]: value,
      },
    }));
  }

  // Get current device GPS location
  function handleDetectLocation() {
    if (!navigator.geolocation) {
      setError("Browser Anda tidak mendukung deteksi lokasi GPS.");
      return;
    }

    setGpsLoading(true);
    setError("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        updateField("latitude", String(position.coords.latitude));
        updateField("longitude", String(position.coords.longitude));
        setGpsLoading(false);
      },
      (err) => {
        setGpsLoading(false);
        if (err.code === 1) {
          setError("Izin akses lokasi ditolak oleh browser.");
        } else if (err.code === 2) {
          setError("Lokasi tidak dapat dideteksi. Pastikan GPS perangkat aktif.");
        } else {
          setError("Gagal mendeteksi lokasi.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function handleSave() {
    setSavedMsg("");
    setError("");
    startTransition(async () => {
      try {
        const lat = currentGeofence.latitude.trim() === "" ? null : Number(currentGeofence.latitude);
        const lng = currentGeofence.longitude.trim() === "" ? null : Number(currentGeofence.longitude);

        if (lat !== null && (isNaN(lat) || lat < -90 || lat > 90)) {
          throw new Error("Latitude harus bernilai angka antara -90 hingga 90.");
        }
        if (lng !== null && (isNaN(lng) || lng < -180 || lng > 180)) {
          throw new Error("Longitude harus bernilai angka antara -180 hingga 180.");
        }

        const radius = Number(currentGeofence.radiusMeters);
        if (isNaN(radius) || radius <= 0) {
          throw new Error("Radius geofence harus bernilai angka positif.");
        }

        await updateStudioGeofenceAction(selectedStudioId, {
          latitude: lat,
          longitude: lng,
          radiusMeters: radius,
        });

        setSavedMsg("Semua konfigurasi geofence berhasil disimpan.");
        setTimeout(() => setSavedMsg(""), 3000);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Gagal menyimpan.");
      }
    });
  }

  return (
    <div className="grid gap-6">
      {/* Studio Selector */}
      {studios.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {studios.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                setSelectedStudioId(s.id);
                setError("");
                setSavedMsg("");
              }}
              className={`rounded-lg border px-4 py-1.5 text-sm font-medium transition-colors ${
                selectedStudioId === s.id
                  ? "border-zinc-950 bg-zinc-950 dark:border-zinc-800 dark:bg-zinc-800 text-white"
                  : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900"
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      {/* Geofence Form */}
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="geo-latitude" className="text-zinc-700 dark:text-zinc-300">Latitude Koordinat</Label>
            <Input
              id="geo-latitude"
              type="text"
              placeholder="cth. -6.2088"
              value={currentGeofence.latitude}
              onChange={(e) => updateField("latitude", e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="geo-longitude" className="text-zinc-700 dark:text-zinc-300">Longitude Koordinat</Label>
            <Input
              id="geo-longitude"
              type="text"
              placeholder="cth. 106.8456"
              value={currentGeofence.longitude}
              onChange={(e) => updateField("longitude", e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="geo-radius" className="text-zinc-700 dark:text-zinc-300">Radius Geofence (Meter)</Label>
          <Input
            id="geo-radius"
            type="number"
            placeholder="cth. 100"
            value={currentGeofence.radiusMeters}
            onChange={(e) => updateField("radiusMeters", Number(e.target.value))}
          />
          <p className="text-[10px] text-zinc-400">
            Jarak toleransi maksimal (dalam meter) bagi staf untuk dapat melakukan presensi kehadiran di kantor.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            className="flex items-center gap-1.5"
            onClick={handleDetectLocation}
            disabled={gpsLoading}
          >
            {gpsLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Navigation className="size-4" />
            )}
            Gunakan Lokasi Saat Ini (GPS)
          </Button>

          <Button onClick={handleSave} disabled={isPending}>
            {isPending && <Loader2 className="size-4 mr-2 animate-spin" />}
            Simpan Geofence
          </Button>
        </div>

        {/* Notices */}
        {savedMsg && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50/50 dark:bg-emerald-950/20 p-3 text-xs text-emerald-800 dark:text-emerald-400">
            <CheckCircle className="size-4" />
            {savedMsg}
          </div>
        )}

        {error && (
          <div className="mt-3 rounded-lg border border-red-100 bg-red-50/50 dark:bg-red-950/20 p-3 text-xs text-red-800 dark:text-red-400">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
