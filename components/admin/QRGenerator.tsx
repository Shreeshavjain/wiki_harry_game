"use client";

import { useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

/**
 * QR Code generator — paste a deployed URL and generate a QR code.
 * Uses qrcode.react instead of the original CDN script.
 */
export default function QRGenerator() {
  const [url, setUrl] = useState("");
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);

  function handleGenerate() {
    const trimmed = url.trim();
    if (!trimmed) {
      setGeneratedUrl(null);
      return;
    }
    setGeneratedUrl(trimmed);
  }

  return (
    <div className="qr-panel">
      <h3 className="font-[family-name:var(--font-cinzel)] text-[0.85rem] tracking-[0.06em] m-0 mb-2.5">
        Event Link / QR
      </h3>
      <input
        type="text"
        className="magic-input text-left max-w-full"
        placeholder="Paste your deployed site link here"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
        id="siteUrlInput"
      />
      <div className="mt-2">
        <button className="small-btn" onClick={handleGenerate}>
          Generate QR
        </button>
      </div>
      {generatedUrl && (
        <div className="mt-2.5 bg-white p-2.5 rounded-lg inline-block">
          <QRCodeSVG
            value={generatedUrl}
            size={180}
            fgColor="#10152b"
            bgColor="#ffffff"
          />
        </div>
      )}
      <p className="text-[0.78rem] text-parchment-dim mt-2 leading-relaxed">
        Paste your deployed site link above. The QR is generated locally on your
        device.
      </p>
    </div>
  );
}
