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
    setEditing(!info);
  }, [info]);

  const updateField = (field: "morning" | "afternoon", value: string) => {
    const next = { ...form, [field]: value, date: "" };
    setForm(next);
    onSave(next);
  };

  return (
    <div className="panel rounded-2xl border border-border p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
            Date Co-ordinators
          </p>
          {!editing && (
            <p className="mt-1 text-xs text-muted-foreground">
              Tap the pencil to edit
            </p>
          )}
        </div>
        <button
          aria-label={editing ? "Finish editing date coordinators" : "Edit date coordinators"}
          className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          onClick={() => setEditing((value) => !value)}
        >
          <Pencil className="size-4" />
        </button>
      </div>

      {editing ? (
        <div className="mt-4 space-y-3">
          <Input
            value={form.morning}
            placeholder="Morning Section"
            onChange={(e) => updateField("morning", e.target.value)}
            className="rounded-xl"
          />
          <Input
            value={form.afternoon}
            placeholder="Afternoon Section"
            onChange={(e) => updateField("afternoon", e.target.value)}
            className="rounded-xl"
          />
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-muted/60 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Morning Section
            </p>
            <p className="mt-1 text-sm font-medium break-words">
              {form.morning || "Not set"}
            </p>
          </div>
          <div className="rounded-xl bg-muted/60 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Afternoon Section
            </p>
            <p className="mt-1 text-sm font-medium break-words">
              {form.afternoon || "Not set"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
