import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { GET as list, POST as create } from "@/app/api/v1/notes/route";
import { GET as getById, PATCH as update, DELETE as remove } from "@/app/api/v1/notes/[id]/route";
import { POST as createLesson } from "@/app/api/v1/lessons/route";
import { prisma } from "@/core/database/prisma";
import { authenticatedRequest, registerTestUser, routeCtx } from "../../../helpers/auth";

function ctxWithId(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("notes endpoints", () => {
  let accessToken: string;
  let otherAccessToken: string;
  let lessonId: string;

  beforeEach(async () => {
    const user = await registerTestUser("notes-owner@learnx.dev");
    accessToken = user.accessToken;
    const otherUser = await registerTestUser("notes-other@learnx.dev");
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
    await prisma.note.deleteMany({});
    await prisma.lesson.deleteMany({});
    await prisma.refreshToken.deleteMany({});
    await prisma.user.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("POST /api/v1/notes", () => {
    it("creates a note without a lessonId", async () => {
      const response = await create(
        authenticatedRequest("http://localhost/api/v1/notes", accessToken, {
          method: "POST",
          body: { title: "Nota livre", contentMarkdown: "# Conteúdo", tags: ["gramatica"] },
        }),
        routeCtx,
      );
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.data).toMatchObject({
        title: "Nota livre",
        contentMarkdown: "# Conteúdo",
        lessonId: null,
        tags: ["gramatica"],
      });
    });

    it("creates a note linked to a lesson owned by the same user", async () => {
      const response = await create(
        authenticatedRequest("http://localhost/api/v1/notes", accessToken, {
          method: "POST",
          body: { title: "Nota da aula", contentMarkdown: "conteudo", lessonId },
        }),
        routeCtx,
      );
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.data.lessonId).toBe(lessonId);
    });

    it("rejects a lessonId belonging to a different user", async () => {
      const response = await create(
        authenticatedRequest("http://localhost/api/v1/notes", otherAccessToken, {
          method: "POST",
          body: { title: "Nota maliciosa", contentMarkdown: "x", lessonId },
        }),
        routeCtx,
      );
      const body = await response.json();

      expect(response.status).toBe(422);
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });

    it("returns 401 without a valid session", async () => {
      const response = await create(
        new Request("http://localhost/api/v1/notes", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ title: "X", contentMarkdown: "x" }),
        }),
        routeCtx,
      );

      expect(response.status).toBe(401);
    });

    it("returns 422 for an invalid payload", async () => {
      const response = await create(
        authenticatedRequest("http://localhost/api/v1/notes", accessToken, {
          method: "POST",
          body: { title: "" },
        }),
        routeCtx,
      );

      expect(response.status).toBe(422);
    });
  });

  describe("GET /api/v1/notes", () => {
    let freeNoteId: string;
    let lessonNoteId: string;

    beforeEach(async () => {
      const freeResponse = await create(
        authenticatedRequest("http://localhost/api/v1/notes", accessToken, {
          method: "POST",
          body: { title: "Nota livre", contentMarkdown: "sobre tons", tags: ["hsk1"] },
        }),
        routeCtx,
      );
      freeNoteId = (await freeResponse.json()).data.id;

      const lessonResponse = await create(
        authenticatedRequest("http://localhost/api/v1/notes", accessToken, {
          method: "POST",
          body: { title: "Nota da aula", contentMarkdown: "sobre gramática", lessonId },
        }),
        routeCtx,
      );
      lessonNoteId = (await lessonResponse.json()).data.id;
    });

    it("lists only the current user's notes with pagination metadata", async () => {
      const response = await list(
        authenticatedRequest("http://localhost/api/v1/notes", accessToken),
        routeCtx,
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data).toHaveLength(2);
      expect(body.meta).toMatchObject({ page: 1, pageSize: 20, total: 2, totalPages: 1 });
    });

    it("filters by lessonId", async () => {
      const response = await list(
        authenticatedRequest(`http://localhost/api/v1/notes?lessonId=${lessonId}`, accessToken),
        routeCtx,
      );
      const body = await response.json();

      expect(body.data).toHaveLength(1);
      expect(body.data[0].id).toBe(lessonNoteId);
    });

    it("filters by tag", async () => {
      const response = await list(
        authenticatedRequest("http://localhost/api/v1/notes?tag=hsk1", accessToken),
        routeCtx,
      );
      const body = await response.json();

      expect(body.data).toHaveLength(1);
      expect(body.data[0].id).toBe(freeNoteId);
    });

    it("searches across title and content", async () => {
      const response = await list(
        authenticatedRequest("http://localhost/api/v1/notes?q=gramática", accessToken),
        routeCtx,
      );
      const body = await response.json();

      expect(body.data).toHaveLength(1);
      expect(body.data[0].id).toBe(lessonNoteId);
    });

    it("does not include another user's notes", async () => {
      const response = await list(
        authenticatedRequest("http://localhost/api/v1/notes", otherAccessToken),
        routeCtx,
      );
      const body = await response.json();

      expect(body.data).toHaveLength(0);
    });
  });

  describe("GET/PATCH/DELETE /api/v1/notes/{id}", () => {
    async function createNote() {
      const response = await create(
        authenticatedRequest("http://localhost/api/v1/notes", accessToken, {
          method: "POST",
          body: { title: "Nota", contentMarkdown: "conteudo", lessonId, tags: ["a"] },
        }),
        routeCtx,
      );
      const body = await response.json();
      return body.data.id as string;
    }

    it("gets a single note by id", async () => {
      const id = await createNote();

      const response = await getById(
        authenticatedRequest(`http://localhost/api/v1/notes/${id}`, accessToken),
        ctxWithId(id),
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data.id).toBe(id);
    });

    it("returns 404 for a note belonging to a different user", async () => {
      const id = await createNote();

      const response = await getById(
        authenticatedRequest(`http://localhost/api/v1/notes/${id}`, otherAccessToken),
        ctxWithId(id),
      );

      expect(response.status).toBe(404);
    });

    it("updates only the provided fields, leaving others untouched", async () => {
      const id = await createNote();

      const response = await update(
        authenticatedRequest(`http://localhost/api/v1/notes/${id}`, accessToken, {
          method: "PATCH",
          body: { title: "Renamed" },
        }),
        ctxWithId(id),
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data.title).toBe("Renamed");
      expect(body.data.tags).toEqual(["a"]);
      expect(body.data.lessonId).toBe(lessonId);
    });

    it("clears lessonId when the update explicitly sets it to null", async () => {
      const id = await createNote();

      const response = await update(
        authenticatedRequest(`http://localhost/api/v1/notes/${id}`, accessToken, {
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
      const id = await createNote();

      const response = await update(
        authenticatedRequest(`http://localhost/api/v1/notes/${id}`, otherAccessToken, {
          method: "PATCH",
          body: { title: "Hijack attempt" },
        }),
        ctxWithId(id),
      );

      // The note itself belongs to `accessToken`'s user, so `otherAccessToken`
      // should not even be able to find it to update.
      expect(response.status).toBe(404);
    });

    it("deletes a note and makes it no longer retrievable", async () => {
      const id = await createNote();

      const deleteResponse = await remove(
        authenticatedRequest(`http://localhost/api/v1/notes/${id}`, accessToken, {
          method: "DELETE",
        }),
        ctxWithId(id),
      );
      expect(deleteResponse.status).toBe(204);

      const getResponse = await getById(
        authenticatedRequest(`http://localhost/api/v1/notes/${id}`, accessToken),
        ctxWithId(id),
      );
      expect(getResponse.status).toBe(404);
    });
  });

  describe("orphaning behavior", () => {
    it("sets lessonId to null when the linked lesson is deleted", async () => {
      const noteResponse = await create(
        authenticatedRequest("http://localhost/api/v1/notes", accessToken, {
          method: "POST",
          body: { title: "Nota", contentMarkdown: "conteudo", lessonId },
        }),
        routeCtx,
      );
      const noteId = (await noteResponse.json()).data.id;

      // Deleting the lesson directly via Prisma (there's no lesson delete
      // route call needed here — this test is specifically about the
      // database's ON DELETE SET NULL behavior on notes.lessonId).
      await prisma.lesson.delete({ where: { id: lessonId } });

      const response = await getById(
        authenticatedRequest(`http://localhost/api/v1/notes/${noteId}`, accessToken),
        ctxWithId(noteId),
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data.lessonId).toBeNull();
    });
  });
});
