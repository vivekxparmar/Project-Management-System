// import { useState, useRef } from "react";
// import { useNavigate } from "react-router-dom";
// import { useForm } from "react-hook-form";
// import { zodResolver } from "@hookform/resolvers/zod";
// import { z } from "zod";
// import { toast } from "sonner";
// import { motion } from "framer-motion";
// import {
//   ArrowLeft,
//   Camera,
//   Loader2,
//   Moon,
//   Sun,
//   Save,
//   Lock,
// } from "lucide-react";
// import { useTheme } from "next-themes";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
// import { Separator } from "@/components/ui/separator";
// import { useAuthStore, useProjectStore, useTaskStore } from "@/stores";
// import { profileService } from "@/services";
// import { getInitials } from "@/lib/constants";
// import { cn } from "@/lib/utils";

// const profileSchema = z.object({
//   name: z.string().min(2, "Name must be at least 2 characters").max(50),
// });

// const passwordSchema = z
//   .object({
//     currentPassword: z.string().min(1, "Current password is required"),
//     newPassword: z.string().min(6, "Password must be at least 6 characters"),
//     confirmPassword: z.string(),
//   })
//   .refine((d) => d.newPassword === d.confirmPassword, {
//     message: "Passwords do not match",
//     path: ["confirmPassword"],
//   });

// type ProfileFormData = z.infer<typeof profileSchema>;
// type PasswordFormData = z.infer<typeof passwordSchema>;

// export default function Profile() {
//   const navigate = useNavigate();
//   const { resolvedTheme, setTheme } = useTheme();
//   const { user, updateUser } = useAuthStore();

//   const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
//   const [avatarFile, setAvatarFile] = useState<File | null>(null);
//   const [isSavingProfile, setIsSavingProfile] = useState(false);
//   const [isSavingPassword, setIsSavingPassword] = useState(false);
//   const fileInputRef = useRef<HTMLInputElement>(null);

//   const {
//     register: profileRegister,
//     handleSubmit: handleProfileSubmit,
//     formState: { errors: profileErrors },
//   } = useForm<ProfileFormData>({
//     defaultValues: { name: user?.name ?? "" },
//   });

//   const {
//     register: passRegister,
//     handleSubmit: handlePassSubmit,
//     reset: resetPass,
//     formState: { errors: passErrors },
//   } = useForm<PasswordFormData>();

//   const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0];
//     if (!file) return;
//     setAvatarFile(file);
//     setAvatarPreview(URL.createObjectURL(file));
//   };

//   const onProfileSubmit = async (data: ProfileFormData) => {
//     setIsSavingProfile(true);
//     try {
//       const res = await profileService.update({
//         name: data.name,
//         avatar: avatarFile ?? undefined,
//       });
//       updateUser(res.data.data);
//       setAvatarFile(null);
//       if (avatarPreview) {
//         // URL.revokeObjectURL(avatarPreview);
//         // setAvatarPreview(null);
//         setTimeout(() => {
//           URL.revokeObjectURL(avatarPreview);
//           setAvatarPreview(null);
//         }, 100);
//       }
//       toast.success("Profile updated.");
//     } catch (err: any) {
//       toast.error(err.response?.data?.message ?? "Failed to update profile.");
//     } finally {
//       setIsSavingProfile(false);
//     }
//   };

//   const onPasswordSubmit = async (data: PasswordFormData) => {
//     setIsSavingPassword(true);
//     try {
//       await profileService.changePassword({
//         currentPassword: data.currentPassword,
//         newPassword: data.newPassword,
//       });
//       toast.success("Password changed.");
//       resetPass();
//     } catch (err: any) {
//       toast.error(err.response?.data?.message ?? "Failed to change password.");
//     } finally {
//       setIsSavingPassword(false);
//     }
//   };

