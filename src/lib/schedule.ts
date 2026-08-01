// ScheduleManager — the AI that generates schedules for the ScheduleMaster app.
// Deterministic rules-engine implementation of "SM generating".
// Takes the survey answers and builds a Mon–Sun week of time blocks.

export type Busyness = "middle" | "packed" | "loose";
// "life" = SM-added routine blocks (meals, sleep, activities); "break" = the
// short green breaks SM slots between activities.
export type BlockKind = "fixed" | "flex" | "want" | "life" | "break";

export type Block = {
  id: string; // stable within a week, for selection + drag/resize
  title: string;
  startMin: number; // minutes from midnight
  endMin: number;
  kind: BlockKind;
  done?: boolean; // checked off as completed
};

export type Week = Block[][]; // 7 entries, index 0 = Monday … 6 = Sunday

export type Entry = Record<string, string>;

export type SurveyAnswers = {
  fixedTime: Entry[];
  flexible: Entry[];
  wants: Entry[];
  busyness: Busyness | null;
  // ISO date ("YYYY-MM-DD") of the Monday of the week this schedule is for.
  // Optional so schedules created before this feature still parse.
  weekStart?: string;
  // i18n title keys ("block.math", …) the user picked to fill the routine.
  // Empty/undefined → SM uses a sensible default mix.
  routineSubjects?: string[];
  // Roughly how many routine (filler) activities to place per day. Blank →
  // automatic (based on busyness/weekend).
  routinesPerDay?: string;
  // Optional school block, placed Mon–Fri when enabled.
  school?: {
    enabled: boolean;
    startH: string;
    startM: string;
    endH: string;
    endM: string;
  };
  // Optional work block, placed Mon–Fri when enabled.
  work?: {
    enabled: boolean;
    startH: string;
    startM: string;
    endH: string;
    endM: string;
  };
  // Optional wake-up time (24h or morning hours). Sets where the day starts.
  wake?: { h: string; m: string };
  // Optional bedtime (24h or evening hours). Sets where the day ends.
  sleep?: { h: string; m: string };
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
  // Spanish
  lun: 0, lunes: 0,
  mar: 1, martes: 1,
  mie: 2, miercoles: 2,
  jue: 3, jueves: 3,
  vie: 4, viernes: 4,
  sab: 5, sabado: 5,
  dom: 6, domingo: 6,
  // French ("dim"/"dom" both mean Sunday, so the overlap is harmless)
  lundi: 0,
  mardi: 1,
  mer: 2, mercredi: 2,
  jeu: 3, jeudi: 3,
  ven: 4, vendredi: 4,
  sam: 5, samedi: 5,
  dim: 6, dimanche: 6,
};

// Chinese day names (週一/星期二/周日…) — matched separately since they
// aren't separated by non-letter characters.
const CJK_DAYS: [RegExp, number][] = [
  [/[周週星]期?[一1]/, 0],
  [/[周週星]期?[二2]/, 1],
  [/[周週星]期?[三3]/, 2],
  [/[周週星]期?[四4]/, 3],
  [/[周週星]期?[五5]/, 4],
  [/[周週星]期?[六6]/, 5],
  [/[周週星]期?[日天]/, 6],
];

const DEFAULT_WINDOW = { start: 7 * 60, end: 21 * 60 }; // 7:00–21:00

/**
 * "Let SM choose the day" — the user doesn't mind which day, so we pick one
 * (round-robin, so several "any" entries spread across the week).
 */
