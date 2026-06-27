"use client";

import { useEffect, useState } from "react";
import { SurveyWizard, type Answers } from "@/components/SurveyWizard";
import { ScheduleGrid } from "@/components/ScheduleGrid";
import { Lobby } from "@/components/Lobby";
import { generateWeek } from "@/lib/schedule";
import {
  defaultTitle,
  genId,
  loadFolders,
  loadSchedules,
  saveFolders,
  saveSchedules,
  type Folder,
  type SavedSchedule,
} from "@/lib/storage";

type View =
  | { name: "lobby" }
  | { name: "survey"; editingId: string | null; initial: Answers | null }
  | { name: "schedule"; id: string };

export function App() {
  const [mounted, setMounted] = useState(false);
  const [schedules, setSchedules] = useState<SavedSchedule[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [view, setView] = useState<View>({ name: "lobby" });

  // Load persisted data on first mount (browser only).
  useEffect(() => {
    setSchedules(loadSchedules());
    setFolders(loadFolders());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) saveSchedules(schedules);
  }, [schedules, mounted]);
  useEffect(() => {
    if (mounted) saveFolders(folders);
  }, [folders, mounted]);

  // Avoid hydration mismatch: render nothing until localStorage is read.
  if (!mounted) return null;

  function completeSurvey(answers: Answers) {
    if (view.name === "survey" && view.editingId) {
      const id = view.editingId;
      setSchedules((list) =>
        list.map((s) => (s.id === id ? { ...s, answers } : s)),
      );
      setView({ name: "schedule", id });
    } else {
      const schedule: SavedSchedule = {
        id: genId(),
        title: defaultTitle(answers),
        createdAt: Date.now(),
        answers,
        folderId: null,
      };
      setSchedules((list) => [...list, schedule]);
      setView({ name: "schedule", id: schedule.id });
    }
  }

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
    return (
      <ScheduleGrid
        week={generateWeek(schedule.answers)}
        title={schedule.title}
        onBack={() => setView({ name: "lobby" })}
        onEdit={() =>
          setView({
            name: "survey",
            editingId: schedule.id,
            initial: schedule.answers,
          })
        }
      />
    );
  }

  return (
    <Lobby
      schedules={schedules}
      folders={folders}
      onNew={() => setView({ name: "survey", editingId: null, initial: null })}
      onOpen={(id) => setView({ name: "schedule", id })}
      onDelete={(id) =>
        setSchedules((list) => list.filter((s) => s.id !== id))
      }
      onRename={(id, title) =>
        setSchedules((list) =>
          list.map((s) => (s.id === id ? { ...s, title } : s)),
        )
      }
      onMove={(id, folderId) =>
        setSchedules((list) =>
          list.map((s) => (s.id === id ? { ...s, folderId } : s)),
        )
      }
      onAddFolder={(name) =>
        setFolders((list) => [
          ...list,
          { id: genId(), name, createdAt: Date.now() },
        ])
      }
      onDeleteFolder={(id) => {
        setFolders((list) => list.filter((f) => f.id !== id));
        // Detach schedules from the removed folder.
        setSchedules((list) =>
          list.map((s) => (s.folderId === id ? { ...s, folderId: null } : s)),
        );
      }}
    />
  );
}
