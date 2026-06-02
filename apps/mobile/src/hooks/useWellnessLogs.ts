import { useEffect, useState, useCallback } from "react";
import type { WellnessLog } from "@mediguard/shared";
import { useAuthStore } from "@/store/authStore";
import { getLogsRange } from "@/services/wellnessLog";

export function useWellnessLogs(days: number = 30): {
  logs: WellnessLog[];
  loading: boolean;
  refresh: () => Promise<void>;
} {
  const user = useAuthStore((s) => s.user);
  const userId = user?.id ?? null;

  const [logs, setLogs] = useState<WellnessLog[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const refresh = useCallback(async () => {
    if (!userId) {
      setLogs([]);
      return;
    }
    setLoading(true);
    try {
      const data = await getLogsRange(userId, days);
      setLogs(data);
    } finally {
      setLoading(false);
    }
  }, [userId, days]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { logs, loading, refresh };
}
