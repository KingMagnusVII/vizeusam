import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, CheckSquare, Plus, Settings } from "lucide-react";
import { ClassCard } from "@/components/tt/ClassCardV2";
import { ClassFormSheet } from "@/components/tt/ClassFormSheet";
import { ConfirmDialog, type ConfirmState } from "@/components/tt/ConfirmDialog";
import { DayStrip } from "@/components/tt/DayStrip";
import { PeoplePanel } from "@/components/tt/PeoplePanel";
import { SettingsSheet } from "@/components/tt/SettingsSheet";
import { TodoPanel } from "@/components/tt/TodoPanel";
import { DayCoordinatorCard } from "@/components/tt/DayCoordinatorCard";
import {
  DAYS,
  activeSchedule,
  formatToday,
  sortClasses,
  todayIndex,
  type ClassItem,
} from "@/lib/timetable";
import { TimetableProvider, useTimetable } from "@/lib/use-timetable";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "My Timetable — classes, tasks & friends" },
      {
        name: "description",
        content:
          "A phone-style timetable app: browse classes by day, track assignments, import friends' timetables from CSV or JSON, and theme it your way.",
      },
      { property: "og:title", content: "My Timetable — classes, tasks & friends" },
      {
        property: "og:description",
        content:
          "Browse classes by day, track assignments, import timetables from CSV or JSON, and switch between light, dark, ocean and wallpaper themes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TimetableApp,
});

function getClassStatus(item: ClassItem, now: Date): "past" | "current" | "upcoming" {
  const [startHour, startMinute] = item.start.split(":").map(Number);
  const [endHour, endMinute] = item.end.split(":").map(Number);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = startHour * 60 + startMinute;
  const endMinutes = endHour * 60 + endMinute;
  if (currentMinutes >= endMinutes) return "past";
  if (currentMinutes >= startMinutes) return "current";
  return "upcoming";
}

function TimetableApp() {
  return (
    <TimetableProvider>
      <TimetableContent />
    </TimetableProvider>
  );
}