//   return (
//     <div className="min-h-screen bg-background">
//       {/* Header */}
//       <div className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
//         <div className="max-w-2xl mx-auto px-6 h-14 flex items-center gap-3">
//           <Button
//             variant="ghost"
//             size="icon"
//             className="h-8 w-8 rounded-xl"
//             onClick={() => navigate(-1)}
//           >
//             <ArrowLeft className="h-4 w-4" />
//           </Button>
//           <h1 className="text-sm font-semibold">Profile & Settings</h1>
//           <div className="flex-1" />
//           <Button
//             variant="ghost"
//             size="icon"
//             className="h-8 w-8 rounded-xl"
//             onClick={() =>
//               setTheme(resolvedTheme === "dark" ? "light" : "dark")
//             }
//           >
//             {resolvedTheme === "dark" ? (
//               <Sun className="h-4 w-4" />
//             ) : (
//               <Moon className="h-4 w-4" />
//             )}
//           </Button>
//         </div>
//       </div>

//       {/* Content */}
//       <div className="max-w-2xl mx-auto px-6 py-8">
//         <motion.div
//           initial={{ opacity: 0, y: 16 }}
//           animate={{ opacity: 1, y: 0 }}
//           transition={{ duration: 0.3 }}
//           className="flex flex-col gap-8"
//         >
//           {/* AVATAR + NAME */}
//           <section>
//             <h2 className="text-sm font-semibold mb-4">Profile</h2>
//             <form
//               onSubmit={handleProfileSubmit(onProfileSubmit)}
//               className="flex flex-col gap-5"
//             >
//               {/* Avatar */}
//               <div className="flex items-center gap-5">
//                 <div className="relative">
//                   <Avatar className="h-20 w-20">
//                     <AvatarImage
//                       key={avatarPreview ?? user?.avatar}
//                       src={avatarPreview ?? user?.avatar}
//                       alt={user?.name}
//                     />
//                     <AvatarFallback className="text-2xl font-bold bg-primary text-primary-foreground">
//                       {getInitials(user?.name ?? "U")}
//                     </AvatarFallback>
//                   </Avatar>
//                   <button
//                     type="button"
//                     onClick={() => fileInputRef.current?.click()}
//                     className="absolute -bottom-1 -right-1 w-7 h-7 bg-muted text-white rounded-full flex items-center justify-center shadow-sm hover:bg-muted/50 transition-colors"
//                   >
//                     <Camera className="h-3.5 w-3.5" />
//                   </button>
//                   <input
//                     ref={fileInputRef}
//                     type="file"
//                     accept="image/*"
//                     className="hidden"
//                     onChange={handleAvatarChange}
//                   />
//                 </div>
//                 <div>
//                   <p className="text-sm font-medium">{user?.name}</p>
//                   <p className="text-xs text-muted-foreground mt-0.5 font-semibold">
//                     {user?.email}
//                   </p>
//                   <p className="text-xs font-semibold text-muted-foreground/60 mt-1">
//                     Click the camera icon to change your avatar
//                   </p>
//                 </div>
//               </div>

//               {/* Name field */}
//               <div className="flex flex-col gap-1.5">
//                 <Label className="text-sm">Display name</Label>
//                 <Input
//                   className={cn(
//                     "h-10 rounded-xl",
//                     profileErrors.name && "border-destructive",
//                   )}
//                   {...profileRegister("name")}
//                 />
//                 {profileErrors.name && (
//                   <p className="text-[11px] text-destructive">
//                     {profileErrors.name.message}
//                   </p>
//                 )}
//               </div>

//               {/* Email (read-only) */}
//               <div className="flex flex-col gap-1.5">
//                 <Label className="text-sm text-muted-foreground font-medium">
//                   Email address
//                 </Label>
//                 <Input
//                   value={user?.email ?? ""}
//                   disabled
//                   className="h-10 rounded-xl bg-muted/50 text-muted-foreground font-semibold"
//                 />
//               </div>

//               <Button
//                 type="submit"
//                 className="w-fit h-9 rounded-xl gap-2 text-sm"
//                 disabled={isSavingProfile}
//               >
//                 {isSavingProfile ? (
//                   <Loader2 className="h-4 w-4 animate-spin" />
//                 ) : (
//                   <Save className="h-4 w-4" />
//                 )}
//                 Save profile
//               </Button>
//             </form>
//           </section>

//           <Separator />

