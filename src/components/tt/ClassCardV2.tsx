import { memo } from "react";
import { Pencil, Pin, Trash2 } from "lucide-react";
import { formatTime, type ClassItem } from "@/lib/timetable";
import { cn } from "@/lib/utils";

export const ClassCard = memo(function ClassCard({
  item,
  status = "upcoming",
  show24HourTime = true,
  onEdit,
  onDelete,
}: {
  item: ClassItem;
  status?: "past" | "current" | "upcoming";
  show24HourTime?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  return (
    <div
      className={cn(
        "group panel relative flex gap-3 overflow-hidden rounded-2xl border border-border p-3 pl-4 transition-all duration-300",
        status === "past" && "opacity-40 grayscale-[0.15]",
        status === "current" && "ring-1 ring-primary/45 shadow-sm",
      )}
    >
      <span
        className="absolute inset-y-2 left-0 w-1 rounded-full"
        style={{ backgroundColor: item.color }}
      />
      <div
        className={cn(
          "flex shrink-0 flex-col justify-between py-0.5",
          show24HourTime ? "w-[3rem]" : "w-[3.75rem]",
        )}
      >
        <span
          className="time-mono whitespace-nowrap text-[13px] font-semibold tracking-tight"
          style={{ color: item.color }}
        >
          {formatTime(item.start, show24HourTime)}
        </span>
        <span className="mx-auto my-1 w-px flex-1 bg-foreground/70" />
        <span className="time-mono whitespace-nowrap tracking-tight text-[11px] text-muted-foreground">
          {formatTime(item.end, show24HourTime)}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <h3 className="min-w-0 flex-1 whitespace-normal break-words text-base font-semibold">
            {item.subject}
          </h3>
          {status === "current" ? (
            <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[9px] font-bold tracking-wider text-primary">
              NOW
            </span>
          ) : null}
          {item.room ? (
            <span className="time-mono rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
              {item.room}
            </span>
          ) : null}
        </div>
        {item.professor ? (
          <p className="mt-0.5 whitespace-normal break-words text-sm text-muted-foreground">
            {item.professor}
          </p>
        ) : null}
        {item.task ? (
          <p
            className="mt-1 flex items-start gap-1.5 whitespace-normal break-words text-[13px]"
            style={{ color: item.color }}
          >
            <Pin className="size-3 shrink-0" />
            {item.task}
          </p>
        ) : null}
      </div>
      {(onEdit || onDelete) && (
        <div className="flex flex-col justify-center gap-1 opacity-60 transition-opacity group-hover:opacity-100">
          {onEdit && (
            <button
              onClick={onEdit}
              aria-label={`Edit ${item.subject}`}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <Pencil className="size-4" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              aria-label={`Delete ${item.subject}`}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive"
            >
              <Trash2 className="size-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
});
