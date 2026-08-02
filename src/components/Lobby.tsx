"use client";

import { useEffect, useMemo, useState } from "react";
import { changePassword, type Folder, type SavedSchedule } from "@/lib/storage";
import { Mascot } from "@/components/Mascot";
import { PasswordInput } from "@/components/PasswordInput";
import { LanguageSwitcher, ThemeToggle, useI18n } from "@/lib/i18n";
import { Tour, type TourStep } from "@/components/Tour";

const TOUR_STEPS: TourStep[] = [
  { target: "howto", textKey: "tour.howto" },
  { target: "new", textKey: "tour.new" },
  { target: "newFolder", textKey: "tour.newFolder" },
  { target: "folders", textKey: "tour.folders" },
  { target: "search", textKey: "tour.search" },
  { target: "lang", textKey: "tour.lang" },
  { target: "logout", textKey: "tour.logout" },
  { target: "quit", textKey: "tour.quit" },
];

// Deterministic colorful banner gradient per schedule (Classroom-style).
// Vivid three-stop gradients so each card pops.
const BANNERS = [
  "from-rose-500 via-red-500 to-orange-400",
  "from-amber-400 via-orange-500 to-pink-500",
  "from-emerald-500 via-teal-500 to-cyan-400",
  "from-sky-500 via-blue-600 to-indigo-600",
  "from-violet-600 via-purple-500 to-fuchsia-500",
  "from-fuchsia-500 via-pink-500 to-rose-500",
  "from-lime-400 via-green-500 to-emerald-500",
  "from-indigo-500 via-violet-500 to-purple-600",
  "from-cyan-400 via-sky-500 to-blue-600",
  "from-orange-500 via-amber-500 to-yellow-400",
  "from-pink-500 via-fuchsia-500 to-violet-600",
  "from-teal-400 via-emerald-500 to-green-600",
];

function bannerFor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return BANNERS[Math.abs(h) % BANNERS.length];
}

