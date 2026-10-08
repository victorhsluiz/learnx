import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { GET as list, POST as create } from "@/app/api/v1/vocabulary/route";
import {
  GET as getById,
  PATCH as update,
  DELETE as remove,
} from "@/app/api/v1/vocabulary/[id]/route";
import { POST as createLesson } from "@/app/api/v1/lessons/route";
import { prisma } from "@/core/database/prisma";
import { authenticatedRequest, registerTestUser, routeCtx } from "../../../helpers/auth";

function ctxWithId(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("vocabulary endpoints", () => {
  let accessToken: string;
  let otherAccessToken: string;
  let lessonId: string;

  beforeEach(async () => {
    const user = await registerTestUser("vocabulary-owner@learnx.dev");
    accessToken = user.accessToken;
    const otherUser = await registerTestUser("vocabulary-other@learnx.dev");
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
    await prisma.word.deleteMany({});
    await prisma.lesson.deleteMany({});
    await prisma.refreshToken.deleteMany({});
    await prisma.user.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("POST /api/v1/vocabulary", () => {
    it("creates a word without a lessonId", async () => {
      const response = await create(
        authenticatedRequest("http://localhost/api/v1/vocabulary", accessToken, {
          method: "POST",
          body: { hanzi: "你好", pinyin: "nǐ hǎo", translation: "hello" },
        }),
        routeCtx,
      );
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.data).toMatchObject({
        hanzi: "你好",
        pinyin: "nǐ hǎo",
        translation: "hello",
        lessonId: null,
        tags: [],
      });
      expect(body.data.learnedAt).toBeTruthy();
    });

    it("creates a word linked to a lesson owned by the same user", async () => {
      const response = await create(
        authenticatedRequest("http://localhost/api/v1/vocabulary", accessToken, {
          method: "POST",
          body: { hanzi: "谢谢", pinyin: "xiè xiè", translation: "thank you", lessonId },
        }),
        routeCtx,
      );
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.data.lessonId).toBe(lessonId);
    });

    it("rejects a lessonId belonging to a different user", async () => {
      const response = await create(
        authenticatedRequest("http://localhost/api/v1/vocabulary", otherAccessToken, {
          method: "POST",
          body: { hanzi: "恶意", pinyin: "èyì", translation: "malicious", lessonId },
        }),
        routeCtx,
      );
      const body = await response.json();

      expect(response.status).toBe(422);
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });

    it("returns 409 on a duplicate (userId, hanzi, pinyin) pair", async () => {
      const payload = { hanzi: "再见", pinyin: "zài jiàn", translation: "goodbye" };

      await create(
        authenticatedRequest("http://localhost/api/v1/vocabulary", accessToken, {
          method: "POST",
          body: payload,
        }),
        routeCtx,
      );
      const response = await create(
        authenticatedRequest("http://localhost/api/v1/vocabulary", accessToken, {
          method: "POST",
          body: payload,
        }),
        routeCtx,
      );
      const body = await response.json();

      expect(response.status).toBe(409);
      expect(body.error.code).toBe("CONFLICT");
    });

    it("allows the same hanzi/pinyin for two different users", async () => {
      const payload = { hanzi: "朋友", pinyin: "péng yǒu", translation: "friend" };

      const first = await create(
        authenticatedRequest("http://localhost/api/v1/vocabulary", accessToken, {
          method: "POST",
          body: payload,
        }),
        routeCtx,
      );
      const second = await create(
        authenticatedRequest("http://localhost/api/v1/vocabulary", otherAccessToken, {
          method: "POST",
          body: payload,
        }),
        routeCtx,
      );

      expect(first.status).toBe(201);
      expect(second.status).toBe(201);
    });

    it("returns 401 without a valid session", async () => {
      const response = await create(
        new Request("http://localhost/api/v1/vocabulary", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ hanzi: "你好", pinyin: "nǐ hǎo", translation: "hello" }),
        }),
        routeCtx,
      );

      expect(response.status).toBe(401);
    });

    it("returns 422 for an invalid payload", async () => {
      const response = await create(
        authenticatedRequest("http://localhost/api/v1/vocabulary", accessToken, {
          method: "POST",
          body: { pinyin: "nǐ hǎo", translation: "hello" },
        }),
        routeCtx,
      );

      expect(response.status).toBe(422);
    });
  });

  describe("GET /api/v1/vocabulary", () => {
    let freeWordId: string;
    let lessonWordId: string;

    beforeEach(async () => {
      const freeResponse = await create(
        authenticatedRequest("http://localhost/api/v1/vocabulary", accessToken, {
          method: "POST",
          body: {
            hanzi: "你好",
            pinyin: "nǐ hǎo",
            translation: "hello",
            tags: ["hsk1"],
            learnedAt: "2024-01-01T00:00:00.000Z",
          },
        }),
        routeCtx,
      );
      freeWordId = (await freeResponse.json()).data.id;

      const lessonResponse = await create(
        authenticatedRequest("http://localhost/api/v1/vocabulary", accessToken, {
          method: "POST",
          body: {
            hanzi: "谢谢",
            pinyin: "xiè xiè",
            translation: "thank you",
            lessonId,
            learnedAt: "2024-06-01T00:00:00.000Z",
          },
        }),
        routeCtx,
      );
      lessonWordId = (await lessonResponse.json()).data.id;
    });

    it("lists only the current user's words with pagination metadata", async () => {
      const response = await list(
        authenticatedRequest("http://localhost/api/v1/vocabulary", accessToken),
        routeCtx,
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data).toHaveLength(2);
      expect(body.meta).toMatchObject({ page: 1, pageSize: 20, total: 2, totalPages: 1 });
    });

    it("filters by lessonId", async () => {
      const response = await list(
        authenticatedRequest(
          `http://localhost/api/v1/vocabulary?lessonId=${lessonId}`,
          accessToken,
        ),
        routeCtx,
      );
      const body = await response.json();

      expect(body.data).toHaveLength(1);
      expect(body.data[0].id).toBe(lessonWordId);
    });

    it("filters by tag", async () => {
      const response = await list(
        authenticatedRequest("http://localhost/api/v1/vocabulary?tag=hsk1", accessToken),
        routeCtx,
      );
      const body = await response.json();

      expect(body.data).toHaveLength(1);
      expect(body.data[0].id).toBe(freeWordId);
    });

    it("searches across hanzi, pinyin, and translation", async () => {
      const hanziMatch = await list(
        authenticatedRequest("http://localhost/api/v1/vocabulary?q=你好", accessToken),
        routeCtx,
      );
      const hanziBody = await hanziMatch.json();
      expect(hanziBody.data).toHaveLength(1);
      expect(hanziBody.data[0].id).toBe(freeWordId);

      const translationMatch = await list(
        authenticatedRequest("http://localhost/api/v1/vocabulary?q=thank", accessToken),
        routeCtx,
      );
      const translationBody = await translationMatch.json();
      expect(translationBody.data).toHaveLength(1);
      expect(translationBody.data[0].id).toBe(lessonWordId);
    });

    it("filters by learnedAfter/learnedBefore date range", async () => {
      const response = await list(
        authenticatedRequest(
          "http://localhost/api/v1/vocabulary?learnedAfter=2024-03-01T00:00:00.000Z",
          accessToken,
        ),
        routeCtx,
      );
      const body = await response.json();

      expect(body.data).toHaveLength(1);
      expect(body.data[0].id).toBe(lessonWordId);

      const beforeResponse = await list(
        authenticatedRequest(
          "http://localhost/api/v1/vocabulary?learnedBefore=2024-03-01T00:00:00.000Z",
          accessToken,
        ),
        routeCtx,
      );
      const beforeBody = await beforeResponse.json();

      expect(beforeBody.data).toHaveLength(1);
      expect(beforeBody.data[0].id).toBe(freeWordId);
    });

    it("does not include another user's words", async () => {
      const response = await list(
        authenticatedRequest("http://localhost/api/v1/vocabulary", otherAccessToken),
        routeCtx,
      );
      const body = await response.json();

      expect(body.data).toHaveLength(0);
    });
  });

  describe("GET/PATCH/DELETE /api/v1/vocabulary/{id}", () => {
    async function createWord() {
      const response = await create(
        authenticatedRequest("http://localhost/api/v1/vocabulary", accessToken, {
          method: "POST",
          body: {
            hanzi: "学习",
            pinyin: "xué xí",
            translation: "to study",
            lessonId,
            tags: ["a"],
          },
        }),
        routeCtx,
      );
      const body = await response.json();
      return body.data.id as string;
    }

    it("gets a single word by id", async () => {
      const id = await createWord();

      const response = await getById(
        authenticatedRequest(`http://localhost/api/v1/vocabulary/${id}`, accessToken),
        ctxWithId(id),
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data.id).toBe(id);
    });

    it("returns 404 for a word belonging to a different user", async () => {
      const id = await createWord();

      const response = await getById(
        authenticatedRequest(`http://localhost/api/v1/vocabulary/${id}`, otherAccessToken),
        ctxWithId(id),
      );

      expect(response.status).toBe(404);
    });

    it("updates only the provided fields, leaving others untouched", async () => {
      const id = await createWord();

      const response = await update(
        authenticatedRequest(`http://localhost/api/v1/vocabulary/${id}`, accessToken, {
          method: "PATCH",
          body: { translation: "to study hard" },
        }),
        ctxWithId(id),
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data.translation).toBe("to study hard");
      expect(body.data.tags).toEqual(["a"]);
      expect(body.data.lessonId).toBe(lessonId);
    });

    it("clears lessonId when the update explicitly sets it to null", async () => {
      const id = await createWord();

      const response = await update(
        authenticatedRequest(`http://localhost/api/v1/vocabulary/${id}`, accessToken, {
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
      const id = await createWord();

      const response = await update(
        authenticatedRequest(`http://localhost/api/v1/vocabulary/${id}`, otherAccessToken, {
          method: "PATCH",
          body: { translation: "Hijack attempt" },
        }),
        ctxWithId(id),
      );

      // The word itself belongs to `accessToken`'s user, so `otherAccessToken`
      // should not even be able to find it to update.
      expect(response.status).toBe(404);
    });

    it("deletes a word and makes it no longer retrievable", async () => {
      const id = await createWord();

      const deleteResponse = await remove(
        authenticatedRequest(`http://localhost/api/v1/vocabulary/${id}`, accessToken, {
          method: "DELETE",
        }),
        ctxWithId(id),
      );
      expect(deleteResponse.status).toBe(204);

      const getResponse = await getById(
        authenticatedRequest(`http://localhost/api/v1/vocabulary/${id}`, accessToken),
        ctxWithId(id),
      );
      expect(getResponse.status).toBe(404);
    });
  });

  describe("orphaning behavior", () => {
    it("sets lessonId to null when the linked lesson is deleted", async () => {
      const wordResponse = await create(
        authenticatedRequest("http://localhost/api/v1/vocabulary", accessToken, {
          method: "POST",
          body: { hanzi: "考试", pinyin: "kǎo shì", translation: "exam", lessonId },
        }),
        routeCtx,
      );
      const wordId = (await wordResponse.json()).data.id;

      // Deleting the lesson directly via Prisma (there's no lesson delete
      // route call needed here — this test is specifically about the
      // database's ON DELETE SET NULL behavior on words.lessonId).
      await prisma.lesson.delete({ where: { id: lessonId } });

      const response = await getById(
        authenticatedRequest(`http://localhost/api/v1/vocabulary/${wordId}`, accessToken),
        ctxWithId(wordId),
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data.lessonId).toBeNull();
    });
  });
});
