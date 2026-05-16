import { useState, useEffect } from "react";
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
import { sprintService } from "@/services";
import { useSprintStore } from "@/stores";
import { cn } from "@/lib/utils";
import { DatePickerInput } from "./DatePickerInput";

const schema = z
  .object({
    name: z.string().min(1, "Sprint name is required").max(100),
    goal: z.string().max(500).optional(),
    startDate: z.date({ message: "Start date is required" }),
    endDate: z.date({ message: "End date is required" }),
  })
  .refine((d) => d.endDate > d.startDate, {
    message: "End date must be after start date",
    path: ["endDate"],
  });

type FormData = z.infer<typeof schema>;

interface CreateSprintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

export default function CreateSprintDialog({
  open,
  onOpenChange,
  projectId,
}: CreateSprintDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { addSprint, setCurrentSprint } = useSprintStore();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      startDate: new Date(),
      endDate: (() => {
        const date = new Date();
        date.setDate(date.getDate() + 14);
        return date;
      })(),
    },
  });

  const startDate = watch("startDate");
  const endDate = watch("endDate");

  useEffect(() => {
    if (!open) {
      reset();
    }
  }, [open, reset]);

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      const res = await sprintService.create({
        name: data.name,
        goal: data.goal,
        startDate: data.startDate.toISOString(),
        endDate: data.endDate.toISOString(),
        projectId,
      });
      const sprint = res.data.data;
      addSprint(sprint);
      setCurrentSprint(sprint);
      toast.success(`Sprint "${sprint.name}" created!`);
      reset();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? "Failed to create sprint.");
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
          <DialogTitle>Create sprint</DialogTitle>
          <DialogDescription className="text-xs font-semibold">
            Define your sprint scope and timeline.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4 mt-2"
        >
          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sprint-name" className="text-sm">
              Sprint Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="sprint-name"
              placeholder="e.g. Sprint 1"
              autoFocus
              className={cn(
                "h-10 rounded-xl font-medium",
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

          {/* Goal */}
          {/* <div className="flex flex-col gap-1.5">
            <Label htmlFor="sprint-goal" className="text-sm">
              Sprint goal{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </Label>
            <Textarea
              id="sprint-goal"
              placeholder="What do you want to achieve in this sprint?"
              rows={2}
              className="rounded-xl resize-none text-sm font-medium"
              {...register("goal")}
            />
          </div> */}

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            {/* Start Date */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="start-date" className="text-sm">
                Start Date <span className="text-destructive">*</span>
              </Label>
              <DatePickerInput
                date={startDate}
                onDateChange={(date) => date && setValue("startDate", date)}
                placeholder="Select start date"
                inputClassName="h-10 rounded-xl"
                disabled={(date) => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  // Cannot select past dates or dates after end date
                  return date < today || (endDate ? date > endDate : false);
                }}
                required
              />
              {errors.startDate && (
                <p className="text-[11px] text-destructive">
                  {errors.startDate.message}
                </p>
              )}
            </div>

            {/* End Date */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="end-date" className="text-sm">
                End Date <span className="text-destructive">*</span>
              </Label>
              <DatePickerInput
                date={endDate}
                onDateChange={(date) => date && setValue("endDate", date)}
                placeholder="Select end date"
                inputClassName="h-10 rounded-xl"
                disabled={(date) => (startDate ? date < startDate : false)}
                required
              />
              {errors.endDate && (
                <p className="text-[11px] text-destructive">
                  {errors.endDate.message}
                </p>
              )}
            </div>
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
                "Create sprint"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// import { useState } from "react";
// import { useForm } from "react-hook-form";
// import { zodResolver } from "@hookform/resolvers/zod";
// import { z } from "zod";
// import { toast } from "sonner";
// import { Loader2 } from "lucide-react";
// import {
//   Dialog,
//   DialogContent,
//   DialogHeader,
//   DialogTitle,
//   DialogDescription,
// } from "@/components/ui/dialog";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Textarea } from "@/components/ui/textarea";
// import { sprintService } from "@/services";
// import { useSprintStore } from "@/stores";
// import { cn } from "@/lib/utils";

// const schema = z
//   .object({
//     name: z.string().min(1, "Sprint name is required").max(100),
//     goal: z.string().max(500).optional(),
//     startDate: z.string().min(1, "Start date is required"),
//     endDate: z.string().min(1, "End date is required"),
//   })
//   .refine((d) => new Date(d.endDate) > new Date(d.startDate), {
//     message: "End date must be after start date",
//     path: ["endDate"],
//   });

// type FormData = z.infer<typeof schema>;

// interface CreateSprintDialogProps {
//   open: boolean;
//   onOpenChange: (open: boolean) => void;
//   projectId: string;
// }

// export default function CreateSprintDialog({
//   open,
//   onOpenChange,
//   projectId,
// }: CreateSprintDialogProps) {
//   const [isLoading, setIsLoading] = useState(false);
//   const { addSprint, setCurrentSprint } = useSprintStore();

//   const {
//     register,
//     handleSubmit,
//     reset,
//     formState: { errors },
//   } = useForm<FormData>({ resolver: zodResolver(schema) });

//   const onSubmit = async (data: FormData) => {
//     setIsLoading(true);
//     try {
//       const res = await sprintService.create({
//         name: data.name,
//         goal: data.goal,
//         startDate: data.startDate,
//         endDate: data.endDate,
//         projectId,
//       });
//       const sprint = res.data.data;
//       addSprint(sprint);
//       setCurrentSprint(sprint);
//       toast.success(`Sprint "${sprint.name}" created!`);
//       reset();
//       onOpenChange(false);
//     } catch (err: any) {
//       toast.error(err.response?.data?.message ?? "Failed to create sprint.");
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const handleClose = () => {
//     if (isLoading) return;
//     reset();
//     onOpenChange(false);
//   };

//   // Default dates: today → today + 14 days
//   const today = new Date().toISOString().split("T")[0];
//   const twoWeeks = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
//     .toISOString()
//     .split("T")[0];

//   return (
//     <Dialog open={open} onOpenChange={handleClose}>
//       <DialogContent className="sm:max-w-md rounded-2xl">
//         <DialogHeader>
//           <DialogTitle>Create sprint</DialogTitle>
//           <DialogDescription className="text-xs font-semibold">
//             Define your sprint scope and timeline.
//           </DialogDescription>
//         </DialogHeader>

//         <form
//           onSubmit={handleSubmit(onSubmit)}
//           className="flex flex-col gap-4 mt-2"
//         >
//           {/* Name */}
//           <div className="flex flex-col gap-1.5">
//             <Label htmlFor="sprint-name" className="text-sm">
//               Sprint name <span className="text-destructive">*</span>
//             </Label>
//             <Input
//               id="sprint-name"
//               placeholder="e.g. Sprint 1"
//               autoFocus
//               className={cn(
//                 "h-10 rounded-xl font-medium",
//                 errors.name && "border-destructive",
//               )}
//               {...register("name")}
//             />
//             {errors.name && (
//               <p className="text-[11px] text-destructive">
//                 {errors.name.message}
//               </p>
//             )}
//           </div>

//           {/* Goal */}
//           <div className="flex flex-col gap-1.5">
//             <Label htmlFor="sprint-goal" className="text-sm">
//               Sprint goal{" "}
//               <span className="text-muted-foreground font-normal">
//                 (optional)
//               </span>
//             </Label>
//             <Textarea
//               id="sprint-goal"
//               placeholder="What do you want to achieve in this sprint?"
//               rows={2}
//               className="rounded-xl resize-none text-sm font-medium"
//               {...register("goal")}
//             />
//           </div>

//           {/* Dates */}
//           <div className="grid grid-cols-2 gap-3">
//             <div className="flex flex-col gap-1.5">
//               <Label htmlFor="start-date" className="text-sm">
//                 Start date <span className="text-destructive">*</span>
//               </Label>
//               <Input
//                 id="start-date"
//                 type="date"
//                 defaultValue={today}
//                 className={cn(
//                   "h-10 rounded-xl",
//                   errors.startDate && "border-destructive",
//                 )}
//                 {...register("startDate")}
//               />
//               {errors.startDate && (
//                 <p className="text-[11px] text-destructive">
//                   {errors.startDate.message}
//                 </p>
//               )}
//             </div>
//             <div className="flex flex-col gap-1.5">
//               <Label htmlFor="end-date" className="text-sm">
//                 End date <span className="text-destructive">*</span>
//               </Label>
//               <Input
//                 id="end-date"
//                 type="date"
//                 defaultValue={twoWeeks}
//                 className={cn(
//                   "h-10 rounded-xl",
//                   errors.endDate && "border-destructive",
//                 )}
//                 {...register("endDate")}
//               />
//               {errors.endDate && (
//                 <p className="text-[11px] text-destructive">
//                   {errors.endDate.message}
//                 </p>
//               )}
//             </div>
//           </div>

//           {/* Actions */}
//           <div className="flex gap-2 pt-1">
//             <Button
//               type="button"
//               variant="outline"
//               className="flex-1 rounded-xl"
//               onClick={handleClose}
//               disabled={isLoading}
//             >
//               Cancel
//             </Button>
//             <Button
//               type="submit"
//               className="flex-1 rounded-xl font-semibold"
//               disabled={isLoading}
//             >
//               {isLoading ? (
//                 <Loader2 className="h-4 w-4 animate-spin" />
//               ) : (
//                 "Create sprint"
//               )}
//             </Button>
//           </div>
//         </form>
//       </DialogContent>
//     </Dialog>
//   );
// }
