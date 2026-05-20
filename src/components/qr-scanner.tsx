"use client";

import { useEffect, useRef } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";

interface QrScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanFailure?: (error: string) => void;
}

export function QrScanner({ onScanSuccess, onScanFailure }: QrScannerProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const containerId = "qr-reader-container";

  useEffect(() => {
    // Create scanner instance
    scannerRef.current = new Html5QrcodeScanner(
      containerId,
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1,
        supportedScanTypes: [0], // 0 is QR_CODE
      },
      false // verbose
    );

    // Start scanning
    scannerRef.current.render(
      (decodedText) => {
        // Pause scanning to prevent multiple callbacks while processing
        if (scannerRef.current) {
          scannerRef.current.pause(true);
        }
        onScanSuccess(decodedText);
      },
      (error) => {
        if (onScanFailure) {
          onScanFailure(error);
        }
      }
    );

    // Cleanup on unmount
    return () => {
      if (scannerRef.current) {
        scannerRef.current
          .clear()
          .catch((err) => console.error("Failed to clear scanner", err));
      }
    };
  }, [onScanSuccess, onScanFailure]);

  return (
    <div className="w-full max-w-sm mx-auto overflow-hidden rounded-xl bg-background/50 backdrop-blur-sm border border-border/50">
      <div id={containerId} className="w-full [&>div]:border-none [&_video]:rounded-lg" />
      <style dangerouslySetInnerHTML={{ __html: `
        #${containerId} {
          border: none !important;
        }
        #${containerId}__scan_region {
          background: transparent !important;
        }
        #${containerId}__dashboard_section_csr button {
          background-color: hsl(var(--primary)) !important;
          color: hsl(var(--primary-foreground)) !important;
          border: none !important;
          border-radius: var(--radius-md) !important;
          padding: 0.5rem 1rem !important;
          font-size: 0.875rem !important;
          cursor: pointer !important;
          margin-top: 0.5rem !important;
        }
        #${containerId}__dashboard_section_csr span {
          color: hsl(var(--foreground)) !important;
          font-size: 0.875rem !important;
        }
        #${containerId} select {
          background-color: hsl(var(--background)) !important;
          color: hsl(var(--foreground)) !important;
          border: 1px solid hsl(var(--border)) !important;
          border-radius: var(--radius-md) !important;
          padding: 0.25rem 0.5rem !important;
          margin-bottom: 0.5rem !important;
          width: 100% !important;
        }
        #${containerId} a {
          display: none !important; /* Hide "Powered by html5-qrcode" */
        }
      `}} />
    </div>
  );
}
