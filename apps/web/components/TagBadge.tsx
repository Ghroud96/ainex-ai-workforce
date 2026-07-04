export default function TagBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-300">
      {label}
    </span>
  );
}
