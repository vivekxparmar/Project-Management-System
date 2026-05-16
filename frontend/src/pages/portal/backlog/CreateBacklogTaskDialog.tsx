import { useState } from "react";
import { useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { taskService } from "@/services";
import { useTaskStore } from "@/stores";
import { cn } from "@/lib/utils";

const schema = z.object({
  title: z.string().min(1, "Task title is required").max(200),
});

type FormData = z.infer<typeof schema>;

interface CreateBacklogTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateBacklogTaskDialog({
  open,
  onOpenChange,
}: CreateBacklogTaskDialogProps) {
  const { projectId } = useParams<{ projectId: string }>();
  const [isLoading, setIsLoading] = useState(false);
  const { addBacklogTask } = useTaskStore();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    if (!projectId) return;
    setIsLoading(true);
    try {
      const res = await taskService.createBacklog({
        title: data.title,
        projectId,
        isInBacklog: true,
      });
      addBacklogTask({ ...res.data.data, subtasks: [] });
      toast.success("Task added to backlog.");
      reset();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? "Failed to create task.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (isLoading) return;
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle>Add task to backlog</DialogTitle>
          <DialogDescription className="text-xs font-semibold">
            This task will sit in the backlog until moved to a sprint.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4 mt-2"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="backlog-title" className="text-sm">
              Task title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="backlog-title"
              autoFocus
              placeholder="e.g. Set up authentication"
              className={cn(
                "h-10 rounded-xl font-medium",
                errors.title && "border-destructive",
              )}
              {...register("title")}
            />
            {errors.title && (
              <p className="text-[11px] text-destructive">
                {errors.title.message}
              </p>
            )}
          </div>
          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              className="flex-1 "
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1 " disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Add to backlog"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
