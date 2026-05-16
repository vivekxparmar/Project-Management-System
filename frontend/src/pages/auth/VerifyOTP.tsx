import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, MailCheck } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { authService } from "@/services";
import { useAuthStore } from "@/stores";
import { cn } from "@/lib/utils";
import { connectSocket } from "@/lib/socket";

const OTP_LENGTH = 6;

export default function VerifyOTP() {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((s) => s.login);

  const email = location.state?.email as string;
  const type = (location.state?.type as string) ?? "register";
  // const resetToken = location.state?.resetToken as string;

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer
  useEffect(() => {
    if (!email) {
      navigate("/register");
      return;
    }
    const interval = setInterval(() => {
      setCountdown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [email]);

  const focusNext = (index: number) => {
    if (index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus();
  };

  const focusPrev = (index: number) => {
    if (index > 0) inputRefs.current[index - 1]?.focus();
  };

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value) focusNext(index);

    // Auto-submit when all filled
    if (newOtp.every((d) => d !== "") && newOtp.length === OTP_LENGTH) {
      handleSubmit(newOtp.join(""));
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace" && !otp[index]) focusPrev(index);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "");
    if (text.length === OTP_LENGTH) {
      const newOtp = text.split("").slice(0, OTP_LENGTH);
      setOtp(newOtp);
      inputRefs.current[OTP_LENGTH - 1]?.focus();
      handleSubmit(text);
    }
  };

  const handleSubmit = async (code?: string) => {
    const value = code ?? otp.join("");
    if (value.length !== OTP_LENGTH) {
      toast.error("Please enter the complete 6-digit OTP.");
      return;
    }

    setIsLoading(true);
    try {
      if (type === "register") {
        const res = await authService.verifyOTP({ email, otp: value });
        const { user, token } = res.data;
        login(user, token);
        connectSocket(token);
        toast.success("Email verified! Welcome aboard!");
        navigate("/projects", { replace: true });
      } else {
        // Forgot password OTP
        const res = await authService.verifyForgotOTP({ email, otp: value });
        const { resetToken: token } = res.data;
        toast.success("OTP verified!");
        navigate("/reset-password", { state: { resetToken: token } });
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? "Invalid OTP. Try again.");
      setOtp(Array(OTP_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    try {
      if (type === "register") {
        await authService.resendOTP(email);
      } else {
        await authService.forgotPassword({ email });
      }
      toast.success("New OTP sent to your email.");
      setCountdown(60);
      setOtp(Array(OTP_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? "Failed to resend OTP.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm"
      >
        {/* Icon */}
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
          <MailCheck className="h-7 w-7 text-primary" />
        </div>

        <h1 className="text-2xl font-medium tracking-tight mb-1">
          Check your email
        </h1>
        <p className="text-sm font-semibold text-muted-foreground mb-8">
          We sent a 6-digit code to{" "}
          <span className="font-semibold text-foreground">{email}</span>
        </p>

        {/* OTP inputs */}
        <div className="flex gap-2 mb-6 justify-between" onPaste={handlePaste}>
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={(el) => {
                inputRefs.current[i] = el;
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className={cn(
                "w-12 h-12 text-center text-lg font-bold rounded-xl border-2 bg-background",
                "focus:outline-none focus:border-primary transition-colors",
                digit ? "border-primary" : "border-border",
              )}
            />
          ))}
        </div>

        {/* Submit */}
        <Button
          className="w-full h-10 rounded-xl font-semibold"
          onClick={() => handleSubmit()}
          disabled={isLoading || otp.some((d) => !d)}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Verify OTP"
          )}
        </Button>

        {/* Resend */}
        <div className="flex items-center justify-center gap-1 mt-5">
          <span className="text-xs font-semibold text-muted-foreground">
            Didn't receive the code?
          </span>
          {countdown > 0 ? (
            <span className="text-xs font-semibold text-muted-foreground">
              Resend in{" "}
              <span className="text-primary font-semibold">{countdown}s</span>
            </span>
          ) : (
            <Button
              onClick={handleResend}
              disabled={isResending}
              className="text-xs text-primary hover:underline font-semibold disabled:opacity-50"
            >
              {isResending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                "Resend OTP"
              )}
            </Button>
          )}
        </div>

        <p className="text-xs text-center font-semibold text-muted-foreground mt-4">
          <Link to="/login" className="text-primary hover:underline">
            Back to login
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
