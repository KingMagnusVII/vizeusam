import { DAYS, type ClassItem } from "@/lib/timetable";
import { memo } from "react";
import { cn } from "@/lib/utils";

export const DayStrip = memo(function DayStrip({
  day,
  onSelect,
  classes,
  compact = false,
}: {
  day: number;
  onSelect: (d: number) => void;
  classes: ClassItem[];
  compact?: boolean;
}) {
  const counts = classes.reduce((acc, item) => {
    acc[item.day] += 1;
    return acc;
  }, [0, 0, 0, 0, 0, 0, 0]);

  return (
    <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
      {DAYS.map((label, i) => {
        const count = counts[i];
        const active = i === day;
        return (
          <button
            key={label}
            onClick={() => onSelect(i)}
            className={cn(
              "flex basis-0 min-w-0 flex-1 flex-col items-center rounded-full border border-transparent px-2 transition-colors",
              compact ? "py-1.5" : "py-2",
              active
                ? "bg-primary text-primary-foreground"
                : "bg-muted/60 text-muted-foreground hover:bg-muted",
            )}
          >
            <span className="text-xs font-semibold">{label}</span>
            {!compact && (
              <span className="text-[11px] opacity-80">{count ? count : "·"}</span>
            )}
          </button>
        );
      })}
    </div>
  );
});
