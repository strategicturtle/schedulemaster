"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  DAY_LABELS,
  formatTime,
  weekBounds,
  type Block,
  type Week,
} from "@/lib/schedule";
import { Mascot } from "@/components/Mascot";
import { useI18n, WeekStartSwitcher } from "@/lib/i18n";

const DAY_KEYS = [
  "day.mon",
  "day.tue",
  "day.wed",
  "day.thu",
  "day.fri",
  "day.sat",
  "day.sun",
];

const PX_PER_MIN = 1; // 1 hour = 60px
const SNAP = 15; // moves/resizes snap to 15-minute steps
const MOVE_THRESHOLD = 4; // px before a press becomes a drag (vs a click)
const MIN_DURATION = 15; // a block can't be shorter than this

const KIND_STYLES: Record<Block["kind"], string> = {
  fixed: "bg-gradient-to-br from-indigo-500 to-violet-600 text-white",
  flex: "bg-gradient-to-br from-sky-500 to-blue-600 text-white",
  want: "bg-gradient-to-br from-emerald-500 to-teal-600 text-white",
  life: "bg-gradient-to-br from-amber-400 to-orange-500 text-white",
  break: "bg-gradient-to-br from-green-400 to-emerald-500 text-white",
};

const MEAL_TITLES = new Set([
  "block.breakfast",
  "block.lunch",
  "block.dinner",
]);

// Day offsets are measured from the schedule's anchor Monday. When the week
// is shown starting on a later day (e.g. Sunday), that first column is the
// day *before* the anchor Monday, so the whole range shifts back.
const firstOffset = (weekStartDay: number) =>
  weekStartDay === 0 ? 0 : weekStartDay - 7;

// Days from the anchor Monday for day index d (0 = Mon … 6 = Sun).
function dayOffset(d: number, weekStartDay: number): number {
  const position = (d - weekStartDay + 7) % 7;
  return firstOffset(weekStartDay) + position;
}

// Short M/D labels per day index (0 = Mon … 6 = Sun), or [] if no week set.
function weekDates(weekStart: string | undefined, weekStartDay: number): string[] {
  if (!weekStart) return [];
  const base = new Date(`${weekStart}T00:00:00`);
  if (Number.isNaN(base.getTime())) return [];
  return DAY_LABELS.map((_, d) => {
    const date = new Date(base);
    date.setDate(base.getDate() + dayOffset(d, weekStartDay));
    return `${date.getMonth() + 1}/${date.getDate()}`;
  });
}

