import { prisma } from "@/lib/prisma";
import { createEvent, deleteEvent } from "./actions";
import { Event } from "@/generated/prisma/client";

const dateFmt = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

async function getEvents(): Promise<{ events: Event[]; dbError: boolean }> {
  try {
    const events = await prisma.event.findMany({
      orderBy: { startTime: "asc" },
    });
    return { events, dbError: false };
  } catch {
    return { events: [], dbError: true };
  }
}

export default async function Home() {
  const { events, dbError } = await getEvents();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8 sm:py-12">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          ScheduleMaster
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Plan, track, and manage your events.
        </p>
      </header>

      {dbError && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-700/50 dark:bg-amber-950/40 dark:text-amber-300">
          Database not connected yet. Set <code>DATABASE_URL</code> and run{" "}
          <code>prisma migrate</code> to enable saving events.
        </div>
      )}

      <form
        action={createEvent}
        className="flex flex-col gap-3 rounded-xl border border-black/[.08] bg-white p-4 shadow-sm dark:border-white/[.12] dark:bg-zinc-900"
      >
        <input
          name="title"
          required
          placeholder="Event title"
          className="w-full rounded-lg border border-black/[.1] bg-transparent px-3 py-2 text-base outline-none focus:border-zinc-400 dark:border-white/[.15]"
        />
        <input
          name="location"
          placeholder="Location (optional)"
          className="w-full rounded-lg border border-black/[.1] bg-transparent px-3 py-2 text-base outline-none focus:border-zinc-400 dark:border-white/[.15]"
        />
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="flex flex-1 flex-col gap-1 text-xs text-zinc-500">
            Starts
            <input
              name="startTime"
              type="datetime-local"
              required
              className="w-full rounded-lg border border-black/[.1] bg-transparent px-3 py-2 text-base outline-none focus:border-zinc-400 dark:border-white/[.15]"
            />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-xs text-zinc-500">
            Ends
            <input
              name="endTime"
              type="datetime-local"
              required
              className="w-full rounded-lg border border-black/[.1] bg-transparent px-3 py-2 text-base outline-none focus:border-zinc-400 dark:border-white/[.15]"
            />
          </label>
        </div>
        <button
          type="submit"
          className="mt-1 h-11 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Add event
        </button>
      </form>

      <section className="flex flex-col gap-3">
        {events.length === 0 && !dbError && (
          <p className="py-8 text-center text-sm text-zinc-400">
            No events yet. Add your first one above.
          </p>
        )}
        {events.map((event) => (
          <article
            key={event.id}
            className="flex items-start justify-between gap-3 rounded-xl border border-black/[.08] bg-white p-4 dark:border-white/[.12] dark:bg-zinc-900"
          >
            <div className="flex flex-col gap-1">
              <h2 className="font-medium">{event.title}</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {dateFmt.format(event.startTime)} – {dateFmt.format(event.endTime)}
              </p>
              {event.location && (
                <p className="text-xs text-zinc-400">📍 {event.location}</p>
              )}
            </div>
            <form action={deleteEvent}>
              <input type="hidden" name="id" value={event.id} />
              <button
                type="submit"
                aria-label="Delete event"
                className="rounded-md px-2 py-1 text-sm text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
              >
                Delete
              </button>
            </form>
          </article>
        ))}
      </section>
    </main>
  );
}
