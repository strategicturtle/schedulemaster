"use client";

import { useCallback, useEffect, useState } from "react";
import { SurveyWizard, type Answers } from "@/components/SurveyWizard";
import { ScheduleGrid } from "@/components/ScheduleGrid";
import { Lobby } from "@/components/Lobby";
import { Login } from "@/components/Login";
import { generateWeek } from "@/lib/schedule";
import {
  createFolder,
  createSchedule,
  deleteAccount,
  deleteFolder,
  deleteSchedule,
  fetchFolders,
  fetchMe,
  fetchSchedules,
  logout,
  recordVisit,
  updateSchedule,
  type AuthUser,
  type Folder,
  type SavedSchedule,
} from "@/lib/storage";

type View =
  | { name: "lobby" }
  | { name: "survey"; editingId: string | null; initial: Answers | null }
  | { name: "schedule"; id: string };

export function App() {
  const [booting, setBooting] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [schedules, setSchedules] = useState<SavedSchedule[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [view, setView] = useState<View>({ name: "lobby" });
  const [visits, setVisits] = useState<number | null>(null);

  // Load the signed-in user's data (called after login and on first mount).
  const loadData = useCallback(async () => {
    const [s, f] = await Promise.all([fetchSchedules(), fetchFolders()]);
    setSchedules(s);
    setFolders(f);
  }, []);

  useEffect(() => {
    (async () => {
      recordVisit().then((n) => n !== null && setVisits(n));
      const me = await fetchMe();
      setUser(me);
      if (me) await loadData().catch(() => {});
      setBooting(false);
    })();
  }, [loadData]);

  async function onAuthed(authed: AuthUser) {
    setUser(authed);
    setView({ name: "lobby" });
    await loadData().catch(() => {});
  }

  async function onLogout() {
    await logout().catch(() => {});
    setUser(null);
    setSchedules([]);
    setFolders([]);
    setView({ name: "lobby" });
  }

  async function onDeleteAccount() {
    await deleteAccount().catch(() => {});
    setUser(null);
    setSchedules([]);
    setFolders([]);
    setView({ name: "lobby" });
  }

  async function completeSurvey(answers: Answers) {
    if (view.name === "survey" && view.editingId) {
      const id = view.editingId;
      const updated = await updateSchedule(id, { answers });
      setSchedules((list) => list.map((s) => (s.id === id ? updated : s)));
      setView({ name: "schedule", id });
    } else {
      const created = await createSchedule(answers);
      setSchedules((list) => [created, ...list]);
      setView({ name: "schedule", id: created.id });
    }
  }

  if (booting) return null;

  if (!user) return <Login onAuthed={onAuthed} visits={visits} />;

  if (view.name === "survey") {
    return (
      <SurveyWizard
        initialAnswers={view.initial ?? undefined}
        onComplete={completeSurvey}
        onCancel={() => setView({ name: "lobby" })}
      />
    );
  }

  if (view.name === "schedule") {
    const schedule = schedules.find((s) => s.id === view.id);
    if (!schedule) {
      setView({ name: "lobby" });
      return null;
    }
    const week = schedule.blocks ?? generateWeek(schedule.answers);
    return (
      <ScheduleGrid
        key={schedule.id}
        week={week}
        title={schedule.title}
        weekStart={schedule.answers.weekStart}
        onBack={() => setView({ name: "lobby" })}
        onEdit={() =>
          setView({
            name: "survey",
            editingId: schedule.id,
            initial: schedule.answers,
          })
        }
        onChange={(newWeek) => {
          // Optimistic: show the move immediately, persist in the background.
          setSchedules((list) =>
            list.map((s) =>
              s.id === schedule.id ? { ...s, blocks: newWeek } : s,
            ),
          );
          updateSchedule(schedule.id, { blocks: newWeek }).catch(() => {});
        }}
      />
    );
  }

  return (
    <Lobby
      username={user.username}
      schedules={schedules}
      folders={folders}
      visits={visits}
      onLogout={onLogout}
      onDeleteAccount={onDeleteAccount}
      onNew={() => setView({ name: "survey", editingId: null, initial: null })}
      onOpen={(id) => setView({ name: "schedule", id })}
      onDelete={async (id) => {
        await deleteSchedule(id);
        setSchedules((list) => list.filter((s) => s.id !== id));
      }}
      onRename={async (id, title) => {
        const updated = await updateSchedule(id, { title });
        setSchedules((list) => list.map((s) => (s.id === id ? updated : s)));
      }}
      onDuplicate={async (id) => {
        const src = schedules.find((s) => s.id === id);
        if (!src) return;
        const created = await createSchedule(src.answers);
        const titled = await updateSchedule(created.id, {
          title: src.title,
          folderId: src.folderId,
        });
        setSchedules((list) => [titled, ...list]);
      }}
      onMove={async (id, folderId) => {
        const updated = await updateSchedule(id, { folderId });
        setSchedules((list) => list.map((s) => (s.id === id ? updated : s)));
      }}
      onAddFolder={async (name) => {
        const folder = await createFolder(name);
        setFolders((list) => [...list, folder]);
      }}
      onDeleteFolder={async (id) => {
        await deleteFolder(id);
        setFolders((list) => list.filter((f) => f.id !== id));
        // Detach schedules from the removed folder (server already did this).
        setSchedules((list) =>
          list.map((s) => (s.folderId === id ? { ...s, folderId: null } : s)),
        );
      }}
    />
  );
}
