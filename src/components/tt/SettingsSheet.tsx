import { useRef, useState } from "react";
import { Check, Download, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { download, parseImport, toCsv, type ThemeName } from "@/lib/timetable";
import { useTimetable } from "@/lib/use-timetable";
import { cn } from "@/lib/utils";
import type { ConfirmState } from "./ConfirmDialog";

import wallpaperNight from "@/assets/wallpaper-night.jpg";
import wallpaperClouds from "@/assets/wallpaper-clouds.jpg";
import wallpaperOcean from "@/assets/wallpaper-ocean.jpg";
import wallpaperNeon from "@/assets/wallpaper-neon.jpg";

export const WALLPAPERS = [wallpaperNight, wallpaperClouds, wallpaperOcean, wallpaperNeon];

const THEMES: { id: ThemeName; label: string; emoji: string }[] = [
  { id: "light", label: "Light", emoji: "☀️" },
  { id: "dark", label: "Dark", emoji: "🌙" },
  { id: "ocean", label: "Ocean", emoji: "🌊" },
  { id: "wallpaper", label: "Wallpaper", emoji: "🖼️" },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
        {title}
      </p>
      {children}
    </div>
  );
}

export function SettingsSheet({
  open,
  onOpenChange,
  confirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  confirm: (s: ConfirmState) => void;
}) {
  const {
    state,
    person,
    renamePerson,
    updateSettings,
    addSchedule,
    renameSchedule,
    removeSchedule,
    setActiveSchedule,
    appendClasses,
    replaceClasses,
  } = useTimetable();
  const { theme, wallpaper, opacity } = state.settings;
  const fileRef = useRef<HTMLInputElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [note, setNote] = useState("");

  const schedule = person.schedules.find((s) => s.id === person.activeScheduleId);

  const onFile = async (file: File, mode: "merge" | "replace") => {
    try {
      const { classes } = parseImport(file.name, await file.text());
      if (!classes.length) throw new Error("No classes found in that file.");
      if (mode === "replace") replaceClasses(person.id, classes);
      else appendClasses(person.id, classes);
      setNote(`Imported ${classes.length} classes.`);
    } catch (e) {
      setNote(e instanceof Error ? e.message : "Could not read that file.");
    }
  };
  const importMode = useRef<"merge" | "replace">("merge");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="mx-auto max-h-[92svh] max-w-md overflow-y-auto rounded-t-3xl">
        <SheetHeader className="flex-row items-center justify-between space-y-0">
          <SheetTitle>Settings</SheetTitle>
          <Button variant="secondary" size="sm" className="rounded-full" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </SheetHeader>

        <div className="space-y-6 px-4 pb-8">
          <Section title="Your name">
            <Input
              value={state.people[0].name}
              onChange={(e) => renamePerson("me", e.target.value)}
              className="h-12 rounded-2xl"
            />
          </Section>

          <Section title="Theme">
            <div className="grid grid-cols-2 gap-3">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => updateSettings({ theme: t.id })}
                  className={cn(
                    "flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold",
                    theme === t.id ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
                  )}
                >
                  <span>{t.emoji}</span>
                  {t.label}
                </button>
              ))}
            </div>
          </Section>

          {theme === "wallpaper" && (
            <>
              <Section title="Wallpaper">
                <div className="grid grid-cols-4 gap-2">
                  {WALLPAPERS.map((w) => (
                    <button
                      key={w}
                      onClick={() => updateSettings({ wallpaper: w })}
                      className={cn(
                        "aspect-9/16 overflow-hidden rounded-xl border-2",
                        wallpaper === w ? "border-primary" : "border-transparent",
                      )}
                    >
                      <img src={w} alt="" loading="lazy" className="size-full object-cover" />
                    </button>
                  ))}
                </div>
              </Section>
              <Section title={`Widget transparency · ${Math.round((1 - opacity) * 100)}%`}>
                <Slider
                  value={[opacity]}
                  min={0.2}
                  max={1}
                  step={0.05}
                  onValueChange={([v]) => updateSettings({ opacity: v })}
                />
              </Section>
            </>
          )}

          <Section title={`Timetables · ${person.id === "me" ? "mine" : person.name}`}>
            <div className="space-y-2">
              {person.schedules.map((s) => (
                <div
                  key={s.id}
                  className={cn(
                    "flex items-center gap-2 rounded-2xl border px-3 py-2",
                    s.id === person.activeScheduleId ? "border-primary bg-primary/10" : "border-border",
                  )}
                >
                  {editingId === s.id ? (
                    <>
                      <Input
                        value={draftName}
                        autoFocus
                        onChange={(e) => setDraftName(e.target.value)}
                        className="h-9 rounded-xl"
                      />
                      <button
                        className="rounded-lg p-1.5 text-primary"
                        onClick={() => {
                          if (draftName.trim()) renameSchedule(person.id, s.id, draftName.trim());
                          setEditingId(null);
                        }}
                      >
                        <Check className="size-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className="flex-1 truncate text-left text-sm font-medium"
                        onClick={() => setActiveSchedule(person.id, s.id)}
                      >
                        {s.name}
                        <span className="ml-2 text-xs text-muted-foreground">{s.classes.length} cls</span>
                      </button>
                      <button
                        aria-label="Rename timetable"
                        className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          setEditingId(s.id);
                          setDraftName(s.name);
                        }}
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        aria-label="Delete timetable"
                        className="rounded-lg p-1.5 text-muted-foreground hover:text-destructive"
                        onClick={() =>
                          confirm({
                            title: `Delete "${s.name}"?`,
                            description: `All ${s.classes.length} classes in this timetable will be removed.`,
                            onConfirm: () => removeSchedule(person.id, s.id),
                          })
                        }
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </>
                  )}
                </div>
              ))}
              <Button
                variant="secondary"
                className="w-full rounded-2xl"
                onClick={() => addSchedule(person.id, `Timetable ${person.schedules.length + 1}`)}
              >
                <Plus className="size-4" /> New timetable
              </Button>
            </div>
          </Section>

          <Section title="Import & export">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="secondary"
                className="rounded-2xl"
                onClick={() => {
                  importMode.current = "merge";
                  fileRef.current?.click();
                }}
              >
                <Upload className="size-4" /> Add from file
              </Button>
              <Button
                variant="secondary"
                className="rounded-2xl"
                onClick={() => {
                  importMode.current = "replace";
                  fileRef.current?.click();
                }}
              >
                <Upload className="size-4" /> Replace week
              </Button>
              <Button
                variant="secondary"
                className="rounded-2xl"
                onClick={() =>
                  download(
                    `${person.name}-timetable.json`,
                    JSON.stringify({ name: person.name, classes: schedule?.classes ?? [] }, null, 2),
                    "application/json",
                  )
                }
              >
                <Download className="size-4" /> Export JSON
              </Button>
              <Button
                variant="secondary"
                className="rounded-2xl"
                onClick={() =>
                  download(`${person.name}-timetable.csv`, toCsv(schedule?.classes ?? []), "text/csv")
                }
              >
                <Download className="size-4" /> Export CSV
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              File columns: day, subject, professor, start, end, room, task, color.
            </p>
            {note && <p className="text-xs text-primary">{note}</p>}
          </Section>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept=".csv,.json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f, importMode.current);
            e.target.value = "";
          }}
        />
      </SheetContent>
    </Sheet>
  );
}
