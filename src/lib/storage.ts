// Browser-local persistence for ScheduleMaster (no accounts yet).

import type { SurveyAnswers } from "@/lib/schedule";

export type SavedSchedule = {
  id: string;
  title: string;
  createdAt: number;
  answers: SurveyAnswers;
  folderId: string | null;
};

export type Folder = {
  id: string;
  name: string;
  createdAt: number;
};

const SCHEDULES_KEY = "sm.schedules";
const FOLDERS_KEY = "sm.folders";

export function genId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota / serialization errors */
  }
}

export const loadSchedules = (): SavedSchedule[] =>
  read<SavedSchedule[]>(SCHEDULES_KEY, []);
export const saveSchedules = (s: SavedSchedule[]): void =>
  write(SCHEDULES_KEY, s);

export const loadFolders = (): Folder[] => read<Folder[]>(FOLDERS_KEY, []);
export const saveFolders = (f: Folder[]): void => write(FOLDERS_KEY, f);

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
