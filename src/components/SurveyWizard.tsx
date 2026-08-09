"use client";

import { useMemo, useState } from "react";
import { LanguageSwitcher, useI18n } from "@/lib/i18n";
import {
  anchorMondayFor,
  displayWeekStart,
  isoDate,
  reanchorForStartDay,
} from "@/lib/schedule";

type Busyness = "middle" | "packed" | "loose";

// Each blank-question is a list of entries; each entry is a record of the
// blanks for that question's template.
type Entry = Record<string, string>;

type BlankWidth = "day" | "wide" | "num";

type Segment =
  | { type: "text"; text: string }
  | { type: "blank"; field: string; placeholder: string; width: BlankWidth }
  // A time slot renders as  [hour] : [min]  — the colon is provided.
  | { type: "time"; hourField: string; minField: string }
  // Optional AM / PM constraint (Any time / AM / PM).
  | { type: "ampm"; field: string };

type BlankStep = {
  key: "fixedTime" | "flexible" | "wants";
  title: string;
  segments: Segment[];
  fields: string[];
  note: string | null;
};

const txt = (text: string): Segment => ({ type: "text", text });
const blank = (
  field: string,
  placeholder: string,
  width: BlankWidth,
): Segment => ({ type: "blank", field, placeholder, width });
const time = (hourField: string, minField: string): Segment => ({
  type: "time",
  hourField,
  minField,
});
const ampm = (field: string): Segment => ({ type: "ampm", field });

// `title`, `note`, text segments and placeholders are i18n keys, resolved with
// t() at render time. (t() passes through anything that isn't a key, so the
// literal "30" example placeholder still renders as "30".)
const BLANK_STEPS: BlankStep[] = [
  {
    key: "fixedTime",
    title: "survey.fixed.title",
    // ____ from _:__ to _:__ on ____
    segments: [
      blank("program", "survey.ph.what", "wide"),
      txt("survey.seg.from"),
      time("startH", "startM"),
      txt("survey.seg.to"),
      time("endH", "endM"),
      txt("survey.seg.on"),
      blank("day", "survey.ph.day", "day"),
    ],
    fields: ["program", "startH", "startM", "endH", "endM", "day"],
    note: null,
  },
  {
    key: "flexible",
    title: "survey.flex.title",
    // ____ for ___ min on ____
    segments: [
      blank("name", "survey.ph.what", "wide"),
      txt("survey.seg.for"),
      blank("durationMin", "30", "num"),
      txt("survey.seg.minOn"),
      blank("day", "survey.ph.day", "day"),
      ampm("ampm"),
    ],
    fields: ["name", "durationMin", "day", "ampm"],
    note: "survey.flex.note",
  },
  {
    key: "wants",
    title: "survey.wants.title",
    // It is ______ on ____
    segments: [
      txt("survey.seg.itIs"),
      blank("want", "survey.ph.what", "wide"),
      txt("survey.seg.on"),
      blank("day", "survey.ph.day", "day"),
      ampm("ampm"),
    ],
    fields: ["want", "day", "ampm"],
    note: "survey.wants.note",
  },
];

const BUSYNESS_OPTIONS: { value: Busyness; labelKey: string; descKey: string }[] =
  [
    { value: "middle", labelKey: "survey.busy.middle.label", descKey: "survey.busy.middle.desc" },
    { value: "packed", labelKey: "survey.busy.packed.label", descKey: "survey.busy.packed.desc" },
    { value: "loose", labelKey: "survey.busy.loose.label", descKey: "survey.busy.loose.desc" },
  ];

// Q1–Q3 blanks + Q4 school + Q5 work + Q6 wake + Q7 busyness + Q8 subjects + Q9 week
const TOTAL_STEPS = 9;

// Subjects the user can opt into for SM to fill the routine with. Labels reuse
// the block.* i18n keys already used on the grid.
const SUBJECT_OPTIONS = [
  "block.math", "block.writing", "block.reading", "block.science",
  "block.spanish", "block.study", "block.music", "block.art",
  "block.exercise", "block.outdoors", "block.sport", "block.chores",
  "block.games", "block.familytime", "block.relax",
];

