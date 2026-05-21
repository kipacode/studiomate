"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { SwitchCamera } from "lucide-react";
import { Button } from "@/components/ui/button";

type FacingMode = "environment" | "user";

interface QrScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanFailure?: (error: string) => void;
}

export function QrScanner({ onScanSuccess, onScanFailure }: QrScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isScanningRef = useRef(false);
  const onSuccessRef = useRef(onScanSuccess);
  const onFailureRef = useRef(onScanFailure);
  const [facingMode, setFacingMode] = useState<FacingMode>("environment");
  const containerId = "qr-reader-container";

  useEffect(() => { onSuccessRef.current = onScanSuccess; }, [onScanSuccess]);
  useEffect(() => { onFailureRef.current = onScanFailure; }, [onScanFailure]);

  // Create scanner instance once on mount
  useEffect(() => {
    scannerRef.current = new Html5Qrcode(containerId);

    return () => {
      const scanner = scannerRef.current;
      if (!scanner) return;
      const stop = isScanningRef.current ? scanner.stop() : Promise.resolve();
      stop.catch(() => {}).finally(() => scanner.clear());
    };
  }, []);

  // Start / restart camera when facingMode changes
  useEffect(() => {
    const scanner = scannerRef.current;
    if (!scanner) return;

    const startCamera = () => {
      scanner
        .start(
          { facingMode },
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
  }, [facingMode]);

  const flipCamera = () =>
    setFacingMode((m) => (m === "environment" ? "user" : "environment"));

  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="relative overflow-hidden rounded-xl bg-background/50 backdrop-blur-sm border border-border/50">
        <div
          id={containerId}
          className="w-full [&>video]:w-full [&>video]:rounded-xl [&>img]:hidden"
        />
        <Button
          size="icon"
          variant="secondary"
          className="absolute bottom-3 right-3 h-9 w-9 rounded-full opacity-80 hover:opacity-100"
          onClick={flipCamera}
          type="button"
          aria-label="Flip camera"
        >
          <SwitchCamera className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
