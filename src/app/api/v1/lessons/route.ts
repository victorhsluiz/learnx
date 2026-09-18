import { withRoute } from "@/core/http";
import { container } from "@/core/container";

export const GET = withRoute(async (request) => {
  return container.lessonController.list(request);
});

export const POST = withRoute(async (request) => {
  return container.lessonController.create(request);
});
