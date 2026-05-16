import { useState, useEffect, useRef } from "react";

interface UseTimerProps {
  activeTimerStart: string | null;
  trackedTime: number; // seconds already tracked
}

export const useTimer = ({ activeTimerStart, trackedTime }: UseTimerProps) => {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (activeTimerStart) {
      // Calculate already elapsed from the start time
      const startMs = new Date(activeTimerStart).getTime();

      const tick = () => {
        const now = Date.now();
        const sessionElapsed = Math.floor((now - startMs) / 1000);
        setElapsed(trackedTime + sessionElapsed);
      };

      tick(); // immediate first tick
      intervalRef.current = setInterval(tick, 1000);
    } else {
      setElapsed(trackedTime);
      if (intervalRef.current) clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [activeTimerStart, trackedTime]);

  const formatTime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;

    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  return {
    elapsed,
    formatted: formatTime(elapsed),
    isRunning: !!activeTimerStart,
  };
};
