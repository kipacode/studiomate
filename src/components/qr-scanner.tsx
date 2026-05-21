"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import type { CameraDevice } from "html5-qrcode";

interface QrScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanFailure?: (error: string) => void;
}

export function QrScanner({ onScanSuccess, onScanFailure }: QrScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isScanningRef = useRef(false);
  const onSuccessRef = useRef(onScanSuccess);
  const onFailureRef = useRef(onScanFailure);
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const containerId = "qr-reader-container";

  // Keep callback refs fresh without triggering restarts
  useEffect(() => { onSuccessRef.current = onScanSuccess; }, [onScanSuccess]);
  useEffect(() => { onFailureRef.current = onScanFailure; }, [onScanFailure]);

  // Initialize scanner instance and enumerate cameras once
  useEffect(() => {
    scannerRef.current = new Html5Qrcode(containerId);

    Html5Qrcode.getCameras()
      .then((devices) => {
        setCameras(devices);
        // Prefer back/environment-facing camera
        const back = devices.find((d) => /back|rear|environment/i.test(d.label));
        setSelectedCameraId((back ?? devices[0])?.id ?? "");
      })
      .catch((err) => console.error("Failed to enumerate cameras", err));

    return () => {
      const scanner = scannerRef.current;
      if (!scanner) return;
      const stop = isScanningRef.current ? scanner.stop() : Promise.resolve();
      stop.catch(() => {}).finally(() => scanner.clear().catch(() => {}));
    };
  }, []);

  // Start or restart scanner whenever the selected camera changes
  useEffect(() => {
    if (!selectedCameraId || !scannerRef.current) return;

    const scanner = scannerRef.current;

    const startCamera = () => {
      scanner
        .start(
          selectedCameraId,
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            scanner.pause(true);
            onSuccessRef.current(decodedText);
          },
          (error) => {
            onFailureRef.current?.(error);
          }
        )
        .then(() => { isScanningRef.current = true; })
        .catch((err) => console.error("Failed to start camera", err));
    };

    if (isScanningRef.current) {
      scanner
        .stop()
        .then(() => { isScanningRef.current = false; startCamera(); })
        .catch((err) => console.error("Failed to stop camera", err));
    } else {
      startCamera();
    }
  }, [selectedCameraId]);

  return (
    <div className="w-full max-w-sm mx-auto space-y-2">
      {cameras.length > 1 && (
        <div className="px-1">
          <label className="block text-xs text-muted-foreground mb-1">Camera</label>
          <select
            value={selectedCameraId}
            onChange={(e) => setSelectedCameraId(e.target.value)}
            className="w-full bg-background text-foreground border border-border rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {cameras.map((cam) => (
              <option key={cam.id} value={cam.id}>
                {cam.label || `Camera ${cam.id.slice(0, 8)}`}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="overflow-hidden rounded-xl bg-background/50 backdrop-blur-sm border border-border/50">
        <div
          id={containerId}
          className="w-full [&>video]:w-full [&>video]:rounded-lg [&>img]:hidden"
        />
      </div>
    </div>
  );
}
