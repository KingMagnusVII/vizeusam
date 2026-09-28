export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export type DayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

// Expanded rainbow palette for class editing. The hues are spaced around the
// colour wheel so the picker gives a much wider range than the old 7 colours.
export const CLASS_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16", "#22c55e", "#10b981", "#06b6d4",
  "#0ea5e9", "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899", "#f43f5e",
  "#ffffff", "#d1d5db", "#9ca3af", "#6b7280", "#4b5563", "#374151", "#1f2937", "#000000",
];

export type ClassItem = {
  id: string;
  day: number;
  subject: string;
  professor: string;
  start: string;
  end: string;
  room: string;
  task: string;
  color: string;
};

export type DayInfo = {
  date: string;
  morning: string;
  afternoon: string;
};

export type Schedule = {
  id: string;
  name: string;
  classes: ClassItem[];
  dayInfo?: Partial<Record<number, DayInfo>>;
};

export type Person = {
  id: string;
  name: string;
  schedules: Schedule[];
  activeScheduleId: string;
};

export type Todo = {
  id: string;
  text: string;
  tag: string;
  done: boolean;
  color: string;
};

export type ThemeName = "light" | "dark" | "ocean" | "wallpaper";

export type AppState = {
  people: Person[];
  activePersonId: string;
  todos: Todo[];
  settings: {
    theme: ThemeName;
    wallpaper: string;
    customWallpaper: string;
    opacity: number;
    primaryColor: string;
    use24HourTime: boolean;
    showDayCoordinators: boolean;
    appName: string;
    appIcon: string;
  };
};

export const uid = () => Math.random().toString(36).slice(2, 10);

export function todayIndex(): number {
  const js = new Date().getDay();
  return (js + 6) % 7;
}

export function formatTime(value: string, use24HourTime: boolean): string {
  const [hour, minute] = value.split(":").map(Number);
  if (use24HourTime || !Number.isFinite(hour) || !Number.isFinite(minute)) return value;
  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${String(minute).padStart(2, "0")} ${suffix}`;
}

export function formatToday(): string {
  return new Date().toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
}

export function sortClasses(list: ClassItem[]): ClassItem[] {
  return [...list].sort((a, b) => a.start.localeCompare(b.start));
}

export function emptySchedule(name: string): Schedule {
  return { id: uid(), name, classes: [], dayInfo: {} };
}

export function activeSchedule(person: Person): Schedule {
  return person.schedules.find((s) => s.id === person.activeScheduleId) ?? person.schedules[0]!;
}

/* ------------------------- import / export ------------------------- */

const FIELDS = ["day", "subject", "professor", "start", "end", "room", "task", "color", "morning", "afternoon"];

function normalizeDay(value: string): number {
  const v = value.trim().toLowerCase().slice(0, 3);
  const i = DAYS.findIndex((d) => d.toLowerCase() === v);
  if (i >= 0) return i;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 && n <= 6 ? n : 0;
}

function normalizeTime(value: string): string {
  const raw = (value || "").trim();
  const m = raw.match(/^(\d{1,2})[:.]?(\d{2})?\s*(am|pm)?$/i);
  if (!m) return raw;
  let h = Number(m[1]);
  const min = m[2] ?? "00";
  const suffix = m[3]?.toLowerCase();
  if (suffix === "pm" && h < 12) h += 12;
  if (suffix === "am" && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${min}`;
}

export function toClassItem(row: Record<string, string>, index: number): ClassItem {
  return {
    id: uid(),
    day: normalizeDay(row["day"] ?? ""),
    subject: row["subject"]?.trim() || "Untitled class",
    professor: row["professor"]?.trim() || "",
    start: normalizeTime(row["start"] ?? "09:00"),
    end: normalizeTime(row["end"] ?? "10:00"),
    room: row["room"]?.trim() || "",
    task: row["task"]?.trim() || "",
    color: row["color"]?.trim() || CLASS_COLORS[index % CLASS_COLORS.length]!,
  };
}


function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else quoted = !quoted;
    } else if (ch === "," && !quoted) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

