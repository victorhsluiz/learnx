import { withRoute } from "@/core/http";
import { container } from "@/core/container";

export const GET = withRoute<RouteContext<"/api/v1/notes/[id]">>(async (request, ctx) => {
  const { id } = await ctx.params;
  return container.noteController.getById(request, id);
});

export const PATCH = withRoute<RouteContext<"/api/v1/notes/[id]">>(async (request, ctx) => {
  const { id } = await ctx.params;
  return container.noteController.update(request, id);
});

export const DELETE = withRoute<RouteContext<"/api/v1/notes/[id]">>(async (request, ctx) => {
  const { id } = await ctx.params;
  return container.noteController.delete(request, id);
});
