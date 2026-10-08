import { withRoute } from "@/core/http";
import { container } from "@/core/container";

export const GET = withRoute(async (request) => {
  return container.wordController.list(request);
});

export const POST = withRoute(async (request) => {
  return container.wordController.create(request);
});
