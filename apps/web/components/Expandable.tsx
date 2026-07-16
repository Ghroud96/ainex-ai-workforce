// Generic "View all / View other" disclosure — native <details>, no client
// state library needed. Used everywhere the Enterprise Demo Experience
// caps a list to the one thing that matters right now (Business Monitor,
// secondary deals, Dashboard's detail sections) instead of hiding the
// rest outright — everything stays one click away, never gone.
export default function Expandable({
  summary,
  children,
}: {
  summary: string;
  children: React.ReactNode;
}) {
  return (
    <details className="group">
      <summary className="cursor-pointer list-none text-sm font-medium text-blue-700 hover:text-blue-800">
        <span className="inline-flex items-center gap-1">
          {summary}
          <svg
            viewBox="0 0 24 24"
            className="h-3.5 w-3.5 transition-transform group-open:rotate-180"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
      </summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}
