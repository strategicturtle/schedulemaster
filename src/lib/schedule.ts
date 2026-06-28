// ScheduleManager — the AI that generates schedules for the ScheduleMaster app.
// Deterministic rules-engine implementation of "SM generating".
// Takes the survey answers and builds a Mon–Sun week of time blocks.

export type Busyness = "middle" | "packed" | "loose";
export type BlockKind = "fixed" | "flex" | "want";

export type Block = {
  title: string;
  startMin: number; // minutes from midnight
  endMin: number;
  kind: BlockKind;
};

export type Week = Block[][]; // 7 entries, index 0 = Monday … 6 = Sunday

export type Entry = Record<string, string>;

export type SurveyAnswers = {
  fixedTime: Entry[];
  flexible: Entry[];
  wants: Entry[];
  busyness: Busyness | null;
};

export const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const DAY_ALIASES: Record<string, number> = {
  mon: 0, monday: 0,
  tue: 1, tues: 1, tuesday: 1,
  wed: 2, weds: 2, wednesday: 2,
  thu: 3, thur: 3, thurs: 3, thursday: 3,
  fri: 4, friday: 4,
  sat: 5, saturday: 5,
  sun: 6, sunday: 6,
};

const DEFAULT_WINDOW = { start: 7 * 60, end: 21 * 60 }; // 7:00–21:00

/** Parse a free-text day field into weekday indices (0=Mon … 6=Sun). */
export function parseDays(raw: string): number[] {
  const s = (raw || "").toLowerCase();
  if (!s.trim()) return [];
  if (/every\s*day|daily|all\s*days?|each\s*day/.test(s)) return [0, 1, 2, 3, 4, 5, 6];
  if (/weekday/.test(s)) return [0, 1, 2, 3, 4];
  if (/weekend/.test(s)) return [5, 6];

  const found = new Set<number>();
  for (const token of s.split(/[^a-z]+/)) {
    if (token in DAY_ALIASES) found.add(DAY_ALIASES[token]);
  }
  return [...found].sort((a, b) => a - b);
}

/**
 * Convert an hour/minute pair into minutes from midnight, applying a simple
 * "after-school" heuristic for the missing AM/PM: hours 1–6 are treated as PM.
 * Returns null if the hour is not a number.
 */
export function toMinutes(hourStr: string, minStr: string): number | null {
  const h = parseInt((hourStr || "").trim(), 10);
  if (Number.isNaN(h)) return null;
  const m = parseInt((minStr || "").trim(), 10);
  const minutes = Number.isNaN(m) ? 0 : m;
  let hour = h % 24;
  if (hour >= 1 && hour <= 6) hour += 12; // 1–6 => 13:00–18:00
  return Math.max(0, Math.min(23 * 60 + 59, hour * 60 + minutes));
}

function timeRange(
  entry: Entry,
): { start: number; end: number } | null {
  const start = toMinutes(entry.startH, entry.startM);
  if (start === null) return null;
  let end = toMinutes(entry.endH, entry.endM);
  if (end === null || end <= start) end = start + 60; // default 1h
  return { start, end };
}

function overlaps(blocks: Block[], start: number, end: number): boolean {
  return blocks.some((b) => start < b.endMin && end > b.startMin);
}

/** Find the first open slot of `duration`, searching outward from `from`. */
function findSlot(
  blocks: Block[],
  duration: number,
  win: { start: number; end: number },
  from: number,
  step = 15,
): { start: number; end: number } | null {
  const tryFrom = (begin: number) => {
    for (let s = begin; s + duration <= win.end; s += step) {
      if (!overlaps(blocks, s, s + duration)) return { start: s, end: s + duration };
    }
    return null;
  };
  return tryFrom(Math.max(win.start, from)) ?? tryFrom(win.start);
}

const WANT_DURATION: Record<Busyness, number> = {
  packed: 60,
  middle: 45,
  loose: 30,
};

const PRODUCTIVE_WORDS = [
  "study", "studying", "read", "reading", "homework", "practice", "learn",
  "learning", "code", "coding", "program", "write", "writing", "chore",
  "chores", "clean", "organize", "draw", "drawing", "paint", "music", "piano",
  "guitar", "violin", "instrument", "language", "math", "science", "project",
  "review", "journal", "build", "work",
];

const HEALTHY_WORDS = [
  "run", "running", "jog", "exercise", "workout", "gym", "walk", "walking",
  "sport", "sports", "soccer", "basketball", "baseball", "tennis", "swim",
  "swimming", "bike", "biking", "cycle", "yoga", "meditate", "meditation",
  "stretch", "sleep", "nap", "rest", "cook", "cooking", "salad", "water",
  "outside", "hike", "hiking", "dance", "fresh air",
];

