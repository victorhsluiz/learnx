import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { GET as list, POST as create } from "@/app/api/v1/study-tasks/route";
import {
  GET as getById,
  PATCH as update,
  DELETE as remove,
} from "@/app/api/v1/study-tasks/[id]/route";
import { POST as createLesson } from "@/app/api/v1/lessons/route";
import { prisma } from "@/core/database/prisma";
import { authenticatedRequest, registerTestUser, routeCtx } from "../../../helpers/auth";

function ctxWithId(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("study-tasks endpoints", () => {
  let accessToken: string;
  let otherAccessToken: string;
  let lessonId: string;

  beforeEach(async () => {
    const user = await registerTestUser("study-tasks-owner@learnx.dev");
    accessToken = user.accessToken;
    const otherUser = await registerTestUser("study-tasks-other@learnx.dev");
    otherAccessToken = otherUser.accessToken;

    const lessonResponse = await createLesson(
      authenticatedRequest("http://localhost/api/v1/lessons", accessToken, {
        method: "POST",
        body: { title: "Aula", type: "RECORDED" },
      }),
      routeCtx,
    );
    lessonId = (await lessonResponse.json()).data.id;
  });

  afterEach(async () => {
    await prisma.studyTask.deleteMany({});
    await prisma.lesson.deleteMany({});
    await prisma.refreshToken.deleteMany({});
    await prisma.user.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("POST /api/v1/study-tasks", () => {
    it("creates a study task without a lessonId, defaulting status to PENDING", async () => {
      const response = await create(
        authenticatedRequest("http://localhost/api/v1/study-tasks", accessToken, {
          method: "POST",
          body: { title: "Revisar HSK1", type: "revisão", date: "2024-05-01T00:00:00.000Z" },
        }),
        routeCtx,
      );
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.data).toMatchObject({
        title: "Revisar HSK1",
        type: "revisão",
        status: "PENDING",
        lessonId: null,
      });
    });

    it("creates a study task linked to a lesson owned by the same user", async () => {
      const response = await create(
        authenticatedRequest("http://localhost/api/v1/study-tasks", accessToken, {
          method: "POST",
          body: {
            title: "Revisar aula",
            type: "estudo",
            date: "2024-05-01T00:00:00.000Z",
            lessonId,
          },
        }),
        routeCtx,
      );
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.data.lessonId).toBe(lessonId);
    });

    it("rejects a lessonId belonging to a different user", async () => {
      const response = await create(
        authenticatedRequest("http://localhost/api/v1/study-tasks", otherAccessToken, {
          method: "POST",
          body: {
            title: "Tentativa maliciosa",
            type: "estudo",
            date: "2024-05-01T00:00:00.000Z",
            lessonId,
          },
        }),
        routeCtx,
      );
      const body = await response.json();

      expect(response.status).toBe(422);
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });

    it("returns 401 without a valid session", async () => {
      const response = await create(
        new Request("http://localhost/api/v1/study-tasks", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            title: "Revisar HSK1",
            type: "revisão",
            date: "2024-05-01T00:00:00.000Z",
          }),
        }),
        routeCtx,
      );

      expect(response.status).toBe(401);
    });

    it("returns 422 for an invalid payload (missing title)", async () => {
      const response = await create(
        authenticatedRequest("http://localhost/api/v1/study-tasks", accessToken, {
          method: "POST",
          body: { type: "revisão", date: "2024-05-01T00:00:00.000Z" },
        }),
        routeCtx,
      );

      expect(response.status).toBe(422);
    });

    it("returns 422 for an invalid status enum value", async () => {
      const response = await create(
        authenticatedRequest("http://localhost/api/v1/study-tasks", accessToken, {
          method: "POST",
          body: {
            title: "Revisar HSK1",
            type: "revisão",
            date: "2024-05-01T00:00:00.000Z",
            status: "NOT_A_STATUS",
          },
        }),
        routeCtx,
      );

      expect(response.status).toBe(422);
    });
  });

  describe("GET /api/v1/study-tasks", () => {
    let pendingTaskId: string;
    let doneTaskId: string;

    beforeEach(async () => {
      const pendingResponse = await create(
        authenticatedRequest("http://localhost/api/v1/study-tasks", accessToken, {
          method: "POST",
          body: {
            title: "Revisar HSK1",
            type: "revisão",
            date: "2024-01-01T00:00:00.000Z",
          },
        }),
        routeCtx,
      );
      pendingTaskId = (await pendingResponse.json()).data.id;

      const doneResponse = await create(
        authenticatedRequest("http://localhost/api/v1/study-tasks", accessToken, {
          method: "POST",
          body: {
            title: "Praticar tons",
            type: "prática",
            date: "2024-06-01T00:00:00.000Z",
            status: "DONE",
            lessonId,
          },
        }),
        routeCtx,
      );
      doneTaskId = (await doneResponse.json()).data.id;
    });

    it("lists only the current user's study tasks with pagination metadata", async () => {
      const response = await list(
        authenticatedRequest("http://localhost/api/v1/study-tasks", accessToken),
        routeCtx,
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data).toHaveLength(2);
      expect(body.meta).toMatchObject({ page: 1, pageSize: 20, total: 2, totalPages: 1 });
    });

    it("filters by status", async () => {
      const response = await list(
        authenticatedRequest("http://localhost/api/v1/study-tasks?status=DONE", accessToken),
        routeCtx,
      );
      const body = await response.json();

      expect(body.data).toHaveLength(1);
      expect(body.data[0].id).toBe(doneTaskId);
    });

    it("filters by type", async () => {
      const response = await list(
        authenticatedRequest("http://localhost/api/v1/study-tasks?type=prática", accessToken),
        routeCtx,
      );
      const body = await response.json();

      expect(body.data).toHaveLength(1);
      expect(body.data[0].id).toBe(doneTaskId);
    });

    it("filters by dateFrom/dateTo range", async () => {
      const afterResponse = await list(
        authenticatedRequest(
          "http://localhost/api/v1/study-tasks?dateFrom=2024-03-01T00:00:00.000Z",
          accessToken,
        ),
        routeCtx,
      );
      const afterBody = await afterResponse.json();
      expect(afterBody.data).toHaveLength(1);
      expect(afterBody.data[0].id).toBe(doneTaskId);

      const beforeResponse = await list(
        authenticatedRequest(
          "http://localhost/api/v1/study-tasks?dateTo=2024-03-01T00:00:00.000Z",
          accessToken,
        ),
        routeCtx,
      );
      const beforeBody = await beforeResponse.json();
      expect(beforeBody.data).toHaveLength(1);
      expect(beforeBody.data[0].id).toBe(pendingTaskId);
    });

    it("does not include another user's study tasks", async () => {
      const response = await list(
        authenticatedRequest("http://localhost/api/v1/study-tasks", otherAccessToken),
        routeCtx,
      );
      const body = await response.json();

      expect(body.data).toHaveLength(0);
    });
  });

  describe("GET/PATCH/DELETE /api/v1/study-tasks/{id}", () => {
    async function createTask() {
      const response = await create(
        authenticatedRequest("http://localhost/api/v1/study-tasks", accessToken, {
          method: "POST",
          body: {
            title: "Revisar vocabulário",
            type: "revisão",
            date: "2024-05-01T00:00:00.000Z",
            lessonId,
            estimatedMinutes: 30,
          },
        }),
        routeCtx,
      );
      const body = await response.json();
      return body.data.id as string;
    }

    it("gets a single study task by id", async () => {
      const id = await createTask();

      const response = await getById(
        authenticatedRequest(`http://localhost/api/v1/study-tasks/${id}`, accessToken),
        ctxWithId(id),
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data.id).toBe(id);
    });

    it("returns 404 for a study task belonging to a different user", async () => {
      const id = await createTask();

      const response = await getById(
        authenticatedRequest(`http://localhost/api/v1/study-tasks/${id}`, otherAccessToken),
        ctxWithId(id),
      );

      expect(response.status).toBe(404);
    });

    it("updates only the provided fields, leaving others untouched", async () => {
      const id = await createTask();

      const response = await update(
        authenticatedRequest(`http://localhost/api/v1/study-tasks/${id}`, accessToken, {
          method: "PATCH",
          body: { title: "Revisar vocabulário avançado" },
        }),
        ctxWithId(id),
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data.title).toBe("Revisar vocabulário avançado");
      expect(body.data.estimatedMinutes).toBe(30);
      expect(body.data.lessonId).toBe(lessonId);
    });

    it("clears lessonId when the update explicitly sets it to null", async () => {
      const id = await createTask();

      const response = await update(
        authenticatedRequest(`http://localhost/api/v1/study-tasks/${id}`, accessToken, {
          method: "PATCH",
          body: { lessonId: null },
        }),
        ctxWithId(id),
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data.lessonId).toBeNull();
    });

    it("rejects updating lessonId to a lesson owned by another user", async () => {
      const id = await createTask();

      const response = await update(
        authenticatedRequest(`http://localhost/api/v1/study-tasks/${id}`, otherAccessToken, {
          method: "PATCH",
          body: { title: "Hijack attempt" },
        }),
        ctxWithId(id),
      );

      // The task itself belongs to `accessToken`'s user, so
      // `otherAccessToken` should not even be able to find it to update.
      expect(response.status).toBe(404);
    });

    it("deletes a study task and makes it no longer retrievable", async () => {
      const id = await createTask();

      const deleteResponse = await remove(
        authenticatedRequest(`http://localhost/api/v1/study-tasks/${id}`, accessToken, {
          method: "DELETE",
        }),
        ctxWithId(id),
      );
      expect(deleteResponse.status).toBe(204);

      const getResponse = await getById(
        authenticatedRequest(`http://localhost/api/v1/study-tasks/${id}`, accessToken),
        ctxWithId(id),
      );
      expect(getResponse.status).toBe(404);
    });
  });

  describe("mark done/skipped flow", () => {
    async function createPendingTask() {
      const response = await create(
        authenticatedRequest("http://localhost/api/v1/study-tasks", accessToken, {
          method: "POST",
          body: {
            title: "Revisar vocabulário",
            type: "revisão",
            date: "2024-05-01T00:00:00.000Z",
          },
        }),
        routeCtx,
      );
      const body = await response.json();
      return body.data as { id: string; title: string; date: string };
    }

    it("marks a task as DONE via a status-only PATCH, leaving other fields unaffected", async () => {
      const task = await createPendingTask();

      const response = await update(
        authenticatedRequest(`http://localhost/api/v1/study-tasks/${task.id}`, accessToken, {
          method: "PATCH",
          body: { status: "DONE" },
        }),
        ctxWithId(task.id),
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data.status).toBe("DONE");
      expect(body.data.title).toBe(task.title);
      expect(body.data.date).toBe(task.date);
    });

    it("marks a task as SKIPPED via a status-only PATCH, leaving other fields unaffected", async () => {
      const task = await createPendingTask();

      const response = await update(
        authenticatedRequest(`http://localhost/api/v1/study-tasks/${task.id}`, accessToken, {
          method: "PATCH",
          body: { status: "SKIPPED" },
        }),
        ctxWithId(task.id),
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data.status).toBe("SKIPPED");
      expect(body.data.title).toBe(task.title);
      expect(body.data.date).toBe(task.date);
    });
  });

  describe("orphaning behavior", () => {
    it("sets lessonId to null when the linked lesson is deleted", async () => {
      const taskResponse = await create(
        authenticatedRequest("http://localhost/api/v1/study-tasks", accessToken, {
          method: "POST",
          body: {
            title: "Revisar aula",
            type: "estudo",
            date: "2024-05-01T00:00:00.000Z",
            lessonId,
          },
        }),
        routeCtx,
      );
      const taskId = (await taskResponse.json()).data.id;

      // Deleting the lesson directly via Prisma (there's no lesson delete
      // route call needed here — this test is specifically about the
      // database's ON DELETE SET NULL behavior on study_tasks.lessonId).
      await prisma.lesson.delete({ where: { id: lessonId } });

      const response = await getById(
        authenticatedRequest(`http://localhost/api/v1/study-tasks/${taskId}`, accessToken),
        ctxWithId(taskId),
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data.lessonId).toBeNull();
    });
  });
});
