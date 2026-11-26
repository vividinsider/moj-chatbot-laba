"use client";

import { useState } from "react";

// Kopiuje tekst do schowka. Niczego nie wysyła.
export default function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button type="button" className="button-ghost small" onClick={copy}>
      {copied ? "Skopiowano ✓" : label}
    </button>
  );
}
