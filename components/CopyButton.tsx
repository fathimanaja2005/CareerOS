"use client";

import { useState } from "react";

/** Small copy-to-clipboard button used next to rewrites and headlines. */
export default function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can be blocked; the text is still selectable on screen.
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex shrink-0 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
      aria-label={copied ? "Copied" : label}
    >
      {copied ? "Copied" : label}
    </button>
  );
}
