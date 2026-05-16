import { useState } from "react";
import { toast } from "sonner";
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
import { sprintService } from "@/services";
import { useSprintStore } from "@/stores";
import type { Sprint } from "@/types";

interface DeleteSprintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sprint: Sprint;
}

export default function DeleteSprintDialog({
  open,
  onOpenChange,
  sprint,
}: DeleteSprintDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const { removeSprint } = useSprintStore();

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await sprintService.delete(sprint._id, sprint.projectId);
      removeSprint(sprint._id);
      toast.success(`Sprint "${sprint.name}" deleted. Tasks moved to backlog.`);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? "Failed to delete sprint.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="rounded-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete sprint?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete{" "}
            <span className="font-semibold text-foreground">{sprint.name}</span>
            . All tasks will be moved to the Backlog. This action cannot be
            undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-xl" disabled={isDeleting}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? "Deleting..." : "Delete sprint"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
