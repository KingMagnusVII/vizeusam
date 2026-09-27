import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export type ConfirmState = {
  title: string;
  description?: string;
  actionLabel?: string;
  onConfirm: () => void;
} | null;

export function ConfirmDialog({
  state,
  onOpenChange,
}: {
  state: ConfirmState;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <AlertDialog open={!!state} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{state?.title}</AlertDialogTitle>
          <AlertDialogDescription>
            {state?.description ?? "This can't be undone."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              state?.onConfirm();
              onOpenChange(false);
            }}
          >
            {state?.actionLabel ?? "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
