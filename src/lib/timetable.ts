export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export type DayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const CLASS_COLORS = [
  "#a78bfa",
  "#f472b6",
  "#2dd4bf",
  "#fbbf24",
  "#34d399",
  "#fb7185",
  "#38bdf8",
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

export type Schedule = {
  id: string;
  name: string;
  classes: ClassItem[];
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
    opacity: number;
  };
};

export const uid = () => Math.random().toString(36).slice(2, 10);

export function todayIndex(): number {
  const js = new Date().getDay();
  return (js + 6) % 7;
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
  return { id: uid(), name, classes: [] };
}

export function activeSchedule(person: Person): Schedule {
  return person.schedules.find((s) => s.id === person.activeScheduleId) ?? person.schedules[0];
}

/* ------------------------- import / export ------------------------- */

const FIELDS = ["day", "subject", "professor", "start", "end", "room", "task", "color"];

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
    day: normalizeDay(row.day ?? ""),
    subject: row.subject?.trim() || "Untitled class",
    professor: row.professor?.trim() || "",
    start: normalizeTime(row.start ?? "09:00"),
    end: normalizeTime(row.end ?? "10:00"),
    room: row.room?.trim() || "",
    task: row.task?.trim() || "",
    color: row.color?.trim() || CLASS_COLORS[index % CLASS_COLORS.length],
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
  const header = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
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

export type ImportResult = { name?: string; classes: ClassItem[] };

export function parseImport(fileName: string, text: string): ImportResult {
  if (fileName.toLowerCase().endsWith(".csv")) {
    return { classes: parseCsv(text) };
  }
  const data = JSON.parse(text);
  const rows = Array.isArray(data)
    ? data
    : Array.isArray(data.classes)
      ? data.classes
      : Array.isArray(data.schedule)
        ? data.schedule
        : [];
  return {
    name: typeof data?.name === "string" ? data.name : undefined,
    classes: rows.map((r: Record<string, string>, i: number) => toClassItem(r, i)),
  };
}

export function toCsv(classes: ClassItem[]): string {
  const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const head = FIELDS.join(",");
  const rows = classes.map((c) =>
    [DAYS[c.day], c.subject, c.professor, c.start, c.end, c.room, c.task, c.color]
      .map((v) => esc(String(v ?? "")))
      .join(","),
  );
  return [head, ...rows].join("\n");
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
  const mine: Schedule = {
    id: uid(),
    name: "Semester 5",
    classes: [
      {
        id: uid(),
        day: 1,
        subject: "Data Structures",
        professor: "Dr. Singh",
        start: "09:00",
        end: "10:30",
        room: "CS-102",
        task: "Complete BST assignment",
        color: "#38bdf8",
      },
      {
        id: uid(),
        day: 1,
        subject: "Linear Algebra",
        professor: "Prof. Sharma",
        start: "11:00",
        end: "12:30",
        room: "LH-301",
        task: "Practice eigenvalues",
        color: "#fbbf24",
      },
      {
        id: uid(),
        day: 1,
        subject: "Chemistry",
        professor: "Dr. Nair",
        start: "14:00",
        end: "15:30",
        room: "Sci-A",
        task: "Review reaction mechanisms",
        color: "#34d399",
      },
      {
        id: uid(),
        day: 0,
        subject: "English Lit",
        professor: "Ms. Iyer",
        start: "10:00",
        end: "11:00",
        room: "H-204",
        task: "Essay draft",
        color: "#f472b6",
      },
      {
        id: uid(),
        day: 2,
        subject: "Physics Lab",
        professor: "Dr. Rao",
        start: "09:30",
        end: "12:30",
        room: "Lab-2",
        task: "Read lab safety guidelines",
        color: "#a78bfa",
      },
    ],
  };
  const friendSchedule: Schedule = {
    id: uid(),
    name: "Week",
    classes: [
      {
        id: uid(),
        day: 1,
        subject: "DBMS",
        professor: "Ms. Verma",
        start: "14:00",
        end: "15:30",
        room: "CS-105",
        task: "ER diagram submission",
        color: "#2dd4bf",
      },
    ],
  };
  const me: Person = {
    id: "me",
    name: "Sammy",
    schedules: [mine],
    activeScheduleId: mine.id,
  };
  const friend: Person = {
    id: uid(),
    name: "Arya Sharma",
    schedules: [friendSchedule],
    activeScheduleId: friendSchedule.id,
  };
  return {
    people: [me, friend],
    activePersonId: "me",
    todos: [
      {
        id: uid(),
        text: "Submit Calculus problem set 4",
        tag: "Calculus II · Tomorrow",
        done: false,
        color: "#a78bfa",
      },
      {
        id: uid(),
        text: "Write 500-word essay draft",
        tag: "English Lit · Wed",
        done: false,
        color: "#f472b6",
      },
      {
        id: uid(),
        text: "BST assignment – 3 methods left",
        tag: "Data Structures · Tue",
        done: false,
        color: "#38bdf8",
      },
      {
        id: uid(),
        text: "Read lab safety guidelines",
        tag: "Physics Lab · Done",
        done: true,
        color: "#2dd4bf",
      },
    ],
    settings: { theme: "dark", wallpaper: "", opacity: 0.85 },
  };
}
