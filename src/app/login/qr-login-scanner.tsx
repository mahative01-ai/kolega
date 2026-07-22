"use client";

import type { Html5Qrcode } from "html5-qrcode";
import { useEffect, useId, useRef, useState } from "react";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { loginAndAttendWithQrAction } from "./actions";

type CurrentUserProp = {
  name: string;
  role: string;
  studioName: string;
  statusText: string;
  statusColor: string;
};

export function QrLoginScanner({
  autoStart = false,
  currentUser,
  action,
  disabled = false,
  disabledMessage = "Scan action not available.",
}: {
  autoStart?: boolean;
  currentUser?: CurrentUserProp;
  action?: string;
  disabled?: boolean;
  disabledMessage?: string;
}) {
  const scannerId = `login-qr-scanner-${useId().replace(/:/g, "")}`;
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [loading, setLoading] = useState(false);

  const defaultMsg = disabled
    ? disabledMessage
    : currentUser
      ? "Point your QR Card at the webcam camera for daily WFO attendance."
      : "Point your QR Card at the webcam camera to sign in & log attendance automatically.";

  const [message, setMessage] = useState(defaultMsg);
  const [statusType, setStatusType] = useState<"info" | "success" | "error" | null>(null);

  async function getCurrentPosition() {
    if (!navigator.geolocation) {
      throw new Error("Location access is not supported in this browser.");
    }

    return new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      });
    });
  }

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
      // ignore cleanup errors
    } finally {
      scannerRef.current = null;
      setIsScanning(false);
    }
  }

  async function startScanner() {
    if (disabled) {
      setMessage(disabledMessage);
      setStatusType("info");
      return;
    }

    if (loading) return;

    if (!navigator.mediaDevices?.getUserMedia) {
      setMessage("Camera access is not supported in this browser.");
      setStatusType("error");
      return;
    }

    setMessage("Opening camera...");
    setStatusType("info");

    try {
      await stopScanner();

      const { Html5Qrcode: Html5QrcodeReader } = await import("html5-qrcode");
      const scanner = new Html5QrcodeReader(scannerId, { verbose: false });
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 220, height: 220 },
          aspectRatio: 1.777778,
        },
        async (decodedText) => {
          const qrUid = decodedText.trim();
          if (!qrUid) return;

          setLoading(true);
          setMessage("QR detected. Getting location...");
          setStatusType("info");
          await stopScanner();

          try {
            const position = await getCurrentPosition();

            setMessage("Location obtained. Processing attendance...");

            const res = (await loginAndAttendWithQrAction(qrUid, {
              action,
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            })) as {
              success: boolean;
              error?: string;
              warning?: string;
              info?: string;
              message?: string;
              redirectUrl?: string;
            };

            if (res.success) {
              if (res.warning) {
                setMessage(res.warning);
                setStatusType("error");
              } else if (res.info) {
                setMessage(res.info);
                setStatusType("info");
              } else if (res.message) {
                setMessage(res.message);
                setStatusType("success");
              } else {
                setMessage("Success. Redirecting...");
                setStatusType("success");
              }
              
              const delay = res.warning || res.info || res.message ? 3500 : 800;
              setTimeout(() => {
                window.location.href = res.redirectUrl || "/";
              }, delay);
            } else {
              setMessage(res.error || "Failed to process QR.");
              setStatusType("error");
              setLoading(false);
            }
          } catch (error: unknown) {
            setMessage(
              error instanceof Error
                ? error.message
                : "System error while processing."
            );
            setStatusType("error");
            setLoading(false);
          }
        },
        () => {
          // ignore scan frame errors
        }
      );

      setIsScanning(true);
      setMessage("Point your QR Card at the camera.");
      setStatusType("info");
    } catch {
      await stopScanner();
      setMessage("Failed to activate camera. Please ensure camera permissions are granted.");
      setStatusType("error");
    }
  }

  useEffect(() => {
    if (autoStart && !disabled) {
      const timer = setTimeout(() => {
        void startScanner();
      }, 300);
      return () => {
        clearTimeout(timer);
        void stopScanner();
      };
    }
    return () => {
      void stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, disabled]);

  return (
    <div className="grid gap-3">
      {currentUser && (
        <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm shadow-sm flex flex-col gap-2">
          <div>
            <p className="font-semibold text-zinc-950">{currentUser.name}</p>
            <p className="text-xs text-zinc-500">
              {currentUser.role === "ADMIN" ? "Admin" : "Member"} • {currentUser.studioName}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-zinc-200/60 mt-1">
            <span className="text-[11px] text-zinc-400 font-medium">Today&apos;s status:</span>
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${currentUser.statusColor}`}>
              {currentUser.statusText}
            </span>
          </div>
        </div>
      )}

      <div className="relative min-h-64 overflow-hidden rounded-md border border-zinc-200 bg-zinc-950">
        <div
          id={scannerId}
          className="min-h-64 text-sm text-zinc-100 [&_button]:rounded-md [&_button]:border [&_button]:border-zinc-300 [&_button]:bg-white [&_button]:px-3 [&_button]:py-2 [&_button]:text-zinc-900 [&_img]:mx-auto [&_video]:w-full"
        />
        {!isScanning && !loading ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-zinc-400">
            Camera not active
          </div>
        ) : null}
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/80 text-sm text-zinc-100">
            Processing...
          </div>
        ) : null}
      </div>

      {!autoStart ? (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => void startScanner()}
            disabled={disabled || isScanning || loading}
            className="w-full"
          >
            <Camera aria-hidden="true" className="mr-1.5 size-4" />
            Start QR Scanning
          </Button>
        </div>
      ) : null}

      <div
        className={`rounded-md p-3 text-sm border ${
          statusType === "success"
            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
            : statusType === "error"
              ? "bg-red-50 border-red-200 text-red-800"
              : statusType === "info"
                ? "bg-amber-50 border-amber-200 text-amber-800"
                : "bg-zinc-50 border-zinc-200 text-zinc-600"
        }`}
      >
        {message}
      </div>
    </div>
  );
}
