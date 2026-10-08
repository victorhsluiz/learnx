import { withRoute } from "@/core/http";
import { container } from "@/core/container";

export const GET = withRoute<RouteContext<"/api/v1/study-tasks/[id]">>(async (request, ctx) => {
  const { id } = await ctx.params;
  return container.studyTaskController.getById(request, id);
});

export const PATCH = withRoute<RouteContext<"/api/v1/study-tasks/[id]">>(async (request, ctx) => {
  const { id } = await ctx.params;
  return container.studyTaskController.update(request, id);
});

export const DELETE = withRoute<RouteContext<"/api/v1/study-tasks/[id]">>(async (request, ctx) => {
  const { id } = await ctx.params;
  return container.studyTaskController.delete(request, id);
});