const UNHEALTHY_WORDS = [
  "game", "gaming", "games", "videogame", "video game", "tv", "television",
  "youtube", "netflix", "scroll", "scrolling", "social media", "tiktok",
  "candy", "junk", "soda", "snack",
];

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/** Score a want for productiveness and healthiness (each 0–1) from keywords. */
export function scoreWant(title: string): {
  productivity: number;
  health: number;
} {
  const s = title.toLowerCase();
  const has = (list: string[]) => list.some((k) => s.includes(k));
  let productivity = 0.4;
  let health = 0.4;
  if (has(PRODUCTIVE_WORDS)) productivity += 0.4;
  if (has(HEALTHY_WORDS)) health += 0.4;
  if (has(UNHEALTHY_WORDS)) {
    productivity -= 0.25;
    health -= 0.25;
  }
  return { productivity: clamp01(productivity), health: clamp01(health) };
}

export function generateWeek(answers: SurveyAnswers): Week {
  const busyness: Busyness = answers.busyness ?? "middle";
  const week: Week = Array.from({ length: 7 }, () => []);

  // 1) Fixed-time programs — placed exactly on their day(s).
  for (const entry of answers.fixedTime) {
    const range = timeRange(entry);
    if (!range) continue;
    const title = (entry.program || "").trim() || "Program";
    const days = parseDays(entry.day);
    const targets = days.length ? days : [0, 1, 2, 3, 4]; // default weekdays
    for (const d of targets) {
      week[d].push({
        title,
        startMin: range.start,
        endMin: range.end,
        kind: "fixed",
      });
    }
  }

  // Day window expands to fit any fixed block outside the default.
  const win = { ...DEFAULT_WINDOW };
  for (const day of week) {
    for (const b of day) {
      win.start = Math.min(win.start, b.startMin);
      win.end = Math.max(win.end, b.endMin);
    }
  }

  // 2) Flexible programs — SM picks a productive (morning-first) open slot.
  for (const entry of answers.flexible) {
    const range = timeRange(entry);
    const named = (entry.name || "").trim();
    if (!named && !range) continue; // skip entirely-empty rows
    const duration = range ? range.end - range.start : 60;
    const title = named || "Activity";
    const days = parseDays(entry.day);
    const targets = days.length ? days : [0, 1, 2, 3, 4];
    for (const d of targets) {
      const slot = findSlot(week[d], duration, win, 9 * 60); // prefer from 9:00
      if (slot)
        week[d].push({
          title,
          startMin: slot.start,
          endMin: slot.end,
          kind: "flex",
        });
    }
  }

  // 3) Wants — the user picks the day(s); SM generates ONLY the duration and
  // the time of day, scaled by how productive + healthy the want is.
  const wantBase = WANT_DURATION[busyness];
  for (const entry of answers.wants) {
    const title = (entry.want || "").trim();
    if (!title) continue;

    const { productivity, health } = scoreWant(title);
    const value = (productivity + health) / 2; // 0–1 overall worth

    // Generated duration: more productive/healthy wants get more time;
    // unhealthy ones get less. Rounded to 15-minute increments.
    const duration = Math.max(
      15,
      Math.round((wantBase * (0.6 + 0.8 * value)) / 15) * 15,
    );

    // Productive wants land in productive morning hours; leisure in the
    // afternoon. The day(s) come from the user, defaulting to the weekend.
    const from = productivity >= 0.5 ? 9 * 60 : 15 * 60;
    const parsed = parseDays(entry.day);
    const days = parsed.length ? parsed : [5, 6];
    for (const d of days) {
      const slot = findSlot(week[d], duration, win, from);
      if (slot)
        week[d].push({
          title,
          startMin: slot.start,
          endMin: slot.end,
          kind: "want",
        });
    }
  }

  // Sort each day's blocks chronologically.
  for (const day of week) day.sort((a, b) => a.startMin - b.startMin);
  return week;
}

/** Visible time bounds for rendering the grid (rounded to the hour). */
export function weekBounds(week: Week): { start: number; end: number } {
  let start = DEFAULT_WINDOW.start;
  let end = DEFAULT_WINDOW.end;
  for (const day of week) {
    for (const b of day) {
      start = Math.min(start, b.startMin);
      end = Math.max(end, b.endMin);
    }
  }
  start = Math.floor(start / 60) * 60;
  end = Math.ceil(end / 60) * 60;
  return { start, end };
}

/** Pick a sensible default title from the survey answers. */
export function defaultTitle(answers: SurveyAnswers): string {
  const candidates = [
    ...answers.fixedTime.map((e) => e.program),
    ...answers.flexible.map((e) => e.name),
    ...answers.wants.map((e) => e.want),
  ];
  const first = candidates.map((c) => (c || "").trim()).find(Boolean);
  if (first) {
    const titled = first.charAt(0).toUpperCase() + first.slice(1);
    return titled.length > 40 ? `${titled.slice(0, 40)}…` : titled;
  }
  return "My schedule";
}

export function formatTime(min: number): string {
  const h24 = Math.floor(min / 60);
  const m = min % 60;
  const period = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return m === 0
    ? `${h12} ${period}`
    : `${h12}:${m.toString().padStart(2, "0")} ${period}`;
}
