import { memo, useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { DayInfo } from "@/lib/timetable";

export const DayCoordinatorCard = memo(function DayCoordinatorCard({
  info,
  onSave,
}: {
  day: number;
  info: DayInfo | undefined;
  onSave: (info: DayInfo) => void;
}) {
  const [editing, setEditing] = useState(!info);
  const [form, setForm] = useState<DayInfo>(
    info ?? { date: "None", morning: "None", afternoon: "None" },
  );

  useEffect(() => {
    setForm(info ?? { date: "None", morning: "None", afternoon: "None" });
  }, [info]);

  const updateField = (field: "morning" | "afternoon", value: string) => {
    const next = { ...form, [field]: value || "None", date: "None" };
    setForm(next);
    onSave(next);
  };

  return (
    <div className="panel rounded-2xl border border-border px-2.5 py-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
          Date Co-ordinators
        </p>
        <button
          aria-label={editing ? "Finish editing date coordinators" : "Edit date coordinators"}
          className="grid size-6 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          onClick={() => setEditing((value) => !value)}
        >
          <Pencil className="size-3" />
        </button>
      </div>

      {editing ? (
        <div className="mt-0.5 grid grid-cols-2 gap-1.5">
          <Input
            value={form.morning}
            placeholder="Morning Section"
            onChange={(e) => updateField("morning", e.target.value)}
            className="h-8 rounded-lg px-2.5 text-xs"
          />
          <Input
            value={form.afternoon}
            placeholder="Afternoon Section"
            onChange={(e) => updateField("afternoon", e.target.value)}
            className="h-8 rounded-lg px-2.5 text-xs"
          />
        </div>
      ) : (
        <div className="mt-1.5 grid grid-cols-2 gap-1.5">
          <div className="min-w-0 rounded-lg bg-muted/60 px-2 py-1.5">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
              Morning
            </p>
            <p className="mt-0.5 break-words text-xs font-medium">
              {form.morning || "None"}
            </p>
          </div>
          <div className="min-w-0 rounded-lg bg-muted/60 px-2 py-1.5">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
              Afternoon
            </p>
            <p className="mt-0.5 break-words text-xs font-medium">
              {form.afternoon || "None"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
});
