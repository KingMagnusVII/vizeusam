import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CLASS_COLORS, DAYS, type ClassItem } from "@/lib/timetable";
import { cn } from "@/lib/utils";

const blank = (day: number): Omit<ClassItem, "id"> => ({
  day,
  subject: "",
  professor: "",
  start: "09:00",
  end: "10:30",
  room: "",
  task: "",
  color: CLASS_COLORS[0]!,
});

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
        {label}
      </span>
      {children}
    </label>
  );
}

export function ClassFormSheet({
  open,
  onOpenChange,
  day,
  initial,
  onSave,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  day: number;
  initial?: ClassItem | null;
  onSave: (value: Omit<ClassItem, "id">, id?: string) => void;
}) {
  const [form, setForm] = useState<Omit<ClassItem, "id">>(blank(day));

  useEffect(() => {
    if (!open) return;
    setForm(initial ? { ...initial } : blank(day));
  }, [open, initial, day]);

  const set = <K extends keyof Omit<ClassItem, "id">>(k: K, v: Omit<ClassItem, "id">[K]) => {
    const next = { ...form, [k]: v };
    setForm(next);
    // Editing is live: persist every field change immediately.
    if (initial?.id) onSave(next, initial.id);
  };

  const submit = () => {
    if (!form.subject.trim()) return;
    onSave(form, initial?.id);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="mx-auto max-h-[92svh] max-w-md overflow-y-auto rounded-t-3xl">
        <SheetHeader className="flex-row items-center justify-between space-y-0">
          <SheetTitle>
            {initial ? "Edit class" : "Add Class"} · {DAYS[form.day]}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 px-4 pb-6">
          <Field label="Subject">
            <Input
              value={form.subject}
              onChange={(e) => set("subject", e.target.value)}
              placeholder="e.g. Calculus VII"
              className="h-12 rounded-2xl"
            />
          </Field>
          <Field label="Professor">
            <Input
              value={form.professor}
              onChange={(e) => set("professor", e.target.value)}
              placeholder="e.g. Dr. Samyuktha"
              className="h-12 rounded-2xl"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start">
              <Input
                type="time"
                value={form.start}
                onChange={(e) => set("start", e.target.value)}
                className="h-12 rounded-2xl"
              />
            </Field>
            <Field label="End">
              <Input
                type="time"
                value={form.end}
                onChange={(e) => set("end", e.target.value)}
                className="h-12 rounded-2xl"
              />
            </Field>
          </div>
          <Field label="Day">
            <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
              {DAYS.map((d, i) => (
                <button
                  key={d}
                  onClick={() => set("day", i)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-semibold",
                    form.day === i ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                  )}
                >
                  {d}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Room">
            <Input
              value={form.room}
              onChange={(e) => set("room", e.target.value)}
              placeholder="e.g. LH-201"
              className="h-12 rounded-2xl"
            />
          </Field>
          <Field label="Task / assignment">
            <Input
              value={form.task}
              onChange={(e) => set("task", e.target.value)}
              placeholder="Optional"
              className="h-12 rounded-2xl"
            />
          </Field>
          <Field label="Color">
            <div className="grid grid-cols-7 gap-2 rounded-2xl bg-muted/30 p-3">
              {CLASS_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => set("color", c)}
                  aria-label={`Color ${c}`}
                  className={cn(
                    "size-8 rounded-full ring-offset-2 ring-offset-background transition-transform hover:scale-110",
                    c === "#000000" && "border border-white/45",
                    form.color === c && "scale-110 ring-2 ring-foreground",
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </Field>
          {!initial && (
            <Button className="h-12 w-full rounded-2xl text-base" onClick={submit}>
              Add Class
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
