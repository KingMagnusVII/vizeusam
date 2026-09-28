import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { DayInfo } from "@/lib/timetable";

export function DayCoordinatorCard({
  info,
  onSave,
}: {
  day: number;
  info: DayInfo | undefined;
  onSave: (info: DayInfo) => void;
}) {
  const [editing, setEditing] = useState(!info);
  const [form, setForm] = useState<DayInfo>(
    info ?? { date: "", morning: "", afternoon: "" },
  );

  useEffect(() => {
    setForm(info ?? { date: "", morning: "", afternoon: "" });
  }, [info]);

  const updateField = (field: "morning" | "afternoon", value: string) => {
    const next = { ...form, [field]: value, date: "" };
    setForm(next);
    onSave(next);
  };

  return (
    <div className="panel rounded-2xl border border-border px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
          Date Co-ordinators
        </p>
        <button
          aria-label={editing ? "Finish editing date coordinators" : "Edit date coordinators"}
          className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          onClick={() => setEditing((value) => !value)}
        >
          <Pencil className="size-3.5" />
        </button>
      </div>

      {editing ? (
        <div className="mt-1 grid grid-cols-2 gap-2">
          <Input
            value={form.morning}
            placeholder="Morning Section"
            onChange={(e) => updateField("morning", e.target.value)}
            className="h-9 rounded-xl text-sm"
          />
          <Input
            value={form.afternoon}
            placeholder="Afternoon Section"
            onChange={(e) => updateField("afternoon", e.target.value)}
            className="h-9 rounded-xl text-sm"
          />
        </div>
      ) : (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div className="min-w-0 rounded-xl bg-muted/60 px-2.5 py-2">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
              Morning
            </p>
            <p className="mt-0.5 break-words text-xs font-medium">
              {form.morning || "Not set"}
            </p>
          </div>
          <div className="min-w-0 rounded-xl bg-muted/60 px-2.5 py-2">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
              Afternoon
            </p>
            <p className="mt-0.5 break-words text-xs font-medium">
              {form.afternoon || "Not set"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
