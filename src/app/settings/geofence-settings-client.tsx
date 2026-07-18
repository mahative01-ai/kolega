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
      setError("Your browser does not support GPS location detection.");
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
          setError("Location access permission denied by browser.");
        } else if (err.code === 2) {
          setError("Location could not be detected. Make sure device GPS is active.");
        } else {
          setError("Failed to detect location.");
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
          throw new Error("Latitude must be a number between -90 and 90.");
        }
        if (lng !== null && (isNaN(lng) || lng < -180 || lng > 180)) {
          throw new Error("Longitude must be a number between -180 and 180.");
        }

        const radius = Number(currentGeofence.radiusMeters);
        if (isNaN(radius) || radius <= 0) {
          throw new Error("Geofence radius must be a positive number.");
        }

        await updateStudioGeofenceAction(selectedStudioId, {
          latitude: lat,
          longitude: lng,
          radiusMeters: radius,
        });

        setSavedMsg("All geofence configurations successfully saved.");
        setTimeout(() => setSavedMsg(""), 3000);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to save.");
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
            <Label htmlFor="geo-latitude" className="text-zinc-700 dark:text-zinc-300">Latitude Coordinate</Label>
            <Input
              id="geo-latitude"
              type="text"
              placeholder="e.g. -6.2088"
              value={currentGeofence.latitude}
              onChange={(e) => updateField("latitude", e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="geo-longitude" className="text-zinc-700 dark:text-zinc-300">Longitude Coordinate</Label>
            <Input
              id="geo-longitude"
              type="text"
              placeholder="e.g. 106.8456"
              value={currentGeofence.longitude}
              onChange={(e) => updateField("longitude", e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="geo-radius" className="text-zinc-700 dark:text-zinc-300">Geofence Radius (Meters)</Label>
          <Input
            id="geo-radius"
            type="number"
            placeholder="e.g. 100"
            value={currentGeofence.radiusMeters}
            onChange={(e) => updateField("radiusMeters", Number(e.target.value))}
          />
          <p className="text-[10px] text-zinc-400">
            Maximum tolerance distance (in meters) for staff to perform attendance presences.
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
            Use Current Location (GPS)
          </Button>

          <Button onClick={handleSave} disabled={isPending}>
            {isPending && <Loader2 className="size-4 mr-2 animate-spin" />}
            Save Geofence
          </Button>
        </div>

        {(() => {
          const latNum = Number(currentGeofence.latitude);
          const lngNum = Number(currentGeofence.longitude);
          const hasCoordinates = !isNaN(latNum) && !isNaN(lngNum) && currentGeofence.latitude.trim() !== "" && currentGeofence.longitude.trim() !== "";
          
          if (!hasCoordinates) return null;

          return (
            <div className="mt-4 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-sm bg-zinc-50 dark:bg-zinc-950/40 p-2">
              <p className="text-xs font-semibold mb-2 text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 px-1">
                Studio Location Visualization (Google Maps)
              </p>
              <iframe
                src={`https://maps.google.com/maps?q=${latNum},${lngNum}&t=&z=16&ie=UTF8&iwloc=&output=embed`}
                width="100%"
                height="250"
                style={{ border: 0 }}
                className="rounded-md"
                allowFullScreen={true}
                loading="lazy"
              />
            </div>
          );
        })()}

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
