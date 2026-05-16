import api from "./axios";

export const timerService = {
  startTimer: (subtaskId: string) => api.post("/timer/start", { subtaskId }),

  stopTimer: (subtaskId: string) => api.post("/timer/stop", { subtaskId }),

  getTimerStatus: (subtaskId: string) => api.get(`/timer/status/${subtaskId}`),

  getTimerSessions: (subtaskId: string) =>
    api.get(`/timer/sessions/${subtaskId}`),
};
