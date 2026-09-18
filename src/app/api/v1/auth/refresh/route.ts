import { withRoute } from "@/core/http";
import { container } from "@/core/container";

export const POST = withRoute(async (request) => {
  return container.authController.refresh(request);
});
