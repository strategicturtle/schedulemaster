"use client";

import { useMemo, useState } from "react";
import type { Folder, SavedSchedule } from "@/lib/storage";

const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export function Lobby({
  schedules,
  folders,
  onNew,
  onOpen,
  onDelete,
  onRename,
  onMove,
  onAddFolder,
  onDeleteFolder,
}: {
  schedules: SavedSchedule[];
  folders: Folder[];
  onNew: () => void;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onMove: (id: string, folderId: string | null) => void;
  onAddFolder: (name: string) => void;
  onDeleteFolder: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [showFolders, setShowFolders] = useState(false);
  const [showHowTo, setShowHowTo] = useState(false);
  const [addingFolder, setAddingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [folderFilter, setFolderFilter] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return schedules
      .filter((s) => (folderFilter ? s.folderId === folderFilter : true))
      .filter((s) => (q ? s.title.toLowerCase().includes(q) : true))
      .sort((a, b) => b.createdAt - a.createdAt); // newest first
  }, [schedules, search, folderFilter]);

  function submitFolder() {
    const name = newFolderName.trim();
    if (name) onAddFolder(name);
    setNewFolderName("");
    setAddingFolder(false);
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-6 sm:py-8">
      <header className="flex flex-col gap-0.5">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
          ScheduleMaster
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Your schedules
        </p>
      </header>

      {/* Search + new */}
      <div className="flex items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search schedules…"
          aria-label="Search schedules"
          className="h-11 flex-1 rounded-lg border border-black/[.1] bg-transparent px-3 text-base outline-none focus:border-zinc-400 dark:border-white/[.15]"
        />
        <button
          type="button"
          onClick={onNew}
          aria-label="New schedule"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-2xl leading-none text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          +
        </button>
      </div>

      {/* Three buttons */}
      <div className="flex flex-wrap gap-2">
        <ToolButton onClick={() => setShowHowTo(true)}>How to use</ToolButton>
        <ToolButton
          onClick={() => {
            setAddingFolder((v) => !v);
            setShowFolders(true);
          }}
        >
          New folder
        </ToolButton>
        <ToolButton
          active={showFolders}
          onClick={() => setShowFolders((v) => !v)}
        >
          Folders
        </ToolButton>
      </div>

      {/* Folders panel */}
      {showFolders && (
        <div className="flex flex-col gap-2 rounded-xl border border-black/[.08] p-3 dark:border-white/[.1]">
          {addingFolder && (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitFolder()}
                placeholder="Folder name"
                className="h-9 flex-1 rounded-md border border-black/[.1] bg-transparent px-2 text-sm outline-none focus:border-zinc-400 dark:border-white/[.15]"
              />
              <button
                type="button"
                onClick={submitFolder}
                className="h-9 rounded-md bg-zinc-900 px-3 text-sm font-medium text-white dark:bg-white dark:text-zinc-900"
              >
                Add
              </button>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <FilterChip
              active={folderFilter === null}
              onClick={() => setFolderFilter(null)}
            >
              All ({schedules.length})
            </FilterChip>
            {folders.map((f) => {
              const count = schedules.filter((s) => s.folderId === f.id).length;
              return (
                <span key={f.id} className="flex items-center">
                  <FilterChip
                    active={folderFilter === f.id}
                    onClick={() => setFolderFilter(f.id)}
                  >
                    📁 {f.name} ({count})
                  </FilterChip>
                  <button
                    type="button"
                    onClick={() => {
                      if (folderFilter === f.id) setFolderFilter(null);
                      onDeleteFolder(f.id);
                    }}
                    aria-label={`Delete folder ${f.name}`}
                    className="px-1 text-xs text-zinc-300 hover:text-red-500"
                  >
                    ✕
                  </button>
                </span>
              );
            })}
            {folders.length === 0 && !addingFolder && (
              <span className="text-xs text-zinc-400">
                No folders yet — tap “New folder”.
              </span>
            )}
          </div>
        </div>
      )}

      {/* Schedule list */}
      <section className="flex flex-col gap-2">
        {visible.length === 0 ? (
          <div className="rounded-xl border border-dashed border-black/[.12] p-8 text-center text-sm text-zinc-400 dark:border-white/[.15]">
            {schedules.length === 0
              ? "No schedules yet. Tap + to create your first one."
              : "No schedules match."}
          </div>
        ) : (
          visible.map((s) => (
            <article
              key={s.id}
              className="flex items-center gap-3 rounded-xl border border-black/[.08] bg-white/60 p-3 dark:border-white/[.1] dark:bg-zinc-900/40"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                {renamingId === s.id ? (
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={() => {
                      onRename(s.id, renameValue.trim() || s.title);
                      setRenamingId(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        onRename(s.id, renameValue.trim() || s.title);
                        setRenamingId(null);
                      }
                    }}
                    className="h-8 rounded-md border border-black/[.1] bg-transparent px-2 text-sm outline-none focus:border-zinc-400 dark:border-white/[.15]"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => onOpen(s.id)}
                    className="truncate text-left font-medium hover:underline"
                  >
                    {s.title}
                  </button>
                )}
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <span>{dateFmt.format(s.createdAt)}</span>
                  {/* Move-to-folder */}
                  <select
                    value={s.folderId ?? ""}
                    onChange={(e) => onMove(s.id, e.target.value || null)}
                    aria-label="Move to folder"
                    className="rounded border border-black/[.1] bg-transparent px-1 py-0.5 text-xs text-zinc-500 outline-none dark:border-white/[.15]"
                  >
                    <option value="">No folder</option>
                    {folders.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setRenamingId(s.id);
                  setRenameValue(s.title);
                }}
                aria-label="Rename"
                className="rounded-md px-2 py-1 text-sm text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              >
                ✏️
              </button>
              <button
                type="button"
                onClick={() => onDelete(s.id)}
                aria-label="Delete schedule"
                className="rounded-md px-2 py-1 text-sm text-zinc-400 hover:text-red-600"
              >
                🗑
              </button>
            </article>
          ))
        )}
      </section>

      {showHowTo && <HowTo onClose={() => setShowHowTo(false)} />}
    </main>
  );
}

function ToolButton({
  children,
  onClick,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-9 rounded-lg border px-3 text-sm font-medium transition-colors ${
        active
          ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900"
          : "border-black/[.1] text-zinc-600 hover:border-zinc-400 dark:border-white/[.15] dark:text-zinc-300"
      }`}
    >
      {children}
    </button>
  );
}

function FilterChip({
  children,
  onClick,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
          : "bg-black/[.05] text-zinc-600 hover:bg-black/[.1] dark:bg-white/[.08] dark:text-zinc-300"
      }`}
    >
      {children}
    </button>
  );
}

function HowTo({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-md flex-col gap-3 overflow-y-auto rounded-2xl bg-white p-5 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold">How to use ScheduleMaster</h2>
        <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm text-zinc-600 dark:text-zinc-300">
          <li>Tap the + button to start a new schedule survey.</li>
          <li>
            Fill in the blanks: fixed-time programs, flexible programs, and your
            wants. Use Tab to move between blanks.
          </li>
          <li>Pick how busy you want your week, then press Done.</li>
          <li>
            ScheduleManager builds your week — fixed items stay put, and it fits
            flexible items and wants into the best slots.
          </li>
          <li>
            Back here in the lobby, search your schedules, rename them, and use
            folders to organize.
          </li>
        </ol>
        <button
          type="button"
          onClick={onClose}
          className="mt-1 h-10 rounded-lg bg-zinc-900 text-sm font-medium text-white dark:bg-white dark:text-zinc-900"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
