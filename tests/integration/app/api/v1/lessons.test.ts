import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { GET as list, POST as create } from "@/app/api/v1/lessons/route";
import { GET as getById, PATCH as update, DELETE as remove } from "@/app/api/v1/lessons/[id]/route";
import { POST as watch } from "@/app/api/v1/lessons/[id]/watch/route";
import { prisma } from "@/core/database/prisma";
import { authenticatedRequest, registerTestUser, routeCtx } from "../../../helpers/auth";

function ctxWithId(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("lessons endpoints", () => {
  let accessToken: string;
  let otherAccessToken: string;

  beforeEach(async () => {
    const user = await registerTestUser("lessons-owner@learnx.dev");
    accessToken = user.accessToken;
    const otherUser = await registerTestUser("lessons-other@learnx.dev");
    otherAccessToken = otherUser.accessToken;
  });

  afterEach(async () => {
    await prisma.lesson.deleteMany({});
    await prisma.refreshToken.deleteMany({});
    await prisma.user.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("POST /api/v1/lessons", () => {
    it("creates a lesson scoped to the authenticated user", async () => {
      const response = await create(
        authenticatedRequest("http://localhost/api/v1/lessons", accessToken, {
          method: "POST",
          body: { title: "Aula 1 - Tons", type: "RECORDED", tags: ["tons"] },
        }),
        routeCtx,
      );
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.data).toMatchObject({
        title: "Aula 1 - Tons",
        type: "RECORDED",
        status: "PENDING",
      });
    });

    it("returns 401 without a valid session", async () => {
      const response = await create(
        new Request("http://localhost/api/v1/lessons", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ title: "X", type: "RECORDED" }),
        }),
        routeCtx,
      );

      expect(response.status).toBe(401);
    });

    it("returns 422 for an invalid payload", async () => {
      const response = await create(
        authenticatedRequest("http://localhost/api/v1/lessons", accessToken, {
          method: "POST",
          body: { title: "", type: "NOT_A_TYPE" },
        }),
        routeCtx,
      );

      expect(response.status).toBe(422);
    });
  });

  describe("GET /api/v1/lessons", () => {
    beforeEach(async () => {
      await create(
        authenticatedRequest("http://localhost/api/v1/lessons", accessToken, {
          method: "POST",
          body: { title: "Aula gravada", type: "RECORDED", tags: ["hsk1"] },
        }),
        routeCtx,
      );
      await create(
        authenticatedRequest("http://localhost/api/v1/lessons", accessToken, {
          method: "POST",
          body: { title: "Aula ao vivo", type: "LIVE", tags: ["hsk2"] },
        }),
        routeCtx,
      );
    });

    it("lists only the current user's lessons with pagination metadata", async () => {
      const response = await list(
        authenticatedRequest("http://localhost/api/v1/lessons", accessToken),
        routeCtx,
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data).toHaveLength(2);
      expect(body.meta).toMatchObject({ page: 1, pageSize: 20, total: 2, totalPages: 1 });
    });

    it("filters by type", async () => {
      const response = await list(
        authenticatedRequest("http://localhost/api/v1/lessons?type=LIVE", accessToken),
        routeCtx,
      );
      const body = await response.json();

      expect(body.data).toHaveLength(1);
      expect(body.data[0].title).toBe("Aula ao vivo");
    });

    it("filters by tag", async () => {
      const response = await list(
        authenticatedRequest("http://localhost/api/v1/lessons?tag=hsk1", accessToken),
        routeCtx,
      );
      const body = await response.json();

      expect(body.data).toHaveLength(1);
      expect(body.data[0].title).toBe("Aula gravada");
    });

    it("does not include another user's lessons", async () => {
      const response = await list(
        authenticatedRequest("http://localhost/api/v1/lessons", otherAccessToken),
        routeCtx,
      );
      const body = await response.json();

      expect(body.data).toHaveLength(0);
    });
  });

  describe("GET/PATCH/DELETE /api/v1/lessons/{id}", () => {
    async function createLesson() {
      const response = await create(
        authenticatedRequest("http://localhost/api/v1/lessons", accessToken, {
          method: "POST",
          body: { title: "Aula", type: "RECORDED", status: "COMPLETED", tags: ["a", "b"] },
        }),
        routeCtx,
      );
      const body = await response.json();
      return body.data.id as string;
    }

    it("gets a single lesson by id", async () => {
      const id = await createLesson();

      const response = await getById(
        authenticatedRequest(`http://localhost/api/v1/lessons/${id}`, accessToken),
        ctxWithId(id),
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data.id).toBe(id);
    });

    it("returns 404 for a lesson belonging to a different user", async () => {
      const id = await createLesson();

      const response = await getById(
        authenticatedRequest(`http://localhost/api/v1/lessons/${id}`, otherAccessToken),
        ctxWithId(id),
      );

      expect(response.status).toBe(404);
    });

    it("updates only the provided fields, leaving others untouched", async () => {
      const id = await createLesson();

      const response = await update(
        authenticatedRequest(`http://localhost/api/v1/lessons/${id}`, accessToken, {
          method: "PATCH",
          body: { title: "Renamed" },
        }),
        ctxWithId(id),
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data.title).toBe("Renamed");
      // Fields not included in the PATCH body must survive unchanged —
      // this guards against the update DTO silently reapplying its own
      // schema defaults (a real bug found during manual testing).
      expect(body.data.status).toBe("COMPLETED");
      expect(body.data.tags).toEqual(["a", "b"]);
    });

    it("deletes a lesson and makes it no longer retrievable", async () => {
      const id = await createLesson();

      const deleteResponse = await remove(
        authenticatedRequest(`http://localhost/api/v1/lessons/${id}`, accessToken, {
          method: "DELETE",
        }),
        ctxWithId(id),
      );
      expect(deleteResponse.status).toBe(204);

      const getResponse = await getById(
        authenticatedRequest(`http://localhost/api/v1/lessons/${id}`, accessToken),
        ctxWithId(id),
      );
      expect(getResponse.status).toBe(404);
    });
  });

  describe("POST /api/v1/lessons/{id}/watch", () => {
    it("marks a lesson as completed and records watchedAt", async () => {
      const createResponse = await create(
        authenticatedRequest("http://localhost/api/v1/lessons", accessToken, {
          method: "POST",
          body: { title: "Aula", type: "RECORDED" },
        }),
        routeCtx,
      );
      const { id } = (await createResponse.json()).data;

      const response = await watch(
        authenticatedRequest(`http://localhost/api/v1/lessons/${id}/watch`, accessToken, {
          method: "POST",
        }),
        ctxWithId(id),
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data.status).toBe("COMPLETED");
      expect(body.data.watchedAt).not.toBeNull();
    });
  });
});
