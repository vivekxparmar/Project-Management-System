import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
// import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Settings as SettingsIcon,
  Save,
  Trash2,
  Archive,
  //   Github,
  FolderGit,
  Loader2,
  // Plus,
  // X,
  // Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
// import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
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
// import { Switch } from "@/components/ui/switch";
import { useProjectStore } from "@/stores";
import { projectService } from "@/services";
import { useRBAC } from "@/hooks";
// import {
//   PROJECT_STATUS_OPTIONS,
//   PRIORITY_OPTIONS,
//   getPriorityColor,
// } from "@/lib/constants";
import { cn } from "@/lib/utils";

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  description: z.string().max(500).optional(),
  githubUrl: z.string().optional(),
  slackWebhook: z.string().optional(),
  defaultSprintDuration: z.number().min(1).max(90),
  defaultPriority: z.enum(["P0", "P1", "P2", "P3", "P4", "P5"]),
});

type FormData = z.infer<typeof schema>;

export default function Settings() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { currentProject, updateProject, removeProject } = useProjectStore();
  const { canChangeSettings, isOwner } = useRBAC();

  const [isSaving, setIsSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  // const [newLabel, setNewLabel] = useState("");

  // const [customLabels, setCustomLabels] = useState<string[]>(
  //   currentProject?.settings?.customLabels ?? [],
  // );

  const {
    register,
    handleSubmit,
    // watch,
    // setValue,
    // formState: { errors, isDirty },
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      name: currentProject?.name ?? "",
      description: currentProject?.description ?? "",
      githubUrl: currentProject?.settings?.integrations?.github ?? "",
      slackWebhook: currentProject?.settings?.integrations?.slackWebhook ?? "",
      defaultSprintDuration:
        currentProject?.settings?.defaultSprintDuration ?? 14,
      defaultPriority: currentProject?.settings?.defaultPriority ?? "P3",
    },
  });

  const onSubmit = async (data: FormData) => {
    if (!projectId) return;
    setIsSaving(true);
    try {
      const res = await projectService.update(projectId, {
        name: data.name,
        description: data.description,
        settings: {
          defaultSprintDuration: data.defaultSprintDuration,
          defaultPriority: data.defaultPriority,
          // customLabels,
          integrations: {
            github: data.githubUrl,
            slackWebhook: data.slackWebhook,
          },
        },
      });
      updateProject(projectId, res.data.data);
      toast.success("Settings saved.");
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? "Failed to save settings.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!projectId) return;
    setIsDeleting(true);
    try {
      await projectService.delete(projectId);
      removeProject(projectId);
      toast.success("Project deleted.");
      navigate("/projects", { replace: true });
    } catch {
      toast.error("Failed to delete project.");
      setIsDeleting(false);
    }
  };

  const handleArchive = async () => {
    if (!projectId) return;
    setIsArchiving(true);
    try {
      await projectService.archive(projectId);
      updateProject(projectId, {
        isArchived: !currentProject?.isArchived,
      });
      toast.success(
        currentProject?.isArchived
          ? "Project unarchived."
          : "Project archived.",
      );
      setArchiveOpen(false);
      if (!currentProject?.isArchived) navigate("/projects", { replace: true });
    } catch {
      toast.error("Failed to archive project.");
    } finally {
      setIsArchiving(false);
    }
  };

  // const handleAddLabel = () => {
  //   const label = newLabel.trim();
  //   if (!label || customLabels.includes(label)) return;
  //   setCustomLabels((prev) => [...prev, label]);
  //   setNewLabel("");
  // };

  // const handleRemoveLabel = (label: string) => {
  //   setCustomLabels((prev) => prev.filter((l) => l !== label));
  // };

  if (!canChangeSettings) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-muted-foreground">
          You don't have permission to view settings.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-background shrink-0">
        <div className="flex items-center gap-2">
          <SettingsIcon className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Project Settings</h2>
        </div>
        <div className="flex-1" />
        <Button
          size="sm"
          className="h-8 text-xs gap-1.5"
          onClick={handleSubmit(onSubmit)}
          disabled={isSaving}
        >
          {isSaving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          Save Changes
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 scrollbar-thin">
        <div className="max-w-2xl flex flex-col gap-8">
          {/* ── GENERAL ───────────────────────────────── */}
          <section>
            <h3 className="text-sm font-semibold mb-4">General</h3>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label className="text-sm">Project name</Label>
                <Input
                  className={cn(
                    "h-10 rounded-xl",
                    errors.name && "border-destructive",
                  )}
                  {...register("name")}
                />
                {errors.name && (
                  <p className="text-[11px] text-destructive">
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-sm">Description</Label>
                <Textarea
                  rows={3}
                  className="rounded-xl resize-none text-sm"
                  placeholder="What is this project about?"
                  {...register("description")}
                />
              </div>
            </div>
          </section>

          <Separator />

          {/* ── SPRINT DEFAULTS ───────────────────────── */}
          {/* <section>
            <h3 className="text-sm font-semibold mb-4">Sprint Defaults</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label className="text-sm">
                  Default sprint duration (days)
                </Label>
                <Input
                  type="number"
                  min={1}
                  max={90}
                  className="h-10 rounded-xl"
                  {...register("defaultSprintDuration", {
                    valueAsNumber: true,
                  })}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-sm">Default task priority</Label>
                <Select
                  value={watch("defaultPriority")}
                  onValueChange={(val: any) => setValue("defaultPriority", val)}
                >
                  <SelectTrigger className="!h-10 ">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent
                    position="popper"
                    side="bottom"
                    align="start"
                    className="rounded-2xl "
                  >
                    {PRIORITY_OPTIONS.map((p) => (
                      <SelectItem
                        key={p.value}
                        value={p.value}
                        className="rounded-xl"
                      >
                        <Badge
                          className={cn(
                            getPriorityColor(p.value),
                            "rounded-full",
                          )}
                        >
                          {p.label}
                        </Badge>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          <Separator /> */}

          {/* ── CUSTOM LABELS ─────────────────────────── */}
          {/* <section>
            <h3 className="text-sm font-semibold mb-1">Custom Labels</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Labels can be applied to tasks and bugs for better categorization.
            </p>
            <div className="flex gap-2 mb-3">
              <Input
                placeholder="Add a label..."
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                className="h-8 rounded-xl text-sm"
                onKeyDown={(e) => e.key === "Enter" && handleAddLabel()}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 rounded-xl gap-1"
                onClick={handleAddLabel}
                disabled={!newLabel.trim()}
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </Button>
            </div>
            {customLabels.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {customLabels.map((label) => (
                  <Badge
                    key={label}
                    variant="secondary"
                    className="gap-1.5 px-2 py-1 rounded-xl text-xs"
                  >
                    <Tag className="h-3 w-3" />
                    {label}
                    <button
                      onClick={() => handleRemoveLabel(label)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </section>

          <Separator /> */}

          {/* ── INTEGRATIONS ──────────────────────────── */}
          <section>
            <h3 className="text-sm font-semibold mb-4">Integrations</h3>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label className="text-sm flex items-center gap-1.5">
                  {/* <Github className="h-3.5 w-3.5" /> */}
                  <FolderGit className="h-3.5 w-3.5" />
                  GitHub repository URL
                </Label>
                <Input
                  placeholder="https://github.com/org/repo"
                  className="h-10 rounded-xl font-medium"
                  {...register("githubUrl")}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-sm">Slack webhook URL</Label>
                <Input
                  placeholder="https://hooks.slack.com/..."
                  className="h-10 rounded-xl font-medium"
                  {...register("slackWebhook")}
                />
              </div>
            </div>
          </section>

          <Separator />

          {/* ── DANGER ZONE ───────────────────────────── */}
          <section>
            <h3 className="text-sm font-semibold text-destructive mb-4">
              Danger Zone
            </h3>
            <div className="flex flex-col gap-3 border border-destructive/30 rounded-2xl p-4 bg-destructive/5">
              {/* Archive */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">
                    {currentProject?.isArchived
                      ? "Unarchive project"
                      : "Archive project"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                    {currentProject?.isArchived
                      ? "Restore this project to active status."
                      : "Archive this project. It will be hidden but data is preserved."}
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-8 w-20 gap-1.5 border-0"
                  onClick={() => setArchiveOpen(true)}
                >
                  <Archive className="h-3.5 w-3.5" />
                  {currentProject?.isArchived ? "Unarchive" : "Archive"}
                </Button>
              </div>

              <Separator className="bg-destructive/20" />

              {/* Delete */}
              {isOwner && (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Delete project</p>
                    <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                      Permanently delete this project and all its data. This
                      cannot be undone.
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="h-8 w-20 gap-1.5"
                    onClick={() => setDeleteOpen(true)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </Button>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Archive confirm */}
      <AlertDialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {currentProject?.isArchived
                ? "Unarchive project?"
                : "Archive project?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {currentProject?.isArchived
                ? "This project will be restored and visible to all members."
                : "This project will be hidden from the main view. You can unarchive it later."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>

            <AlertDialogAction
              onClick={handleArchive}
              disabled={isArchiving}
              className="rounded-xl !bg-destructive text-destructive-foreground gap-2 flex items-center justify-center"
            >
              {isArchiving && <Loader2 className="h-4 w-4 animate-spin" />}
              {currentProject?.isArchived ? "Unarchive" : "Archive"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirm */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete project permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <span className="font-semibold text-foreground">
                {currentProject?.name}
              </span>{" "}
              and all its sprints, tasks, bugs, and data. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="rounded-xl !bg-destructive text-destructive-foreground flex items-center justify-center gap-2 disabled:opacity-80"
            >
              {isDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
