import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  defaultState,
  parseImport,
  emptySchedule,
  uid,
  type AppState,
  type ClassItem,
  type Person,
  type Todo,
} from "./timetable";

const KEY = "timetable-app-state-v2";
const PERSIST_DELAY_MS = 500;

type Ctx = {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  person: Person;
  updatePerson: (id: string, fn: (p: Person) => Person) => void;
};

const TimetableContext = createContext<Ctx | null>(null);

export function TimetableProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => defaultState());
  const [loaded, setLoaded] = useState(false);
  const latestState = useRef(state);
  const persistedStateRef = useRef("");
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persist = useCallback(() => {
    const serialized = JSON.stringify(latestState.current);
    if (serialized === persistedStateRef.current) return;
    localStorage.setItem(KEY, serialized);
    persistedStateRef.current = serialized;
  }, []);

  useEffect(() => {
    latestState.current = state;
  }, [state]);

  useEffect(() => {
    let cancelled = false;

    const loadInitialState = async () => {
      try {
        const raw = localStorage.getItem(KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<AppState>;
          const defaults = defaultState();
          const normalizedPeople = (parsed.people ?? defaults.people).map((person) => ({
            ...person,
            schedules: (person.schedules ?? []).map((schedule) => ({
              ...schedule,
              classes: (schedule.classes ?? []).map((item) => ({
                ...item,
                // Older saved/imported data used "None" for empty class fields.
                // Keep class subject, professor, room, and task blank instead.
                subject: item.subject === "None" ? "" : item.subject,
                professor: item.professor === "None" ? "" : item.professor,
                room: item.room === "None" ? "" : item.room,
                task: item.task === "None" ? "" : item.task,
              })),
              dayInfo: Object.fromEntries(
                Object.entries(schedule.dayInfo ?? {}).map(([day, info]) => [
                  day,
                  info
                    ? {
                        ...info,
                        morning: info.morning?.replaceAll("Dr ", "Dr. "),
                        afternoon: info.afternoon?.replaceAll("Dr ", "Dr. "),
                      }
                    : info,
                ]),
              ),
            })),
          }));

          let normalizedState = {
            ...defaults,
            ...parsed,
            people: normalizedPeople,
            settings: { ...defaults.settings, ...(parsed.settings ?? {}) },
          } as AppState;

          // Saved app state is normally used after the first CSV import. If an
          // older saved state has no coordinator data, fetch the bundled CSVs
          // and fill only the missing coordinator values without overwriting
          // classes or any coordinator values the user already edited.
          const needsCoordinatorImport = normalizedState.people.some((p) =>
            p.schedules.some((s) => !s.dayInfo || Object.keys(s.dayInfo).length === 0),
          );

          if (needsCoordinatorImport) {
            try {
              const [week1Response, week2Response] = await Promise.all([
                fetch("/timetable/Foundation_Course_Week1_BatchC_v2.csv"),
                fetch("/timetable/Foundation_Course_Week2_BatchC_v2.csv"),
              ]);

              if (week1Response.ok && week2Response.ok) {
                const [week1Text, week2Text] = await Promise.all([
                  week1Response.text(),
                  week2Response.text(),
                ]);
                const bundled = [
                  parseImport("Week1.csv", week1Text),
                  parseImport("Week2.csv", week2Text),
                ];

                normalizedState = {
                  ...normalizedState,
                  people: normalizedState.people.map((p) => ({
                    ...p,
                    schedules: p.schedules.map((s) => {
                      const source = bundled.find((b) => b.name === s.name) ?? (
                        s.name === "Week 1" ? bundled[0] :
                        s.name === "Week 2" ? bundled[1] : undefined
                      );
                      if (!source?.dayInfo) return s;

                      const existing = s.dayInfo ?? {};
                      const merged = { ...source.dayInfo, ...existing };
                      return { ...s, dayInfo: merged };
                    }),
                  })),
                };
              }
            } catch {
              // Keep the saved state if the bundled coordinator CSVs fail.
            }
          }

          setState(normalizedState);
          persistedStateRef.current = raw;
          return;
        }

        const [week1Response, week2Response] = await Promise.all([
          fetch("/timetable/Foundation_Course_Week1_BatchC_v2.csv"),
          fetch("/timetable/Foundation_Course_Week2_BatchC_v2.csv"),
        ]);

        if (!week1Response.ok || !week2Response.ok) {
          throw new Error("Bundled timetable CSV could not be loaded");
        }

        const [week1Text, week2Text] = await Promise.all([
          week1Response.text(),
          week2Response.text(),
        ]);

        const week1 = parseImport("Week1.csv", week1Text);
        const week2 = parseImport("Week2.csv", week2Text);
        const defaults = defaultState();
        const schedules = [
          { id: uid(), name: "Week 1", classes: week1.classes, dayInfo: week1.dayInfo },
          { id: uid(), name: "Week 2", classes: week2.classes, dayInfo: week2.dayInfo },
        ];

        if (!cancelled) {
          const bundledState = {
            ...defaults,
            people: [
              {
                ...defaults.people[0]!,
                schedules,
                activeScheduleId: schedules[0]!.id,
              },
            ],
          } as AppState;
          setState(bundledState);
        }
      } catch {
        // Keep the built-in empty Week 1/Week 2 state if the bundled CSVs fail.
      } finally {
        if (!cancelled) setLoaded(true);
      }
    };

    void loadInitialState();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!loaded) return;

    if (persistTimer.current) clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(() => {
      persist();
      persistTimer.current = null;
    }, PERSIST_DELAY_MS);

    return () => {
      if (persistTimer.current) {
        clearTimeout(persistTimer.current);
        persistTimer.current = null;
      }
    };
  }, [state, loaded, persist]);

  useEffect(() => {
    if (!loaded) return;

    const persistNow = () => {
      if (persistTimer.current) {
        clearTimeout(persistTimer.current);
        persistTimer.current = null;
      }
      persist();
    };

    window.addEventListener("pagehide", persistNow);
    return () => window.removeEventListener("pagehide", persistNow);
  }, [loaded, persist]);

  const updatePerson = useCallback(
    (id: string, fn: (p: Person) => Person) =>
      setState((s) => {
        const index = s.people.findIndex((p) => p.id === id);
        if (index < 0) return s;
        const current = s.people[index]!;
        const next = fn(current);
        if (next === current) return s;
        const people = s.people.slice();
        people[index] = next;
        return { ...s, people };
      }),
    [],
  );

  const value = useMemo<Ctx>(() => {
    const person = state.people.find((p) => p.id === state.activePersonId) ?? state.people[0]!;
    return { state, setState, person, updatePerson };
  }, [state, updatePerson]);

  return <TimetableContext.Provider value={value}>{children}</TimetableContext.Provider>;
}

