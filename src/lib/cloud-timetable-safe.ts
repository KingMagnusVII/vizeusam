import { supabase } from "@/integrations/supabase/client";
import type { ClassItem, DayInfo } from "./timetable";

export type CloudTimetable = {
  id: string;
  name: string;
  version: number;
  data: { classes: ClassItem[]; dayInfo?: Partial<Record<number, DayInfo>> };
  updated_at: string;
};

export async function fetchCloudTimetable(): Promise<CloudTimetable | null> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return null;
  try {
    const { data, error } = await (supabase as any)
      .from("timetable_documents")
      .select("id,name,version,data,updated_at")
      .eq("id", "default")
      .maybeSingle();
    if (error || !data) return null;
    return data as CloudTimetable;
  } catch {
    return null;
  }
}

export async function publishCloudTimetable(
  classes: ClassItem[],
  dayInfo: Partial<Record<number, DayInfo>>,
  currentVersion: number,
) {
  const nextVersion = Math.max(1, currentVersion + 1);
  const { data, error } = await (supabase as any)
    .from("timetable_documents")
    .update({
      version: nextVersion,
      data: { classes, dayInfo },
      updated_at: new Date().toISOString(),
    })
    .eq("id", "default")
    .select("id,name,version,data,updated_at")
    .single();
  if (error) throw error;
  return data as CloudTimetable;
}

export async function isCurrentUserTimetableAdmin(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { data, error } = await (supabase as any).rpc("is_timetable_admin");
    return !error && data === true;
  } catch {
    return false;
  }
}
