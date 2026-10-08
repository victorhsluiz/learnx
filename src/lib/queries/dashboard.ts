import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

/** Mirrors modules/dashboard/dashboard.service.ts's DashboardSummary shape. */
export interface DashboardSummary {
  words: { total: number; last7Days: number };
  lessons: { completed: number; pending: number };
  scheduleTasks: { dueToday: number; dueThisWeek: number };
}

export function useDashboardSummary() {
  return useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: () => apiClient.get<DashboardSummary>("/dashboard/summary"),
  });
}
