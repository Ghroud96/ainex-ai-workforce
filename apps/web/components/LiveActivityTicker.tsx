"use client";

import { useEffect, useState } from "react";
import ActivityTimeline from "@/components/ActivityTimeline";
import type { SimulatedEvent } from "@/lib/enterprise/LiveSimulationBuilder";

// Presentational reveal animation only — every event's content is
// pre-computed server-side and deterministic (see LiveSimulationBuilder.ts).
// This component invents nothing; it just advances a counter on a timer so
// the feed feels like it's happening live during a demo.
export default function LiveActivityTicker({ events }: { events: SimulatedEvent[] }) {
  const [revealedCount, setRevealedCount] = useState(Math.min(1, events.length));

  useEffect(() => {
    if (revealedCount >= events.length) return;

    const previousMs = events[revealedCount - 1]?.revealAfterMs ?? 0;
    const delay = Math.max(1000, events[revealedCount].revealAfterMs - previousMs);
    const timer = setTimeout(() => setRevealedCount((count) => count + 1), delay);

    return () => clearTimeout(timer);
  }, [revealedCount, events]);

  if (events.length === 0) {
    return <p className="text-sm text-slate-500">No simulated activity available for this company.</p>;
  }

  const revealed = events.slice(0, revealedCount).slice().reverse();

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
        </span>
        <span className="text-xs font-medium tracking-wide text-green-600 uppercase">Live</span>
      </div>

      <ActivityTimeline
        entries={revealed.map((event) => ({
          time: "Just now",
          title: event.workerName,
          description: `${event.headline} ${event.workerReaction}`,
        }))}
      />

      {revealedCount < events.length && (
        <p className="mt-2 text-xs text-slate-500">Watching for the next event…</p>
      )}
    </div>
  );
}
