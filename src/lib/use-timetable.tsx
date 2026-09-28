import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
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

          setState({
            ...defaults,
            ...parsed,
            people: normalizedPeople,
            // Keep newly added settings fields when loading older local data.
            settings: { ...defaults.settings, ...(parsed.settings ?? {}) },
          });
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
          setState({
            ...defaults,
            people: [
              {
                ...defaults.people[0]!,
                schedules,
                activeScheduleId: schedules[0]!.id,
              },
            ],
          });
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
    if (loaded) localStorage.setItem(KEY, JSON.stringify(state));
  }, [state, loaded]);

  const value = useMemo<Ctx>(() => {
    const person = state.people.find((p) => p.id === state.activePersonId) ?? state.people[0]!;
    const updatePerson = (id: string, fn: (p: Person) => Person) =>
      setState((s) => ({ ...s, people: s.people.map((p) => (p.id === id ? fn(p) : p)) }));
    return { state, setState, person, updatePerson };
  }, [state]);

  return <TimetableContext.Provider value={value}>{children}</TimetableContext.Provider>;
}

export function useTimetable() {
  const ctx = useContext(TimetableContext);
  if (!ctx) throw new Error("useTimetable must be used inside TimetableProvider");
  const { state, setState, person, updatePerson } = ctx;

  const mutateClasses = (personId: string, fn: (list: ClassItem[]) => ClassItem[]) =>
    updatePerson(personId, (p) => ({
      ...p,
      schedules: p.schedules.map((s) =>
        s.id === p.activeScheduleId ? { ...s, classes: fn(s.classes) } : s,
      ),
    }));

  return {
    state,
    setState,
    person,
    updatePerson,
    setActivePerson: (id: string) => setState((s) => ({ ...s, activePersonId: id })),

    addClass: (personId: string, item: Omit<ClassItem, "id">) =>
      mutateClasses(personId, (list) => [...list, { ...item, id: uid() }]),
    updateClass: (personId: string, item: ClassItem) =>
      mutateClasses(personId, (list) => list.map((c) => (c.id === item.id ? item : c))),
    removeClass: (personId: string, classId: string) =>
      mutateClasses(personId, (list) => list.filter((c) => c.id !== classId)),
    replaceClasses: (personId: string, list: ClassItem[]) => mutateClasses(personId, () => list),
    appendClasses: (personId: string, list: ClassItem[]) =>
      mutateClasses(personId, (old) => [...old, ...list]),

    updateDayInfo: (personId: string, day: number, info: { date: string; morning: string; afternoon: string }) =>
      updatePerson(personId, (p) => ({
        ...p,
        schedules: p.schedules.map((s) =>
          s.id === p.activeScheduleId ? { ...s, dayInfo: { ...(s.dayInfo ?? {}), [day]: info } } : s,
        ),
      })),
    addSchedule: (personId: string, name: string) =>
      updatePerson(personId, (p) => {
        const s = emptySchedule(name);
        return { ...p, schedules: [...p.schedules, s], activeScheduleId: s.id };
      }),
    renameSchedule: (personId: string, scheduleId: string, name: string) =>
      updatePerson(personId, (p) => ({
        ...p,
        schedules: p.schedules.map((s) => (s.id === scheduleId ? { ...s, name } : s)),
      })),
    removeSchedule: (personId: string, scheduleId: string) =>
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
    setActiveSchedule: (personId: string, scheduleId: string) =>
      updatePerson(personId, (p) => ({ ...p, activeScheduleId: scheduleId })),

    addPerson: (name: string, classes: ClassItem[]) => {
      const schedule = { id: uid(), name: "Week", classes };
      const p: Person = { id: uid(), name, schedules: [schedule], activeScheduleId: schedule.id };
      setState((s) => ({ ...s, people: [...s.people, p] }));
      return p.id;
    },
    removePerson: (id: string) =>
      setState((s) => ({
        ...s,
        people: s.people.filter((p) => p.id !== id),
        activePersonId: s.activePersonId === id ? "me" : s.activePersonId,
      })),
    renamePerson: (id: string, name: string) => updatePerson(id, (p) => ({ ...p, name })),

    addTodo: (todo: Omit<Todo, "id">) =>
      setState((s) => ({ ...s, todos: [{ ...todo, id: uid() }, ...s.todos] })),
    toggleTodo: (id: string) =>
      setState((s) => ({
        ...s,
        todos: s.todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
      })),
    removeTodo: (id: string) =>
      setState((s) => ({ ...s, todos: s.todos.filter((t) => t.id !== id) })),

    updateSettings: (patch: Partial<AppState["settings"]>) =>
      setState((s) => ({ ...s, settings: { ...s.settings, ...patch } })),
  };
}
