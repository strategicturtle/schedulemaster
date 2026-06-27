"use client";

import { useRef, useState } from "react";

type Busyness = "middle" | "packed" | "loose";

type Answers = {
  fixedTime: string;
  flexible: string;
  wants: string;
  busyness: Busyness | null;
};

type TextStep = {
  key: "fixedTime" | "flexible" | "wants";
  title: string;
  format: string;
  placeholder: string;
  note: string | null;
};

const TEXT_STEPS: TextStep[] = [
  {
    key: "fixedTime",
    title: "Any fixed-time programs?",
    format: "____ from _:__ to _:__ on ____",
    placeholder: "Soccer practice from 4:00 to 5:30 on Tuesday",
    note: null,
  },
  {
    key: "flexible",
    title: "Any programs without a fixed time?",
    format: "_:__ to _:__ called ____ on ____",
    placeholder: "1:00 to 2:00 called Homework on Monday",
    note: "ScheduleMaster will choose the time and duration based on your productivity.",
  },
  {
    key: "wants",
    title: "Any wants?",
    format: "It is ______",
    placeholder: "It is reading for fun",
    note: "ScheduleMaster decides the duration, the time, and whether to do it at all (or only on weekends).",
  },
];

const BUSYNESS_OPTIONS: { value: Busyness; label: string; desc: string }[] = [
  { value: "middle", label: "In the middle", desc: "A balanced day." },
  { value: "packed", label: "Packed", desc: "Fill the day up." },
  { value: "loose", label: "Loose", desc: "Plenty of breathing room." },
];

const TOTAL_STEPS = 4; // Q1–Q3 (text) + Q4 (busyness)

export function SurveyWizard() {
  const [step, setStep] = useState(0); // 0–2 = text questions, 3 = busyness
  const [submitted, setSubmitted] = useState(false);
  const [answers, setAnswers] = useState<Answers>({
    fixedTime: "",
    flexible: "",
    wants: "",
    busyness: null,
  });
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const goNext = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  function handleTextKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Shift+Enter inserts a newline; plain Enter advances to the next question.
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      goNext();
    }
  }

  function restart() {
    setAnswers({ fixedTime: "", flexible: "", wants: "", busyness: null });
    setStep(0);
    setSubmitted(false);
  }

  if (submitted) {
    return (
      <Summary
        answers={answers}
        onEdit={() => {
          setSubmitted(false);
          setStep(0);
        }}
        onRestart={restart}
      />
    );
  }

  const isBusynessStep = step === TOTAL_STEPS - 1;
  const textStep = !isBusynessStep ? TEXT_STEPS[step] : null;

  return (
    <Shell>
      {/* Progress */}
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

      {textStep && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
              {textStep.title}
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Format: <span className="font-mono">{textStep.format}</span>
            </p>
          </div>

          <textarea
            ref={textareaRef}
            value={answers[textStep.key]}
            onChange={(e) =>
              setAnswers((a) => ({ ...a, [textStep.key]: e.target.value }))
            }
            onKeyDown={handleTextKeyDown}
            placeholder={textStep.placeholder}
            rows={5}
            autoFocus
            className="w-full resize-y rounded-xl border border-black/[.1] bg-white px-4 py-3 text-base leading-relaxed outline-none focus:border-zinc-400 dark:border-white/[.15] dark:bg-zinc-900"
          />

          <p className="text-xs text-zinc-400">
            Add one per line — <kbd className="font-sans">Shift</kbd>+
            <kbd className="font-sans">Enter</kbd> for a new line,{" "}
            <kbd className="font-sans">Enter</kbd> or Next to continue. Leave
            blank if none.
          </p>

          {textStep.note && (
            <p className="rounded-lg bg-zinc-100 px-3 py-2 text-sm text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300">
              {textStep.note}
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

      {/* Navigation */}
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

function Summary({
  answers,
  onEdit,
  onRestart,
}: {
  answers: Answers;
  onEdit: () => void;
  onRestart: () => void;
}) {
  const busynessLabel =
    BUSYNESS_OPTIONS.find((o) => o.value === answers.busyness)?.label ?? "—";

  const rows: { label: string; value: string }[] = [
    { label: "Fixed-time programs", value: answers.fixedTime },
    { label: "Flexible programs", value: answers.flexible },
    { label: "Wants", value: answers.wants },
    { label: "Busyness", value: busynessLabel },
  ];

  return (
    <Shell>
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
          Survey complete
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Here&apos;s what you entered. Schedule generation comes next — this
          screen becomes the schedule view.
        </p>
      </div>

      <dl className="flex flex-col divide-y divide-black/[.06] dark:divide-white/[.08]">
        {rows.map((r) => (
          <div key={r.label} className="flex flex-col gap-1 py-3">
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400">
              {r.label}
            </dt>
            <dd className="whitespace-pre-wrap text-sm text-zinc-800 dark:text-zinc-200">
              {r.value.trim() ? r.value : <span className="text-zinc-400">—</span>}
            </dd>
          </div>
        ))}
      </dl>

      <div className="flex items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={onRestart}
          className="h-11 rounded-lg px-4 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900 dark:hover:text-white"
        >
          Start over
        </button>
        <button
          type="button"
          onClick={onEdit}
          className="h-11 rounded-lg bg-zinc-900 px-6 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Edit answers
        </button>
      </div>
    </Shell>
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
