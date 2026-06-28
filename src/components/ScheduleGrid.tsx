"use client";

import { useEffect, useRef, useState } from "react";
import {
  DAY_LABELS,
  formatTime,
  weekBounds,
  type Block,
  type Week,
} from "@/lib/schedule";

const PX_PER_MIN = 1; // 1 hour = 60px
const SNAP = 15; // moves/resizes snap to 15-minute steps
const MOVE_THRESHOLD = 4; // px before a press becomes a drag (vs a click)
const MIN_DURATION = 15; // a block can't be shorter than this

const KIND_STYLES: Record<Block["kind"], string> = {
  fixed: "bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900",
  flex: "bg-sky-500 text-white",
  want: "bg-emerald-500 text-white",
};

const KIND_LABEL: Record<Block["kind"], string> = {
  fixed: "Fixed",
  flex: "Activity",
  want: "Want",
};

const snap = (min: number) => Math.round(min / SNAP) * SNAP;
const clamp = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, n));

// Replace one block (matched by id) within the week, then re-sort its day.
function replaceBlock(w: Week, id: string, next: Block, day: number): Week {
  const without = w.map((d) => d.filter((b) => b.id !== id));
  without[day] = [...without[day], next].sort((a, b) => a.startMin - b.startMin);
  return without;
}

type MoveGesture = {
  block: Block;
  grabX: number;
  grabY: number;
  startX: number;
  startY: number;
  w: number;
  moving: boolean;
};

type ResizeGesture = { block: Block; edge: "top" | "bottom" };

