import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, X, Upload } from "lucide-react";
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
import { bugService } from "@/services";
import { useBugStore } from "@/stores";
import { cn } from "@/lib/utils";
import api from "@/services/axios";

const schema = z.object({
  title: z.string().min(1, "Bug title is required").max(200),
  description: z.string().max(5000).optional(),
});

type FormData = z.infer<typeof schema>;

interface ReportBugDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

export default function ReportBugDialog({
  open,
  onOpenChange,
  projectId,
}: ReportBugDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadedAttachments, setUploadedAttachments] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addBug } = useBugStore();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    setUploadingImages(true);

    const remainingSlots = 5 - images.length;
    const filesToAdd = files.slice(0, remainingSlots);

    const newUploads = [];
    const newPreviews = [];

    for (const file of filesToAdd) {
      try {
        // Show preview immediately
        const previewUrl = URL.createObjectURL(file);
        newPreviews.push(previewUrl);

        // Upload to your working /upload endpoint
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", "bugs");

        const response = await api.post("/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        newUploads.push({
          url: response.data.data.url,
          publicId: response.data.data.publicId,
          type: response.data.data.type,
          originalName: response.data.data.fileName,
        });
      } catch (error) {
        console.error("Failed to upload image:", error);
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    setImages((prev) => [...prev, ...filesToAdd]);
    setPreviews((prev) => [...prev, ...newPreviews]);
    setUploadedAttachments((prev) => [...prev, ...newUploads]);
    setUploadingImages(false);
  };

  const removeImage = async (index: number) => {
    const attachment = uploadedAttachments[index];
    if (attachment && attachment.publicId) {
      try {
        await api.delete(`/upload/${attachment.publicId}`);
      } catch (error) {
        console.error("Failed to delete image:", error);
      }
    }

    URL.revokeObjectURL(previews[index]);
    setImages((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
    setUploadedAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: FormData) => {
    if (uploadingImages) {
      toast.error("Please wait for images to finish uploading");
      return;
    }

    setIsLoading(true);
    try {
      const res = await bugService.create({
        title: data.title,
        description: data.description,
        projectId,
        attachments: uploadedAttachments,
      });

      if (res.data.success && res.data.data) {
        addBug(res.data.data);
        toast.success("Bug reported successfully.");
        handleClose();
      } else {
        throw new Error("Failed to create bug");
      }
    } catch (err: any) {
      console.error("Error:", err);
      toast.error(err.response?.data?.message ?? "Failed to report bug.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (isLoading || uploadingImages) return;
    reset();
    setImages([]);
    setUploadedAttachments([]);
    previews.forEach((p) => URL.revokeObjectURL(p));
    setPreviews([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-sm rounded-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Report a bug</DialogTitle>
          <DialogDescription className="text-xs font-medium">
            Describe the issue clearly so the team can reproduce and fix it.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4 mt-2"
        >
          <div className="flex flex-col gap-1.5">
            <Label className="text-sm">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              autoFocus
              placeholder="e.g. Login button not working on mobile"
              className={cn(
                "h-10 rounded-xl",
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

          <div className="flex flex-col gap-1.5">
            <Label className="text-sm">
              Description<span className="text-destructive">*</span>
            </Label>
            <Textarea
              placeholder="Steps to reproduce, expected vs actual behavior..."
              rows={4}
              className="rounded-xl resize-none"
              {...register("description")}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-sm">Attachments (up to 5 images)</Label>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl p-6 transition-colors",
                "hover:border-primary/50 hover:bg-primary/5",
                (images.length >= 5 || uploadingImages) &&
                  "opacity-50 cursor-not-allowed",
              )}
              disabled={images.length >= 5 || uploadingImages}
            >
              {uploadingImages ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <Upload className="h-6 w-6" />
              )}
              <p className="text-xs">
                {uploadingImages
                  ? "Uploading..."
                  : `Click to upload (${images.length}/5)`}
              </p>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleImageSelect}
              disabled={images.length >= 5 || uploadingImages}
            />

            {previews.length > 0 && (
              <div className="flex gap-2 flex-wrap mt-1">
                {previews.map((preview, i) => (
                  <div
                    key={i}
                    className="relative w-16 h-16 rounded-xl overflow-hidden border group"
                  >
                    <img
                      src={preview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    >
                      <X className="h-4 w-4 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

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
            <Button type="submit" className="flex-1" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Report Bug"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