export function isAnyDay(raw: string): boolean {
  const s = (raw || "").trim().toLowerCase();
  return /^(any|anyday|whenever|whatever|idc|random|surprise|you (choose|pick)|(doesn'?t|dont|don't) ?matter|(don'?t|dont) ?care)/.test(
    s,
  );
}

/** Lowercase and strip accents so "miércoles" matches "miercoles". */
function normalize(raw: string): string {
  return (raw || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/** Parse a free-text day field into weekday indices (0=Mon … 6=Sun). */
export function parseDays(raw: string): number[] {
  const s = normalize(raw);
  if (!s.trim()) return [];
  if (/every|daily|all\s*days?|each\s*day|todos|cada\s*dia|chaque\s*jour|tous\s*les\s*jours|每天|每日/.test(s))
    return [0, 1, 2, 3, 4, 5, 6];
  if (/weekday|entre\s*semana|semaine|工作日|平日/.test(s))
    return [0, 1, 2, 3, 4];
  if (/weekend|fin\s*de\s*semana|week-?end|周末|週末/.test(s)) return [5, 6];

  const found = new Set<number>();
  for (const token of s.split(/[^a-z]+/)) {
    if (token in DAY_ALIASES) found.add(DAY_ALIASES[token]);
  }
  for (const [re, idx] of CJK_DAYS) if (re.test(s)) found.add(idx);
  // Bare CJK numerals ("六或日"), only when the field is nothing but day
  // characters and separators — so this can't misfire on other text.
  if (!found.size && /^[一二三四五六日天1-6或和、,\/\s]+$/.test(s.trim())) {
    const BARE: [RegExp, number][] = [
      [/[一1]/, 0], [/[二2]/, 1], [/[三3]/, 2], [/[四4]/, 3],
      [/[五5]/, 4], [/[六6]/, 5], [/[日天]/, 6],
    ];
    for (const [re, idx] of BARE) if (re.test(s)) found.add(idx);
  }
  return [...found].sort((a, b) => a - b);
}

/**
 * Parse the day field, distinguishing "all of these" from "one of these".
 * Writing days with "or"/"either"/"/" (e.g. "sat or sun") means SM should
 * pick a single day among them; otherwise every listed day is used.
 */
export function parseDayChoice(raw: string): {
  days: number[];
  pickOne: boolean;
} {
  const s = normalize(raw);
  const days = parseDays(s);
  // "or" in each supported language (es: o/u, fr: ou, zh: 或/还是), plus "/".
  const pickOne =
    /\bor\b|\beither\b|\bo\b|\bu\b|\bou\b|或|还是|\//.test(s) && days.length > 1;
  return { days, pickOne };
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

/**
 * Find the first open slot of `duration`, searching forward from `from` and
 * wrapping back to the window start. `gap` keeps breathing room around
 * neighbouring blocks so the day isn't a solid wall.
 */
function findSlot(
  blocks: Block[],
  duration: number,
  win: { start: number; end: number },
  from: number,
  gap = 0,
  step = 15,
): { start: number; end: number } | null {
  const fits = (s: number) =>
    s >= win.start &&
    s + duration <= win.end &&
    !overlaps(blocks, s - gap, s + duration + gap);
  const tryFrom = (begin: number) => {
    for (let s = Math.max(win.start, begin); s + duration <= win.end; s += step)
      if (fits(s)) return { start: s, end: s + duration };
    return null;
  };
  // Prefer the requested time; if nothing fits even with the gap, retry from
  // the window start, and finally without the gap so a slot is always found.
  return (
    tryFrom(from) ??
    tryFrom(win.start) ??
    (gap > 0 ? findSlot(blocks, duration, win, from, 0, step) : null)
  );
}

const WANT_DURATION: Record<Busyness, number> = {
  packed: 60,
  middle: 45,
  loose: 30,
};

const PRODUCTIVE_WORDS = [
  "study", "studying", "read", "reading", "homework", "hw", "practice",
  "practise", "learn", "learning", "code", "coding", "program", "programming",
  "write", "writing", "essay", "chore", "chores", "clean", "cleaning",
  "organize", "organise", "tidy", "draw", "drawing", "paint", "painting",
  "art", "music", "piano", "guitar", "violin", "drums", "instrument", "band",
  "choir", "orchestra", "language", "spanish", "french", "math", "maths",
  "science", "history", "english", "geography", "project", "review", "revise",
  "revision", "journal", "build", "work", "research", "vocab", "vocabulary",
  "flashcards", "memorize", "tutor", "tutoring", "robotics", "stem", "chess",
  "debate", "scouts", "volunteer", "volunteering", "internship", "test",
  "exam", "quiz", "presentation", "report", "lesson", "lessons", "class",
  // --- added ---
  "algebra", "geometry", "calculus", "trigonometry", "biology", "chemistry",
  "physics", "literature", "poetry", "grammar", "spelling", "handwriting",
  "cursive", "typing", "notes", "summary", "outline", "thesis", "assignment",
  "worksheet", "workbook", "mandarin", "german", "italian", "latin", "python",
  "javascript", "sewing", "knitting", "crochet", "pottery", "sculpting",
  "engineering", "experiment", "economics", "philosophy", "psychology",
  "astronomy", "civics", "accounting", "arithmetic", "calligraphy",
  "photography", "editing", "laundry", "dishes", "vacuum", "dusting",
  "mopping", "sweeping", "gardening", "weeding", "yardwork", "raking",
  "budgeting", "errands", "meal prep", "flute", "trumpet", "cello",
];

const HEALTHY_WORDS = [
  "run", "running", "jog", "jogging", "exercise", "workout", "gym", "walk",
  "walking", "sport", "sports", "soccer", "basketball", "baseball", "football",
  "tennis", "volleyball", "hockey", "lacrosse", "softball", "track", "swim",
  "swimming", "bike", "biking", "cycle", "cycling", "ride", "yoga", "pilates",
  "meditate", "meditation", "stretch", "stretching", "gymnastics", "karate",
  "judo", "taekwondo", "martial arts", "cheer", "sleep", "nap", "rest",
  "cook", "cooking", "bake", "salad", "water", "outside", "outdoor", "hike",
  "hiking", "dance", "dancing", "ballet", "skate", "skating", "ski", "climb",
  "climbing", "fresh air", "play", "recess", "park",
  // --- added ---
  "pushups", "situps", "pullups", "squats", "planks", "crunches", "lifting",
  "weights", "cardio", "hiit", "crossfit", "spin", "rowing", "elliptical",
  "treadmill", "jumprope", "jump rope", "marathon", "sprint", "laps", "drills",
  "scrimmage", "tumbling", "wrestling", "boxing", "kickboxing", "fencing",
  "archery", "golf", "badminton", "squash", "pickleball", "ping pong",
  "dodgeball", "kickball", "frisbee", "rugby", "cricket", "surfing",
  "paddleboard", "kayak", "kayaking", "canoe", "canoeing", "sailing",
  "bouldering", "snowboard", "snowboarding", "sledding", "rollerblade",
  "scooter", "trampoline", "parkour", "camping", "fishing", "tai chi",
  "zumba", "aerobics", "breathing", "mindfulness", "hydrate", "vegetables",
  "fruit", "smoothie", "shower", "brush teeth",
];

const UNHEALTHY_WORDS = [
  "game", "gaming", "games", "videogame", "video game", "roblox", "minecraft",
  "fortnite", "xbox", "playstation", "nintendo", "switch", "console", "tv",
  "television", "youtube", "netflix", "movie", "movies", "stream", "streaming",
  "scroll", "scrolling", "social media", "tiktok", "instagram", "snapchat",
  "discord", "candy", "junk", "soda", "chips", "fast food",
  // --- added ---
  "phone", "texting", "reels", "shorts", "twitch", "binge", "memes",
  "doomscroll", "vaping", "gambling", "chocolate", "cookies", "cake",
  "donut", "ice cream", "fries", "burger", "energy drink", "vending",
  "browsing",
];

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const clamp = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, n));

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

// Activity → time-of-day buckets, so SM places things when they make sense.
const FOCUS_WORDS = [
  "study", "studying", "read", "reading", "homework", "hw", "learn",
  "learning", "code", "coding", "program", "write", "writing", "essay", "math",
  "maths", "science", "history", "english", "geography", "project", "review",
  "revise", "revision", "journal", "research", "vocab", "vocabulary",
  "flashcards", "memorize", "language", "spanish", "french", "tutor",
  "tutoring", "lesson", "lessons", "class", "test", "exam", "quiz", "report",
  "presentation", "practice", "practise", "piano", "guitar", "violin", "drums",
  "instrument", "band", "choir", "orchestra", "draw", "drawing", "paint",
  "art", "robotics", "stem", "chess", "debate",
  // --- added ---
  "algebra", "geometry", "calculus", "trigonometry", "biology", "chemistry",
  "physics", "literature", "poetry", "grammar", "spelling", "handwriting",
  "cursive", "typing", "notes", "summary", "outline", "thesis", "assignment",
  "worksheet", "workbook", "mandarin", "german", "italian", "latin", "python",
  "javascript", "engineering", "experiment", "economics", "philosophy",
  "psychology", "astronomy", "civics", "accounting", "arithmetic",
  "calligraphy", "photography", "editing", "sewing", "knitting", "crochet",
  "pottery", "sculpting", "flute", "trumpet", "cello",
];
const ACTIVE_WORDS = [
  "run", "running", "jog", "jogging", "exercise", "workout", "gym", "walk",
  "walking", "sport", "sports", "soccer", "basketball", "baseball", "football",
  "tennis", "volleyball", "hockey", "lacrosse", "softball", "track", "swim",
  "swimming", "bike", "biking", "cycle", "cycling", "ride", "yoga", "pilates",
  "stretch", "stretching", "gymnastics", "karate", "judo", "taekwondo",
  "martial arts", "cheer", "hike", "hiking", "dance", "dancing", "ballet",
  "skate", "skating", "ski", "climb", "climbing", "outside", "outdoor",
  "play", "recess", "park", "scouts",
  // --- added ---
  "pushups", "situps", "pullups", "squats", "planks", "crunches", "lifting",
  "weights", "cardio", "hiit", "crossfit", "spin", "rowing", "elliptical",
  "treadmill", "jumprope", "jump rope", "marathon", "sprint", "laps", "drills",
  "scrimmage", "tumbling", "wrestling", "boxing", "kickboxing", "fencing",
  "archery", "golf", "badminton", "squash", "pickleball", "ping pong",
  "dodgeball", "kickball", "frisbee", "rugby", "cricket", "surfing",
  "paddleboard", "kayak", "kayaking", "canoe", "canoeing", "sailing",
  "bouldering", "snowboard", "snowboarding", "sledding", "rollerblade",
  "scooter", "trampoline", "parkour", "camping", "fishing", "tai chi",
  "zumba", "aerobics",
];
const LEISURE_WORDS = [
  "game", "gaming", "games", "videogame", "video game", "roblox", "minecraft",
  "fortnite", "xbox", "playstation", "nintendo", "switch", "console", "tv",
  "television", "youtube", "netflix", "movie", "movies", "stream", "streaming",
  "relax", "chill", "hangout", "hang out", "friends", "social", "social media",
  "tiktok", "instagram", "snapchat", "discord", "podcast", "listen", "rest",
  // --- added ---
  "phone", "texting", "reels", "shorts", "twitch", "memes", "browsing",
  "comics", "manga", "anime", "cartoons", "cards", "puzzle", "lego", "legos",
  "toys", "sleepover", "facetime", "doodle", "daydream", "lounge",
  "board game", "movie night",
];

const HOUR = 60;
const TIME_SLOTS = {
  breakfast: 7 * HOUR + 30,
  morning: 9 * HOUR,
  lunch: 12 * HOUR,
  afternoon: 15 * HOUR + 30,
  dinner: 18 * HOUR,
  evening: 18 * HOUR + 30,
};

/** Preferred start-of-day for an activity, by what it is. */
function preferredStart(title: string, productivity: number): number {
  const s = title.toLowerCase();
  const has = (list: string[]) => list.some((k) => s.includes(k));
  if (s.includes("breakfast")) return TIME_SLOTS.breakfast;
  if (s.includes("lunch")) return TIME_SLOTS.lunch;
  if (s.includes("dinner") || s.includes("supper")) return TIME_SLOTS.dinner;
  if (/\b(cook|cooking|bake|baking|meal|eat|eating)\b/.test(s))
    return TIME_SLOTS.dinner;
  if (s.includes("nap")) return TIME_SLOTS.afternoon;
  if (has(ACTIVE_WORDS)) return TIME_SLOTS.afternoon;
  if (has(FOCUS_WORDS)) return TIME_SLOTS.morning;
  if (has(LEISURE_WORDS)) return TIME_SLOTS.evening;
  return productivity >= 0.5 ? TIME_SLOTS.morning : TIME_SLOTS.evening;
}

// Breathing room between generated blocks, by how busy the user wants to be.
const GAP_FOR: Record<Busyness, number> = { packed: 0, middle: 15, loose: 30 };

export function generateWeek(answers: SurveyAnswers): Week {
  const busyness: Busyness = answers.busyness ?? "middle";
  const week: Week = Array.from({ length: 7 }, () => []);
  let uid = 0;
  const nid = () => `b${uid++}`;

  // "any" day entries each get a single day, cycled through the week so they
  // don't all pile onto Monday.
  let anyCursor = 0;
  const pickAnyDay = () => [anyCursor++ % 7];

  // Total scheduled minutes on a day so far — used to pick the least-busy
  // option for an "or" day choice (which also spreads several such entries).
  const dayLoad = (d: number) =>
    week[d].reduce((sum, b) => sum + (b.endMin - b.startMin), 0);
  const pickOneDay = (days: number[]) =>
    days.reduce((best, d) => (dayLoad(d) < dayLoad(best) ? d : best), days[0]);

  // Resolve a day field to the day(s) to place on. "any" → one cycled day;
  // "sat or sun" → one least-busy day among them; otherwise every listed day
  // (falling back to `fallback` when nothing parses).
  const resolveDays = (raw: string, fallback: number[]): number[] => {
    if (isAnyDay(raw)) return pickAnyDay();
    const { days, pickOne } = parseDayChoice(raw);
    if (!days.length) return fallback;
    return pickOne ? [pickOneDay(days)] : days;
  };

  // 1) Fixed-time programs — placed exactly on their day(s).
  for (const entry of answers.fixedTime) {
    const range = timeRange(entry);
    if (!range) continue;
    const title = (entry.program || "").trim() || "Program";
    const targets = resolveDays(entry.day, [0, 1, 2, 3, 4]); // default weekdays
    for (const d of targets) {
      week[d].push({
        id: nid(),
        title,
        startMin: range.start,
        endMin: range.end,
        kind: "fixed",
      });
    }
  }

  // 1b) School — a fixed block on weekdays (Mon–Fri) when enabled.
  if (answers.school?.enabled) {
    const range = timeRange({
      startH: answers.school.startH,
      startM: answers.school.startM,
      endH: answers.school.endH,
      endM: answers.school.endM,
    });
    if (range) {
      for (const d of [0, 1, 2, 3, 4]) {
        week[d].push({
          id: nid(),
          title: "block.school",
          startMin: range.start,
          endMin: range.end,
          kind: "fixed",
        });
      }
    }
  }

  // 1c) Work — a fixed block on weekdays (Mon–Fri) when enabled.
  if (answers.work?.enabled) {
    const range = timeRange({
      startH: answers.work.startH,
      startM: answers.work.startM,
      endH: answers.work.endH,
      endM: answers.work.endM,
    });
    if (range) {
      for (const d of [0, 1, 2, 3, 4]) {
        week[d].push({
          id: nid(),
          title: "block.work",
          startMin: range.start,
          endMin: range.end,
          kind: "fixed",
        });
      }
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

  // 2) Flexible programs — the user gives a length; SM picks the time of day
  // that fits the activity (focus in the morning, active in the afternoon…).
  const gap = GAP_FOR[busyness];

  // Spread multiple same-time-of-day items across the day instead of stacking
  // them back-to-back (so two "focus" items don't both glue to 9 AM).
  const SPREAD = 165; // minutes
  const bucketUse: Record<string, number> = {};
  const stagger = (d: number, from: number) => {
    const key = `${d}:${from}`;
    const idx = bucketUse[key] ?? 0;
    bucketUse[key] = idx + 1;
    return from + idx * SPREAD;
  };

  const flexScore = (e: Entry) => {
    const { productivity, health } = scoreWant(e.name || "");
    return (productivity + health) / 2;
  };
  // An optional AM/PM choice restricts placement to the morning or afternoon.
  const windowFor = (ampm: string) => {
    const a = (ampm || "").trim().toLowerCase();
    if (a === "am") return { start: win.start, end: Math.min(win.end, NOON) };
    if (a === "pm") return { start: Math.max(win.start, NOON), end: win.end };
    return win;
  };

  const orderedFlex = [...answers.flexible].sort(
    (a, b) => flexScore(b) - flexScore(a),
  );
  for (const entry of orderedFlex) {
    const named = (entry.name || "").trim();
    if (!named) continue; // skip empty rows
    const mins = parseInt((entry.durationMin || "").trim(), 10);
    const duration =
      Number.isNaN(mins) || mins <= 0 ? 60 : Math.min(mins, 12 * 60);
    const targets = resolveDays(entry.day, [0, 1, 2, 3, 4]);
    const w = windowFor(entry.ampm);
    const base = clamp(preferredStart(named, scoreWant(named).productivity), w.start, w.end);
    for (const d of targets) {
      const from = clamp(stagger(d, base), w.start, w.end);
      const slot = findSlot(week[d], duration, w, from, gap);
      if (slot)
        week[d].push({
          id: nid(),
          title: named,
          startMin: slot.start,
          endMin: slot.end,
          kind: "flex",
        });
    }
  }

  // 3) Wants — the user picks the day(s); SM generates ONLY the duration and
  // the time of day, scaled by how productive + healthy the want is.
  // Place the most worthwhile wants first so they claim the prime slots
  // (e.g. homework lands before video games when they share a day).
  const wantValue = (title: string) => {
    const { productivity, health } = scoreWant(title);
    return (productivity + health) / 2;
  };
  const wantBase = WANT_DURATION[busyness];
  const orderedWants = [...answers.wants].sort(
    (a, b) => wantValue(b.want || "") - wantValue(a.want || ""),
  );
  for (const entry of orderedWants) {
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

    // Placed at the time of day that suits the activity (active → afternoon,
    // focus → morning, leisure → evening), unless the user pinned AM/PM.
    const w = windowFor(entry.ampm);
    const base = clamp(preferredStart(title, productivity), w.start, w.end);
    const days = resolveDays(entry.day, [5, 6]);
    for (const d of days) {
      const from = clamp(stagger(d, base), w.start, w.end);
      const slot = findSlot(week[d], duration, w, from, gap);
      if (slot)
        week[d].push({
          id: nid(),
          title,
          startMin: slot.start,
          endMin: slot.end,
          kind: "want",
        });
    }
  }

  // 4) Fill each day into a realistic routine: meals, a sleep block, and the
  // user's chosen subjects (or a default mix), so the day looks lived-in.
  // Weekends start later and get bigger, lazier chunks.
  fillRoutine(
    week,
    nid,
    answers.routineSubjects,
    answers.wake,
    answers.sleep,
    answers.routinesPerDay,
    busyness,
  );

  // Sort each day's blocks chronologically.
  for (const day of week) day.sort((a, b) => a.startMin - b.startMin);
  return week;
}

const NOON = 12 * 60;

// Default mix: SM alternates a productive activity, then an active / relax /
// fun one, and repeats — so the day stays varied (not runs of similar things).
const PRODUCTIVE_FILL = [
  "block.math", "block.writing", "block.reading", "block.science",
  "block.study", "block.spanish", "block.art", "block.music",
];
const BREAK_FILL = [
  "block.outdoors", "block.exercise", "block.games", "block.relax",
  "block.sport", "block.familytime",
];

// Add meals, sleep, and filler activities (kind "life") to every day, filling
// gaps between waking and bedtime. If the user picked subjects, those are
// cycled; otherwise SM alternates productive ↔ active/relax for a mixed day.
// Titles are i18n keys so the grid can localize them.
function fillRoutine(
  week: Week,
  nid: () => string,
  subjects?: string[],
  wake?: { h: string; m: string },
  sleep?: { h: string; m: string },
  perDay?: string,
  busyness: Busyness = "middle",
): void {
  const picks = subjects && subjects.length ? subjects : null;
  // Insert a short green "Break" after every N activities: loose=1, middle=3,
  // packed=5.
  const breakEvery = { loose: 1, middle: 3, packed: 5 }[busyness];
  const BREAK_LEN = 20;
  // Target number of routine activities per day (blank → automatic).
  const targetCount = (() => {
    const n = parseInt((perDay ?? "").trim(), 10);
    return Number.isNaN(n) ? null : clamp(n, 2, 12);
  })();
  // Parse the user's wake time as morning hours (no PM heuristic).
  const userWake = (() => {
    const h = parseInt((wake?.h ?? "").trim(), 10);
    if (Number.isNaN(h)) return null;
    const m = parseInt((wake?.m ?? "").trim(), 10);
    return clamp((h % 24) * 60 + (Number.isNaN(m) ? 0 : m), 0, 12 * 60);
  })();
  // Parse bedtime as evening hours (1–11 → PM), clamped to a sane evening.
  const userBed = (() => {
    const h = parseInt((sleep?.h ?? "").trim(), 10);
    if (Number.isNaN(h)) return null;
    let hour = h % 24;
    if (hour >= 1 && hour <= 11) hour += 12; // 9 → 21:00, 10 → 22:00
    const m = parseInt((sleep?.m ?? "").trim(), 10);
    return clamp(hour * 60 + (Number.isNaN(m) ? 0 : m), 17 * 60, 23 * 60 + 45);
  })();
  // Rotating cursors for the whole week, so things spread evenly.
  let poolCursor = 0; // explicit picks
  let prodCursor = 0;
  let breakCursor = 0;
  let turn = 0; // even → productive, odd → active/relax
  for (let d = 0; d < 7; d++) {
    const isWeekend = d >= 5;
    // User's wake time wins; otherwise default (later on weekends).
    const wake = userWake ?? (isWeekend ? 8 * 60 + 30 : 7 * 60);
    const bed = userBed ?? 21 * 60; // bedtime — start of sleep (default 9 PM)
    const sleepEnd = Math.min(bed + 60, 23 * 60 + 59);
    const day = week[d];

    const addLife = (titleKey: string, s: number, e: number) => {
      if (s >= e || overlaps(day, s, e)) return;
      day.push({ id: nid(), title: titleKey, startMin: s, endMin: e, kind: "life" });
    };

    // Meals (skipped if a fixed event already occupies the slot, e.g. school).
    addLife("block.breakfast", wake, wake + 30);
    addLife("block.lunch", NOON, NOON + 45);
    addLife("block.dinner", 18 * 60, 18 * 60 + 45);
    // Sleep.
    addLife("block.sleep", bed, sleepEnd);

    // Fill the remaining daytime gaps by cycling through the chosen subjects
    // (no two in a row repeat). If the user set a target count, size the
    // chunks so about that many routine blocks fit the day; else default
    // (bigger, lazier chunks on weekends).
    const chunk = targetCount
      ? clamp(Math.round((bed - wake) / targetCount), 30, 330)
      : isWeekend
        ? 120
        : 90;
    let lastTitle = "";
    const pickFill = (): string => {
      let title: string;
      if (picks) {
        // User-chosen subjects: cycle them, avoiding back-to-back repeats.
        title = picks[poolCursor % picks.length];
        poolCursor++;
        if (title === lastTitle && picks.length > 1) {
          title = picks[poolCursor % picks.length];
          poolCursor++;
        }
      } else if (turn % 2 === 0) {
        title = PRODUCTIVE_FILL[prodCursor % PRODUCTIVE_FILL.length];
        prodCursor++;
        turn++;
      } else {
        title = BREAK_FILL[breakCursor % BREAK_FILL.length];
        breakCursor++;
        turn++;
      }
      lastTitle = title;
      return title;
    };
    let sinceBreak = 0; // activities placed since the last break (per day)
    const fillGap = (s: number, e: number) => {
      let t = s;
      while (e - t >= 30) {
        if (sinceBreak >= breakEvery) {
          // Short green break between activities.
          const end = Math.min(t + BREAK_LEN, e);
          day.push({
            id: nid(),
            title: "block.break",
            startMin: t,
            endMin: end,
            kind: "break",
          });
          t = end;
          sinceBreak = 0;
          continue;
        }
        const end = Math.min(t + chunk, e);
        day.push({
          id: nid(),
          title: pickFill(),
          startMin: t,
          endMin: end,
          kind: "life",
        });
        t = end;
        sinceBreak++;
      }
    };

    const occupied = [...day]
      .filter((b) => b.endMin > wake && b.startMin < bed)
      .sort((a, b) => a.startMin - b.startMin);
    let cursor = wake;
    for (const b of occupied) {
      if (b.startMin > cursor) fillGap(cursor, Math.min(b.startMin, bed));
      cursor = Math.max(cursor, b.endMin);
      if (cursor >= bed) break;
    }
    if (cursor < bed) fillGap(cursor, bed);
  }
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
