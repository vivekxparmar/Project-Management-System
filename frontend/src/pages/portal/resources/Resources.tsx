import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  File as FileIcon,
  Image as ImageIcon,
  Link as LinkIcon,
  FolderOpen,
  Plus,
  Trash2,
  ExternalLink,
  FileText,
  Video,
  Music,
  Loader2,
  Upload,
  Search,
  X,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { resourceService } from "@/services";
import { useRBAC } from "@/hooks";
import {
  getInitials,
  canAddResource,
  canDeleteResource,
} from "@/lib/constants";
import { useResourceStore } from "@/stores";
import { formatRelativeTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Resource, ResourceType } from "@/types";
import PageLoader from "@/components/shared/PageLoader";

const RESOURCE_ICONS: Record<ResourceType, any> = {
  url: LinkIcon,
  image: ImageIcon,
  video: Video,
  audio: Music,
  file: FileIcon,
  document: FileText,
  other: FileIcon,
};

const RESOURCE_TYPE_META: Record<ResourceType, { label: string; icon: any }> = {
  url: { label: "URL", icon: LinkIcon },
  image: { label: "Image", icon: ImageIcon },
  video: { label: "Video", icon: Video },
  audio: { label: "Audio", icon: Music },
  file: { label: "File", icon: FileIcon },
  document: { label: "Document", icon: FileText },
  other: { label: "Other", icon: FileIcon },
};

const RESOURCE_COLORS: Record<ResourceType, string> = {
  url: "bg-blue-400/15 text-blue-600",
  image: "bg-pink-400/15 text-pink-600",
  video: "bg-purple-400/15 text-purple-600",
  audio: "bg-green-400/15 text-green-600",
  file: "bg-slate-400/15 text-slate-600",
  document: "bg-orange-400/15 text-orange-600",
  other: "bg-gray-400/15 text-gray-600",
};