export function useTimetable() {
  const ctx = useContext(TimetableContext);
  if (!ctx) throw new Error("useTimetable must be used inside TimetableProvider");
  const { state, setState, person, updatePerson } = ctx;

  const mutateClasses = useCallback(
    (personId: string, fn: (list: ClassItem[]) => ClassItem[]) =>
      updatePerson(personId, (p) => ({
        ...p,
        schedules: p.schedules.map((s) =>
          s.id === p.activeScheduleId ? { ...s, classes: fn(s.classes) } : s,
        ),
      })),
    [updatePerson],
  );

  const setActivePerson = useCallback(
    (id: string) =>
      setState((s) => (s.activePersonId === id ? s : { ...s, activePersonId: id })),
    [setState],
  );
  const addClass = useCallback(
    (personId: string, item: Omit<ClassItem, "id">) =>
      mutateClasses(personId, (list) => [...list, { ...item, id: uid() }]),
    [mutateClasses],
  );
  const updateClass = useCallback(
    (personId: string, item: ClassItem) =>
      mutateClasses(personId, (list) => {
        const index = list.findIndex((c) => c.id === item.id);
        if (index < 0) return list;

        const previous = list[index]!;
        if (previous.color === item.color) {
          const next = list.slice();
          next[index] = item;
          return next;
        }

        return list.map((c) =>
          c.id === item.id || c.subject === item.subject
            ? { ...c, ...(c.id === item.id ? item : { color: item.color }) }
            : c,
        );
      }),
    [mutateClasses],
  );
  const removeClass = useCallback(
    (personId: string, classId: string) => mutateClasses(personId, (list) => list.filter((c) => c.id !== classId)),
    [mutateClasses],
  );
  const replaceClasses = useCallback(
    (personId: string, list: ClassItem[]) => mutateClasses(personId, () => list),
    [mutateClasses],
  );
  const appendClasses = useCallback(
    (personId: string, list: ClassItem[]) => mutateClasses(personId, (old) => [...old, ...list]),
    [mutateClasses],
  );
  const updateDayInfo = useCallback(
    (personId: string, day: number, info: { date: string; morning: string; afternoon: string }) =>
      updatePerson(personId, (p) => ({
        ...p,
        schedules: p.schedules.map((s) =>
          s.id === p.activeScheduleId ? { ...s, dayInfo: { ...(s.dayInfo ?? {}), [day]: info } } : s,
        ),
      })),
    [updatePerson],
  );
  const addSchedule = useCallback(
    (personId: string, name: string) =>
      updatePerson(personId, (p) => {
        const s = emptySchedule(name);
        return { ...p, schedules: [...p.schedules, s], activeScheduleId: s.id };
      }),
    [updatePerson],
  );
  const renameSchedule = useCallback(
    (personId: string, scheduleId: string, name: string) =>
      updatePerson(personId, (p) => ({
        ...p,
        schedules: p.schedules.map((s) => (s.id === scheduleId ? { ...s, name } : s)),
      })),
    [updatePerson],
  );
  const removeSchedule = useCallback(
    (personId: string, scheduleId: string) =>
      updatePerson(personId, (p) => {
        const schedules = p.schedules.filter((s) => s.id !== scheduleId);
        const list = schedules.length ? schedules : [emptySchedule("Week")];
        return {
          ...p,
          schedules: list,
          activeScheduleId: list.some((s) => s.id === p.activeScheduleId)
            ? p.activeScheduleId
            : list[0]!.id,
        };
      }),
    [updatePerson],
  );
  const setActiveSchedule = useCallback(
    (personId: string, scheduleId: string) =>
      updatePerson(personId, (p) =>
        p.activeScheduleId === scheduleId ? p : { ...p, activeScheduleId: scheduleId },
      ),
    [updatePerson],
  );
  const addPerson = useCallback(
    (name: string, classes: ClassItem[], dayInfo?: Partial<Record<number, { date: string; morning: string; afternoon: string }>>) => {
      const schedule = { id: uid(), name: "Week", classes, dayInfo };
      const p: Person = { id: uid(), name, schedules: [schedule], activeScheduleId: schedule.id };
      setState((s) => ({ ...s, people: [...s.people, p] }));
      return p.id;
    },
    [setState],
  );
  const removePerson = useCallback(
    (id: string) =>
      setState((s) => ({
        ...s,
        people: s.people.filter((p) => p.id !== id),
        activePersonId: s.activePersonId === id ? "me" : s.activePersonId,
      })),
    [setState],
  );
  const renamePerson = useCallback(
    (id: string, name: string) =>
      updatePerson(id, (p) => (p.name === name ? p : { ...p, name })),
    [updatePerson],
  );
  const addTodo = useCallback(
    (todo: Omit<Todo, "id">) => setState((s) => ({ ...s, todos: [{ ...todo, id: uid() }, ...s.todos] })),
    [setState],
  );
  const toggleTodo = useCallback(
    (id: string) => setState((s) => ({ ...s, todos: s.todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)) })),
    [setState],
  );
  const removeTodo = useCallback(
    (id: string) => setState((s) => ({ ...s, todos: s.todos.filter((t) => t.id !== id) })),
    [setState],
  );
  const updateSettings = useCallback(
    (patch: Partial<AppState["settings"]>) =>
      setState((s) => {
        const keys = Object.keys(patch) as Array<keyof AppState["settings"]>;
        if (keys.every((key) => s.settings[key] === patch[key])) return s;
        return { ...s, settings: { ...s.settings, ...patch } };
      }),
    [setState],
  );

  return {
    state,
    setState,
    person,
    updatePerson,
    setActivePerson,
    addClass,
    updateClass,
    removeClass,
    replaceClasses,
    appendClasses,
    updateDayInfo,
    addSchedule,
    renameSchedule,
    removeSchedule,
    setActiveSchedule,
    addPerson,
    removePerson,
    renamePerson,
    addTodo,
    toggleTodo,
    removeTodo,
    updateSettings,
  };
}
