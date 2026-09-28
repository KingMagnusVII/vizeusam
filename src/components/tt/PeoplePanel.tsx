import { memo, useRef, useState } from "react";
import { ChevronUp, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { parseImport } from "@/lib/timetable";
import { useTimetable } from "@/lib/use-timetable";
import { cn } from "@/lib/utils";
import type { ConfirmState } from "./ConfirmDialog";

const initials = (name: string) =>
  name.split(" ").map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();

export const PeoplePanel = memo(function PeoplePanel({ confirm }: { confirm: (s: ConfirmState) => void }) {
  const { state, person, setActivePerson, addPerson, removePerson, renamePerson } = useTimetable();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const onFile = async (file: File) => {
    try {
      const text = await file.text();
      const { name, classes } = parseImport(file.name, text);
      if (!classes.length) throw new Error("No classes found in that file.");
      const friendName = name || file.name.replace(/\.(csv|json)$/i, "");
      const id = addPerson(friendName, classes);
      setActivePerson(id);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read that file.");
    }
  };

  return (
    <div className="panel-strong rounded-t-3xl border-t border-border px-4 pt-3 pb-5">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-2 pb-1 text-left">
        <span className="text-sm font-semibold">Friends&apos; Timetables</span>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{state.people.length - 1}</span>
        <ChevronUp className={cn("ml-auto size-4 text-muted-foreground transition-transform", !open && "rotate-180")} />
      </button>
      {open && (
        <div className="no-scrollbar mt-3 flex gap-3 overflow-x-auto pb-1">
          {state.people.map((p) => {
            const count = (p.schedules.find((s) => s.id === p.activeScheduleId)?.classes ?? []).length;
            const active = p.id === person.id;
            const editing = editingId === p.id;
            return (
              <div key={p.id} className="relative shrink-0">
                <button onClick={() => !editing && setActivePerson(p.id)} className={cn("flex w-20 flex-col items-center gap-1.5 rounded-2xl border p-2 transition-colors", active ? "border-primary bg-primary/10" : "border-border hover:bg-muted/60")}>
                  <span className="grid size-11 place-items-center rounded-full bg-primary/25 text-sm font-semibold text-primary">{p.id === "me" ? "ME" : initials(p.name)}</span>
                  {editing ? (
                    <input autoFocus value={draftName} onChange={(e) => setDraftName(e.target.value)} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => { if (e.key === "Enter" && draftName.trim()) { renamePerson(p.id, draftName.trim()); setEditingId(null); } }} className="w-full rounded-md bg-background px-1 text-center text-[11px] outline-none" />
                  ) : (
                    <span className="w-full truncate text-center text-xs font-semibold">{p.id === "me" ? "Me" : p.name.split(" ")[0]}</span>
                  )}
                  <span className="time-mono text-[10px] text-muted-foreground">{count} cls</span>
                </button>
                {p.id !== "me" && !editing && (
                  <>
                    <button aria-label={"Rename " + p.name} onClick={(e) => { e.stopPropagation(); setDraftName(p.name); setEditingId(p.id); }} className="absolute -top-1 -right-1 rounded-full bg-muted p-1 text-muted-foreground hover:text-foreground"><Pencil className="size-3" /></button>
                    <button aria-label={"Remove " + p.name} onClick={() => confirm({ title: "Remove " + p.name + "?", description: "Their imported timetable will be deleted from this device.", actionLabel: "Remove", onConfirm: () => removePerson(p.id) })} className="absolute -bottom-1 -right-1 rounded-full bg-muted p-1 text-muted-foreground hover:text-destructive"><Trash2 className="size-3" /></button>
                  </>
                )}
                {editing && (
                  <button aria-label="Save friend name" onClick={(e) => { e.stopPropagation(); if (draftName.trim()) renamePerson(p.id, draftName.trim()); setEditingId(null); }} className="absolute -top-1 -right-1 rounded-full bg-primary p-1 text-primary-foreground"><span className="text-[10px] font-bold">✓</span></button>
                )}
              </div>
            );
          })}
          <button onClick={() => fileRef.current?.click()} className="flex w-20 shrink-0 flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-border p-2 text-muted-foreground hover:bg-muted/60"><Plus className="size-5" /><span className="text-xs font-semibold">Add</span><span className="text-[10px]">CSV / JSON</span></button>
        </div>
      )}
      {open && <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground"><Upload className="size-3" /> Import a friend&apos;s timetable file to see their week here.</p>}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
      {open && person.id !== "me" && <Button variant="secondary" size="sm" className="mt-3 w-full rounded-full" onClick={() => setActivePerson("me")}>Back to my timetable</Button>}
      <input ref={fileRef} type="file" accept=".csv,.json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
    </div>
  );
});
