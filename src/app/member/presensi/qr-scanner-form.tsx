"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { submitWfoAttendanceAction } from "./actions";

type BarcodeResult = {
  rawValue?: string;
};

type BarcodeDetectorInstance = {
  detect(image: HTMLVideoElement): Promise<BarcodeResult[]>;
};

type BarcodeDetectorConstructor = new (options: {
  formats: string[];
}) => BarcodeDetectorInstance;

function getBarcodeDetector() {
  return (window as unknown as { BarcodeDetector?: BarcodeDetectorConstructor })
    .BarcodeDetector;
}

export function QrScannerForm({
  disabled,
  submitLabel,
}: {
  disabled: boolean;
  submitLabel: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const [scanValue, setScanValue] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [message, setMessage] = useState(
    "Scan QR Card yang sudah kamu simpan untuk membuka tombol presensi."
  );
  const canSubmit = Boolean(scanValue.trim()) && !disabled;

  function stopScanner() {
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setIsScanning(false);
  }

  async function startScanner() {
    if (disabled) {
      return;
    }

    const BarcodeDetector = getBarcodeDetector();

    if (!BarcodeDetector) {
      setMessage(
        "Browser ini belum mendukung scanner QR kamera. Gunakan Chrome/Edge terbaru atau coba dari perangkat lain."
      );
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setMessage("Akses kamera tidak tersedia di browser ini.");
      return;
    }

    setScanValue("");
    setMessage("Membuka kamera...");
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
      audio: false,
    });
    const video = videoRef.current;

    if (!video) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }

    streamRef.current = stream;
    video.srcObject = stream;
    await video.play();
    setIsScanning(true);
    setMessage("Arahkan kamera ke QR Card.");

    const detector = new BarcodeDetector({ formats: ["qr_code"] });

    async function scanFrame() {
      const currentVideo = videoRef.current;

      if (!currentVideo || currentVideo.readyState < 2) {
        frameRef.current = requestAnimationFrame(scanFrame);
        return;
      }

      try {
        const codes = await detector.detect(currentVideo);
        const qrValue = codes.find((code) => code.rawValue)?.rawValue?.trim();

        if (qrValue) {
          setScanValue(qrValue);
          setMessage("QR terbaca. Kamu bisa lanjut presensi.");
          stopScanner();
          return;
        }
      } catch {
        setMessage("QR belum terbaca, coba arahkan ulang kamera.");
      }

      frameRef.current = requestAnimationFrame(scanFrame);
    }

    frameRef.current = requestAnimationFrame(scanFrame);
  }

  useEffect(() => {
    return () => stopScanner();
  }, []);

  return (
    <div className="grid gap-3">
      <div className="overflow-hidden rounded-md border border-zinc-200 bg-zinc-950">
        <video
          ref={videoRef}
          className={`aspect-video w-full object-cover ${
            isScanning ? "block" : "hidden"
          }`}
          muted
          playsInline
        />
        {!isScanning ? (
          <div className="flex aspect-video items-center justify-center text-sm text-zinc-300">
            Kamera belum aktif
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={startScanner}
          disabled={disabled || isScanning}
        >
          <Camera aria-hidden="true" />
          Buka Kamera
        </Button>
        {isScanning ? (
          <Button type="button" variant="ghost" onClick={stopScanner}>
            Stop
          </Button>
        ) : null}
      </div>

      <p className="text-sm text-zinc-600">{message}</p>

      <form action={submitWfoAttendanceAction} className="grid gap-3">
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
