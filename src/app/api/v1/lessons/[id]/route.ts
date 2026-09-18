import { withRoute } from "@/core/http";
import { container } from "@/core/container";

export const GET = withRoute<RouteContext<"/api/v1/lessons/[id]">>(async (request, ctx) => {
  const { id } = await ctx.params;
  return container.lessonController.getById(request, id);
});

export const PATCH = withRoute<RouteContext<"/api/v1/lessons/[id]">>(async (request, ctx) => {
  const { id } = await ctx.params;
  return container.lessonController.update(request, id);
});

export const DELETE = withRoute<RouteContext<"/api/v1/lessons/[id]">>(async (request, ctx) => {
  const { id } = await ctx.params;
  return container.lessonController.delete(request, id);
});
