import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { projectService } from "@/services";
// import { useProjectStore, useAuthStore } from "@/stores";
import { useProjectStore } from "@/stores";
import { cn } from "@/lib/utils";
// import type { ProjectStatus } from "@/types";

const schema = z.object({
  name: z
    .string()
    .min(2, "Project name must be at least 2 characters")
    .max(100, "Project name too long"),
  description: z.string().max(500, "Description too long").optional(),
});

type FormData = z.infer<typeof schema>;

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateProjectDialog({
  open,
  onOpenChange,
}: CreateProjectDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { addProject } = useProjectStore();
  // const user = useAuthStore((s) => s.user);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      const res = await projectService.create({
        name: data.name,
        description: data.description ?? "",
      });
      const newProject = res.data.data;

      // Attach myRole before adding to store
      addProject({
        ...newProject,
        myRole: "Owner",
      });

      toast.success(`Project "${newProject.name}" created!`);
      reset();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? "Failed to create project.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (isLoading) return;
    reset();
    onOpenChange(false);
    // setTimeout(() => onOpenChange(false), 0);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg">Create new project</DialogTitle>
          <DialogDescription className="text-xs font-semibold">
            Set up your project workspace. You can add team members after
            creation.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4 mt-2"
        >
          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="proj-name" className="text-sm">
              Project name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="proj-name"
              placeholder="e.g. Mobile App Redesign"
              autoFocus
              className={cn(
                "h-10 rounded-xl font-medium",
                errors.name && "border-destructive",
              )}
              {...register("name")}
            />
            {errors.name && (
              <p className="text-[11px] text-destructive font-medium">
                {errors.name.message}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="proj-desc" className="text-sm">
              Description{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </Label>
            <Textarea
              id="proj-desc"
              placeholder="What is this project about?"
              rows={3}
              className={cn(
                "rounded-xl resize-none text-sm font-medium",
                errors.description && "border-destructive",
              )}
              {...register("description")}
            />
            {errors.description && (
              <p className="text-[11px] text-destructive font-medium">
                {errors.description.message}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 font-semibold"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Create project"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