//           {/* CHANGE PASSWORD */}
//           <section>
//             <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
//               <Lock className="h-3.5 w-3.5" />
//               Change Password
//             </h2>
//             <form
//               onSubmit={handlePassSubmit(onPasswordSubmit)}
//               className="flex flex-col gap-4"
//             >
//               <div className="flex flex-col gap-1.5">
//                 <Label className="text-sm">Current password</Label>
//                 <Input
//                   type="password"
//                   className={cn(
//                     "h-10 rounded-xl",
//                     passErrors.currentPassword && "border-destructive",
//                   )}
//                   {...passRegister("currentPassword")}
//                 />
//                 {passErrors.currentPassword && (
//                   <p className="text-[11px] text-destructive">
//                     {passErrors.currentPassword.message}
//                   </p>
//                 )}
//               </div>

//               <div className="flex flex-col gap-1.5">
//                 <Label className="text-sm">New password</Label>
//                 <Input
//                   type="password"
//                   className={cn(
//                     "h-10 rounded-xl",
//                     passErrors.newPassword && "border-destructive",
//                   )}
//                   {...passRegister("newPassword")}
//                 />
//                 {passErrors.newPassword && (
//                   <p className="text-[11px] text-destructive">
//                     {passErrors.newPassword.message}
//                   </p>
//                 )}
//               </div>

//               <div className="flex flex-col gap-1.5">
//                 <Label className="text-sm">Confirm new password</Label>
//                 <Input
//                   type="password"
//                   className={cn(
//                     "h-10 rounded-xl",
//                     passErrors.confirmPassword && "border-destructive",
//                   )}
//                   {...passRegister("confirmPassword")}
//                 />
//                 {passErrors.confirmPassword && (
//                   <p className="text-[11px] text-destructive">
//                     {passErrors.confirmPassword.message}
//                   </p>
//                 )}
//               </div>

//               <Button
//                 type="submit"
//                 className="w-fit h-9 rounded-xl gap-2 text-sm"
//                 disabled={isSavingPassword}
//               >
//                 {isSavingPassword ? (
//                   <Loader2 className="h-4 w-4 animate-spin" />
//                 ) : (
//                   <Lock className="h-4 w-4" />
//                 )}
//                 Change password
//               </Button>
//             </form>
//           </section>
//         </motion.div>
//       </div>
//     </div>
//   );
// }

import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Camera,
  Loader2,
  Moon,
  Sun,
  Save,
  Lock,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useAuthStore, useProjectStore, useTaskStore } from "@/stores";
import { profileService } from "@/services";
import { getInitials } from "@/lib/constants";
import { cn } from "@/lib/utils";

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(50),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

