// import { useEffect, useState } from "react";
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
// } from "@/components/ui/dialog";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Textarea } from "@/components/ui/textarea";
// import { sprintService } from "@/services";
// import { useSprintStore } from "@/stores";
// import type { Sprint } from "@/types";
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

// interface EditSprintDialogProps {
//   open: boolean;
//   onOpenChange: (open: boolean) => void;
//   sprint: Sprint;
// }

// export default function EditSprintDialog({
//   open,
//   onOpenChange,
//   sprint,
// }: EditSprintDialogProps) {
//   const [isLoading, setIsLoading] = useState(false);
//   const { updateSprint } = useSprintStore();

//   const {
//     register,
//     handleSubmit,
//     reset,
//     formState: { errors },
//   } = useForm<FormData>({ resolver: zodResolver(schema) });

//   useEffect(() => {
//     if (open) {
//       reset({
//         name: sprint.name,
//         goal: sprint.goal ?? "",
//         startDate: sprint.startDate.split("T")[0],
//         endDate: sprint.endDate.split("T")[0],
//       });
//     }
//   }, [open, sprint]);

//   const onSubmit = async (data: FormData) => {
//     setIsLoading(true);
//     // Optimistic
//     updateSprint(sprint._id, {
//       name: data.name,
//       goal: data.goal,
//       startDate: data.startDate,
//       endDate: data.endDate,
//     });
//     try {
//       const res = await sprintService.update(sprint._id, {
//         name: data.name,
//         goal: data.goal,
//         startDate: data.startDate,
//         endDate: data.endDate,
//         projectId: sprint.projectId,
//       });
//       updateSprint(sprint._id, res.data.data);
//       toast.success("Sprint updated.");
//       onOpenChange(false);
//     } catch (err: any) {
//       // Rollback
//       updateSprint(sprint._id, sprint);
//       toast.error(err.response?.data?.message ?? "Failed to update sprint.");
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   return (
//     <Dialog open={open} onOpenChange={(o) => !isLoading && onOpenChange(o)}>
//       <DialogContent className="sm:max-w-md rounded-2xl">
//         <DialogHeader>
//           <DialogTitle>Edit sprint</DialogTitle>
//         </DialogHeader>

//         <form
//           onSubmit={handleSubmit(onSubmit)}
//           className="flex flex-col gap-4 mt-2"
//         >
//           <div className="flex flex-col gap-1.5">
//             <Label className="text-sm">Sprint name</Label>
//             <Input
//               autoFocus
//               className={cn(
//                 "h-10 rounded-xl",
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

//           <div className="flex flex-col gap-1.5">
//             <Label className="text-sm">Sprint goal</Label>
//             <Textarea
//               rows={2}
//               className="rounded-xl resize-none text-sm"
//               {...register("goal")}
//             />
//           </div>

//           <div className="grid grid-cols-2 gap-3">
//             <div className="flex flex-col gap-1.5">
//               <Label className="text-sm">Start date</Label>
//               <Input
//                 type="date"
//                 className={cn(
//                   "h-10 rounded-xl",
//                   errors.startDate && "border-destructive",
//                 )}
//                 {...register("startDate")}
//               />
//             </div>
//             <div className="flex flex-col gap-1.5">
//               <Label className="text-sm">End date</Label>
//               <Input
//                 type="date"
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

//           <div className="flex gap-2 pt-1">
//             <Button
//               type="button"
//               variant="outline"
//               className="flex-1 rounded-xl"
//               onClick={() => onOpenChange(false)}
//               disabled={isLoading}
//             >
//               Cancel
//             </Button>
//             <Button
//               type="submit"
//               className="flex-1 rounded-xl"
//               disabled={isLoading}
//             >
//               {isLoading ? (
//                 <Loader2 className="h-4 w-4 animate-spin" />
//               ) : (
//                 "Save changes"
//               )}
//             </Button>
//           </div>
//         </form>
//       </DialogContent>
//     </Dialog>
//   );
// }

import { useEffect, useState } from "react";
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
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { sprintService } from "@/services";
import { useSprintStore } from "@/stores";
import type { Sprint } from "@/types";
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

interface EditSprintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sprint: Sprint;
}

export default function EditSprintDialog({
  open,
  onOpenChange,
  sprint,
}: EditSprintDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { updateSprint } = useSprintStore();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const startDate = watch("startDate");
  const endDate = watch("endDate");

  useEffect(() => {
    if (open) {
      reset({
        name: sprint.name,
        goal: sprint.goal ?? "",
        startDate: new Date(sprint.startDate),
        endDate: new Date(sprint.endDate),
      });
    }
  }, [open, sprint, reset]);

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    // Optimistic
    updateSprint(sprint._id, {
      name: data.name,
      goal: data.goal,
      startDate: data.startDate.toISOString(),
      endDate: data.endDate.toISOString(),
    });
    try {
      const res = await sprintService.update(sprint._id, {
        name: data.name,
        goal: data.goal,
        startDate: data.startDate.toISOString(),
        endDate: data.endDate.toISOString(),
        projectId: sprint.projectId,
      });
      updateSprint(sprint._id, res.data.data);
      toast.success("Sprint updated.");
      onOpenChange(false);
    } catch (err: any) {
      // Rollback
      updateSprint(sprint._id, sprint);
      toast.error(err.response?.data?.message ?? "Failed to update sprint.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !isLoading && onOpenChange(o)}>
      <DialogContent className="sm:max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle>Edit sprint</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4 mt-2"
        >
          <div className="flex flex-col gap-1.5">
            <Label className="text-sm">Sprint name</Label>
            <Input
              autoFocus
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
            <Label className="text-sm">Sprint goal</Label>
            <Textarea
              rows={2}
              className="rounded-xl resize-none text-sm"
              {...register("goal")}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Start Date */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm">Start date</Label>
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
              <Label className="text-sm">End date</Label>
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

          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              className="flex-1 "
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1 " disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Save changes"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
