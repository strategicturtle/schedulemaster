// Client-side API wrapper for ScheduleMaster. Schedules and folders live in
// Postgres, scoped to the logged-in user; these helpers call the route
// handlers under /api and normalize the JSON shapes the UI expects.

import type { SurveyAnswers, Week } from "@/lib/schedule";

export type SavedSchedule = {
  id: string;
  title: string;
  createdAt: number;
  answers: SurveyAnswers;
  blocks: Week | null;
  folderId: string | null;
};

export type Folder = {
  id: string;
  name: string;
  createdAt: number;
};

export type AuthUser = { id: string; username: string };

async function jsonOrThrow<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((body as { error?: string }).error || `Request failed (${res.status})`);
  }
  return body as T;
}

function toSchedule(raw: {
  id: string;
  title: string;
  createdAt: string;
  answers: SurveyAnswers;
  blocks: Week | null;
  folderId: string | null;
}): SavedSchedule {
  return {
    id: raw.id,
    title: raw.title,
    createdAt: new Date(raw.createdAt).getTime(),
    answers: raw.answers,
    blocks: raw.blocks ?? null,
    folderId: raw.folderId,
  };
}

function toFolder(raw: { id: string; name: string; createdAt: string }): Folder {
  return { id: raw.id, name: raw.name, createdAt: new Date(raw.createdAt).getTime() };
}

// ---- Auth -----------------------------------------------------------------

export async function fetchMe(): Promise<AuthUser | null> {
  const res = await fetch("/api/auth/me");
  if (!res.ok) return null;
  const body = (await res.json()) as { user: AuthUser | null };
  return body.user;
}

export async function signup(username: string, password: string): Promise<AuthUser> {
  const res = await fetch("/api/auth/signup", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  return (await jsonOrThrow<{ user: AuthUser }>(res)).user;
}

export async function login(username: string, password: string): Promise<AuthUser> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  return (await jsonOrThrow<{ user: AuthUser }>(res)).user;
}

export async function logout(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST" });
}

// ---- Schedules ------------------------------------------------------------

export async function fetchSchedules(): Promise<SavedSchedule[]> {
  const res = await fetch("/api/schedules");
  const body = await jsonOrThrow<{ schedules: Parameters<typeof toSchedule>[0][] }>(res);
  return body.schedules.map(toSchedule);
}

export async function createSchedule(answers: SurveyAnswers): Promise<SavedSchedule> {
  const res = await fetch("/api/schedules", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ answers }),
  });
  return toSchedule((await jsonOrThrow<{ schedule: Parameters<typeof toSchedule>[0] }>(res)).schedule);
}

export async function updateSchedule(
  id: string,
  patch: {
    title?: string;
    folderId?: string | null;
    answers?: SurveyAnswers;
    blocks?: Week;
  },
): Promise<SavedSchedule> {
  const res = await fetch(`/api/schedules/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(patch),
  });
  return toSchedule((await jsonOrThrow<{ schedule: Parameters<typeof toSchedule>[0] }>(res)).schedule);
}

export async function deleteSchedule(id: string): Promise<void> {
  await jsonOrThrow(await fetch(`/api/schedules/${id}`, { method: "DELETE" }));
}

// ---- Folders --------------------------------------------------------------

export async function fetchFolders(): Promise<Folder[]> {
  const res = await fetch("/api/folders");
  const body = await jsonOrThrow<{ folders: Parameters<typeof toFolder>[0][] }>(res);
  return body.folders.map(toFolder);
}

export async function createFolder(name: string): Promise<Folder> {
  const res = await fetch("/api/folders", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name }),
  });
  return toFolder((await jsonOrThrow<{ folder: Parameters<typeof toFolder>[0] }>(res)).folder);
}

export async function deleteFolder(id: string): Promise<void> {
  await jsonOrThrow(await fetch(`/api/folders/${id}`, { method: "DELETE" }));
}
