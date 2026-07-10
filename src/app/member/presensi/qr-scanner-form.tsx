"use client";

import type { Html5Qrcode } from "html5-qrcode";
import { useEffect, useId, useRef, useState } from "react";
import { Camera, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { submitWfoAttendanceAction } from "./actions";

function getCameraErrorMessage(error: unknown) {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError") {
      return "Izin kamera ditolak. Izinkan akses kamera dari browser, lalu coba lagi.";
    }

    if (error.name === "NotFoundError") {
      return "Kamera tidak ditemukan di perangkat ini.";
    }

    if (error.name === "NotReadableError") {
      return "Kamera sedang dipakai aplikasi lain. Tutup aplikasi kamera/meeting, lalu coba lagi.";
    }

    if (error.name === "OverconstrainedError") {
      return "Kamera belakang tidak tersedia. Coba gunakan perangkat lain atau kamera default.";
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Kamera belum bisa dibuka. Periksa izin kamera browser, lalu coba lagi.";
}

export function QrScannerForm({
  disabled,
  submitLabel,
}: {
  disabled: boolean;
  submitLabel: string;
}) {
  const scannerId = `qr-scanner-${useId().replace(/:/g, "")}`;
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [scanValue, setScanValue] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [message, setMessage] = useState(
    "Scan QR Card yang sudah kamu simpan untuk membuka tombol presensi."
  );
  
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [isLoadingGeo, setIsLoadingGeo] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
          setIsLoadingGeo(false);
        },
        (err) => {
          console.error(err);
          setGeoError(
            err.code === 1
              ? "Akses lokasi ditolak. Harap aktifkan GPS & izin lokasi browser."
              : "Gagal mendapatkan koordinat GPS. Pastikan GPS aktif."
          );
          setIsLoadingGeo(false);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setGeoError("Browser Anda tidak mendukung Geolocation.");
      setIsLoadingGeo(false);
    }
  }, []);

  function refreshLocation() {
    setIsLoadingGeo(true);
    setGeoError(null);
    setCoords(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setIsLoadingGeo(false);
      },
      (err) => {
        console.error(err);
        setGeoError(
          err.code === 1
            ? "Akses lokasi ditolak. Harap aktifkan GPS & izin lokasi browser."
            : "Gagal mendapatkan koordinat GPS. Pastikan GPS aktif."
        );
        setIsLoadingGeo(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  const canSubmit = Boolean(scanValue.trim()) && !disabled && Boolean(coords);

  async function stopScanner() {
    const scanner = scannerRef.current;

    if (!scanner) {
      setIsScanning(false);
      return;
    }

    try {
      if (scanner.isScanning) {
        await scanner.stop();
      }
      scanner.clear();
    } catch {
      // Scanner cleanup can fail if the browser already closed the camera stream.
    } finally {
      scannerRef.current = null;
      setIsScanning(false);
    }
  }

  async function startScanner() {
    if (disabled || isScanning) {
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setMessage("Akses kamera tidak tersedia di browser ini.");
      return;
    }

    setScanValue("");
    setMessage("Membuka kamera...");

    try {
      await stopScanner();

      const { Html5Qrcode: Html5QrcodeReader } = await import("html5-qrcode");
      const scanner = new Html5QrcodeReader(scannerId, {
        verbose: false,
      });

      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 240, height: 240 },
        },
        (decodedText) => {
          const qrValue = decodedText.trim();

          if (!qrValue) {
            return;
          }

          setScanValue(qrValue);
          setMessage("QR terbaca. Kamu bisa lanjut presensi.");
          void stopScanner();
        },
        () => {
          setMessage("Arahkan kamera ke QR Card sampai terbaca.");
        }
      );

      setIsScanning(true);
      setMessage("Arahkan kamera ke QR Card.");
    } catch (error) {
      await stopScanner();
      setMessage(getCameraErrorMessage(error));
    }
  }

  useEffect(() => {
    return () => {
      void stopScanner();
    };
  }, []);

  return (
    <div className="grid gap-3">
      <div className="relative min-h-64 overflow-hidden rounded-md border border-zinc-200 bg-zinc-950 flex items-center justify-center">
        <div
          id={scannerId}
          className="w-full text-sm text-zinc-100 [&_button]:rounded-md [&_button]:border [&_button]:border-zinc-300 [&_button]:bg-white [&_button]:px-3 [&_button]:py-2 [&_button]:text-zinc-900 [&_img]:mx-auto [&_video]:w-full [&_video]:h-auto [&_video]:max-h-[400px] [&_video]:object-contain"
        />
        {!isScanning ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-zinc-300">
            Kamera belum aktif
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => void startScanner()}
          disabled={disabled || isScanning}
        >
          <Camera aria-hidden="true" />
          Buka Kamera
        </Button>
        {isScanning ? (
          <Button
            type="button"
            variant="ghost"
            onClick={() => void stopScanner()}
          >
            Stop
          </Button>
        ) : null}
      </div>

      <p className="text-sm text-zinc-600">{message}</p>

      <div className="rounded-md border p-3 text-xs bg-zinc-50 dark:bg-zinc-900/50">
        {isLoadingGeo ? (
          <p className="text-zinc-500 flex items-center gap-1.5 animate-pulse">
            <span className="h-2 w-2 rounded-full bg-zinc-400" />
            Sedang melacak koordinat GPS Anda...
          </p>
        ) : coords ? (
          <p className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 font-medium">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Lokasi GPS Terverifikasi: {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
          </p>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <p className="text-red-600 dark:text-red-400 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              {geoError}
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={refreshLocation}
              className="text-[10px] h-6 py-0 px-2 shadow-none"
            >
              Coba Lagi
            </Button>
          </div>
        )}
      </div>

      <form action={submitWfoAttendanceAction} className="grid gap-3">
        <input type="hidden" name="latitude" value={coords?.lat ?? ""} />
        <input type="hidden" name="longitude" value={coords?.lng ?? ""} />
        <div className="flex flex-col gap-2">
          <label htmlFor="qrUid" className="text-sm font-medium">
            Hasil Scan QR
          </label>
          <Input
            id="qrUid"
            name="qrUid"
            value={scanValue}
            placeholder="Belum ada QR yang terbaca"
            disabled={disabled}
            readOnly
            required
          />
        </div>
        <Button type="submit" disabled={!canSubmit}>
          <ScanLine aria-hidden="true" />
          {submitLabel}
        </Button>
      </form>
    </div>
  );
}