function TimetableContent() {
  const { state, person, addClass, updateClass, removeClass, updateDayInfo } = useTimetable();
  const [day, setDay] = useState(todayIndex);
  const [tab, setTab] = useState<"timetable" | "todo">("timetable");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ClassItem | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);
  const [now, setNow] = useState(() => new Date());

  const { theme, wallpaper, opacity, primaryColor, use24HourTime, showDayCoordinators, appName, appIcon } = state.settings;
  const show24HourTime = use24HourTime ?? true;
  const schedule = useMemo(() => activeSchedule(person), [person]);
  const classes = useMemo(
    () => sortClasses(schedule.classes.filter((c) => c.day === day)),
    [schedule.classes, day],
  );
  const today = todayIndex();
  const pendingCount = useMemo(
    () => state.todos.reduce((count, todo) => count + (todo.done ? 0 : 1), 0),
    [state.todos],
  );

  useEffect(() => {
    // Always land on the current day when the app opens, rather than a previously selected day.
    setDay(today);
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, [today]);

  const lastClassEnd = useMemo(
    () =>
      classes.reduce((latest, item) => {
        const [hour, minute] = item.end.split(":").map(Number);
        return Math.max(latest, hour * 60 + minute);
      }, -1),
    [classes],
  );

  useEffect(() => {
    if (day !== today || lastClassEnd < 0) return;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    if (currentMinutes >= lastClassEnd) {
      setDay((currentDay) => (currentDay + 1) % DAYS.length);
    }
  }, [day, today, lastClassEnd, now]);
  const isWallpaper = theme === "wallpaper" && !!wallpaper;
  const themeClass =
    theme === "light" ? "theme-light" : theme === "ocean" ? "theme-ocean" : "theme-dark";

  // Themes must live on <html> so portalled sheets/dialogs inherit them too.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("theme-light", "theme-dark", "theme-ocean");
    root.classList.add(themeClass, "app-root");
    root.style.setProperty("--panel-opacity", String(isWallpaper ? opacity : 1));
    root.style.setProperty("--primary", primaryColor);
    const hex = primaryColor.replace("#", "");
    const n = Number.parseInt(hex.length === 6 ? hex : "a78bfa", 16);
    const luminance = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
    root.style.setProperty("--primary-foreground", luminance > 0.62 ? "#17131f" : "#ffffff");
    root.style.backgroundImage = isWallpaper ? `url(${wallpaper})` : "";
    root.style.backgroundSize = isWallpaper ? "cover" : "";
    root.style.backgroundPosition = isWallpaper ? "center" : "";
    root.style.backgroundRepeat = isWallpaper ? "no-repeat" : "";
    document.title = appName || "My Timetable";
    const icon = document.querySelector<HTMLLinkElement>("link[rel=\"icon\"]");
    if (icon) icon.href = appIcon || "/app-icons/golden_192x192.png";
    const manifest = document.querySelector<HTMLLinkElement>("link[rel=\"manifest\"]");
    if (manifest) {
      const manifestUrl = URL.createObjectURL(new Blob([JSON.stringify({
        name: appName || "My Timetable",
        short_name: appName || "Timetable",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#000000",
        theme_color: primaryColor,
        icons: [{ src: appIcon || "/app-icons/golden_192x192.png", sizes: "512x512", type: "image/png", purpose: "any maskable" }],
      })], { type: "application/manifest+json" }));
      const previous = manifest.href;
      manifest.href = manifestUrl;
      return () => {
        URL.revokeObjectURL(manifestUrl);
        if (previous.startsWith("blob:")) URL.revokeObjectURL(previous);
      };
    }
  }, [themeClass, isWallpaper, opacity, wallpaper, primaryColor, appName, appIcon]);

  return (
    <div className="flex min-h-svh flex-col">

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        {/* Header */}
        <header className="panel m-3 rounded-3xl border border-border p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground">{formatToday()}</p>
              <h1 className="text-xl font-bold tracking-tight">
                {person.id === "me" ? `${state.people[0]!.name}'s` : `${person.name}'s`} Timetable
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <span className="grid size-7 place-items-center rounded-full bg-destructive/25 text-xs font-semibold text-destructive-foreground">
                {pendingCount}
              </span>
              <button
                aria-label="Settings"
                onClick={() => setSettingsOpen(true)}
                className="grid size-8 place-items-center rounded-full bg-muted text-muted-foreground hover:text-foreground"
              >
                <Settings className="size-4" />
              </button>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-1 rounded-full bg-muted/60 p-1">
            {(
              [
                ["timetable", "Timetable", CalendarDays],
                ["todo", "To-Do", CheckSquare],
              ] as const
            ).map(([id, label, Icon]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-full py-2 text-sm font-semibold transition-colors",
                  tab === id ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                )}
              >
                <Icon className="size-4" />
                {label}
              </button>
            ))}
          </div>

          {tab === "timetable" && (
            <div className="mt-3">
              <DayStrip day={day} onSelect={setDay} classes={schedule.classes} />
            </div>
          )}
        </header>

        {/* Content */}
        <main className="flex-1 space-y-2 px-3 pb-6">
          {tab === "timetable" ? (
            <>
              {showDayCoordinators && classes.length > 0 && (
                <DayCoordinatorCard
                  day={day}
                  info={schedule.dayInfo?.[day]}
                  onSave={(info) => updateDayInfo(person.id, day, info)}
                />
              )}
              {classes.map((c) => (
                <ClassCard
                  key={c.id}
                  item={c}
                  show24HourTime={show24HourTime}
                  status={day === today ? getClassStatus(c, now) : "upcoming"}
                  onEdit={() => {
                    setEditing(c);
                    setFormOpen(true);
                  }}
                  onDelete={() =>
                    setConfirmState({
                      title: `Delete ${c.subject}?`,
                      description: "This class will be removed from this timetable.",
                      onConfirm: () => removeClass(person.id, c.id),
                    })
                  }
                />
              ))}
              {classes.length === 0 ? (
                day === 6 ? (
                  <div className="panel rounded-2xl border border-border p-8 text-center">
                    <div className="text-4xl">🎉</div>
                    <p className="mt-2 text-lg font-bold">No classes today</p>
                    <p className="mt-1 text-sm text-muted-foreground">Enjoy your Sunday!</p>
                  </div>
                ) : (
                  <p className="py-10 text-center text-sm text-muted-foreground">
                    No classes on {DAYS[day]} yet.
                  </p>
                )
              ) : null}
              <button
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
                className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-border py-4 text-sm font-medium text-primary hover:bg-muted/40"
              >
                <Plus className="size-4" /> Add class on {DAYS[day]}
              </button>
            </>
          ) : (
            <TodoPanel />
          )}
        </main>

        <div className="sticky bottom-0">
          <PeoplePanel confirm={setConfirmState} />
        </div>
      </div>

      <ClassFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        day={day}
        initial={editing}
        onSave={(value, id) =>
          id ? updateClass(person.id, { ...value, id }) : addClass(person.id, value)
        }
      />
      <SettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} confirm={setConfirmState} />
      <ConfirmDialog state={confirmState} onOpenChange={(o) => !o && setConfirmState(null)} />
    </div>
  );
}