export type Answers = {
  fixedTime: Entry[];
  flexible: Entry[];
  wants: Entry[];
  busyness: Busyness | null;
  weekStart?: string; // ISO "YYYY-MM-DD" of the chosen week's Monday
  weekStartDay?: number; // which weekday the grid starts on (0 = Mon … 6 = Sun)
  routineSubjects?: string[]; // block.* keys to fill the routine with
  routinesPerDay?: string; // rough count of routine activities per day
  school?: {
    enabled: boolean;
    startH: string;
    startM: string;
    endH: string;
    endM: string;
  };
  work?: {
    enabled: boolean;
    startH: string;
    startM: string;
    endH: string;
    endM: string;
  };
  wake?: { h: string; m: string };
  sleep?: { h: string; m: string };
};

// Day options for the "week starts on" question (0 = Mon … 6 = Sun).
const DAY_START_KEYS = [
  "day.mon", "day.tue", "day.wed", "day.thu", "day.fri", "day.sat", "day.sun",
];

const WEEKS_AHEAD = 104; // ~2 years of weeks to choose from

// All selectable weeks: this week's Monday through ~2 years out. Labels are
// formatted at render time so they follow the active language/locale.
function buildWeekOptions(weekStartDay: number): { value: string; date: Date }[] {
  const base = anchorMondayFor(weekStartDay);
  const out: { value: string; date: Date }[] = [];
  for (let i = 0; i <= WEEKS_AHEAD; i++) {
    const d = new Date(`${base}T00:00:00`);
    d.setDate(d.getDate() + i * 7);
    const value = isoDate(d);
    out.push({ value, date: displayWeekStart(value, weekStartDay) });
  }
  return out;
}

function emptyEntry(fields: string[]): Entry {
  return Object.fromEntries(fields.map((f) => [f, ""]));
}

function initAnswers(): Answers {
  return {
    fixedTime: [emptyEntry(BLANK_STEPS[0].fields)],
    flexible: [emptyEntry(BLANK_STEPS[1].fields)],
    wants: [emptyEntry(BLANK_STEPS[2].fields)],
    busyness: null,
    weekStartDay: 0,
    weekStart: anchorMondayFor(0),
    routineSubjects: [],
    routinesPerDay: "",
    school: { enabled: false, startH: "", startM: "", endH: "", endM: "" },
    work: { enabled: false, startH: "", startM: "", endH: "", endM: "" },
    wake: { h: "", m: "" },
    sleep: { h: "", m: "" },
  };
}

