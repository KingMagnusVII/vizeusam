import { useEffect, useState } from "react";
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

export function ClassList({
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

  useEffect(() => {
    const tick = () => setNow(new Date());
    const delay = 60_000 - (Date.now() % 60_000) + 50;
    let interval: number | undefined;

    const timeout = window.setTimeout(() => {
      tick();
      interval = window.setInterval(tick, 60_000);
    }, delay);

    return () => {
      window.clearTimeout(timeout);
      if (interval !== undefined) window.clearInterval(interval);
    };
  }, []);

  const today = todayIndex();
  const statusDay = day === today;

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
}