const schema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(1000).optional(),
  type: z.enum(["url", "image", "video", "audio", "file", "document", "other"]),
  url: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function Resources() {
  const { projectId } = useParams<{ projectId: string }>();
  const { myRole } = useRBAC();

  // const [resources, setResources] = useState<Resource[]>([]);
  // const [filteredResources, setFilteredResources] = useState<Resource[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  // const [isLoading, setIsLoading] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Resource | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<globalThis.File | null>(
    null,
  );
  const canAdd = canAddResource(myRole);
  const canDel = canDeleteResource(myRole);

  const {
    resources,
    setResources,
    addResource,
    removeResource,
    isLoading,
    setLoading,
  } = useResourceStore();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: "url" },
  });

  const resourceType = watch("type");

  const handleDialogChange = (open: boolean) => {
    if (!open) {
      if (!isSubmitting) {
        setAddOpen(false);
        reset();
        setSelectedFile(null);
      }
    } else {
      setAddOpen(true);
    }
  };

  useEffect(() => {
    if (!projectId) return;
    const fetch = async () => {
      // setIsLoading(true);
      setLoading(true);
      try {
        const res = await resourceService.getAll(projectId);
        setResources(res.data.data);
        // setFilteredResources(res.data.data);
      } catch {
        // ignore
      } finally {
        // setIsLoading(false);
        setLoading(false);
      }
    };
    fetch();
  }, [projectId]);

  // Filter resources when search query or type filter changes
  // useEffect(() => {
  //   let filtered = [...resources];

  //   // Filter by search query (name and description)
  //   if (searchQuery.trim()) {
  //     const query = searchQuery.toLowerCase().trim();
  //     filtered = filtered.filter(
  //       (resource) =>
  //         resource.name.toLowerCase().includes(query) ||
  //         (resource.description &&
  //           resource.description.toLowerCase().includes(query)),
  //     );
  //   }

  //   // Filter by resource type
  //   if (selectedType !== "all") {
  //     filtered = filtered.filter(
  //       (resource) => resource.resourceType === selectedType,
  //     );
  //   }

  //   setFilteredResources(filtered);
  // }, [searchQuery, selectedType, resources]);

  const filteredResources = resources.filter((resource) => {
    const matchesSearch =
      !searchQuery.trim() ||
      resource.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resource.description?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType =
      selectedType === "all" || resource.resourceType === selectedType;

    return matchesSearch && matchesType;
  });

  const onSubmit = async (data: FormData) => {
    if (!projectId) return;
    setIsSubmitting(true);
    try {
      const res = await resourceService.create({
        projectId,
        name: data.title,
        description: data.description,
        resourceType: data.type,
        url: data.url,
        file: selectedFile ?? undefined,
      });
      // setResources((prev) => [res.data.data, ...prev]);
      addResource(res.data.data);
      toast.success("Resource added.");
      reset();
      setSelectedFile(null);
      setAddOpen(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? "Failed to add resource.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    // setResources((prev) => prev.filter((r) => r._id !== deleteTarget._id));
    removeResource(deleteTarget._id);
    try {
      await resourceService.delete(deleteTarget._id, projectId);
      toast.success("Resource deleted.");
    } catch {
      toast.error("Failed to delete resource.");
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  // Helper to get a proper download URL from a Cloudinary raw URL
  const getDownloadUrl = (url: string, fileName?: string) => {
    if (!url) return url;
    return url.replace(
      "/upload/",
      `/upload/fl_attachment${fileName ? `:${fileName}` : ""}/`,
    );
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery("");
    setSelectedType("all");
  };

  if (isLoading) return <PageLoader rows={4} />;

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-background shrink-0">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Resources</h2>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full font-semibold">
              {filteredResources.length}
            </span>
          </div>
          <div className="flex-1" />
          {canAdd && (
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={() => setAddOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              Add Resource
            </Button>
          )}
        </div>

        {/* Search and Filter Bar */}
        <div className="px-4 py-3 border-b border-border bg-background shrink-0">
          <div className="flex gap-2">
            <div className="max-w-md relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search resources by name or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-8 h-9 rounded-full text-sm font-medium"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                </button>
              )}
            </div>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-[140px] !bg-muted flex items-center !h-9 border font-medium ">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent
                position="popper"
                side="bottom"
                align="start"
                className="p-2 bg-muted font-medium"
              >
                <SelectItem value="all" className="rounded-lg">
                  All Types
                </SelectItem>
                <SelectItem value="url" className="rounded-lg">
                  <div className="flex items-center gap-2">
                    <LinkIcon className="h-3.5 w-3.5" />
                    URLs
                  </div>
                </SelectItem>
                <SelectItem value="image" className="rounded-lg">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-3.5 w-3.5" />
                    Images
                  </div>
                </SelectItem>
                <SelectItem value="video" className="rounded-lg">
                  <div className="flex items-center gap-2">
                    <Video className="h-3.5 w-3.5" />
                    Videos
                  </div>
                </SelectItem>
                <SelectItem value="audio" className="rounded-lg">
                  <div className="flex items-center gap-2">
                    <Music className="h-3.5 w-3.5" />
                    Audio
                  </div>
                </SelectItem>
                <SelectItem value="document" className="rounded-lg">
                  <div className="flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5" />
                    Documents
                  </div>
                </SelectItem>
                <SelectItem value="file" className="rounded-lg">
                  <div className="flex items-center gap-2">
                    <FileIcon className="h-3.5 w-3.5" />
                    Files
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            {(searchQuery || selectedType !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-9 px-3 rounded-xl text-xs"
              >
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-auto p-4">
          {filteredResources.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                <FolderOpen className="h-6 w-6 text-muted-foreground/40" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                {resources.length === 0
                  ? "No resources yet"
                  : "No matching resources found"}
              </p>
              <p className="text-xs text-muted-foreground/60">
                {resources.length === 0
                  ? "Add URLs, documents, images, and more"
                  : "Try adjusting your search or filter criteria"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredResources.map((resource) => {
                const Icon = RESOURCE_ICONS[resource.resourceType];
                const color = RESOURCE_COLORS[resource.resourceType];
                return (
                  <div
                    key={resource._id}
                    className="group bg-card border border-border rounded-2xl p-4 flex flex-col gap-3 hover:border-primary/30 transition-colors"
                  >
                    {/* Type icon + title */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={cn(
                            "w-8 h-8 rounded-xl flex items-center justify-center shrink-0",
                            color,
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {resource.name}
                          </p>
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0 mt-0.5 capitalize rounded-full"
                          >
                            {resource.resourceType}
                          </Badge>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <a
                              href={resource.url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 rounded-lg"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            </a>
                          </TooltipTrigger>
                          <TooltipContent className="bg-primary text-primary-foreground font-medium">
                            Open
                          </TooltipContent>
                        </Tooltip>
                        {canDel && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 rounded-lg hover:text-destructive hover:bg-destructive/10"
                                onClick={() => setDeleteTarget(resource)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent className="bg-primary text-primary-foreground font-medium">
                              Delete
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </div>

                    {/* Description */}
                    {resource.description && (
                      <p className="text-xs text-foreground line-clamp-2 leading-relaxed">
                        {resource.description}
                      </p>
                    )}

                    {/* Footer */}
                    <div className="flex items-center gap-2 mt-auto pt-1">
                      <Badge variant="outline" className="rounded-full">
                        Uploaded by
                      </Badge>
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={resource.uploadedBy.avatar} />
                        <AvatarFallback className="text-[12px] bg-primary text-primary-foreground">
                          {getInitials(resource.uploadedBy.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-[12px] font-medium text-muted-foreground ml-auto">
                        {formatRelativeTime(resource.createdAt)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ADD RESOURCE DIALOG */}
      <Dialog open={addOpen} onOpenChange={handleDialogChange}>
        <DialogContent
          className="sm:max-w-sm rounded-2xl"
          onPointerDownOutside={(e) => {
            if (isSubmitting) e.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>Add resource</DialogTitle>
            <DialogDescription className="text-xs font-semibold">
              Share a link, file, image, video or document with your team.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-4 mt-2"
          >
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm">Title *</Label>
              <Input
                autoFocus
                placeholder="e.g. Figma Design File"
                className="h-10 rounded-xl font-medium"
                {...register("title")}
              />
              {errors.title && (
                <p className="text-[11px] text-destructive font-medium">
                  {errors.title.message}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-sm">Type *</Label>
              <Select
                value={resourceType}
                onValueChange={(val: any) => setValue("type", val)}
              >
                <SelectTrigger className="h-10 rounded-xl w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  side="bottom"
                  align="start"
                  className="rounded-2xl w-[var(--radix-select-trigger-width)]"
                >
                  {(
                    [
                      "url",
                      "image",
                      "video",
                      "audio",
                      "file",
                      "document",
                      "other",
                    ] as ResourceType[]
                  ).map((t) => {
                    const meta = RESOURCE_TYPE_META[t];
                    const Icon = meta.icon;

                    return (
                      <SelectItem
                        key={t}
                        value={t}
                        className="rounded-xl capitalize"
                      >
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <span>{meta.label}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* URL or file upload */}
            {resourceType === "url" ? (
              <div className="flex flex-col gap-1.5">
                <Label className="text-sm">URL *</Label>
                <Input
                  placeholder="https://..."
                  className="h-10 rounded-xl font-medium"
                  {...register("url")}
                />
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <Label className="text-sm">File *</Label>
                <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl p-6 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground font-medium">
                    {selectedFile ? selectedFile.name : "Click to upload file"}
                  </p>
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) =>
                      setSelectedFile(e.target.files?.[0] ?? null)
                    }
                  />
                </label>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label className="text-sm">
                Description{" "}
                <span className="text-muted-foreground font-medium">
                  (optional)
                </span>
              </Label>
              <Textarea
                rows={2}
                placeholder="What is this resource for?"
                className="rounded-xl resize-none text-sm font-medium"
                {...register("description")}
              />
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setAddOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Add Resource"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
      >
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete resource?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold text-foreground">
                {deleteTarget?.name}
              </span>
              ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}
