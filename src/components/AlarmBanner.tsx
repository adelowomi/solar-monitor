import { useEffect, useRef } from "react";
import { BellRing, X } from "lucide-react";
import type { AlertEvent } from "../api/events";

const RED_FAVICON =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">' +
      '<circle cx="16" cy="16" r="15" fill="#dc2626"/>' +
      '<rect x="14" y="7" width="4" height="12" rx="2" fill="#fff"/>' +
      '<circle cx="16" cy="24" r="2.5" fill="#fff"/>' +
    "</svg>"
  );

interface AlarmBannerProps {
  event: AlertEvent | null;
  onDismiss: () => void;
}

export function AlarmBanner({ event, onDismiss }: AlarmBannerProps) {
  const originalTitle = useRef(document.title);
  const originalIcon = useRef<string | null>(null);

  // Title flash + favicon swap: the only signals that survive a muted machine.
  useEffect(() => {
    if (!event) return;

    const link =
      document.querySelector<HTMLLinkElement>('link[rel="icon"]') ??
      (() => {
        const el = document.createElement("link");
        el.rel = "icon";
        document.head.appendChild(el);
        return el;
      })();

    originalTitle.current = document.title;
    originalIcon.current = link.getAttribute("href");
    link.setAttribute("href", RED_FAVICON);

    let on = false;
    const flash = window.setInterval(() => {
      on = !on;
      document.title = on ? `⚠ ${event.title} — Sunhouse` : originalTitle.current;
    }, 1000);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss();
    };
    window.addEventListener("keydown", onKey);

    return () => {
      window.clearInterval(flash);
      window.removeEventListener("keydown", onKey);
      document.title = originalTitle.current;
      if (originalIcon.current) link.setAttribute("href", originalIcon.current);
    };
  }, [event, onDismiss]);

  if (!event) return null;

  const critical = event.severity === "critical";

  return (
    <div
      role="alert"
      onClick={onDismiss}
      className={`fixed inset-x-0 top-0 z-50 flex items-center gap-4 px-5 py-4 shadow-lg cursor-pointer ${
        critical ? "bg-red-600 text-white" : "bg-amber-500 text-slate-950"
      }`}
    >
      <BellRing className="h-6 w-6 shrink-0 animate-bounce" />
      <div className="min-w-0 flex-1">
        <p className="text-base font-semibold leading-tight">{event.title}</p>
        <p className="truncate text-sm opacity-90">{event.body}</p>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDismiss();
        }}
        autoFocus
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-black/25 px-4 py-2 text-sm font-semibold hover:bg-black/40"
      >
        <X className="h-4 w-4" />
        Silence
      </button>
    </div>
  );
}
