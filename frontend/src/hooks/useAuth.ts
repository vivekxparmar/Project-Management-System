import { useEffect } from "react";
import { useAuthStore } from "../stores";
import { authService } from "../services";
import { disconnectSocket } from "./useSocket";

export const useAuth = () => {
  const {
    user,
    token,
    isAuthenticated,
    isLoading,
    login,
    logout,
    setLoading,
    updateUser,
  } = useAuthStore();

  // On app boot — verify token and fetch user
  useEffect(() => {
    const storedToken = localStorage.getItem("token");

    if (!storedToken) {
      setLoading(false);
      return;
    }

    const verify = async () => {
      try {
        const res = await authService.getMe();
        login(res.data.user, storedToken);
      } catch {
        logout();
      } finally {
        setLoading(false);
      }
    };

    verify();
  }, []);

  // Listen for auth:logout event (fired by axios interceptor)
  useEffect(() => {
    const handleLogout = () => {
      logout();
      disconnectSocket();
    };
    window.addEventListener("auth:logout", handleLogout);
    return () => window.removeEventListener("auth:logout", handleLogout);
  }, [logout]);

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch {
      // ignore
    } finally {
      logout();
      disconnectSocket();
    }
  };

  return {
    user,
    token,
    isAuthenticated,
    isLoading,
    logout: handleLogout,
    updateUser,
  };
};
