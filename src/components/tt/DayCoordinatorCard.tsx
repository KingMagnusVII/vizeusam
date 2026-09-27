import { useEffect, useState } from "react";
import { Pencil, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { DayInfo } from "@/lib/timetable";

export function DayCoordinatorCard({
  day,
  info,
  onSave,
}: {
  day: number;
  info?: DayInfo;
  onSave: (info: DayInfo) => void;
}) {
  const [editing, setEditing] = useState(!info);
  const [form, setForm] = useState<DayInfo>(
    info ?? { date: "", morning: "", afternoon: "" },
  );

  useEffect(() => {
    setForm(info ?? { date: "", morning: "", afternoon: "" });
    setEditing(!info);
  }, [info]);

  if (editing) {
    return (
      <div className="panel rounded-2xl border border-border p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold">Date Co-ordinators</h3>
          <Button size="sm" className="rounded-full" onClick={() => { onSave(form); setEditing(false); }}>
            <Check className="size-4" /> Save
          </Button>
        </div>
        <div className="space-y-3">
          <Input value={form.date} placeholder="Date" onChange={(e) => setForm({ ...form, date: e.target.value })} className="rounded-xl" />
          <Input value={form.morning} placeholder="Morning Section" onChange={(e) => setForm({ ...form, morning: e.target.value })} className="rounded-xl" />
          <Input value={form.afternoon} placeholder="Afternoon Section" onChange={(e) => setForm({ ...form, afternoon: e.target.value })} className="rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="panel rounded-2xl border border-border p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">Date Co-ordinators</p>
          <p className="mt-1 text-sm font-semibold">{form.date || "Date not set"}</p>
        </div>
        <button aria-label="Edit date coordinators" className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground" onClick={() => setEditing(true)}>
          <Pencil className="size-4" />
        </button>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-muted/60 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Morning Section</p>
          <p className="mt-1 text-sm font-medium">{form.morning || "Not set"}</p>
        </div>
        <div className="rounded-xl bg-muted/60 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Afternoon Section</p>
          <p className="mt-1 text-sm font-medium">{form.afternoon || "Not set"}</p>
        </div>
      </div>
    </div>
  );
}
