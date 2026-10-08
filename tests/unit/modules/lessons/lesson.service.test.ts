import { describe, expect, it, beforeEach } from "vitest";
import { LessonService } from "@/modules/lessons/lesson.service";
import { NotFoundError } from "@/core/errors";
import type {
  FindManyResult,
  LessonFilters,
  LessonRepository,
  LessonWriteInput,
} from "@/modules/lessons/lesson.repository.interface";
import type { Lesson } from "@/generated/prisma/client";

function makeLesson(overrides: Partial<Lesson> = {}): Lesson {
  return {
    id: "lesson-1",
    userId: "user-1",
    title: "Aula 1",
    type: "RECORDED",
    status: "PENDING",
    sourceUrl: null,
    scheduledAt: null,
    watchedAt: null,
    durationMinutes: null,
    tags: [],
    position: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

class FakeLessonRepository implements LessonRepository {
  private lessons: Lesson[] = [];

  seed(lesson: Lesson) {
    this.lessons.push(lesson);
  }

  async findById(userId: string, id: string): Promise<Lesson | null> {
    return this.lessons.find((l) => l.id === id && l.userId === userId) ?? null;
  }

  async create(userId: string, input: LessonWriteInput): Promise<Lesson> {
    const lesson = makeLesson({ id: `lesson-${this.lessons.length + 1}`, userId, ...input });
    this.lessons.push(lesson);
    return lesson;
  }

  async update(userId: string, id: string, input: Partial<LessonWriteInput>): Promise<Lesson> {
    const lesson = await this.findById(userId, id);
    if (!lesson) {
      throw new NotFoundError("Lesson not found");
    }
    Object.assign(lesson, input);
    return lesson;
  }

  async delete(userId: string, id: string): Promise<void> {
    const index = this.lessons.findIndex((l) => l.id === id && l.userId === userId);
    if (index === -1) {
      throw new NotFoundError("Lesson not found");
    }
    this.lessons.splice(index, 1);
  }

  async findMany(
    userId: string,
    filters: LessonFilters,
    pagination: { skip: number; take: number },
  ): Promise<FindManyResult<Lesson>> {
    let items = this.lessons.filter((l) => l.userId === userId);
    if (filters.status) items = items.filter((l) => l.status === filters.status);
    if (filters.type) items = items.filter((l) => l.type === filters.type);
    if (filters.tag) items = items.filter((l) => l.tags.includes(filters.tag!));
    if (filters.q) {
      items = items.filter((l) => l.title.toLowerCase().includes(filters.q!.toLowerCase()));
    }
    const total = items.length;
    return { items: items.slice(pagination.skip, pagination.skip + pagination.take), total };
  }

  async markWatched(userId: string, id: string, watchedAt: Date): Promise<Lesson> {
    const lesson = await this.findById(userId, id);
    if (!lesson) {
      throw new NotFoundError("Lesson not found");
    }
    lesson.status = "COMPLETED";
    lesson.watchedAt = watchedAt;
    return lesson;
  }

  async countByStatus(): Promise<number> {
    throw new Error("not used in these tests");
  }
}

describe("LessonService", () => {
  let repository: FakeLessonRepository;
  let service: LessonService;

  beforeEach(() => {
    repository = new FakeLessonRepository();
    service = new LessonService(repository);
  });

  describe("getById", () => {
    it("returns the lesson when it belongs to the user", async () => {
      repository.seed(makeLesson({ id: "lesson-1", userId: "user-1" }));

      const lesson = await service.getById("user-1", "lesson-1");

      expect(lesson.id).toBe("lesson-1");
    });

    it("throws NotFoundError when the lesson belongs to a different user", async () => {
      repository.seed(makeLesson({ id: "lesson-1", userId: "other-user" }));

      await expect(service.getById("user-1", "lesson-1")).rejects.toThrow(NotFoundError);
    });

    it("throws NotFoundError when the lesson doesn't exist", async () => {
      await expect(service.getById("user-1", "missing")).rejects.toThrow(NotFoundError);
    });
  });

  describe("create", () => {
    it("creates a lesson scoped to the user", async () => {
      const lesson = await service.create("user-1", {
        title: "New lesson",
        type: "LIVE",
        status: "PENDING",
        tags: ["hsk1"],
      });

      expect(lesson.userId).toBe("user-1");
      expect(lesson.title).toBe("New lesson");
    });
  });

  describe("update", () => {
    it("updates only the provided fields", async () => {
      repository.seed(
        makeLesson({ id: "lesson-1", userId: "user-1", status: "COMPLETED", tags: ["a"] }),
      );

      const updated = await service.update("user-1", "lesson-1", { title: "Renamed" });

      expect(updated.title).toBe("Renamed");
      expect(updated.status).toBe("COMPLETED");
      expect(updated.tags).toEqual(["a"]);
    });

    it("throws NotFoundError for a lesson belonging to a different user", async () => {
      repository.seed(makeLesson({ id: "lesson-1", userId: "other-user" }));

      await expect(service.update("user-1", "lesson-1", { title: "Renamed" })).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe("delete", () => {
    it("deletes a lesson belonging to the user", async () => {
      repository.seed(makeLesson({ id: "lesson-1", userId: "user-1" }));

      await service.delete("user-1", "lesson-1");

      await expect(service.getById("user-1", "lesson-1")).rejects.toThrow(NotFoundError);
    });

    it("throws NotFoundError for a lesson belonging to a different user", async () => {
      repository.seed(makeLesson({ id: "lesson-1", userId: "other-user" }));

      await expect(service.delete("user-1", "lesson-1")).rejects.toThrow(NotFoundError);
    });
  });

  describe("markWatched", () => {
    it("sets status to COMPLETED and records watchedAt", async () => {
      repository.seed(makeLesson({ id: "lesson-1", userId: "user-1" }));

      const lesson = await service.markWatched("user-1", "lesson-1");

      expect(lesson.status).toBe("COMPLETED");
      expect(lesson.watchedAt).toBeInstanceOf(Date);
    });
  });

  describe("list", () => {
    beforeEach(() => {
      repository.seed(
        makeLesson({ id: "lesson-1", userId: "user-1", type: "RECORDED", tags: ["hsk1"] }),
      );
      repository.seed(
        makeLesson({ id: "lesson-2", userId: "user-1", type: "LIVE", tags: ["hsk2"] }),
      );
      repository.seed(makeLesson({ id: "lesson-3", userId: "other-user", type: "LIVE" }));
    });

    it("only returns lessons belonging to the user", async () => {
      const { items, total } = await service.list(
        "user-1",
        {},
        { page: 1, pageSize: 20, skip: 0, take: 20 },
      );

      expect(total).toBe(2);
      expect(items.every((l) => l.userId === "user-1")).toBe(true);
    });

    it("filters by type", async () => {
      const { items } = await service.list(
        "user-1",
        { type: "LIVE" },
        { page: 1, pageSize: 20, skip: 0, take: 20 },
      );

      expect(items).toHaveLength(1);
      expect(items[0].id).toBe("lesson-2");
    });

    it("filters by tag", async () => {
      const { items } = await service.list(
        "user-1",
        { tag: "hsk1" },
        { page: 1, pageSize: 20, skip: 0, take: 20 },
      );

      expect(items).toHaveLength(1);
      expect(items[0].id).toBe("lesson-1");
    });
  });
});
