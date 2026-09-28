import { memo, useRef, useState } from "react";
import { ChevronUp, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { parseImport } from "@/lib/timetable";
import { useTimetable } from "@/lib/use-timetable";
import { cn } from "@/lib/utils";
import type { ConfirmState } from "./ConfirmDialog";
import { CropImageDialog } from "./CropImageDialog";

const initials = (name: string) =>
  name.split(" ").map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();

export const PeoplePanel = memo(function PeoplePanel({ confirm }: { confirm: (s: ConfirmState) => void }) {
  const { state, person, setActivePerson, addPerson, removePerson, updatePerson } = useTimetable();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [profileId, setProfileId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftAvatar, setDraftAvatar] = useState("");
  const [cropFile, setCropFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const profileImageRef = useRef<HTMLInputElement>(null);

  const profilePerson = profileId ? state.people.find((p) => p.id === profileId) : null;

  const openProfile = (id: string) => {
    const p = state.people.find((item) => item.id === id);
    if (!p) return;
    setProfileId(id);
    setDraftName(p.name);
    setDraftAvatar(p.avatar ?? "");
  };

  const onFile = async (file: File) => {
    try {
      const text = await file.text();
      const { name, classes, dayInfo } = parseImport(file.name, text);
      if (!classes.length) throw new Error("No classes found in that file.");
      const friendName = name || file.name.replace(/\.(csv|json)$/i, "");
      const id = addPerson(friendName, classes, dayInfo);
      setActivePerson(id);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read that file.");
    }
  };

  const saveProfile = () => {
    if (!profileId || !draftName.trim()) return;
    updatePerson(profileId, (p) => ({
      ...p,
      name: draftName.trim(),
      avatar: draftAvatar || undefined,
    }));
    setProfileId(null);
    setCropFile(null);
  };

  return (
    <>
      <div className="panel-strong relative z-20 -mt-2 rounded-t-3xl border-t border-border px-4 pt-5 pb-5">
        <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-2 pb-1 text-left">
          <span className="text-sm font-semibold">Friends&apos; Timetable</span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{state.people.length - 1}</span>
          <ChevronUp className={cn("ml-auto size-4 text-muted-foreground transition-transform", !open && "rotate-180")} />
        </button>

        {open && (
          <div className="no-scrollbar mt-3 flex gap-3 overflow-x-auto pb-1">
            {state.people.map((p) => {
              const count = (p.schedules.find((s) => s.id === p.activeScheduleId)?.classes ?? []).length;
              const active = p.id === person.id;
              return (
                <div key={p.id} className="relative shrink-0">
                  <button
                    onClick={() => setActivePerson(p.id)}
                    className={cn(
                      "flex w-20 flex-col items-center gap-1.5 rounded-2xl border p-2 transition-colors",
                      active ? "border-primary bg-primary/10" : "border-border hover:bg-muted/60",
                    )}
                  >
                    {p.avatar ? (
                      <img src={p.avatar} alt="" className="size-11 rounded-full object-cover" />
                    ) : (
                      <span className="grid size-11 place-items-center rounded-full bg-primary/25 text-sm font-semibold text-primary">
                        {initials(p.name)}
                      </span>
                    )}
                    <span className="w-full truncate text-center text-xs font-semibold">
                      {p.name.split(" ")[0]}
                    </span>
                    <span className="time-mono text-[10px] text-muted-foreground">{count} cls</span>
                  </button>

                  <button
                    aria-label={"Edit " + (p.id === "me" ? "my profile" : p.name)}
                    onClick={(e) => { e.stopPropagation(); openProfile(p.id); }}
                    className="absolute right-1 top-1 rounded-full bg-muted p-1 text-muted-foreground shadow-sm hover:text-foreground"
                  >
                    <Pencil className="size-3" />
                  </button>

                  {p.id !== "me" && (
                    <>
                      <button
                        aria-label={"Remove " + p.name}
                        onClick={() => confirm({
                          title: "Remove " + p.name + "?",
                          description: "Their imported timetable will be deleted from this device.",
                          actionLabel: "Remove",
                          onConfirm: () => removePerson(p.id),
                        })}
                        className="absolute -bottom-1 -right-1 rounded-full bg-muted p-1 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </>
                  )}
                </div>
              );
            })}

            <button
              onClick={() => fileRef.current?.click()}
              className="flex w-20 shrink-0 flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-border p-2 text-muted-foreground hover:bg-muted/60"
            >
              <Plus className="size-5" />
              <span className="text-xs font-semibold">Add</span>
              <span className="text-[10px]">CSV / JSON</span>
            </button>
          </div>
        )}

        {open && (
          <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Upload className="size-3" /> Import a friend&apos;s timetable file to see their week here.
          </p>
        )}
        {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
        {open && person.id !== "me" && (
          <Button variant="secondary" size="sm" className="mt-3 w-full rounded-full" onClick={() => setActivePerson("me")}>
            Back to my timetable
          </Button>
        )}

        <Dialog open={!!profileId} onOpenChange={(value) => !value && setProfileId(null)}>
          <DialogContent className="max-w-sm rounded-3xl">
            <DialogHeader>
              <DialogTitle>{profilePerson?.id === "me" ? "Edit my profile" : "Edit friend"}</DialogTitle>
              <DialogDescription>Change the name or add a profile picture.</DialogDescription>
            </DialogHeader>

            <div className="space-y-5">
              <div className="flex flex-col items-center gap-3">
                {draftAvatar ? (
                  <img src={draftAvatar} alt="" className="size-20 rounded-full object-cover ring-2 ring-border" />
                ) : (
                  <span className="grid size-20 place-items-center rounded-full bg-primary/25 text-xl font-semibold text-primary ring-2 ring-border">
                    {draftName ? initials(draftName) : "?"}
                  </span>
                )}
                <div className="flex gap-2">
                  <Button type="button" variant="secondary" className="rounded-full" onClick={() => profileImageRef.current?.click()}>
                    <Upload className="size-4" /> Picture
                  </Button>
                  {draftAvatar && (
                    <Button type="button" variant="ghost" className="rounded-full text-destructive" onClick={() => setDraftAvatar("")}>
                      Remove
                    </Button>
                  )}
                </div>
              </div>

              <Input
                autoFocus
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                placeholder="Friend name"
                className="h-12 rounded-2xl"
              />
            </div>

            <DialogFooter>
              <Button variant="secondary" className="rounded-2xl" onClick={() => setProfileId(null)}>Cancel</Button>
              <Button className="rounded-2xl" onClick={saveProfile} disabled={!draftName.trim()}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <input
          ref={fileRef}
          type="file"
          accept=".csv,.json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
            e.target.value = "";
          }}
        />
        <input
          ref={profileImageRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) setCropFile(f);
            e.target.value = "";
          }}
        />
      </div>

      <CropImageDialog
        open={!!cropFile}
        file={cropFile}
        aspect={1}
        title="Crop profile picture"
        onOpenChange={(value) => !value && setCropFile(null)}
        onSave={(dataUrl) => {
          setDraftAvatar(dataUrl);
          setCropFile(null);
        }}
      />
    </>
  );
});
