"use client";

import { useState } from "react";
import { generateWeek } from "@/lib/schedule";
import { ScheduleGrid } from "@/components/ScheduleGrid";

type Busyness = "middle" | "packed" | "loose";

// Each blank-question is a list of entries; each entry is a record of the
// blanks for that question's template.
type Entry = Record<string, string>;

type BlankWidth = "day" | "wide";

type Segment =
  | { type: "text"; text: string }
  | { type: "blank"; field: string; placeholder: string; width: BlankWidth }
  // A time slot renders as  [hour] : [min]  — the colon is provided.
  | { type: "time"; hourField: string; minField: string };

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

const BLANK_STEPS: BlankStep[] = [
  {
    key: "fixedTime",
    title: "Any fixed-time programs?",
    // ____ from _:__ to _:__ on ____
    segments: [
      blank("program", "what", "wide"),
      txt("from"),
      time("startH", "startM"),
      txt("to"),
      time("endH", "endM"),
      txt("on"),
      blank("day", "day", "day"),
    ],
    fields: ["program", "startH", "startM", "endH", "endM", "day"],
    note: null,
  },
  {
    key: "flexible",
    title: "Any programs without a fixed time?",
    // _:__ to _:__ called ____ on ____
    segments: [
      time("startH", "startM"),
      txt("to"),
      time("endH", "endM"),
      txt("called"),
      blank("name", "what", "wide"),
      txt("on"),
      blank("day", "day", "day"),
    ],
    fields: ["startH", "startM", "endH", "endM", "name", "day"],
    note: "ScheduleMaster will choose the time and duration based on your productivity.",
  },
  {
    key: "wants",
    title: "Any wants?",
    // It is ______
    segments: [txt("It is"), blank("want", "what", "wide")],
    fields: ["want"],
    note: "ScheduleMaster decides the duration, the time, and whether to do it at all (or only on weekends).",
  },
];

const BUSYNESS_OPTIONS: { value: Busyness; label: string; desc: string }[] = [
  { value: "middle", label: "In the middle", desc: "A balanced day." },
  { value: "packed", label: "Packed", desc: "Fill the day up." },
  { value: "loose", label: "Loose", desc: "Plenty of breathing room." },
];

const TOTAL_STEPS = 4; // Q1–Q3 (blanks) + Q4 (busyness)

type Answers = {
  fixedTime: Entry[];
  flexible: Entry[];
  wants: Entry[];
  busyness: Busyness | null;
};

function emptyEntry(fields: string[]): Entry {
  return Object.fromEntries(fields.map((f) => [f, ""]));
}

function initAnswers(): Answers {
  return {
    fixedTime: [emptyEntry(BLANK_STEPS[0].fields)],
    flexible: [emptyEntry(BLANK_STEPS[1].fields)],
    wants: [emptyEntry(BLANK_STEPS[2].fields)],
    busyness: null,
  };
}

export function SurveyWizard() {
  const [step, setStep] = useState(0); // 0–2 = blank questions, 3 = busyness
  const [submitted, setSubmitted] = useState(false);
  const [answers, setAnswers] = useState<Answers>(initAnswers);

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

  function restart() {
    setAnswers(initAnswers());
    setStep(0);
    setSubmitted(false);
  }

  if (submitted) {
    const week = generateWeek(answers);
    return (
      <ScheduleGrid
        week={week}
        onBack={restart}
        onEdit={() => {
          setSubmitted(false);
          setStep(0);
        }}
      />
    );
  }

  const isBusynessStep = step === TOTAL_STEPS - 1;
  const stepDef = !isBusynessStep ? BLANK_STEPS[step] : null;

  return (
    <Shell>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">
          Question {step + 1} of {TOTAL_STEPS}
        </span>
        <div className="flex gap-1.5" aria-hidden>
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <span
              key={i}
              className={`h-1.5 w-6 rounded-full transition-colors ${
                i <= step
                  ? "bg-zinc-900 dark:bg-white"
                  : "bg-zinc-200 dark:bg-zinc-700"
              }`}
            />
          ))}
        </div>
      </div>

      {stepDef && (
        <div className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
            {stepDef.title}
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
            + Add another
          </button>

          <p className="text-xs text-zinc-400">
            Fill in the blanks — <kbd className="font-sans">Tab</kbd> jumps to
            the next blank, or click a blank to type. Leave blank if none.
          </p>

          {stepDef.note && (
            <p className="rounded-lg bg-zinc-100 px-3 py-2 text-sm text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300">
              {stepDef.note}
            </p>
          )}
        </div>
      )}

      {isBusynessStep && (
        <div className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
            What schedule busyness do you want?
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
                      ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900"
                      : "border-black/[.1] bg-white hover:border-zinc-400 dark:border-white/[.15] dark:bg-zinc-900"
                  }`}
                >
                  <span className="font-medium">{opt.label}</span>
                  <span
                    className={`text-sm ${
                      selected
                        ? "text-white/70 dark:text-zinc-900/70"
                        : "text-zinc-500 dark:text-zinc-400"
                    }`}
                  >
                    {opt.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={goBack}
          disabled={step === 0}
          className="h-11 rounded-lg px-4 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-0 dark:hover:text-white"
        >
          Back
        </button>

        {isBusynessStep ? (
          <button
            type="button"
            onClick={() => setSubmitted(true)}
            disabled={answers.busyness === null}
            className="h-11 rounded-lg bg-zinc-900 px-6 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Done
          </button>
        ) : (
          <button
            type="button"
            onClick={goNext}
            className="h-11 rounded-lg bg-zinc-900 px-6 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Next
          </button>
        )}
      </div>
    </Shell>
  );
}

const BLANK_INPUT =
  "border-0 border-b-2 border-zinc-300 bg-transparent px-1 py-0.5 text-center text-zinc-900 outline-none transition-colors placeholder:text-zinc-300 focus:border-zinc-900 dark:border-zinc-600 dark:text-zinc-100 dark:placeholder:text-zinc-600 dark:focus:border-white";

const WIDTH_CLASS: Record<BlankWidth, string> = {
  day: "w-24",
  wide: "w-36 sm:w-44",
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
                {seg.text}
              </span>
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
              placeholder={seg.placeholder}
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
          aria-label="Remove this entry"
          className="shrink-0 rounded-md px-2 py-1 text-sm text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
        >
          ✕
        </button>
      )}
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-8 sm:py-12">
      <header className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          ScheduleMaster
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          New schedule survey
        </p>
      </header>
      <div className="flex flex-col gap-6 rounded-2xl border border-black/[.08] bg-white/60 p-5 shadow-sm sm:p-6 dark:border-white/[.1] dark:bg-zinc-900/40">
        {children}
      </div>
    </main>
  );
}
