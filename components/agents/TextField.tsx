"use client";

/** Labelled textarea with a character counter. Shared by the agent cards. */
export default function TextField({
  id,
  label,
  placeholder,
  value,
  onChange,
  rows = 12,
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}) {
  const maxChars = 15_000;

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="text-sm font-medium text-slate-800">
          {label}
        </label>
        <span className="text-xs tabular-nums text-slate-400">
          {value.length.toLocaleString("en-US")} / {maxChars.toLocaleString("en-US")}
        </span>
      </div>
      <textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        maxLength={maxChars}
        rows={rows}
        placeholder={placeholder}
        className="mt-1.5 w-full resize-y rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm leading-relaxed text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
      />
    </div>
  );
}
