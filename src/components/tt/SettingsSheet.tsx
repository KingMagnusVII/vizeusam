import { useRef, useState } from "react";
import { Check, Download, Image as ImageIcon, Moon, Pencil, Plus, Sun, Trash2, Upload, Waves, Palette } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { download, parseImport, toCsv, type ThemeName } from "@/lib/timetable";
import { isCurrentUserTimetableAdmin, publishCloudTimetable } from "@/lib/cloud-timetable-safe";
import { supabase } from "@/integrations/supabase/client";
import { useTimetable } from "@/lib/use-timetable";
import { cn } from "@/lib/utils";
import type { ConfirmState } from "./ConfirmDialog";

import wallpaperNight from "@/assets/wallpaper-night.jpg";
import wallpaperClouds from "@/assets/wallpaper-clouds.jpg";
import wallpaperOcean from "@/assets/wallpaper-ocean.jpg";
import wallpaperNeon from "@/assets/wallpaper-neon.jpg";

export const WALLPAPERS = [wallpaperNight, wallpaperClouds, wallpaperOcean, wallpaperNeon];

const THEMES: { id: ThemeName; label: string; Icon: typeof Sun }[] = [
  { id: "light", label: "Light", Icon: Sun },
  { id: "dark", label: "Dark", Icon: Moon },
  { id: "ocean", label: "Ocean", Icon: Waves },
  { id: "wallpaper", label: "Wallpaper", Icon: ImageIcon },
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
  const { theme, wallpaper, opacity, primaryColor } = state.settings;
  const fileRef = useRef<HTMLInputElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [note, setNote] = useState("");
  const bgRef = useRef<HTMLInputElement>(null);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [admin, setAdmin] = useState(false);
  const [adminNote, setAdminNote] = useState("");

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
              value={state.people[0]!.name}
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
                  <t.Icon className="size-4" />
                  {t.label}
                </button>
              ))}
            </div>
          </Section>

          <Section title="Accent colour">
            <div className="flex items-center gap-3">
              <input
                aria-label="Accent colour"
                type="color"
                value={primaryColor}
                onChange={(e) => updateSettings({ primaryColor: e.target.value })}
                className="size-12 cursor-pointer rounded-xl border-0 bg-transparent p-0"
              />
              <Input
                value={primaryColor}
                onChange={(e) => {
                  const v = e.target.value;
                  if (/^#[0-9a-fA-F]{0,6}$/.test(v)) updateSettings({ primaryColor: v });
                }}
                onBlur={() => {
                  if (!/^#[0-9a-fA-F]{6}$/.test(primaryColor)) updateSettings({ primaryColor: "#a78bfa" });
                }}
                placeholder="#a78bfa"
                className="h-12 flex-1 rounded-2xl font-mono"
              />
            </div>
            <div className="grid grid-cols-6 gap-2">
              {[
                "#ef4444",
                "#f97316",
                "#fbbf24",
                "#22c55e",
                "#34d399",
                "#2dd4bf",
                "#06b6d4",
                "#38bdf8",
                "#a78bfa",
                "#f472b6",
                "#fb7185",
                "#ffffff",
              ].map((c) => (
                <button
                  key={c}
                  aria-label={c}
                  onClick={() => updateSettings({ primaryColor: c })}
                  className={cn(
                    "size-8 rounded-full border-2",
                    primaryColor.toLowerCase() === c.toLowerCase() ? "border-foreground" : "border-transparent",
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">Changes the selected/primary UI colour without changing the existing visual design.</p>
          </Section>

          {theme === "wallpaper" && (
            <>
              <Section title="Custom background">
                <Button variant="secondary" className="w-full rounded-2xl" onClick={() => bgRef.current?.click()}>
                  <Upload className="size-4" /> Import picture from device
                </Button>
                <p className="text-[11px] text-muted-foreground">The picture is stored locally on this device and remains available offline.</p>
              </Section>
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
                  onValueChange={([v]) => updateSettings({ opacity: v! })}
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

          <Section title="Cloud timetable">
            {!admin ? (
              <div className="space-y-2">
                <Input type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="Admin email" className="rounded-2xl" />
                <Input type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} placeholder="Admin password" className="rounded-2xl" />
                <Button
                  className="w-full rounded-2xl"
                  onClick={async () => {
                    setAdminNote("Signing in…");
                    const { error } = await supabase.auth.signInWithPassword({ email: adminEmail, password: adminPassword });
                    if (error) { setAdminNote(error.message); return; }
                    const ok = await isCurrentUserTimetableAdmin();
                    setAdmin(ok);
                    setAdminNote(ok ? "Admin access enabled." : "This account is not an approved timetable admin.");
                  }}
                >Admin sign in</Button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">You are signed in as a timetable admin. Local changes can be reviewed here and published to every connected device.</p>
                <Button
                  className="w-full rounded-2xl"
                  onClick={async () => {
                    try {
                      const current = Number(localStorage.getItem("timetable-cloud-version-v1") ?? "0");
                      const result = await publishCloudTimetable(schedule?.classes ?? [], schedule?.dayInfo ?? {}, current);
                      localStorage.setItem("timetable-cloud-version-v1", String(result.version));
                      setAdminNote(`Published timetable v${result.version}.`);
                    } catch (e) {
                      setAdminNote(e instanceof Error ? e.message : "Could not publish timetable.");
                    }
                  }}
                >Publish timetable</Button>
                <Button variant="secondary" className="w-full rounded-2xl" onClick={async () => { await supabase.auth.signOut(); setAdmin(false); setAdminNote("Signed out."); }}>Sign out admin</Button>
              </div>
            )}
            {adminNote && <p className="text-xs text-primary">{adminNote}</p>}
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
