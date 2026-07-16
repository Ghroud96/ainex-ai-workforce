"use client";

export default function SearchBar({
  value,
  onChange,
  placeholder = "Search...",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-lg border border-slate-200/70 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-600 placeholder:text-slate-400"
    />
  );
}