export function ScheduleGrid({
  week,
  title = "Your schedule",
  onBack,
  onEdit,
  onChange,
}: {
  week: Week;
  title?: string;
  onBack: () => void;
  onEdit: () => void;
  onChange: (week: Week) => void;
}) {
  const { start, end } = weekBounds(week);
  const totalMin = end - start;
  const height = totalMin * PX_PER_MIN;
  const hours: number[] = [];
  for (let m = start; m <= end; m += 60) hours.push(m);

  const isEmpty = week.every((d) => d.length === 0);

  const colRef = useRef<HTMLDivElement | null>(null);
  // Latest render values, so the once-attached window listeners aren't stale.
  const latest = useRef({ week, onChange, start, end });
  latest.current = { week, onChange, start, end };

  const moveRef = useRef<MoveGesture | null>(null);
  const resizeRef = useRef<ResizeGesture | null>(null);

  const [ghost, setGhost] = useState<{ x: number; y: number; w: number } | null>(
    null,
  );
  type Preview = { id: string; startMin: number; endMin: number } | null;
  const [preview, setPreviewState] = useState<Preview>(null);
  const previewRef = useRef<Preview>(null);
  const setPreview = (p: Preview) => {
    previewRef.current = p;
    setPreviewState(p);
  };
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    function onMove(e: PointerEvent) {
      const col = colRef.current;
      if (moveRef.current) {
        const g = moveRef.current;
        if (!g.moving) {
          if (
            Math.hypot(e.clientX - g.startX, e.clientY - g.startY) <
            MOVE_THRESHOLD
          )
            return;
          g.moving = true;
        }
        setGhost({ x: e.clientX - g.grabX, y: e.clientY - g.grabY, w: g.w });
      } else if (resizeRef.current && col) {
        const r = resizeRef.current;
        const cr = col.getBoundingClientRect();
        const { start: s } = latest.current;
        const minute = clamp(
          snap(s + (e.clientY - cr.top) / PX_PER_MIN),
          s,
          latest.current.end,
        );
        if (r.edge === "top") {
          setPreview({
            id: r.block.id,
            startMin: Math.min(minute, r.block.endMin - MIN_DURATION),
            endMin: r.block.endMin,
          });
        } else {
          setPreview({
            id: r.block.id,
            startMin: r.block.startMin,
            endMin: Math.max(minute, r.block.startMin + MIN_DURATION),
          });
        }
      }
    }

    function onUp(e: PointerEvent) {
      const { week: w, onChange: change, start: s, end: en } = latest.current;
      const col = colRef.current;
      if (moveRef.current) {
        const g = moveRef.current;
        if (g.moving && col) {
          const cr = col.getBoundingClientRect();
          const duration = g.block.endMin - g.block.startMin;
          const day = clamp(Math.floor((e.clientX - cr.left) / cr.width), 0, 6);
          const topY = e.clientY - g.grabY;
          const startMin = clamp(
            snap(s + (topY - cr.top) / PX_PER_MIN),
            s,
            en - duration,
          );
          change(
            replaceBlock(
              w,
              g.block.id,
              { ...g.block, startMin, endMin: startMin + duration },
              day,
            ),
          );
        }
        moveRef.current = null;
        setGhost(null);
      } else if (resizeRef.current) {
        const r = resizeRef.current;
        const p = previewRef.current;
        // The block stays in its own day; find which day holds it.
        const day = w.findIndex((d) => d.some((b) => b.id === r.block.id));
        if (p && p.id === r.block.id && day >= 0) {
          change(
            replaceBlock(
              w,
              r.block.id,
              { ...r.block, startMin: p.startMin, endMin: p.endMin },
              day,
            ),
          );
        }
        resizeRef.current = null;
        setPreview(null);
      }
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  function startMove(e: React.PointerEvent, block: Block) {
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    moveRef.current = {
      block,
      grabX: e.clientX - rect.left,
      grabY: e.clientY - rect.top,
      startX: e.clientX,
      startY: e.clientY,
      w: rect.width,
      moving: false,
    };
  }

  function startResize(
    e: React.PointerEvent,
    block: Block,
    edge: "top" | "bottom",
  ) {
    e.preventDefault();
    e.stopPropagation();
    resizeRef.current = { block, edge };
    setPreview({ id: block.id, startMin: block.startMin, endMin: block.endMin });
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-3 py-6 sm:px-4 sm:py-8">
      <header className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to lobby"
          className="flex h-10 w-10 items-center justify-center rounded-lg text-lg text-zinc-500 transition-colors hover:bg-black/[.05] hover:text-zinc-900 dark:hover:bg-white/[.08] dark:hover:text-white"
        >
          ←
        </button>
        <div className="flex flex-col items-center">
          <h1 className="max-w-[60vw] truncate text-base font-semibold tracking-tight">
            {title}
          </h1>
          <p className="text-xs text-zinc-400">Generated by ScheduleManager</p>
        </div>
        <button
          type="button"
          onClick={onEdit}
          aria-label="Edit survey"
          className="flex h-10 w-10 items-center justify-center rounded-lg text-base text-zinc-500 transition-colors hover:bg-black/[.05] hover:text-zinc-900 dark:hover:bg-white/[.08] dark:hover:text-white"
        >
          ✏️
        </button>
      </header>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500">
        {(["fixed", "flex", "want"] as const).map((k) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-full ${KIND_STYLES[k]}`} />
            {KIND_LABEL[k]}
          </span>
        ))}
        {!isEmpty && (
          <span className="text-zinc-400">
            · drag to move · double-click to resize
          </span>
        )}
      </div>

      {isEmpty ? (
        <div className="rounded-xl border border-black/[.08] p-8 text-center text-sm text-zinc-400 dark:border-white/[.1]">
          Nothing scheduled yet. Tap ✏️ to add programs and wants.
        </div>
      ) : (
        <div
          className="overflow-x-auto rounded-xl border border-black/[.08] bg-white/60 dark:border-white/[.1] dark:bg-zinc-900/40"
          onPointerDown={(e) => {
            // Click on empty grid space clears the selection.
            if (!(e.target as HTMLElement).closest("[data-block]")) {
              setSelectedId(null);
            }
          }}
        >
          <div
            className="grid min-w-[640px]"
            style={{ gridTemplateColumns: "3rem repeat(7, minmax(76px, 1fr))" }}
          >
            {/* Header row */}
            <div className="sticky top-0 z-10 border-b border-black/[.08] bg-white/80 backdrop-blur dark:border-white/[.1] dark:bg-zinc-900/80" />
            {DAY_LABELS.map((d, i) => (
              <div
                key={d}
                className={`sticky top-0 z-10 border-b border-l border-black/[.06] bg-white/80 py-2 text-center text-xs font-medium backdrop-blur dark:border-white/[.08] dark:bg-zinc-900/80 ${
                  i >= 5 ? "text-zinc-400" : "text-zinc-700 dark:text-zinc-200"
                }`}
              >
                {d}
              </div>
            ))}

            {/* Time gutter */}
            <div className="relative" style={{ height }}>
              {hours.map((m) => (
                <div
                  key={m}
                  className="absolute right-1 text-[10px] leading-none tabular-nums text-zinc-400"
                  style={{ top: (m - start) * PX_PER_MIN + 2 }}
                >
                  {formatTime(m)}
                </div>
              ))}
            </div>

            {/* Day columns */}
            {week.map((day, di) => (
              <div
                key={di}
                ref={di === 0 ? colRef : undefined}
                className="relative border-l border-black/[.06] dark:border-white/[.08]"
                style={{ height }}
              >
                {hours.map((m) => (
                  <div
                    key={m}
                    className="absolute inset-x-0 border-t border-black/[.04] dark:border-white/[.05]"
                    style={{ top: (m - start) * PX_PER_MIN }}
                  />
                ))}
                {day.map((b) => {
                  const showStart =
                    preview && preview.id === b.id ? preview.startMin : b.startMin;
                  const showEnd =
                    preview && preview.id === b.id ? preview.endMin : b.endMin;
                  const top = (showStart - start) * PX_PER_MIN;
                  const h = (showEnd - showStart) * PX_PER_MIN;
                  const isDragged = moveRef.current?.block.id === b.id && !!ghost;
                  const isSelected = selectedId === b.id;
                  return (
                    <div
                      key={b.id}
                      data-block
                      onPointerDown={(e) => startMove(e, b)}
                      onDoubleClick={() =>
                        setSelectedId((cur) => (cur === b.id ? null : b.id))
                      }
                      className={`absolute inset-x-0.5 cursor-grab touch-none select-none overflow-hidden rounded-md px-1 py-0.5 text-[10px] leading-tight shadow-sm active:cursor-grabbing ${
                        KIND_STYLES[b.kind]
                      } ${isDragged ? "opacity-30" : ""} ${
                        isSelected ? "z-20 ring-2 ring-blue-500 ring-offset-1" : ""
                      }`}
                      style={{ top, height: h }}
                      title={`${b.title} · ${formatTime(showStart)}–${formatTime(showEnd)}`}
                    >
                      <div className="truncate font-medium">{b.title}</div>
                      {h > 26 && (
                        <div className="truncate opacity-80">
                          {formatTime(showStart)}
                        </div>
                      )}
                      {isSelected && (
                        <>
                          <span
                            onPointerDown={(e) => startResize(e, b, "top")}
                            className="absolute -top-1.5 left-1/2 h-3 w-8 -translate-x-1/2 cursor-ns-resize touch-none rounded-full border-2 border-white bg-blue-500 shadow"
                          />
                          <span
                            onPointerDown={(e) => startResize(e, b, "bottom")}
                            className="absolute -bottom-1.5 left-1/2 h-3 w-8 -translate-x-1/2 cursor-ns-resize touch-none rounded-full border-2 border-white bg-blue-500 shadow"
                          />
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Floating drag ghost */}
      {moveRef.current && ghost && (
        <div
          className={`pointer-events-none fixed z-50 overflow-hidden rounded-md px-1 py-0.5 text-[10px] leading-tight opacity-90 shadow-lg ${KIND_STYLES[moveRef.current.block.kind]}`}
          style={{
            left: ghost.x,
            top: ghost.y,
            width: ghost.w,
            height:
              (moveRef.current.block.endMin - moveRef.current.block.startMin) *
              PX_PER_MIN,
          }}
        >
          <div className="truncate font-medium">{moveRef.current.block.title}</div>
          <div className="truncate opacity-80">
            {formatTime(moveRef.current.block.startMin)}
          </div>
        </div>
      )}
    </main>
  );
}
