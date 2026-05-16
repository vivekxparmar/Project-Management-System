import { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import AuthLayout from "@/components/shared/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { authService } from "@/services";
import { useAuthStore } from "@/stores";
import { cn } from "@/lib/utils";
import { connectSocket } from "@/lib/socket";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type FormData = z.infer<typeof schema>;

export default function Login() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const login = useAuthStore((s) => s.login);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const email = watch("email");
  const password = watch("password");

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      const res = await authService.login(data);
      const { user, token } = res.data;
      // console.log("LOGIN RESPONSE:", res.data);
      login(user, token);
      connectSocket(token);
      toast.success(`Welcome back, ${user.name.split(" ")[0]}!`);
      navigate("/projects", { replace: true });
    } catch (err: any) {
      toast.error(
        err.response?.data?.message ?? "Login failed. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const google_url =
    import.meta.env.VITE_GOOGLE_CALLBACK_URL ||
    "http://localhost:5000/api/auth/google";

  const handleGoogle = () => {
    window.location.href = google_url;
  };

  return (
    <AuthLayout title="Sign In" subtitle="Sign in to your workspace">
      {/* Google error */}
      {params.get("error") === "google_failed" && (
        <div className="mb-4 text-xs text-destructive bg-destructive/10 rounded-xl px-3 py-2 font-semibold">
          Google sign-in failed. Please try again.
        </div>
      )}

      {/* Google */}
      <Button
        variant="outline"
        className="w-full h-10 gap-2 mb-5"
        onClick={handleGoogle}
        type="button"
      >
        <FcGoogle className="h-4 w-4" />
        Continue with Google
      </Button>

      <div className="flex items-center gap-3 mb-5">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground font-semibold">or</span>
        <Separator className="flex-1" />
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email" className="text-sm">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            className={cn(
              "h-10 font-medium",
              errors.email && "border-destructive",
            )}
            {...register("email")}
          />
          {errors.email && (
            <p className="text-[11px] text-destructive font-medium">
              {errors.email.message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-sm">
              Password
            </Label>
            <Link
              to="/forgot-password"
              className="text-[11px] text-primary hover:underline font-medium"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              autoComplete="current-password"
              className={cn(
                "h-10 font-medium pr-10",
                errors.password && "border-destructive",
              )}
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((p) => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="text-[11px] text-destructive font-medium">
              {errors.password.message}
            </p>
          )}
        </div>

        <Button
          type="submit"
          className="h-10 font-semibold mt-1"
          disabled={isLoading || !email || !password}
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
        </Button>
      </form>

      <p className="text-xs text-center text-muted-foreground mt-6 font-semibold">
        Don't have an account?{" "}
        <Link
          to="/register"
          className="text-primary hover:underline font-medium"
        >
          Sign up
        </Link>
      </p>
    </AuthLayout>
  );
}