export function Lobby({
  username,
  schedules,
  folders,
  visits,
  onLogout,
  onDeleteAccount,
  onNew,
  onNewBlank,
  onOpen,
  onDelete,
  onRename,
  onDuplicate,
  onMove,
  onAddFolder,
  onDeleteFolder,
}: {
  username: string;
  schedules: SavedSchedule[];
  folders: Folder[];
  visits?: number | null;
  onLogout: () => void;
  onDeleteAccount: () => void;
  onNew: () => void;
  /** Create a blank schedule and build it by hand (no ScheduleManager). */
  onNewBlank: () => void;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onDuplicate: (id: string) => void;
  onMove: (id: string, folderId: string | null) => void;
  onAddFolder: (name: string) => void;
  onDeleteFolder: (id: string) => void;
}) {
  const { t, locale } = useI18n();
  const dateFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }),
    [locale],
  );
  const [search, setSearch] = useState("");
  const [showFolders, setShowFolders] = useState(false);
  const [showHowTo, setShowHowTo] = useState(false);
  const [confirmQuit, setConfirmQuit] = useState(false);
  const [showChangePw, setShowChangePw] = useState(false);
  const [showTour, setShowTour] = useState(false);

  // Show the first-run tour once, right after signup.
  useEffect(() => {
    try {
      if (localStorage.getItem("sm_tour") === "pending") setShowTour(true);
    } catch {
      /* ignore */
    }
  }, []);
  const endTour = () => {
    setShowTour(false);
    try {
      localStorage.setItem("sm_tour", "done");
    } catch {
      /* ignore */
    }
  };
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
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-4 py-6 sm:py-8">
      <header className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <Mascot size={44} className="shrink-0" />
          <div className="flex flex-col gap-0.5">
            <h1 className="brand-gradient text-xl font-bold tracking-tight sm:text-2xl">
              ScheduleMaster
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {t("lobby.signedInAs", { name: username })}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <span data-tour="lang">
              <LanguageSwitcher />
            </span>
          </div>
          <button
            type="button"
            data-tour="logout"
            onClick={onLogout}
            className="h-9 rounded-lg border border-black/[.1] px-3 text-sm font-medium text-zinc-600 transition-colors hover:border-zinc-400 dark:border-white/[.15] dark:text-zinc-300"
          >
            {t("lobby.logout")}
          </button>
          <button
            type="button"
            onClick={() => setShowChangePw(true)}
            className="h-8 rounded-lg px-3 text-xs font-medium text-zinc-500 transition-colors hover:text-indigo-600 dark:text-zinc-400 dark:hover:text-indigo-300"
          >
            {t("pw.title")}
          </button>
          <button
            type="button"
            data-tour="quit"
            onClick={() => setConfirmQuit(true)}
            className="h-9 rounded-lg px-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
          >
            {t("lobby.quit")}
          </button>
        </div>
      </header>

      {/* Search + new */}
      <div className="flex items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("lobby.search")}
          aria-label={t("lobby.search")}
          data-tour="search"
          className="h-11 flex-1 rounded-lg border border-black/[.1] bg-transparent px-3 text-base outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-white/[.15]"
        />
        <button
          type="button"
          onClick={onNew}
          aria-label={t("lobby.new")}
          data-tour="new"
          className="btn-primary flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-2xl leading-none"
        >
          +
        </button>
      </div>

      {/* Three buttons */}
      <div className="flex flex-wrap gap-2">
        <ToolButton
          dataTour="newBlank"
          title={t("lobby.blankTip")}
          onClick={onNewBlank}
        >
          ✏️ {t("lobby.newBlank")}
        </ToolButton>
        <ToolButton dataTour="howto" onClick={() => setShowHowTo(true)}>
          {t("lobby.howto")}
        </ToolButton>
        <ToolButton
          dataTour="newFolder"
          onClick={() => {
            setAddingFolder((v) => !v);
            setShowFolders(true);
          }}
        >
          {t("lobby.newFolder")}
        </ToolButton>
        <ToolButton
          dataTour="folders"
          active={showFolders}
          onClick={() => setShowFolders((v) => !v)}
        >
          {t("lobby.folders")}
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
                placeholder={t("lobby.folderName")}
                className="h-9 flex-1 rounded-md border border-black/[.1] bg-transparent px-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-white/[.15]"
              />
              <button
                type="button"
                onClick={submitFolder}
                className="btn-primary h-9 rounded-md px-3 text-sm font-medium"
              >
                {t("lobby.add")}
              </button>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <FilterChip
              active={folderFilter === null}
              onClick={() => setFolderFilter(null)}
            >
              {t("lobby.all", { n: schedules.length })}
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
                    aria-label={t("lobby.deleteFolder", { name: f.name })}
                    className="px-1 text-xs text-zinc-300 hover:text-red-500"
                  >
                    ✕
                  </button>
                </span>
              );
            })}
            {folders.length === 0 && !addingFolder && (
              <span className="text-xs text-zinc-400">
                {t("lobby.noFolders")}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Schedule grid */}
      <section>
        {visible.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-black/[.12] p-8 text-center text-sm text-zinc-400 dark:border-white/[.15]">
            {schedules.length === 0 && <Mascot size={88} />}
            <p>
              {schedules.length === 0
                ? t("lobby.emptyNew")
                : t("lobby.emptyNoMatch")}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visible.map((s) => {
              const folderName = folders.find(
                (f) => f.id === s.folderId,
              )?.name;
              return (
                <article
                  key={s.id}
                  className="group flex flex-col overflow-hidden rounded-xl border border-black/[.08] bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg hover:ring-2 hover:ring-indigo-300/60 dark:border-white/[.1] dark:bg-zinc-900"
                >
                  {/* Colorful banner */}
                  <button
                    type="button"
                    onClick={() => onOpen(s.id)}
                    className={`relative flex h-28 items-end bg-gradient-to-br p-3 text-left ${bannerFor(
                      s.id,
                    )}`}
                  >
                    <span className="line-clamp-2 text-base font-semibold leading-snug text-white drop-shadow-sm">
                      {s.title}
                    </span>
                  </button>

                  {/* Body */}
                  <div className="flex flex-1 flex-col gap-2 p-3">
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
                        className="h-8 rounded-md border border-black/[.1] bg-transparent px-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-white/[.15]"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => onOpen(s.id)}
                        className="truncate text-left text-sm font-medium hover:underline"
                      >
                        {s.title}
                      </button>
                    )}
                    <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                      <span aria-hidden>🗓</span>
                      <span>{dateFmt.format(s.createdAt)}</span>
                      {folderName && (
                        <span className="truncate">· 📁 {folderName}</span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="mt-auto flex items-center gap-1 pt-1">
                      <select
                        value={s.folderId ?? ""}
                        onChange={(e) => onMove(s.id, e.target.value || null)}
                        aria-label={t("lobby.moveToFolder")}
                        className="mr-auto rounded border border-black/[.1] bg-transparent px-1 py-0.5 text-xs text-zinc-500 outline-none dark:border-white/[.15]"
                      >
                        <option value="">{t("lobby.noFolder")}</option>
                        {folders.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          setRenamingId(s.id);
                          setRenameValue(s.title);
                        }}
                        aria-label={t("lobby.rename")}
                        className="rounded-md px-2 py-1 text-sm text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        onClick={() => onDuplicate(s.id)}
                        aria-label={t("lobby.duplicate")}
                        className="rounded-md px-2 py-1 text-sm text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-300"
                      >
                        📋
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(s.id)}
                        aria-label={t("lobby.deleteSchedule")}
                        className="rounded-md px-2 py-1 text-sm text-zinc-400 hover:text-red-600"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {visits != null && (
        <p className="pt-2 text-center text-xs text-zinc-400">
          🌐 {t("common.entered", { n: visits.toLocaleString(locale) })}
        </p>
      )}

      {showTour && <Tour steps={TOUR_STEPS} onDone={endTour} />}

      {showChangePw && (
        <ChangePassword onClose={() => setShowChangePw(false)} />
      )}
      {showHowTo && <HowTo onClose={() => setShowHowTo(false)} />}
      {confirmQuit && (
        <ConfirmQuit
          onCancel={() => setConfirmQuit(false)}
          onConfirm={() => {
            setConfirmQuit(false);
            onDeleteAccount();
          }}
        />
      )}
    </main>
  );
}

