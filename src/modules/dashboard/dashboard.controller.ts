import { ok, requireUser } from "@/core/http";
import type { DashboardService } from "./dashboard.service";

export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  async getSummary(request: Request): Promise<Response> {
    const user = await requireUser(request);
    const summary = await this.dashboardService.getSummary(user.id);
    return ok(summary);
  }
}
