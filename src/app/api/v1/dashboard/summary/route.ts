import { withRoute } from "@/core/http";
import { container } from "@/core/container";

export const GET = withRoute(async (request) => {
  return container.dashboardController.getSummary(request);
});