export default function Profile() {
  const navigate = useNavigate();
  const { resolvedTheme, setTheme } = useTheme();
  const { user, updateUser } = useAuthStore();
  const updateMemberInProject = useProjectStore((s) => s.updateMemberInProject);
  const updateAssigneeInTasks = useTaskStore((s) => s.updateAssigneeInTasks);

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register: profileRegister,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors },
  } = useForm<ProfileFormData>({
    defaultValues: { name: user?.name ?? "" },
  });

  const {
    register: passRegister,
    handleSubmit: handlePassSubmit,
    reset: resetPass,
    formState: { errors: passErrors },
  } = useForm<PasswordFormData>();

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const onProfileSubmit = async (data: ProfileFormData) => {
    setIsSavingProfile(true);
    try {
      const res = await profileService.update({
        name: data.name,
        avatar: avatarFile ?? undefined,
      });

      const updatedUser = res.data.data;
      const syncUpdates = {
        name: updatedUser.name,
        avatar: updatedUser.avatar,
      };

      // Sync across all stores simultaneously
      updateUser(updatedUser);
      updateMemberInProject(updatedUser._id, syncUpdates);
      updateAssigneeInTasks(updatedUser._id, syncUpdates);

      setAvatarFile(null);
      if (avatarPreview) {
        setTimeout(() => {
          URL.revokeObjectURL(avatarPreview);
          setAvatarPreview(null);
        }, 100);
      }

      toast.success("Profile updated.");
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? "Failed to update profile.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const onPasswordSubmit = async (data: PasswordFormData) => {
    setIsSavingPassword(true);
    try {
      await profileService.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      toast.success("Password changed.");
      resetPass();
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? "Failed to change password.");
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="max-w-2xl mx-auto px-6 h-14 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-xl"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-sm font-semibold">Profile & Settings</h1>
          <div className="flex-1" />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-xl"
            onClick={() =>
              setTheme(resolvedTheme === "dark" ? "light" : "dark")
            }
          >
            {resolvedTheme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col gap-8"
        >
          {/* AVATAR + NAME */}
          <section>
            <h2 className="text-sm font-semibold mb-4">Profile</h2>
            <form
              onSubmit={handleProfileSubmit(onProfileSubmit)}
              className="flex flex-col gap-5"
            >
              {/* Avatar */}
              <div className="flex items-center gap-5">
                <div className="relative">
                  <Avatar className="h-20 w-20">
                    <AvatarImage
                      key={avatarPreview ?? user?.avatar}
                      src={avatarPreview ?? user?.avatar}
                      alt={user?.name}
                    />
                    <AvatarFallback className="text-2xl font-bold bg-primary text-primary-foreground">
                      {getInitials(user?.name ?? "U")}
                    </AvatarFallback>
                  </Avatar>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-1 -right-1 w-7 h-7 bg-background/40 text-foreground rounded-full flex items-center justify-center shadow-sm hover:backdrop-blur-md transition-all"
                  >
                    <Camera className="h-3.5 w-3.5" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                </div>
                <div>
                  <p className="text-sm font-medium">{user?.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 font-semibold">
                    {user?.email}
                  </p>
                  <p className="text-xs font-semibold text-muted-foreground/60 mt-1">
                    Click the camera icon to change your avatar
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-sm">Display name</Label>
                <Input
                  className={cn(
                    "h-10 rounded-xl",
                    profileErrors.name && "border-destructive",
                  )}
                  {...profileRegister("name")}
                />
                {profileErrors.name && (
                  <p className="text-[11px] text-destructive">
                    {profileErrors.name.message}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-sm text-muted-foreground font-medium">
                  Email address
                </Label>
                <Input
                  value={user?.email ?? ""}
                  disabled
                  className="h-10 rounded-xl bg-muted/50 text-muted-foreground font-semibold"
                />
              </div>

              <Button
                type="submit"
                className="w-fit h-9 rounded-xl gap-2 text-sm"
                disabled={isSavingProfile}
              >
                {isSavingProfile ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save profile
              </Button>
            </form>
          </section>

          <Separator />

          {/* CHANGE PASSWORD */}
          <section>
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Lock className="h-3.5 w-3.5" />
              Change Password
            </h2>
            <form
              onSubmit={handlePassSubmit(onPasswordSubmit)}
              className="flex flex-col gap-4"
            >
              <div className="flex flex-col gap-1.5">
                <Label className="text-sm">Current password</Label>
                <Input
                  type="password"
                  className={cn(
                    "h-10 rounded-xl",
                    passErrors.currentPassword && "border-destructive",
                  )}
                  {...passRegister("currentPassword")}
                />
                {passErrors.currentPassword && (
                  <p className="text-[11px] text-destructive">
                    {passErrors.currentPassword.message}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-sm">New password</Label>
                <Input
                  type="password"
                  className={cn(
                    "h-10 rounded-xl",
                    passErrors.newPassword && "border-destructive",
                  )}
                  {...passRegister("newPassword")}
                />
                {passErrors.newPassword && (
                  <p className="text-[11px] text-destructive">
                    {passErrors.newPassword.message}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-sm">Confirm new password</Label>
                <Input
                  type="password"
                  className={cn(
                    "h-10 rounded-xl",
                    passErrors.confirmPassword && "border-destructive",
                  )}
                  {...passRegister("confirmPassword")}
                />
                {passErrors.confirmPassword && (
                  <p className="text-[11px] text-destructive">
                    {passErrors.confirmPassword.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-fit h-9 rounded-xl gap-2 text-sm"
                disabled={isSavingPassword}
              >
                {isSavingPassword ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Lock className="h-4 w-4" />
                )}
                Change password
              </Button>
            </form>
          </section>
        </motion.div>
      </div>
    </div>
  );
}
