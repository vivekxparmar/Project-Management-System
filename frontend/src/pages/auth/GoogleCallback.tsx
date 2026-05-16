import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "@/stores";
import { authService } from "@/services";
import AppLoader from "@/components/shared/AppLoader";

export default function GoogleCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);

  useEffect(() => {
    const token = params.get("token");
    if (!token) {
      navigate("/login?error=google_failed");
      return;
    }

    const fetchUser = async () => {
      try {
        localStorage.setItem("token", token);
        const res = await authService.getMe();
        // login(res.data.data, token);
        login(res.data.user, token);
        navigate("/projects", { replace: true });
      } catch {
        navigate("/login?error=google_failed");
      }
    };

    fetchUser();
  }, []);

  return <AppLoader />;
}