// Which day index (0–6) is today, or -1 if today isn't in the shown week.
function todayIndex(weekStart: string | undefined, weekStartDay: number): number {
  if (!weekStart) return -1;
  const base = new Date(`${weekStart}T00:00:00`);
  if (Number.isNaN(base.getTime())) return -1;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.round((today.getTime() - base.getTime()) / 86400000);
  const lo = firstOffset(weekStartDay);
  if (diff < lo || diff > lo + 6) return -1;
  return (weekStartDay + (diff - lo)) % 7;
}

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
  title,
  weekStart,
  weekStartDay = 0,
  manual = false,
  onBack,
  onEdit,
  onChange,
  onWeekStartDayChange,
}: {
  week: Week;
  title?: string;
  weekStart?: string;
  /** Which weekday this schedule's grid starts on (0 = Mon … 6 = Sun). */
  weekStartDay?: number;
  /** Hand-built schedule: no survey behind it, so nothing regenerates. */
  manual?: boolean;
  onBack: () => void;
  onEdit: () => void;
  onChange: (week: Week) => void;
  /** Change this schedule's start day (manual schedules have no survey). */
  onWeekStartDayChange?: (d: number) => void;
}) {
  const { t } = useI18n();
  const displayTitle = title ?? t("grid.defaultTitle");
  const dayDates = weekDates(weekStart, weekStartDay);
  const today = todayIndex(weekStart, weekStartDay);
  const { start, end } = weekBounds(week);
  const totalMin = end - start;
  const height = totalMin * PX_PER_MIN;
  const hours: number[] = [];
  for (let m = start; m <= end; m += 60) hours.push(m);

  const isEmpty = week.every((d) => d.length === 0);

  // Week vs single-day view. Day view opens on today (or the week's first day).
  const [view, setView] = useState<"week" | "day">("week");
  const [dayIndex, setDayIndex] = useState(
    today >= 0 ? today : weekStartDay,
  );
  // Columns are rotated so the user's chosen start day comes first. Stored
  // schedules always keep index 0 = Monday, so this is display-only.
  const weekOrder = useMemo(
    () => Array.from({ length: 7 }, (_, i) => (weekStartDay + i) % 7),
    [weekStartDay],
  );
  const visibleDays = view === "day" ? [dayIndex] : weekOrder;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showStats, setShowStats] = useState(false);

  // A live "now" line (minutes since midnight), refreshed each minute.
  const [nowMin, setNowMin] = useState(() => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  });
  useEffect(() => {
    const id = setInterval(() => {
      const d = new Date();
      setNowMin(d.getHours() * 60 + d.getMinutes());
    }, 60000);
    return () => clearInterval(id);
  }, []);

  const colRef = useRef<HTMLDivElement | null>(null);
  const latest = useRef({ week, onChange, start, end, visibleDays });
  latest.current = { week, onChange, start, end, visibleDays };

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

  // ---- Direct edits (add / rename / delete / mark done) ----
  const commit = (w: Week) => latest.current.onChange(w);
  const updateBlock = (id: string, patch: Partial<Block>) => {
    const w = latest.current.week;
    const day = w.findIndex((d) => d.some((b) => b.id === id));
    if (day < 0) return;
    const block = w[day].find((b) => b.id === id)!;
    commit(replaceBlock(w, id, { ...block, ...patch }, day));
  };
  const deleteBlock = (id: string) => {
    commit(latest.current.week.map((d) => d.filter((b) => b.id !== id)));
    setSelectedId(null);
  };
  const addBlock = (day: number, startMin: number) => {
    const w = latest.current.week;
    const s = clamp(snap(startMin), latest.current.start, latest.current.end - 30);
    const e = Math.min(s + 60, latest.current.end);
    const id = `u${Date.now()}`;
    const next: Block = { id, title: t("block.new"), startMin: s, endMin: e, kind: "want" };
    commit(
      w.map((d, i) => (i === day ? [...d, next].sort((a, b) => a.startMin - b.startMin) : d)),
    );
    setSelectedId(id);
  };

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
        const { start: s, end: en, week: w } = latest.current;
        const minute = clamp(snap(s + (e.clientY - cr.top) / PX_PER_MIN), s, en);
        const day = w.findIndex((d) => d.some((b) => b.id === r.block.id));
        const others = day >= 0 ? w[day].filter((b) => b.id !== r.block.id) : [];
        if (r.edge === "top") {
          const ceil = others
            .filter((b) => b.endMin <= r.block.startMin)
            .reduce((m, b) => Math.max(m, b.endMin), s);
          setPreview({
            id: r.block.id,
            startMin: clamp(minute, ceil, r.block.endMin - MIN_DURATION),
            endMin: r.block.endMin,
          });
        } else {
          const floor = others
            .filter((b) => b.startMin >= r.block.endMin)
            .reduce((m, b) => Math.min(m, b.startMin), en);
          setPreview({
            id: r.block.id,
            startMin: r.block.startMin,
            endMin: clamp(minute, r.block.startMin + MIN_DURATION, floor),
          });
        }
      }
    }

    function onUp(e: PointerEvent) {
      const {
        week: w,
        onChange: change,
        start: s,
        end: en,
        visibleDays: vd,
      } = latest.current;
      const col = colRef.current;
      if (moveRef.current) {
        const g = moveRef.current;
        if (g.moving && col) {
          const cr = col.getBoundingClientRect();
          const duration = g.block.endMin - g.block.startMin;
          const colIdx = clamp(
            Math.floor((e.clientX - cr.left) / cr.width),
            0,
            vd.length - 1,
          );
          const day = vd[colIdx];
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

  const selected = selectedId
    ? week.flatMap((d) => d).find((b) => b.id === selectedId) ?? null
    : null;

  // ---- Week stats ----
  const stats = useMemo(() => {
    let fixed = 0,
      activity = 0,
      routine = 0,
      meals = 0,
      sleep = 0,
      breaks = 0;
    let done = 0,
      total = 0;
    for (const day of week) {
      for (const b of day) {
        const hrs = (b.endMin - b.startMin) / 60;
        if (b.kind === "fixed") fixed += hrs;
        else if (b.kind === "flex" || b.kind === "want") activity += hrs;
        else if (b.kind === "break") breaks += hrs;
        else if (b.kind === "life") {
          if (b.title === "block.sleep") sleep += hrs;
          else if (MEAL_TITLES.has(b.title)) meals += hrs;
          else routine += hrs;
        }
        if (b.title !== "block.sleep") {
          total++;
          if (b.done) done++;
        }
      }
    }
    return { fixed, activity, routine, meals, sleep, breaks, done, total };
  }, [week]);
  const hf = (h: number) => (Math.round(h * 2) / 2).toString();

  const dayTimeFromEvent = (e: React.MouseEvent, colEl: HTMLElement) => {
    const cr = colEl.getBoundingClientRect();
    return start + (e.clientY - cr.top) / PX_PER_MIN;
  };

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-3 py-6 sm:px-4 sm:py-8">
      <header className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onBack}
          aria-label={t("grid.back")}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-lg text-zinc-500 transition-colors hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-500/15 dark:hover:text-indigo-300"
        >
          ←
        </button>
        <div className="flex flex-col items-center">
          <h1 className="max-w-[60vw] truncate text-base font-semibold tracking-tight">
            {displayTitle}
          </h1>
          <p className="text-xs text-zinc-400">
            {manual ? t("grid.builtByYou") : t("grid.generatedBy")}
          </p>
        </div>
        {/* A manual schedule has no survey to edit — editing one would
            regenerate the week and wipe what was built by hand. */}
        {manual ? (
          <span className="h-10 w-10" />
        ) : (
          <button
            type="button"
            onClick={onEdit}
            aria-label={t("grid.edit")}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-base text-zinc-500 transition-colors hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-500/15 dark:hover:text-indigo-300"
          >
            ✏️
          </button>
        )}
      </header>

      {/* View toggle + stats toggle */}
      <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-black/[.1] p-0.5 text-xs font-medium dark:border-white/[.15]">
            <button
              type="button"
              onClick={() => setView("week")}
              className={`rounded-md px-3 py-1 ${view === "week" ? "btn-primary" : "text-zinc-500"}`}
            >
              {t("grid.week")}
            </button>
            <button
              type="button"
              onClick={() => {
                setDayIndex(today >= 0 ? today : dayIndex);
                setView("day");
              }}
              className={`rounded-md px-3 py-1 ${view === "day" ? "btn-primary" : "text-zinc-500"}`}
            >
              {t("grid.day")}
            </button>
          </div>
          {/* Manual schedules have no survey, so the start day is set here. */}
          {manual && onWeekStartDayChange && (
            <WeekStartSwitcher
              value={weekStartDay}
              onChange={onWeekStartDayChange}
            />
          )}
          <button
            type="button"
            onClick={() => setShowStats((v) => !v)}
            className={`rounded-lg border px-3 py-1 text-xs font-medium transition-colors ${showStats ? "btn-primary border-transparent" : "border-black/[.1] text-zinc-500 hover:border-indigo-400 dark:border-white/[.15]"}`}
          >
            {t("grid.stats")}
          </button>
          {view === "day" && (
            <div className="ml-auto flex items-center gap-2 text-sm font-medium">
              <button
                type="button"
                onClick={() => setDayIndex((d) => (d + 6) % 7)}
                className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-500/15"
              >
                ‹
              </button>
              <span className="tabular-nums">
                {t(DAY_KEYS[dayIndex])}
                {dayDates[dayIndex] ? ` ${dayDates[dayIndex]}` : ""}
              </span>
              <button
                type="button"
                onClick={() => setDayIndex((d) => (d + 1) % 7)}
                className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-500/15"
              >
                ›
              </button>
            </div>
          )}
      </div>

      {/* Stats panel */}
      {!isEmpty && showStats && (
        <div className="flex flex-wrap gap-1.5 text-xs">
          {stats.activity > 0 && <Stat label={`⚡ ${hf(stats.activity)}h`} />}
          {stats.routine > 0 && <Stat label={`🔁 ${hf(stats.routine)}h`} />}
          {stats.fixed > 0 && <Stat label={`📌 ${hf(stats.fixed)}h`} />}
          {stats.breaks > 0 && <Stat label={`☕ ${hf(stats.breaks)}h`} />}
          {stats.meals > 0 && <Stat label={`🍽 ${hf(stats.meals)}h`} />}
          {stats.sleep > 0 && <Stat label={`😴 ${hf(stats.sleep)}h`} />}
          <Stat label={`✓ ${stats.done}/${stats.total}`} />
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500">
        {(["fixed", "flex", "want", "life", "break"] as const).map((k) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-full ${KIND_STYLES[k]}`} />
            {t(`grid.legend.${k}`)}
          </span>
        ))}
        <span className="text-zinc-400">{t("grid.hint2")}</span>
      </div>

      {/* The grid always renders, even when empty, so blocks can be added to
          it by double-tapping a slot (the only way to build a manual week). */}
      {isEmpty && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-black/[.08] p-6 text-center text-sm text-zinc-400 dark:border-white/[.1]">
          <Mascot size={72} />
          <p>{manual ? t("grid.emptyManual") : t("grid.empty")}</p>
        </div>
      )}
      <div
          className="overflow-x-auto rounded-xl border border-black/[.08] bg-white/60 dark:border-white/[.1] dark:bg-zinc-900/40"
          onPointerDown={(e) => {
            if (!(e.target as HTMLElement).closest("[data-block]")) {
              setSelectedId(null);
            }
          }}
        >
          <div
            className={`grid ${view === "week" ? "min-w-[640px]" : ""}`}
            style={{
              gridTemplateColumns: `3rem repeat(${visibleDays.length}, minmax(76px, 1fr))`,
            }}
          >
            {/* Header row */}
            <div className="sticky top-0 z-10 border-b border-black/[.08] bg-white/80 backdrop-blur dark:border-white/[.1] dark:bg-zinc-900/80" />
            {visibleDays.map((di) => (
              <div
                key={di}
                className={`sticky top-0 z-10 flex flex-col items-center border-b border-l border-black/[.06] py-2 text-center text-xs font-semibold leading-tight backdrop-blur dark:border-white/[.08] ${
                  di === today
                    ? "bg-indigo-50/90 dark:bg-indigo-500/20"
                    : "bg-white/80 dark:bg-zinc-900/80"
                } ${
                  di >= 5
                    ? "text-fuchsia-500 dark:text-fuchsia-400"
                    : "text-indigo-600 dark:text-indigo-300"
                }`}
              >
                <span>{t(DAY_KEYS[di])}</span>
                {dayDates[di] && (
                  <span className="text-[10px] font-normal text-zinc-400 tabular-nums">
                    {dayDates[di]}
                  </span>
                )}
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
            {visibleDays.map((di, colIdx) => (
              <div
                key={di}
                ref={colIdx === 0 ? colRef : undefined}
                onDoubleClick={(e) => {
                  if ((e.target as HTMLElement).closest("[data-block]")) return;
                  addBlock(di, dayTimeFromEvent(e, e.currentTarget));
                }}
                className={`relative border-l border-black/[.06] dark:border-white/[.08] ${
                  di === today ? "bg-indigo-50/40 dark:bg-indigo-500/5" : ""
                }`}
                style={{ height }}
              >
                {hours.map((m) => (
                  <div
                    key={m}
                    className="absolute inset-x-0 border-t border-black/[.04] dark:border-white/[.05]"
                    style={{ top: (m - start) * PX_PER_MIN }}
                  />
                ))}

                {/* Now line */}
                {di === today && nowMin >= start && nowMin <= end && (
                  <div
                    className="pointer-events-none absolute inset-x-0 z-30 border-t-2 border-red-500"
                    style={{ top: (nowMin - start) * PX_PER_MIN }}
                  >
                    <span className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-red-500" />
                  </div>
                )}

                {week[di].map((b) => {
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
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setSelectedId((cur) => (cur === b.id ? null : b.id));
                      }}
                      className={`absolute inset-x-0.5 cursor-grab touch-none select-none overflow-hidden rounded-md px-1 py-0.5 text-[10px] leading-tight shadow-sm active:cursor-grabbing ${
                        KIND_STYLES[b.kind]
                      } ${isDragged ? "opacity-30" : ""} ${
                        b.done ? "opacity-50" : ""
                      } ${
                        isSelected ? "z-20 ring-2 ring-blue-500 ring-offset-1" : ""
                      }`}
                      style={{ top, height: h }}
                      title={`${t(b.title)} · ${formatTime(showStart)}–${formatTime(showEnd)}`}
                    >
                      <div
                        className={`truncate font-medium ${b.done ? "line-through" : ""}`}
                      >
                        {b.done ? "✓ " : ""}
                        {t(b.title)}
                      </div>
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

      {/* Selected-block action bar: rename / done / delete */}
      {selected && (
        <div className="sticky bottom-3 z-40 mx-auto flex w-full max-w-xl items-center gap-2 rounded-2xl border border-black/[.08] bg-white/95 p-2 shadow-lg backdrop-blur dark:border-white/[.12] dark:bg-zinc-900/95">
          <input
            value={t(selected.title)}
            onChange={(e) => updateBlock(selected.id, { title: e.target.value })}
            aria-label={t("grid.blockName")}
            className="h-9 min-w-0 flex-1 rounded-lg border border-black/[.1] bg-transparent px-2 text-sm outline-none focus:border-indigo-500 dark:border-white/[.15]"
          />
          <button
            type="button"
            onClick={() => updateBlock(selected.id, { done: !selected.done })}
            className={`h-9 rounded-lg px-3 text-sm font-medium ${selected.done ? "btn-primary" : "border border-black/[.1] text-zinc-600 dark:border-white/[.15] dark:text-zinc-300"}`}
          >
            ✓ {t("grid.done")}
          </button>
          <button
            type="button"
            onClick={() => deleteBlock(selected.id)}
            aria-label={t("grid.delete")}
            className="h-9 rounded-lg px-3 text-sm text-zinc-400 hover:text-red-600"
          >
            🗑
          </button>
          <button
            type="button"
            onClick={() => setSelectedId(null)}
            aria-label={t("grid.close")}
            className="h-9 rounded-lg px-2 text-sm text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
          >
            ✕
          </button>
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
          <div className="truncate font-medium">
            {t(moveRef.current.block.title)}
          </div>
          <div className="truncate opacity-80">
            {formatTime(moveRef.current.block.startMin)}
          </div>
        </div>
      )}
    </main>
  );
}

function Stat({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-indigo-50 px-2.5 py-1 font-medium text-indigo-700 dark:bg-white/[.08] dark:text-zinc-200">
      {label}
    </span>
  );
}
