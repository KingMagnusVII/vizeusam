import { useRef, useState } from "react";
import { Check, Download, Image as ImageIcon, Moon, Pencil, Plus, Sun, Trash2, Upload, Waves } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { download, parseImport, toCsv, type ThemeName } from "@/lib/timetable";
import { useTimetable } from "@/lib/use-timetable";
import { cn } from "@/lib/utils";
import type { ConfirmState } from "./ConfirmDialog";
import { CropImageDialog } from "./CropImageDialog";

import wallpaperNight from "@/assets/wallpaper-night.jpg";
import wallpaperOcean from "@/assets/wallpaper-ocean.jpg";
import wallpaperNeon from "@/assets/wallpaper-neon.jpg";

export const WALLPAPERS = [wallpaperNight, wallpaperOcean, wallpaperNeon];

const THEMES: { id: ThemeName; label: string; Icon: typeof Sun }[] = [
  { id: "light", label: "Light", Icon: Sun },
  { id: "dark", label: "Dark", Icon: Moon },
  { id: "ocean", label: "Ocean", Icon: Waves },
  { id: "wallpaper", label: "Wallpaper", Icon: ImageIcon },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">{title}</p>
      {children}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn("grid size-5 shrink-0 place-items-center rounded-full border-2 p-0.5 transition-colors", checked ? "border-primary bg-transparent" : "border-muted-foreground/45 bg-transparent")}
    >
      {checked && <span className="size-3 rounded-full bg-primary" />}
    </button>
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
    updateDayInfo,
  } = useTimetable();
  const { theme, wallpaper, opacity, primaryColor, use24HourTime, showDayCoordinators, appName, appIcon } = state.settings;
  const fileRef = useRef<HTMLInputElement>(null);
  const bgRef = useRef<HTMLInputElement>(null);
  const iconRef = useRef<HTMLInputElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [note, setNote] = useState("");
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [cropMode, setCropMode] = useState<"wallpaper" | "icon" | null>(null);
  const importMode = useRef<"merge" | "replace">("merge");
  const schedule = person.schedules.find((s) => s.id === person.activeScheduleId);

  const openCrop = (file: File, mode: "wallpaper" | "icon") => {
    setCropMode(mode);
    setCropFile(file);
  };

  const onFile = async (file: File, mode: "merge" | "replace") => {
    try {
      const { classes, dayInfo } = parseImport(file.name, await file.text());
      if (!classes.length && !dayInfo) throw new Error("No timetable data found in that file.");
      if (mode === "replace") replaceClasses(person.id, classes);
      else if (classes.length) appendClasses(person.id, classes);
      if (dayInfo) Object.entries(dayInfo).forEach(([day, info]) => info && updateDayInfo(person.id, Number(day), info));
      const coordinatorCount = dayInfo ? Object.keys(dayInfo).length : 0;
      setNote(`Imported ${classes.length} classes${coordinatorCount ? ` and ${coordinatorCount} coordinator day${coordinatorCount === 1 ? "" : "s"}` : ""}.`);
    } catch (e) {
      setNote(e instanceof Error ? e.message : "Could not read that file.");
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="mx-auto max-h-[92svh] max-w-md overflow-y-auto rounded-t-3xl">
          <SheetHeader className="flex-row items-center justify-between space-y-0"><SheetTitle>Settings</SheetTitle></SheetHeader>

          <div className="space-y-6 px-4 pb-8">
            <Section title="General">
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-2xl border border-border px-4 py-3">
                  <div className="min-w-0 pr-3">
                    <p className="text-sm font-semibold">Show 24-hour time</p>
                    <p className="text-[11px] text-muted-foreground">Use 24-hour times instead of AM/PM.</p>
                  </div>
                  <Toggle checked={use24HourTime} onChange={(value) => updateSettings({ use24HourTime: value })} />
                </div>
                <Input value={state.people[0]!.name} onChange={(e) => renamePerson("me", e.target.value)} placeholder="Your name" className="h-12 rounded-2xl" />
                <div className="flex items-center justify-between rounded-2xl border border-border px-4 py-3">
                  <div className="min-w-0 pr-3">
                    <p className="text-sm font-semibold">Show Date Co-ordinators</p>
                    <p className="text-[11px] text-muted-foreground">Show the coordinator block above the day&apos;s classes.</p>
                  </div>
                  <Toggle checked={showDayCoordinators} onChange={(value) => updateSettings({ showDayCoordinators: value })} />
                </div>
              </div>
            </Section>

            <Section title="Themes">
              <div className="grid grid-cols-2 gap-3">
                {THEMES.map((t) => (
                  <button key={t.id} onClick={() => updateSettings({ theme: t.id })} className={cn("flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold", theme === t.id ? "bg-primary text-primary-foreground" : "bg-muted text-foreground")}>
                    <t.Icon className="size-4" />{t.label}
                  </button>
                ))}
              </div>
            </Section>

            <Section title="Accent">
              <div className="flex items-center gap-3">
                <input aria-label="Accent colour" type="color" value={primaryColor} onChange={(e) => updateSettings({ primaryColor: e.target.value })} className="size-12 cursor-pointer rounded-xl border-0 bg-transparent p-0" />
                <Input
                  value={primaryColor}
                  onChange={(e) => { const v = e.target.value; if (/^#[0-9a-fA-F]{0,6}$/.test(v)) updateSettings({ primaryColor: v }); }}
                  onBlur={() => { if (!/^#[0-9a-fA-F]{6}$/.test(primaryColor)) updateSettings({ primaryColor: "#3b82f6" }); }}
                  placeholder="#3b82f6"
                  className="h-12 flex-1 rounded-2xl font-mono"
                />
              </div>
              <div className="grid grid-cols-6 gap-2">
                {["#ef4444","#f97316","#fbbf24","#22c55e","#34d399","#2dd4bf","#06b6d4","#38bdf8","#3b82f6","#a78bfa","#f472b6","#ffffff"].map((c) => (
                  <button key={c} aria-label={c} onClick={() => updateSettings({ primaryColor: c })} className={cn("size-8 rounded-full border-2", primaryColor.toLowerCase() === c ? "border-foreground" : "border-transparent")} style={{ backgroundColor: c }} />
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
                        className={cn("relative aspect-9/16 overflow-hidden rounded-xl border-2", wallpaper === w ? "border-primary" : "border-transparent")}
                      >
                        <img src={w} alt="" loading="lazy" className="size-full object-cover" />
                      </button>
                    ))}
                    {(() => {
                      const hasCustomWallpaper = wallpaper.startsWith("data:image/");
                      return hasCustomWallpaper ? (
                        <div className="relative aspect-9/16 overflow-hidden rounded-xl border-2 border-primary">
                          <img src={wallpaper} alt="Custom wallpaper" className="size-full object-cover" />
                          <button
                            type="button"
                            aria-label="Delete custom wallpaper"
                            onClick={() => updateSettings({ wallpaper: "" , theme: "dark" })}
                            className="absolute right-1 top-1 grid size-7 place-items-center rounded-full bg-black/70 text-white backdrop-blur-sm"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          aria-label="Add custom wallpaper"
                          onClick={() => bgRef.current?.click()}
                          className="flex aspect-9/16 items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                        >
                          <Plus className="size-5" />
                        </button>
                      );
                    })()}
                  </div>
                </Section>
                <Section title={`Widget transparency · ${Math.round((1 - opacity) * 100)}%`}>
                  <Slider value={[opacity]} min={0.2} max={1} step={0.05} onValueChange={([v]) => updateSettings({ opacity: v! })} />
                </Section>
              </>
            )}

            <Section title={`Timetables · ${person.id === "me" ? "mine" : person.name}`}>
              <div className="space-y-2">
                {person.schedules.map((s) => (
                  <div key={s.id} className={cn("flex items-center gap-2 rounded-2xl border px-3 py-2", s.id === person.activeScheduleId ? "border-primary bg-primary/10" : "border-border")}>
                    {editingId === s.id ? (
                      <>
                        <Input value={draftName} autoFocus onChange={(e) => setDraftName(e.target.value)} className="h-9 rounded-xl" />
                        <button className="rounded-lg p-1.5 text-primary" onClick={() => { if (draftName.trim()) renameSchedule(person.id, s.id, draftName.trim()); setEditingId(null); }}><Check className="size-4" /></button>
                      </>
                    ) : (
                      <>
                        <button className="flex-1 truncate text-left text-sm font-medium" onClick={() => setActiveSchedule(person.id, s.id)}>
                          {s.name}<span className="ml-2 text-xs text-muted-foreground">{s.classes.length} cls</span>
                        </button>
                        <button aria-label="Rename timetable" className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground" onClick={() => { setEditingId(s.id); setDraftName(s.name); }}><Pencil className="size-4" /></button>
                        <button aria-label="Delete timetable" className="rounded-lg p-1.5 text-muted-foreground hover:text-destructive" onClick={() => confirm({ title: `Delete "${s.name}"?`, description: `All ${s.classes.length} classes in this timetable will be removed.`, onConfirm: () => removeSchedule(person.id, s.id) })}><Trash2 className="size-4" /></button>
                      </>
                    )}
                  </div>
                ))}
                <Button variant="secondary" className="w-full rounded-2xl" onClick={() => addSchedule(person.id, `Timetable ${person.schedules.length + 1}`)}><Plus className="size-4" /> New timetable</Button>
              </div>
            </Section>

            <Section title="Import & export">
              <div className="grid grid-cols-2 gap-2">
                <Button variant="secondary" className="rounded-2xl" onClick={() => { importMode.current = "merge"; fileRef.current?.click(); }}><Upload className="size-4" /> Add from file</Button>
                <Button variant="secondary" className="rounded-2xl" onClick={() => { importMode.current = "replace"; fileRef.current?.click(); }}><Upload className="size-4" /> Replace week</Button>
                <Button variant="secondary" className="rounded-2xl" onClick={() => download(`${person.name}-timetable.json`, JSON.stringify({ name: person.name, classes: schedule?.classes ?? [], dayInfo: schedule?.dayInfo ?? {} }, null, 2), "application/json")}><Download className="size-4" /> Export JSON</Button>
                <Button variant="secondary" className="rounded-2xl" onClick={() => download(`${person.name}-timetable.csv`, toCsv(schedule?.classes ?? [], schedule?.dayInfo), "text/csv")}><Download className="size-4" /> Export CSV</Button>
              </div>
              <p className="text-[11px] text-muted-foreground">File columns: day, subject, professor, start, end, room, task, color.</p>
              {note && <p className="text-xs text-primary">{note}</p>}
            </Section>

            <Section title="App">
              <div className="space-y-3">
                <Input value={appName} onChange={(e) => updateSettings({ appName: e.target.value || "My Timetable" })} placeholder="App name" className="h-11 rounded-2xl" />
                <div className="flex items-center justify-between rounded-2xl border border-border px-3 py-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <img src={appIcon} alt="" className="size-12 rounded-xl object-cover" />
                    <div><p className="text-sm font-semibold">App icon</p><p className="text-[11px] text-muted-foreground">Square crop</p></div>
                  </div>
                  <button aria-label="Change app icon" onClick={() => iconRef.current?.click()} className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"><Pencil className="size-4" /></button>
                </div>
              </div>
            </Section>
          </div>

          <input ref={fileRef} type="file" accept=".csv,.json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f, importMode.current); e.target.value = ""; }} />
          <input ref={bgRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) openCrop(f, "wallpaper"); e.target.value = ""; }} />
          <input ref={iconRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) openCrop(f, "icon"); e.target.value = ""; }} />
        </SheetContent>
      </Sheet>

      <CropImageDialog
        open={!!cropMode && !!cropFile}
        file={cropFile}
        aspect={cropMode === "wallpaper" ? 9 / 16 : 1}
        title={cropMode === "wallpaper" ? "Crop wallpaper" : "Crop app icon"}
        onOpenChange={(value) => { if (!value) { setCropMode(null); setCropFile(null); } }}
        onSave={(dataUrl) => {
          if (cropMode === "wallpaper") updateSettings({ wallpaper: dataUrl, customWallpaper: dataUrl, theme: "wallpaper" });
          else updateSettings({ appIcon: dataUrl });
          setCropMode(null);
          setCropFile(null);
        }}
      />
    </>
  );
}
