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
      return "Camera permission denied. Allow camera access in your browser and try again.";
    }

    if (error.name === "NotFoundError") {
      return "Camera not found on this device.";
    }

    if (error.name === "NotReadableError") {
      return "Camera is currently in use by another application. Close other camera/meeting apps and try again.";
    }

    if (error.name === "OverconstrainedError") {
      return "Rear camera is not available. Try another device or the default camera.";
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Could not open camera. Check browser camera permissions and try again.";
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
    "Scan your saved QR Card to activate the attendance button."
  );
  
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [isLoadingGeo, setIsLoadingGeo] = useState(true);

  function refreshLocation() {
    setIsLoadingGeo(true);
    setGeoError(null);
    setCoords(null);
    if (!navigator.geolocation) {
      setGeoError("Your browser does not support Geolocation.");
      setIsLoadingGeo(false);
      return;
    }

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
            ? "Location access denied. Please enable GPS and allow location access in your browser."
            : "Failed to retrieve GPS coordinates. Make sure GPS is enabled."
        );
        setIsLoadingGeo(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  useEffect(() => {
    const timer = window.setTimeout(refreshLocation, 0);
    return () => window.clearTimeout(timer);
  }, []);

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
      setMessage("Camera access is not supported in this browser.");
      return;
    }

    setScanValue("");
    setMessage("Opening camera...");

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
          setMessage("QR read successfully. You can proceed with attendance.");
          void stopScanner();
        },
        () => {
          setMessage("Point your camera at the QR Card until it is read.");
        }
      );

      setIsScanning(true);
      setMessage("Point your camera at the QR Card.");
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
            Camera not active
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
          Open Camera
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
            Tracking your GPS coordinates...
          </p>
        ) : coords ? (
          <p className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 font-medium">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            GPS Location Verified: {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
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
              Try Again
            </Button>
          </div>
        )}
      </div>

      <form action={submitWfoAttendanceAction} className="grid gap-3">
        <input type="hidden" name="latitude" value={coords?.lat ?? ""} />
        <input type="hidden" name="longitude" value={coords?.lng ?? ""} />
        <div className="flex flex-col gap-2">
          <label htmlFor="qrUid" className="text-sm font-medium">
            QR Scan Result
          </label>
          <Input
            id="qrUid"
            name="qrUid"
            value={scanValue}
            placeholder="No QR code read yet"
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
