import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { GET as getSummary } from "@/app/api/v1/dashboard/summary/route";
import { POST as createWord } from "@/app/api/v1/vocabulary/route";
import { POST as createLesson } from "@/app/api/v1/lessons/route";
import { POST as createStudyTask } from "@/app/api/v1/study-tasks/route";
import { prisma } from "@/core/database/prisma";
import { authenticatedRequest, registerTestUser, routeCtx } from "../../../helpers/auth";

describe("GET /api/v1/dashboard/summary", () => {
  let accessToken: string;
  let otherAccessToken: string;

  beforeEach(async () => {
    const user = await registerTestUser("dashboard-owner@learnx.dev");
    accessToken = user.accessToken;
    const otherUser = await registerTestUser("dashboard-other@learnx.dev");
    otherAccessToken = otherUser.accessToken;
  });

  afterEach(async () => {
    await prisma.studyTask.deleteMany({});
    await prisma.word.deleteMany({});
    await prisma.lesson.deleteMany({});
    await prisma.refreshToken.deleteMany({});
    await prisma.user.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns 401 without a valid session", async () => {
    const response = await getSummary(
      new Request("http://localhost/api/v1/dashboard/summary"),
      routeCtx,
    );

    expect(response.status).toBe(401);
  });

  it("counts words, lessons, and schedule tasks scoped to the current user", async () => {
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const twentyDaysAgo = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000);

    // Words: 2 within the last 7 days, 1 older than 7 days -> total 3, last7Days 2.
    await createWord(
      authenticatedRequest("http://localhost/api/v1/vocabulary", accessToken, {
        method: "POST",
        body: {
          hanzi: "你好",
          pinyin: "nǐ hǎo",
          translation: "olá",
          learnedAt: now.toISOString(),
          tags: [],
        },
      }),
      routeCtx,
    );
    await createWord(
      authenticatedRequest("http://localhost/api/v1/vocabulary", accessToken, {
        method: "POST",
        body: {
          hanzi: "谢谢",
          pinyin: "xièxiè",
          translation: "obrigado",
          learnedAt: threeDaysAgo.toISOString(),
          tags: [],
        },
      }),
      routeCtx,
    );
    await createWord(
      authenticatedRequest("http://localhost/api/v1/vocabulary", accessToken, {
        method: "POST",
        body: {
          hanzi: "再见",
          pinyin: "zàijiàn",
          translation: "tchau",
          learnedAt: twentyDaysAgo.toISOString(),
          tags: [],
        },
      }),
      routeCtx,
    );

    // Lessons: 2 completed, 1 pending, 1 in-progress (not counted in either bucket).
    await createLesson(
      authenticatedRequest("http://localhost/api/v1/lessons", accessToken, {
        method: "POST",
        body: { title: "Aula 1", type: "RECORDED", status: "COMPLETED" },
      }),
      routeCtx,
    );
    await createLesson(
      authenticatedRequest("http://localhost/api/v1/lessons", accessToken, {
        method: "POST",
        body: { title: "Aula 2", type: "RECORDED", status: "COMPLETED" },
      }),
      routeCtx,
    );
    await createLesson(
      authenticatedRequest("http://localhost/api/v1/lessons", accessToken, {
        method: "POST",
        body: { title: "Aula 3", type: "RECORDED", status: "PENDING" },
      }),
      routeCtx,
    );
    await createLesson(
      authenticatedRequest("http://localhost/api/v1/lessons", accessToken, {
        method: "POST",
        body: { title: "Aula 4", type: "RECORDED", status: "IN_PROGRESS" },
      }),
      routeCtx,
    );

    // Schedule tasks: one PENDING due today, one PENDING due later this
    // week (both within the Monday-Sunday window), one PENDING far in the
    // future (outside the week), one DONE today (not counted, wrong status).
    const startOfToday = new Date(now);
    startOfToday.setHours(10, 0, 0, 0);

    const laterThisWeek = new Date(now);
    laterThisWeek.setDate(
      laterThisWeek.getDate() + (laterThisWeek.getDay() === 0 ? 0 : 7 - laterThisWeek.getDay()),
    );
    laterThisWeek.setHours(10, 0, 0, 0);

    const farFuture = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

    await createStudyTask(
      authenticatedRequest("http://localhost/api/v1/study-tasks", accessToken, {
        method: "POST",
        body: { title: "Tarefa hoje", type: "estudo", date: startOfToday.toISOString() },
      }),
      routeCtx,
    );
    await createStudyTask(
      authenticatedRequest("http://localhost/api/v1/study-tasks", accessToken, {
        method: "POST",
        body: { title: "Tarefa na semana", type: "estudo", date: laterThisWeek.toISOString() },
      }),
      routeCtx,
    );
    await createStudyTask(
      authenticatedRequest("http://localhost/api/v1/study-tasks", accessToken, {
        method: "POST",
        body: { title: "Tarefa futura", type: "estudo", date: farFuture.toISOString() },
      }),
      routeCtx,
    );
    await createStudyTask(
      authenticatedRequest("http://localhost/api/v1/study-tasks", accessToken, {
        method: "POST",
        body: {
          title: "Tarefa feita hoje",
          type: "estudo",
          date: startOfToday.toISOString(),
          status: "DONE",
        },
      }),
      routeCtx,
    );

    const response = await getSummary(
      authenticatedRequest("http://localhost/api/v1/dashboard/summary", accessToken),
      routeCtx,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.words).toEqual({ total: 3, last7Days: 2 });
    expect(body.data.lessons).toEqual({ completed: 2, pending: 1 });
    expect(body.data.scheduleTasks.dueToday).toBe(1);
    expect(body.data.scheduleTasks.dueThisWeek).toBeGreaterThanOrEqual(1);
    expect(body.data.scheduleTasks.dueThisWeek).toBeLessThanOrEqual(2);
  });

  it("does not count another user's words, lessons, or study tasks", async () => {
    await createWord(
      authenticatedRequest("http://localhost/api/v1/vocabulary", accessToken, {
        method: "POST",
        body: { hanzi: "你好", pinyin: "nǐ hǎo", translation: "olá", tags: [] },
      }),
      routeCtx,
    );
    await createLesson(
      authenticatedRequest("http://localhost/api/v1/lessons", accessToken, {
        method: "POST",
        body: { title: "Aula 1", type: "RECORDED", status: "COMPLETED" },
      }),
      routeCtx,
    );
    await createStudyTask(
      authenticatedRequest("http://localhost/api/v1/study-tasks", accessToken, {
        method: "POST",
        body: { title: "Tarefa", type: "estudo", date: new Date().toISOString() },
      }),
      routeCtx,
    );

    const response = await getSummary(
      authenticatedRequest("http://localhost/api/v1/dashboard/summary", otherAccessToken),
      routeCtx,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.words).toEqual({ total: 0, last7Days: 0 });
    expect(body.data.lessons).toEqual({ completed: 0, pending: 0 });
    expect(body.data.scheduleTasks).toEqual({ dueToday: 0, dueThisWeek: 0 });
  });
});
