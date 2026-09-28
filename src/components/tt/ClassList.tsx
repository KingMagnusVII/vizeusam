import { memo, useEffect, useState } from "react";
import { ClassCard } from "@/components/tt/ClassCardV2";
import { todayIndex, type ClassItem } from "@/lib/timetable";

function getClassStatus(item: ClassItem, now: Date): "past" | "current" | "upcoming" {
  const [startHour, startMinute] = item.start.split(":").map(Number);
  const [endHour, endMinute] = item.end.split(":").map(Number);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = startHour * 60 + startMinute;
  const endMinutes = endHour * 60 + endMinute;

  if (currentMinutes >= endMinutes) return "past";
  if (currentMinutes >= startMinutes) return "current";
  return "upcoming";
}

export const ClassList = memo(function ClassList({
  classes,
  day,
  show24HourTime,
  onEdit,
  onDelete,
}: {
  classes: ClassItem[];
  day: number;
  show24HourTime: boolean;
  onEdit: (item: ClassItem) => void;
  onDelete: (item: ClassItem) => void;
}) {
  const [now, setNow] = useState(() => new Date());

  const statusDay = day === todayIndex();

  useEffect(() => {
    if (!statusDay || classes.length === 0) return;

    const current = new Date();
    const currentMinutes = current.getHours() * 60 + current.getMinutes();
    const boundaries = classes
      .flatMap((item) => [item.start, item.end])
      .map((value) => {
        const [hour, minute] = value.split(":").map(Number);
        return hour * 60 + minute;
      })
      .filter((minute) => minute > currentMinutes)
      .sort((a, b) => a - b);

    if (boundaries.length === 0) return;

    const nextBoundary = boundaries[0]!;
    const delay = Math.max(250, (nextBoundary - currentMinutes) * 60_000 - current.getSeconds() * 1_000 - current.getMilliseconds() + 50);
    const timeout = window.setTimeout(() => setNow(new Date()), delay);

    return () => window.clearTimeout(timeout);
  }, [statusDay, classes]);

  return (
    <>
      {classes.map((item) => (
        <ClassCard
          key={item.id}
          item={item}
          show24HourTime={show24HourTime}
          status={statusDay ? getClassStatus(item, now) : "upcoming"}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </>
  );
});
