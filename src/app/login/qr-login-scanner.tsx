"use client";

import type { Html5Qrcode } from "html5-qrcode";
import { useEffect, useId, useRef, useState } from "react";
import { Camera, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { loginAndAttendWithQrAction, verifyQrForRequestAction } from "./actions";

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
}: {
  autoStart?: boolean;
  currentUser?: CurrentUserProp;
}) {
  const scannerId = `login-qr-scanner-${useId().replace(/:/g, "")}`;
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [requestMode, setRequestMode] = useState(false);

  const defaultMsg = currentUser
    ? "Arahkan kartu QR Card Anda ke kamera webcam untuk presensi harian WFO."
    : "Arahkan kartu QR Card Anda ke kamera webcam untuk login & presensi otomatis.";
  const requestMsg = "Mode Verifikasi Izin: Pindai QR Card Anda untuk memverifikasi identitas sebelum mengajukan Sakit/Cuti.";

  const [message, setMessage] = useState(defaultMsg);
  const [statusType, setStatusType] = useState<"info" | "success" | "error" | null>(null);

  // Sync message when mode changes
  useEffect(() => {
    setMessage(requestMode ? requestMsg : defaultMsg);
    setStatusType(requestMode ? "info" : null);
  }, [requestMode, defaultMsg]);

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
    if (loading) return;

    if (!navigator.mediaDevices?.getUserMedia) {
      setMessage("Akses kamera tidak didukung di browser ini.");
      setStatusType("error");
      return;
    }

    setMessage(requestMode ? "Membuka kamera verifikasi..." : "Membuka kamera...");
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
          setMessage(requestMode ? "Memproses verifikasi QR..." : "QR terdeteksi. Memproses masuk...");
          setStatusType("info");
          await stopScanner();

          try {
            const res = (requestMode
              ? await verifyQrForRequestAction(qrUid)
              : await loginAndAttendWithQrAction(qrUid)) as {
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
                setMessage("Berhasil. Mengalihkan...");
                setStatusType("success");
              }
              
              const delay = res.warning || res.info || res.message ? 3500 : 800;
              setTimeout(() => {
                window.location.href = res.redirectUrl || "/";
              }, delay);
            } else {
              setMessage(res.error || "Gagal memproses QR.");
              setStatusType("error");
              setLoading(false);
            }
          } catch (err: any) {
            setMessage(err.message || "Terjadi kesalahan sistem saat memproses.");
            setStatusType("error");
            setLoading(false);
          }
        },
        () => {
          // ignore scan frame errors
        }
      );

      setIsScanning(true);
      setMessage(requestMode ? "Arahkan kartu QR ke kamera untuk verifikasi izin." : "Arahkan kartu QR ke kamera.");
      setStatusType("info");
    } catch (err: any) {
      await stopScanner();
      setMessage("Gagal mengaktifkan kamera. Pastikan izin kamera diberikan.");
      setStatusType("error");
    }
  }

  useEffect(() => {
    if (autoStart) {
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
  }, [autoStart, requestMode]);

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
            <span className="text-[11px] text-zinc-400 font-medium">Status hari ini:</span>
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
            Kamera belum aktif
          </div>
        ) : null}
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/80 text-sm text-zinc-100">
            Memproses...
          </div>
        ) : null}
      </div>

      {!autoStart ? (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => void startScanner()}
            disabled={isScanning || loading}
            className="w-full"
          >
            <Camera aria-hidden="true" className="mr-1.5 size-4" />
            Mulai Pindai QR
          </Button>
        </div>
      ) : null}

      {/* Button for Sick / Leave requests */}
      {currentUser ? (
        <div className="mt-2">
          {!requestMode ? (
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={async () => {
                await stopScanner();
                setRequestMode(true);
              }}
              disabled={loading}
            >
              🤒 / ✈️ Saya Sedang Sakit / Cuti
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="w-full flex items-center justify-center gap-1.5"
              onClick={async () => {
                await stopScanner();
                setRequestMode(false);
              }}
              disabled={loading}
            >
              <ArrowLeft className="size-4" />
              Kembali ke Presensi WFO
            </Button>
          )}
        </div>
      ) : null}

      <div
        className={`rounded-md p-3 text-sm border ${
          statusType === "success"
            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
            : statusType === "error"
              ? "bg-red-50 border-red-200 text-red-800"
              : statusType === "info" || requestMode
                ? "bg-amber-50 border-amber-200 text-amber-800"
                : "bg-zinc-50 border-zinc-200 text-zinc-600"
        }`}
      >
        {message}
      </div>
    </div>
  );
}
