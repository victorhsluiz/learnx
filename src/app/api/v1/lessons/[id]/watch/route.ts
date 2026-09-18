import { withRoute } from "@/core/http";
import { container } from "@/core/container";

export const POST = withRoute<RouteContext<"/api/v1/lessons/[id]/watch">>(async (request, ctx) => {
  const { id } = await ctx.params;
  return container.lessonController.markWatched(request, id);
});
