"use client";

import type { Html5Qrcode } from "html5-qrcode";
import { useEffect, useId, useRef, useState } from "react";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { loginAndAttendWithQrAction } from "./actions";

export function QrLoginScanner() {
  const scannerId = `login-qr-scanner-${useId().replace(/:/g, "")}`;
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(
    "Arahkan kartu QR Card Anda ke kamera webcam untuk login & presensi otomatis."
  );
  const [statusType, setStatusType] = useState<"info" | "success" | "error" | null>(null);

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
    if (isScanning || loading) return;

    if (!navigator.mediaDevices?.getUserMedia) {
      setMessage("Akses kamera tidak didukung di browser ini.");
      setStatusType("error");
      return;
    }

    setMessage("Membuka kamera...");
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
          setMessage("QR terdeteksi. Memproses masuk...");
          setStatusType("info");
          await stopScanner();

          try {
            const res = await loginAndAttendWithQrAction(qrUid);
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
                setMessage("Login berhasil. Mengalihkan...");
                setStatusType("success");
              }
              
              const delay = res.warning || res.info || res.message ? 3500 : 800;
              setTimeout(() => {
                window.location.href = res.redirectUrl || "/";
              }, delay);
            } else {
              setMessage(res.error || "Gagal masuk menggunakan QR.");
              setStatusType("error");
              setLoading(false);
            }
          } catch (err: any) {
            setMessage(err.message || "Terjadi kesalahan sistem saat masuk.");
            setStatusType("error");
            setLoading(false);
          }
        },
        () => {
          // ignore scan frame errors
        }
      );

      setIsScanning(true);
      setMessage("Arahkan kartu QR Card ke kamera.");
      setStatusType("info");
    } catch (err: any) {
      await stopScanner();
      setMessage("Gagal mengaktifkan kamera. Pastikan izin kamera diberikan.");
      setStatusType("error");
    }
  }

  useEffect(() => {
    return () => {
      void stopScanner();
    };
  }, []);

  return (
    <div className="grid gap-3">
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

      <div
        className={`rounded-md p-3 text-sm border ${
          statusType === "success"
            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
            : statusType === "error"
              ? "bg-red-50 border-red-200 text-red-800"
              : statusType === "info"
                ? "bg-blue-50 border-blue-200 text-blue-800"
                : "bg-zinc-50 border-zinc-200 text-zinc-600"
        }`}
      >
        {message}
      </div>
    </div>
  );
}