export function SurveyWizard({
  initialAnswers,
  onComplete,
  onCancel,
}: {
  initialAnswers?: Answers;
  onComplete: (answers: Answers) => void;
  onCancel: () => void;
}) {
  const { t, locale } = useI18n();
  const weekLabelFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    [locale],
  );
  const [step, setStep] = useState(0); // 0–2 = blanks, 3 = busyness, 4 = week
  const [answers, setAnswers] = useState<Answers>(() => {
    if (!initialAnswers) return initAnswers();
    // Backfill weekStart for schedules created before this question existed.
    return {
      ...initialAnswers,
      weekStart:
        initialAnswers.weekStart ||
        anchorMondayFor(initialAnswers.weekStartDay ?? 0),
    };
  });
  const weekOptions = useMemo(() => {
    const opts = buildWeekOptions(answers.weekStartDay ?? 0);
    // Keep a previously-chosen past week selectable when editing an old one.
    if (answers.weekStart && !opts.some((o) => o.value === answers.weekStart)) {
      opts.unshift({
        value: answers.weekStart,
        date: displayWeekStart(answers.weekStart, answers.weekStartDay ?? 0),
      });
    }
    return opts;
  }, [answers.weekStart, answers.weekStartDay]);

  const goNext = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  function updateEntry(
    key: BlankStep["key"],
    index: number,
    field: string,
    value: string,
  ) {
    setAnswers((a) => {
      const list = a[key].map((entry, i) =>
        i === index ? { ...entry, [field]: value } : entry,
      );
      return { ...a, [key]: list };
    });
  }

  function addEntry(stepDef: BlankStep) {
    setAnswers((a) => ({
      ...a,
      [stepDef.key]: [...a[stepDef.key], emptyEntry(stepDef.fields)],
    }));
  }

  function removeEntry(key: BlankStep["key"], index: number) {
    setAnswers((a) => ({
      ...a,
      [key]: a[key].filter((_, i) => i !== index),
    }));
  }

  const isSchoolStep = step === 3;
  const isWorkStep = step === 4;
  const isWakeStep = step === 5;
  const isBusynessStep = step === 6;
  const isSubjectsStep = step === 7;
  const isWeekStep = step === TOTAL_STEPS - 1; // 8 — the final question
  const stepDef = step <= 2 ? BLANK_STEPS[step] : null;

  const wake = answers.wake ?? { h: "", m: "" };
  const setWake = (patch: Partial<{ h: string; m: string }>) =>
    setAnswers((a) => ({ ...a, wake: { ...wake, ...patch } }));
  const sleep = answers.sleep ?? { h: "", m: "" };
  const setSleep = (patch: Partial<{ h: string; m: string }>) =>
    setAnswers((a) => ({ ...a, sleep: { ...sleep, ...patch } }));

  const school = answers.school ?? {
    enabled: false,
    startH: "",
    startM: "",
    endH: "",
    endM: "",
  };
  const setSchool = (patch: Partial<NonNullable<Answers["school"]>>) =>
    setAnswers((a) => ({
      ...a,
      school: { ...school, ...patch },
    }));

  const work = answers.work ?? {
    enabled: false,
    startH: "",
    startM: "",
    endH: "",
    endM: "",
  };
  const setWork = (patch: Partial<NonNullable<Answers["work"]>>) =>
    setAnswers((a) => ({
      ...a,
      work: { ...work, ...patch },
    }));

  const toggleSubject = (key: string) =>
    setAnswers((a) => {
      const cur = a.routineSubjects ?? [];
      return {
        ...a,
        routineSubjects: cur.includes(key)
          ? cur.filter((k) => k !== key)
          : [...cur, key],
      };
    });

  return (
    <Shell>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">
          {t("survey.q", { n: step + 1, total: TOTAL_STEPS })}
        </span>
        <div className="flex gap-1.5" aria-hidden>
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <span
              key={i}
              className={`h-1.5 w-6 rounded-full transition-colors ${
                i <= step
                  ? "bg-gradient-to-r from-indigo-500 to-fuchsia-500"
                  : "bg-zinc-200 dark:bg-zinc-700"
              }`}
            />
          ))}
        </div>
      </div>

      {stepDef && (
        <div className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
            {t(stepDef.title)}
          </h2>

          <div className="flex flex-col gap-3">
            {answers[stepDef.key].map((entry, i) => (
              <BlankRow
                key={i}
                stepDef={stepDef}
                entry={entry}
                autoFocus={i === 0}
                removable={answers[stepDef.key].length > 1}
                onChange={(field, value) =>
                  updateEntry(stepDef.key, i, field, value)
                }
                onRemove={() => removeEntry(stepDef.key, i)}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => addEntry(stepDef)}
            className="self-start text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900 dark:hover:text-white"
          >
            {t("survey.addAnother")}
          </button>

          <p className="text-xs text-zinc-400">{t("survey.blanksHint")}</p>

          {stepDef.note && (
            <p className="rounded-lg bg-zinc-100 px-3 py-2 text-sm text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300">
              {t(stepDef.note)}
            </p>
          )}
        </div>
      )}

      {isSchoolStep && (
        <div className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
            {t("survey.school.title")}
          </h2>
          <div className="flex gap-2">
            <button
              type="button"
              aria-pressed={school.enabled}
              onClick={() => setSchool({ enabled: true })}
              className={`h-11 flex-1 rounded-xl border text-sm font-medium transition-colors ${
                school.enabled
                  ? "btn-primary border-transparent"
                  : "border-black/[.1] hover:border-indigo-400 dark:border-white/[.15]"
              }`}
            >
              {t("survey.school.yes")}
            </button>
            <button
              type="button"
              aria-pressed={!school.enabled}
              onClick={() => setSchool({ enabled: false })}
              className={`h-11 flex-1 rounded-xl border text-sm font-medium transition-colors ${
                !school.enabled
                  ? "btn-primary border-transparent"
                  : "border-black/[.1] hover:border-indigo-400 dark:border-white/[.15]"
              }`}
            >
              {t("survey.school.no")}
            </button>
          </div>

          {school.enabled && (
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-2 text-base leading-loose">
              <span className="text-zinc-600 dark:text-zinc-300">
                {t("survey.seg.from")}
              </span>
              <span className="inline-flex items-baseline">
                <input
                  type="text"
                  inputMode="numeric"
                  value={school.startH}
                  onChange={(e) => setSchool({ startH: e.target.value })}
                  placeholder="_"
                  aria-label="startH"
                  className={`w-7 ${BLANK_INPUT}`}
                />
                <span className="px-0.5 text-zinc-600 dark:text-zinc-300">:</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={school.startM}
                  onChange={(e) => setSchool({ startM: e.target.value })}
                  placeholder="__"
                  aria-label="startM"
                  className={`w-9 ${BLANK_INPUT}`}
                />
              </span>
              <span className="text-zinc-600 dark:text-zinc-300">
                {t("survey.seg.to")}
              </span>
              <span className="inline-flex items-baseline">
                <input
                  type="text"
                  inputMode="numeric"
                  value={school.endH}
                  onChange={(e) => setSchool({ endH: e.target.value })}
                  placeholder="_"
                  aria-label="endH"
                  className={`w-7 ${BLANK_INPUT}`}
                />
                <span className="px-0.5 text-zinc-600 dark:text-zinc-300">:</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={school.endM}
                  onChange={(e) => setSchool({ endM: e.target.value })}
                  placeholder="__"
                  aria-label="endM"
                  className={`w-9 ${BLANK_INPUT}`}
                />
              </span>
            </div>
          )}

          <p className="rounded-lg bg-zinc-100 px-3 py-2 text-sm text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300">
            {t("survey.school.note")}
          </p>
        </div>
      )}

      {isWorkStep && (
        <div className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
            {t("survey.work.title")}
          </h2>
          <div className="flex gap-2">
            <button
              type="button"
              aria-pressed={work.enabled}
              onClick={() => setWork({ enabled: true })}
              className={`h-11 flex-1 rounded-xl border text-sm font-medium transition-colors ${
                work.enabled
                  ? "btn-primary border-transparent"
                  : "border-black/[.1] hover:border-indigo-400 dark:border-white/[.15]"
              }`}
            >
              {t("survey.school.yes")}
            </button>
            <button
              type="button"
              aria-pressed={!work.enabled}
              onClick={() => setWork({ enabled: false })}
              className={`h-11 flex-1 rounded-xl border text-sm font-medium transition-colors ${
                !work.enabled
                  ? "btn-primary border-transparent"
                  : "border-black/[.1] hover:border-indigo-400 dark:border-white/[.15]"
              }`}
            >
              {t("survey.school.no")}
            </button>
          </div>

          {work.enabled && (
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-2 text-base leading-loose">
              <span className="text-zinc-600 dark:text-zinc-300">
                {t("survey.seg.from")}
              </span>
              <span className="inline-flex items-baseline">
                <input
                  type="text"
                  inputMode="numeric"
                  value={work.startH}
                  onChange={(e) => setWork({ startH: e.target.value })}
                  placeholder="_"
                  aria-label="workStartH"
                  className={`w-7 ${BLANK_INPUT}`}
                />
                <span className="px-0.5 text-zinc-600 dark:text-zinc-300">:</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={work.startM}
                  onChange={(e) => setWork({ startM: e.target.value })}
                  placeholder="__"
                  aria-label="workStartM"
                  className={`w-9 ${BLANK_INPUT}`}
                />
              </span>
              <span className="text-zinc-600 dark:text-zinc-300">
                {t("survey.seg.to")}
              </span>
              <span className="inline-flex items-baseline">
                <input
                  type="text"
                  inputMode="numeric"
                  value={work.endH}
                  onChange={(e) => setWork({ endH: e.target.value })}
                  placeholder="_"
                  aria-label="workEndH"
                  className={`w-7 ${BLANK_INPUT}`}
                />
                <span className="px-0.5 text-zinc-600 dark:text-zinc-300">:</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={work.endM}
                  onChange={(e) => setWork({ endM: e.target.value })}
                  placeholder="__"
                  aria-label="workEndM"
                  className={`w-9 ${BLANK_INPUT}`}
                />
              </span>
            </div>
          )}

          <p className="rounded-lg bg-zinc-100 px-3 py-2 text-sm text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300">
            {t("survey.work.note")}
          </p>
        </div>
      )}

      {isWakeStep && (
        <div className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
            {t("survey.wake.title")}
          </h2>
          <div className="flex items-baseline gap-2 text-base leading-loose">
            <span className="w-28 text-zinc-600 dark:text-zinc-300">
              {t("survey.wake.at")}
            </span>
            <span className="inline-flex items-baseline">
              <input
                type="text"
                inputMode="numeric"
                value={wake.h}
                onChange={(e) => setWake({ h: e.target.value })}
                placeholder="7"
                aria-label="wakeH"
                className={`w-7 ${BLANK_INPUT}`}
              />
              <span className="px-0.5 text-zinc-600 dark:text-zinc-300">:</span>
              <input
                type="text"
                inputMode="numeric"
                value={wake.m}
                onChange={(e) => setWake({ m: e.target.value })}
                placeholder="00"
                aria-label="wakeM"
                className={`w-9 ${BLANK_INPUT}`}
              />
            </span>
          </div>
          <div className="flex items-baseline gap-2 text-base leading-loose">
            <span className="w-28 text-zinc-600 dark:text-zinc-300">
              {t("survey.wake.sleepAt")}
            </span>
            <span className="inline-flex items-baseline">
              <input
                type="text"
                inputMode="numeric"
                value={sleep.h}
                onChange={(e) => setSleep({ h: e.target.value })}
                placeholder="9"
                aria-label="sleepH"
                className={`w-7 ${BLANK_INPUT}`}
              />
              <span className="px-0.5 text-zinc-600 dark:text-zinc-300">:</span>
              <input
                type="text"
                inputMode="numeric"
                value={sleep.m}
                onChange={(e) => setSleep({ m: e.target.value })}
                placeholder="00"
                aria-label="sleepM"
                className={`w-9 ${BLANK_INPUT}`}
              />
              <span className="pl-1 text-sm text-zinc-400">
                {t("survey.wake.pm")}
              </span>
            </span>
          </div>
          <p className="rounded-lg bg-zinc-100 px-3 py-2 text-sm text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300">
            {t("survey.wake.note")}
          </p>
        </div>
      )}

      {isBusynessStep && (
        <div className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
            {t("survey.busy.title")}
          </h2>
          <div className="flex flex-col gap-3">
            {BUSYNESS_OPTIONS.map((opt) => {
              const selected = answers.busyness === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() =>
                    setAnswers((a) => ({ ...a, busyness: opt.value }))
                  }
                  className={`flex flex-col items-start gap-0.5 rounded-xl border px-4 py-3 text-left transition-colors ${
                    selected
                      ? "btn-primary border-transparent"
                      : "border-black/[.1] bg-white hover:border-indigo-400 dark:border-white/[.15] dark:bg-zinc-900"
                  }`}
                >
                  <span className="font-medium">{t(opt.labelKey)}</span>
                  <span
                    className={`text-sm ${
                      selected
                        ? "text-white/80"
                        : "text-zinc-500 dark:text-zinc-400"
                    }`}
                  >
                    {t(opt.descKey)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {isSubjectsStep && (
        <div className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
            {t("survey.subjects.title")}
          </h2>
          <div className="flex flex-wrap gap-2">
            {SUBJECT_OPTIONS.map((key) => {
              const on = (answers.routineSubjects ?? []).includes(key);
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleSubject(key)}
                  className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                    on
                      ? "btn-primary"
                      : "border border-black/[.1] text-zinc-600 hover:border-indigo-400 hover:text-indigo-600 dark:border-white/[.15] dark:text-zinc-300"
                  }`}
                >
                  {t(key)}
                </button>
              );
            })}
          </div>
          <div className="flex items-baseline gap-2 text-base leading-loose">
            <span className="text-zinc-600 dark:text-zinc-300">
              {t("survey.routines.label")}
            </span>
            <input
              type="text"
              inputMode="numeric"
              value={answers.routinesPerDay ?? ""}
              onChange={(e) =>
                setAnswers((a) => ({ ...a, routinesPerDay: e.target.value }))
              }
              placeholder="auto"
              aria-label={t("survey.routines.label")}
              className={`w-16 ${BLANK_INPUT}`}
            />
          </div>
          <p className="rounded-lg bg-zinc-100 px-3 py-2 text-sm text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300">
            {t("survey.subjects.note")} {t("survey.routines.note")}
          </p>
        </div>
      )}

      {isWeekStep && (
        <div className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
            {t("survey.week.title")}
          </h2>
          <select
            value={answers.weekStart ?? ""}
            onChange={(e) =>
              setAnswers((a) => ({ ...a, weekStart: e.target.value }))
            }
            aria-label={t("survey.week.title")}
            className="h-12 w-full rounded-xl border border-black/[.1] bg-white px-3 text-base outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-white/[.15] dark:bg-zinc-900 dark:focus:border-indigo-400"
          >
            {weekOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {t("survey.week.of", { date: weekLabelFmt.format(o.date) })}
              </option>
            ))}
          </select>
          <p className="rounded-lg bg-zinc-100 px-3 py-2 text-sm text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300">
            {t("survey.week.note")}
          </p>

          <h2 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">
            {t("survey.weekStart.title")}
          </h2>
          <select
            value={answers.weekStartDay ?? 0}
            onChange={(e) => {
              const next = Number(e.target.value);
              setAnswers((a) => {
                const from = a.weekStartDay ?? 0;
                return {
                  ...a,
                  weekStartDay: next,
                  weekStart: reanchorForStartDay(
                    a.weekStart ?? anchorMondayFor(from),
                    from,
                    next,
                  ),
                };
              });
            }}
            aria-label={t("survey.weekStart.title")}
            className="h-12 w-full rounded-xl border border-black/[.1] bg-white px-3 text-base outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-white/[.15] dark:bg-zinc-900 dark:focus:border-indigo-400"
          >
            {DAY_START_KEYS.map((key, i) => (
              <option key={key} value={i}>
                {t("weekStart.starts", { day: t(key) })}
              </option>
            ))}
          </select>
          <p className="rounded-lg bg-zinc-100 px-3 py-2 text-sm text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300">
            {t("survey.weekStart.note")}
          </p>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={step === 0 ? onCancel : goBack}
          className="h-11 rounded-lg px-4 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900 dark:hover:text-white"
        >
          {step === 0 ? t("survey.cancel") : t("survey.back")}
        </button>

        {isWeekStep ? (
          <button
            type="button"
            onClick={() => onComplete(answers)}
            className="btn-primary h-11 rounded-lg px-6 text-sm font-medium"
          >
            {t("survey.done")}
          </button>
        ) : (
          <button
            type="button"
            onClick={goNext}
            disabled={isBusynessStep && answers.busyness === null}
            className="btn-primary h-11 rounded-lg px-6 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t("survey.next")}
          </button>
        )}
      </div>
    </Shell>
  );
}

const BLANK_INPUT =
  "border-0 border-b-2 border-zinc-300 bg-transparent px-1 py-0.5 text-center text-zinc-900 outline-none transition-colors placeholder:text-zinc-300 focus:border-indigo-500 dark:border-zinc-600 dark:text-zinc-100 dark:placeholder:text-zinc-600 dark:focus:border-indigo-400";

const WIDTH_CLASS: Record<BlankWidth, string> = {
  day: "w-24",
  wide: "w-36 sm:w-44",
  num: "w-14",
};

function BlankRow({
  stepDef,
  entry,
  autoFocus,
  removable,
  onChange,
  onRemove,
}: {
  stepDef: BlankStep;
  entry: Entry;
  autoFocus: boolean;
  removable: boolean;
  onChange: (field: string, value: string) => void;
  onRemove: () => void;
}) {
  const { t } = useI18n();
  // Track the first input across the whole row so it can be auto-focused.
  let firstInputSeen = false;
  const takeFirst = () => {
    if (firstInputSeen) return false;
    firstInputSeen = true;
    return true;
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-1 flex-wrap items-baseline gap-x-2 gap-y-2 text-base leading-loose">
        {stepDef.segments.map((seg, i) => {
          if (seg.type === "text") {
            return (
              <span key={i} className="text-zinc-600 dark:text-zinc-300">
                {t(seg.text)}
              </span>
            );
          }
          if (seg.type === "ampm") {
            return (
              <select
                key={i}
                value={entry[seg.field] ?? ""}
                onChange={(e) => onChange(seg.field, e.target.value)}
                aria-label={t("survey.ampm.any")}
                className="rounded-md border border-black/[.1] bg-transparent px-1.5 py-1 text-sm text-zinc-600 outline-none focus:border-indigo-500 dark:border-white/[.15] dark:text-zinc-300"
              >
                <option value="">{t("survey.ampm.any")}</option>
                <option value="am">{t("survey.ampm.am")}</option>
                <option value="pm">{t("survey.ampm.pm")}</option>
              </select>
            );
          }
          if (seg.type === "time") {
            return (
              <span key={i} className="inline-flex items-baseline">
                <input
                  type="text"
                  inputMode="numeric"
                  value={entry[seg.hourField] ?? ""}
                  onChange={(e) => onChange(seg.hourField, e.target.value)}
                  placeholder="_"
                  autoFocus={autoFocus && takeFirst()}
                  aria-label={seg.hourField}
                  className={`w-7 ${BLANK_INPUT}`}
                />
                <span className="px-0.5 text-zinc-600 dark:text-zinc-300">:</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={entry[seg.minField] ?? ""}
                  onChange={(e) => onChange(seg.minField, e.target.value)}
                  placeholder="__"
                  aria-label={seg.minField}
                  className={`w-9 ${BLANK_INPUT}`}
                />
              </span>
            );
          }
          return (
            <input
              key={i}
              type="text"
              value={entry[seg.field] ?? ""}
              onChange={(e) => onChange(seg.field, e.target.value)}
              placeholder={t(seg.placeholder)}
              autoFocus={autoFocus && takeFirst()}
              aria-label={seg.field}
              className={`${WIDTH_CLASS[seg.width]} ${BLANK_INPUT}`}
            />
          );
        })}
      </div>
      {removable && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={t("survey.removeEntry")}
          className="shrink-0 rounded-md px-2 py-1 text-sm text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
        >
          ✕
        </button>
      )}
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-8 sm:py-12">
      <header className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <h1 className="brand-gradient text-lg font-bold tracking-tight">
            ScheduleMaster
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {t("survey.subtitle")}
          </p>
        </div>
        <LanguageSwitcher />
      </header>
      <div className="relative flex flex-col gap-6 overflow-hidden rounded-2xl border border-black/[.08] bg-white/60 p-5 shadow-sm before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-gradient-to-r before:from-indigo-500 before:via-fuchsia-500 before:to-cyan-400 before:content-[''] sm:p-6 dark:border-white/[.1] dark:bg-zinc-900/40">
        {children}
      </div>
    </main>
  );
}
