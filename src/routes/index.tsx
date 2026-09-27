import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, CheckSquare, Plus, Settings } from "lucide-react";
import { ClassCard } from "@/components/tt/ClassCard";
import { ClassFormSheet } from "@/components/tt/ClassFormSheet";
import { ConfirmDialog, type ConfirmState } from "@/components/tt/ConfirmDialog";
import { DayStrip } from "@/components/tt/DayStrip";
import { PeoplePanel } from "@/components/tt/PeoplePanel";
import { SettingsSheet } from "@/components/tt/SettingsSheet";
import { TodoPanel } from "@/components/tt/TodoPanel";
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
  component: () => (
    <TimetableProvider>
      <TimetableApp />
    </TimetableProvider>
  ),
});

function TimetableApp() {
  const { state, person, addClass, updateClass, removeClass } = useTimetable();
  const [day, setDay] = useState(todayIndex);
  const [tab, setTab] = useState<"timetable" | "todo">("timetable");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ClassItem | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);

  const { theme, wallpaper, opacity } = state.settings;
  const schedule = activeSchedule(person);
  const classes = sortClasses(schedule.classes.filter((c) => c.day === day));
  const pendingCount = state.todos.filter((t) => !t.done).length;
  const isWallpaper = theme === "wallpaper" && !!wallpaper;

  return (
    <div
      className={cn(
        "app-root flex min-h-svh flex-col",
        theme === "light" ? "theme-light" : theme === "ocean" ? "theme-ocean" : "theme-dark",
      )}
      style={{
        "--panel-opacity": isWallpaper ? opacity : 1,
        backgroundImage: isWallpaper ? `url(${wallpaper})` : undefined,
      } as React.CSSProperties}
    >
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
              {classes.map((c) => (
                <ClassCard
                  key={c.id}
                  item={c}
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
              {classes.length === 0 && (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  No classes on {DAYS[day]} yet.
                </p>
              )}
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
