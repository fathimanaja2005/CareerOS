"use client";

import { useRef, useState } from "react";
import TextField from "./TextField";

const MAX_CHARS = 15_000;

/**
 * Resume box shared by every agent: paste text, or upload a PDF / .txt file.
 * The value is remembered in this browser (see useSharedValue) so it only has
 * to be entered once. PDFs are read on the server and not stored.
 */
export default function ResumeField({
  id,
  label = "Resume",
  value,
  onChange,
  rows,
  placeholder = "Paste your resume as plain text, or upload a PDF below…",
  clearLabel = "Clear saved resume",
  note = "Saved in this browser only, shared across all tabs.",
}: {
  id: string;
  label?: string;
  rows?: number;
  placeholder?: string;
  clearLabel?: string;
  note?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function handleFile(file: File) {
    setMessage("");
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    const isText = file.type.startsWith("text/") || file.name.toLowerCase().endsWith(".txt");
    if (!isPdf && !isText) {
      setMessage("Please choose a PDF or .txt file.");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setMessage("That file is over 4 MB. Please use a smaller one.");
      return;
    }

    setBusy(true);
    try {
      let text = "";
      if (isText) {
        text = await file.text();
      } else {
        const form = new FormData();
        form.append("file", file);
        const response = await fetch("/api/extract", { method: "POST", body: form });
        const data = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(
            (data && typeof data.error === "string" && data.error) ||
              "Could not read that file. Try pasting the text instead.",
          );
        }
        text = String(data.text ?? "");
      }
      const trimmed = text.trim().slice(0, MAX_CHARS);
      if (!trimmed) throw new Error("No text found in that file. Try pasting the text instead.");
      onChange(trimmed);
      setMessage(
        text.trim().length > MAX_CHARS
          ? "Loaded the first 15,000 characters."
          : "Loaded. Check that the text looks right before you continue.",
      );
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not read that file.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <TextField
        id={id}
        label={label}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        rows={rows}
      />
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.txt,application/pdf,text/plain"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
        >
          {busy ? "Reading…" : "Upload PDF or .txt"}
        </button>
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange("");
              setMessage("Cleared.");
            }}
            className="rounded-lg px-2.5 py-1 font-medium text-slate-500 transition hover:text-slate-900"
          >
            {clearLabel}
          </button>
        )}
        <span className="text-slate-400">{note}</span>
      </div>
      {message && (
        <p role="status" className="mt-1 text-xs text-slate-600">
          {message}
        </p>
      )}
    </div>
  );
}
