import { useState } from "react";
import { Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { CLASS_COLORS } from "@/lib/timetable";
import { useTimetable } from "@/lib/use-timetable";
import { cn } from "@/lib/utils";

export function TodoPanel() {
  const { state, addTodo, toggleTodo, removeTodo } = useTimetable();
  const [text, setText] = useState("");

  const pending = state.todos.filter((t) => !t.done);
  const done = state.todos.filter((t) => t.done);

  const add = () => {
    if (!text.trim()) return;
    addTodo({
      text: text.trim(),
      tag: "General · Soon",
      done: false,
      color: CLASS_COLORS[state.todos.length % CLASS_COLORS.length]!,
    });
    setText("");
  };

  const row = (t: (typeof state.todos)[number]) => (
    <div
      key={t.id}
      className="panel relative flex items-center gap-3 overflow-hidden rounded-2xl border border-border py-3 pr-2 pl-4"
    >
      <span className="absolute inset-y-2 left-0 w-1 rounded-full" style={{ backgroundColor: t.color }} />
      <button
        onClick={() => toggleTodo(t.id)}
        aria-label="Toggle task"
        className="grid size-6 shrink-0 place-items-center rounded-full border-2"
        style={{ borderColor: t.color, backgroundColor: t.done ? t.color : "transparent" }}
      >
        {t.done && <Check className="size-3.5 text-background" />}
      </button>
      <div className="min-w-0 flex-1">
        <p className={cn("whitespace-pre-wrap break-all text-sm font-medium", t.done && "text-muted-foreground line-through")}>
          {t.text}
        </p>
        <p className="whitespace-pre-wrap break-words text-xs" style={{ color: t.color }}>
          {t.tag}
        </p>
      </div>
      <button
        onClick={() => removeTodo(t.id)}
        aria-label="Remove task"
        className="rounded-lg p-1.5 text-muted-foreground hover:text-destructive"
      >
        <X className="size-4" />
      </button>
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") add();
          }}
          placeholder="Add a task..."
          rows={2}
          className="min-h-12 resize-none rounded-2xl"
        />
        <Button onClick={add} className="h-12 rounded-full px-5">
          Add
        </Button>
      </div>

      <p className="pt-1 text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
        Pending · {pending.length}
      </p>
      <div className="space-y-2">{pending.map(row)}</div>

      {done.length > 0 && (
        <>
          <p className="pt-2 text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
            Completed · {done.length}
          </p>
          <div className="space-y-2">{done.map(row)}</div>
        </>
      )}
    </div>
  );
}