export function parseCsv(text: string): ClassItem[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return [];
  const header = splitCsvLine(lines[0]!).map((h) => h.trim().toLowerCase());
  const hasHeader = header.some((h) => FIELDS.includes(h));
  const cols = hasHeader ? header : FIELDS;
  const body = hasHeader ? lines.slice(1) : lines;
  return body.map((line, i) => {
    const cells = splitCsvLine(line);
    const row: Record<string, string> = {};
    cols.forEach((c, ci) => (row[c] = cells[ci] ?? ""));
    return toClassItem(row, i);
  });
}

export type ImportResult = {
  name?: string;
  classes: ClassItem[];
  dayInfo?: Partial<Record<number, DayInfo>>;
};

export function parseImport(fileName: string, text: string): ImportResult {
  if (fileName.toLowerCase().endsWith(".csv")) {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (!lines.length) return { classes: [] };
    const header = splitCsvLine(lines[0]!).map((h) => h.trim().toLowerCase());
    const hasHeader = header.some((h) => FIELDS.includes(h));
    const cols = hasHeader ? header : FIELDS;
    const body = hasHeader ? lines.slice(1) : lines;
    const dayInfo: Partial<Record<number, DayInfo>> = {};
    const classes = body.map((line, i) => {
      const cells = splitCsvLine(line);
      const row: Record<string, string> = {};
      cols.forEach((c, ci) => (row[c] = cells[ci] ?? ""));
      const day = normalizeDay(row.day ?? "");
      if (row.morning?.trim() || row.afternoon?.trim()) {
        dayInfo[day] = {
          date: "",
          morning: row.morning?.trim() ?? "",
          afternoon: row.afternoon?.trim() ?? "",
        };
      }
      const hasClassData = ["subject", "professor", "start", "end", "room", "task", "color"]
        .some((field) => row[field]?.trim());
      return hasClassData ? toClassItem(row, i) : null;
    });
    return { classes: classes.filter((item): item is ClassItem => item !== null), dayInfo };
  }

  const data = JSON.parse(text);
  const rows = Array.isArray(data)
    ? data
    : Array.isArray(data.classes)
      ? data.classes
      : Array.isArray(data.schedule)
        ? data.schedule
        : [];
  const dayInfo = data?.dayInfo as Partial<Record<number, DayInfo>> | undefined;
  return {
    name: typeof data?.name === "string" ? data.name : undefined,
    classes: rows.map((r: Record<string, string>, i: number) => toClassItem(r, i)),
    dayInfo,
  };
}

export function toCsv(
  classes: ClassItem[],
  dayInfo?: Partial<Record<number, DayInfo>>,
): string {
  const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const head = FIELDS.join(",");
  const rows = classes.map((c) => {
    const info = dayInfo?.[c.day];
    return [
      DAYS[c.day],
      c.subject,
      c.professor,
      c.start,
      c.end,
      c.room,
      c.task,
      c.color,
      info?.morning ?? "",
      info?.afternoon ?? "",
    ]
      .map((v) => esc(String(v ?? "")))
      .join(",");
  });
  const classDays = new Set(classes.map((c) => c.day));
  const coordinatorRows = Object.entries(dayInfo ?? {})
    .filter(([day]) => !classDays.has(Number(day)))
    .map(([day, info]) =>
      [
        DAYS[Number(day)],
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        info?.morning ?? "",
        info?.afternoon ?? "",
      ]
        .map((v) => esc(String(v ?? "")))
        .join(","),
    );
  return [head, ...rows, ...coordinatorRows].join("\n");
}

export function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ----------------------------- defaults ----------------------------- */

export function defaultState(): AppState {
  const week1 = emptySchedule("Week 1");
  const week2 = emptySchedule("Week 2");

  const me: Person = {
    id: "me",
    name: "Sammy",
    schedules: [week1, week2],
    activeScheduleId: week1.id,
  };

  return {
    people: [me],
    activePersonId: "me",
    todos: [],
    settings: {
      theme: "dark",
      wallpaper: "",
      customWallpaper: "",
      opacity: 0.85,
      primaryColor: "#3b82f6",
      use24HourTime: true,
      showDayCoordinators: true,
      appName: "My Timetable",
      appIcon: "/app-icons/golden_192x192.png",
    },
  };
}
