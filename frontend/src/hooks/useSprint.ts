import { useSprintStore } from "../stores";
import { useTaskStore } from "../stores";
import { sprintService, taskService } from "../services";
import type { Sprint } from "../types";

export const useSprint = (projectId?: string) => {
  const {
    sprints,
    currentSprint,
    isLoading,
    setSprints,
    setCurrentSprint,
    setLoading,
    addSprint,
    updateSprint,
    updateSprintStatus,
    toggleSprintLock,
    removeSprint,
    clearSprints,
  } = useSprintStore();

  const { setSprintTasks, setLoading: setTaskLoading } = useTaskStore();

  const fetchSprints = async (projId?: string) => {
    const id = projId ?? projectId;
    if (!id) return;
    setLoading(true);
    try {
      const res = await sprintService.getAll(id);
      const fetchedSprints: Sprint[] = res.data.data;
      setSprints(fetchedSprints);

      // Restore saved sprint
      const savedId = localStorage.getItem(`currentSprintId-${id}`);
      if (savedId) {
        const saved = fetchedSprints.find((s) => s._id === savedId);
        if (saved) setCurrentSprint(saved);
      }
    } catch (err) {
      console.error("Failed to fetch sprints:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSprintTasks = async (sprintId: string) => {
    setTaskLoading(true);
    try {
      const res = await taskService.getBySprint(sprintId);
      setSprintTasks(sprintId, res.data.data);
    } catch (err) {
      console.error("Failed to fetch sprint tasks:", err);
    } finally {
      setTaskLoading(false);
    }
  };

  return {
    sprints,
    currentSprint,
    isLoading,
    fetchSprints,
    fetchSprintTasks,
    setCurrentSprint,
    addSprint,
    updateSprint,
    updateSprintStatus,
    toggleSprintLock,
    removeSprint,
    clearSprints,
  };
};
