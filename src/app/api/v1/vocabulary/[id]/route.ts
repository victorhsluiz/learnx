import { withRoute } from "@/core/http";
import { container } from "@/core/container";

export const GET = withRoute<RouteContext<"/api/v1/vocabulary/[id]">>(async (request, ctx) => {
  const { id } = await ctx.params;
  return container.wordController.getById(request, id);
});

export const PATCH = withRoute<RouteContext<"/api/v1/vocabulary/[id]">>(async (request, ctx) => {
  const { id } = await ctx.params;
  return container.wordController.update(request, id);
});

export const DELETE = withRoute<RouteContext<"/api/v1/vocabulary/[id]">>(async (request, ctx) => {
  const { id } = await ctx.params;
  return container.wordController.delete(request, id);
});