function ToolButton({
  children,
  onClick,
  active,
  dataTour,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  dataTour?: string;
  title?: string;
}) {
  return (
    <button
      type="button"
      data-tour={dataTour}
      title={title}
      onClick={onClick}
      className={`h-9 rounded-lg border px-3 text-sm font-medium transition-colors ${
        active
          ? "btn-primary border-transparent"
          : "border-black/[.1] text-zinc-600 hover:border-indigo-400 hover:text-indigo-600 dark:border-white/[.15] dark:text-zinc-300"
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
          ? "btn-primary"
          : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-white/[.08] dark:text-zinc-300"
      }`}
    >
      {children}
    </button>
  );
}

function ConfirmQuit({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { t } = useI18n();
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onCancel}
    >
      <div
        className="flex w-full max-w-sm flex-col gap-3 rounded-2xl bg-white p-5 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold">{t("quit.title")}</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          {t("quit.body")}
        </p>
        <div className="mt-1 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-10 flex-1 rounded-lg border border-black/[.1] text-sm font-medium text-zinc-600 transition-colors hover:border-zinc-400 dark:border-white/[.15] dark:text-zinc-300"
          >
            {t("quit.cancel")}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="h-10 flex-1 rounded-lg bg-red-600 text-sm font-medium text-white transition-colors hover:bg-red-700"
          >
            {t("quit.confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}

function ChangePassword({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await changePassword(current, next);
      setDone(true);
      setTimeout(onClose, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <form
        onSubmit={submit}
        className="flex w-full max-w-sm flex-col gap-3 rounded-2xl bg-white p-5 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold">{t("pw.title")}</h2>
        {done ? (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            {t("pw.success")}
          </p>
        ) : (
          <>
            <PasswordInput
              autoFocus
              value={current}
              onChange={setCurrent}
              placeholder={t("pw.current")}
              className="h-11 rounded-lg border border-black/[.1] bg-transparent px-3 text-base outline-none focus:border-indigo-500 dark:border-white/[.15]"
            />
            <PasswordInput
              value={next}
              onChange={setNext}
              placeholder={t("pw.new")}
              className="h-11 rounded-lg border border-black/[.1] bg-transparent px-3 text-base outline-none focus:border-indigo-500 dark:border-white/[.15]"
            />
            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
                {error}
              </p>
            )}
            <div className="mt-1 flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="h-10 flex-1 rounded-lg border border-black/[.1] text-sm font-medium text-zinc-600 dark:border-white/[.15] dark:text-zinc-300"
              >
                {t("pw.cancel")}
              </button>
              <button
                type="submit"
                disabled={busy || !current || !next}
                className="btn-primary h-10 flex-1 rounded-lg text-sm font-medium disabled:opacity-40"
              >
                {t("pw.save")}
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}

function HowTo({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-md flex-col gap-3 overflow-y-auto rounded-2xl bg-white p-5 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold">{t("howto.title")}</h2>
        <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm text-zinc-600 marker:font-bold marker:text-indigo-500 dark:text-zinc-300">
          <li>{t("howto.s1")}</li>
          <li>{t("howto.s2")}</li>
          <li>{t("howto.s3")}</li>
          <li>{t("howto.s4")}</li>
          <li>{t("howto.s5")}</li>
        </ol>
        <button
          type="button"
          onClick={onClose}
          className="btn-primary mt-1 h-10 rounded-lg text-sm font-medium"
        >
          {t("howto.got")}
        </button>
      </div>
    </div>
  );
}
