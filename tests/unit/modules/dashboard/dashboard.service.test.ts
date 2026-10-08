import { describe, expect, it } from "vitest";
import { DashboardService } from "@/modules/dashboard/dashboard.service";
import type { WordRepository } from "@/modules/vocabulary/word.repository.interface";
import type { LessonRepository } from "@/modules/lessons/lesson.repository.interface";
import type { StudyTaskRepository } from "@/modules/schedule/study-task.repository.interface";

/**
 * Minimal fakes implementing only the count methods DashboardService
 * actually calls; everything else throws, mirroring the pattern used by
 * FakeLessonRepository/FakeStudyTaskRepository in the other service tests.
 */
class FakeWordRepository implements WordRepository {
  constructor(
    private readonly total: number,
    private readonly last7Days: number,
  ) {}

  findById(): never {
    throw new Error("not used in these tests");
  }
  create(): never {
    throw new Error("not used in these tests");
  }
  update(): never {
    throw new Error("not used in these tests");
  }
  delete(): never {
    throw new Error("not used in these tests");
  }
  findMany(): never {
    throw new Error("not used in these tests");
  }
  async countTotal(): Promise<number> {
    return this.total;
  }
  async countSince(): Promise<number> {
    return this.last7Days;
  }
}

class FakeLessonRepository implements LessonRepository {
  constructor(
    private readonly completed: number,
    private readonly pending: number,
  ) {}

  findById(): never {
    throw new Error("not used in these tests");
  }
  create(): never {
    throw new Error("not used in these tests");
  }
  update(): never {
    throw new Error("not used in these tests");
  }
  delete(): never {
    throw new Error("not used in these tests");
  }
  findMany(): never {
    throw new Error("not used in these tests");
  }
  markWatched(): never {
    throw new Error("not used in these tests");
  }
  async countByStatus(_userId: string, status: "PENDING" | "IN_PROGRESS" | "COMPLETED") {
    return status === "COMPLETED" ? this.completed : this.pending;
  }
}

class FakeStudyTaskRepository implements StudyTaskRepository {
  constructor(
    private readonly dueToday: number,
    private readonly dueThisWeek: number,
  ) {}

  findById(): never {
    throw new Error("not used in these tests");
  }
  create(): never {
    throw new Error("not used in these tests");
  }
  update(): never {
    throw new Error("not used in these tests");
  }
  delete(): never {
    throw new Error("not used in these tests");
  }
  findMany(): never {
    throw new Error("not used in these tests");
  }
  private calls = 0;
  async countByStatusAndDateRange(): Promise<number> {
    // First call made by getSummary is dueToday, second is dueThisWeek.
    this.calls += 1;
    return this.calls === 1 ? this.dueToday : this.dueThisWeek;
  }
}

describe("DashboardService", () => {
  it("composes word, lesson, and schedule counts into a single summary", async () => {
    const wordRepository = new FakeWordRepository(42, 5);
    const lessonRepository = new FakeLessonRepository(10, 3);
    const studyTaskRepository = new FakeStudyTaskRepository(2, 7);

    const service = new DashboardService(wordRepository, lessonRepository, studyTaskRepository);

    const summary = await service.getSummary("user-1");

    expect(summary).toEqual({
      words: { total: 42, last7Days: 5 },
      lessons: { completed: 10, pending: 3 },
      scheduleTasks: { dueToday: 2, dueThisWeek: 7 },
    });
  });
});
