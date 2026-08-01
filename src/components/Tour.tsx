"use client";

import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";

export type TourStep = { target: string; textKey: string };

// A first-run walkthrough: spotlights each pressable feature (by data-tour
// attribute), points a hand at it, and shows a translated tooltip.
export function Tour({
  steps,
  onDone,
}: {
  steps: TourStep[];
  onDone: () => void;
}) {
  const { t } = useI18n();
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  // Find the next step whose target actually exists on the page.
  const findFrom = useCallback(
    (start: number) => {
      for (let k = start; k < steps.length; k++) {
        if (document.querySelector(`[data-tour="${steps[k].target}"]`)) return k;
      }
      return -1;
    },
    [steps],
  );

  useEffect(() => {
    const idx = findFrom(i);
    if (idx === -1) {
      onDone();
      return;
    }
    if (idx !== i) {
      setI(idx);
      return;
    }
    const el = document.querySelector(`[data-tour="${steps[i].target}"]`);
    if (!el) return;
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    const measure = () => setRect(el.getBoundingClientRect());
    // Let the smooth scroll settle before measuring.
    const timer = setTimeout(measure, 260);
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [i, steps, findFrom, onDone]);

  if (!rect) return null;

  const step = steps[i];
  const last = findFrom(i + 1) === -1;
  const below = rect.bottom + 150 < window.innerHeight;
  const tipLeft = Math.min(
    Math.max(rect.left + rect.width / 2, 150),
    window.innerWidth - 150,
  );

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Spotlight: highlight ring + dim everything else via a huge shadow. */}
      <div
        className="pointer-events-none absolute rounded-xl ring-4 ring-indigo-400 transition-all duration-200"
        style={{
          top: rect.top - 6,
          left: rect.left - 6,
          width: rect.width + 12,
          height: rect.height + 12,
          boxShadow: "0 0 0 9999px rgba(15,23,42,0.6)",
        }}
      />
      {/* Pointing hand */}
      <div
        className="pointer-events-none absolute text-3xl drop-shadow"
        style={{
          top: below ? rect.bottom + 4 : rect.top - 40,
          left: rect.left + rect.width / 2 - 15,
        }}
      >
        {below ? "👆" : "👇"}
      </div>
      {/* Tooltip */}
      <div
        className="absolute w-72 max-w-[82vw] rounded-2xl bg-white p-4 shadow-xl dark:bg-zinc-900"
        style={{
          top: below ? rect.bottom + 46 : rect.top - 46,
          left: tipLeft,
          transform: below
            ? "translateX(-50%)"
            : "translate(-50%, -100%)",
        }}
      >
        <p className="text-sm text-zinc-700 dark:text-zinc-200">
          {t(step.textKey)}
        </p>
        <div className="mt-3 flex items-center justify-between">
          <button
            type="button"
            onClick={onDone}
            className="text-xs font-medium text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
          >
            {t("tour.skip")}
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400">
              {i + 1}/{steps.length}
            </span>
            <button
              type="button"
              onClick={() => (last ? onDone() : setI(i + 1))}
              className="btn-primary rounded-lg px-4 py-1.5 text-sm font-medium"
            >
              {last ? t("tour.done") : t("tour.next")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
