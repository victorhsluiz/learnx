import { describe, expect, it, beforeEach } from "vitest";
import { StudyTaskService } from "@/modules/schedule/study-task.service";
import { NotFoundError, ValidationError } from "@/core/errors";
import type {
  FindManyResult,
  StudyTaskFilters,
  StudyTaskRepository,
  StudyTaskWriteInput,
} from "@/modules/schedule/study-task.repository.interface";
import type {
  LessonFilters,
  LessonRepository,
  LessonWriteInput,
} from "@/modules/lessons/lesson.repository.interface";
import type { Lesson, StudyTask } from "@/generated/prisma/client";

function makeStudyTask(overrides: Partial<StudyTask> = {}): StudyTask {
  return {
    id: "task-1",
    userId: "user-1",
    lessonId: null,
    title: "Revisar HSK1",
    type: "revisão",
    date: new Date(),
    status: "PENDING",
    estimatedMinutes: null,
    actualMinutes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeLesson(overrides: Partial<Lesson> = {}): Lesson {
  return {
    id: "lesson-1",
    userId: "user-1",
    title: "Aula",
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

class FakeStudyTaskRepository implements StudyTaskRepository {
  private studyTasks: StudyTask[] = [];

  seed(studyTask: StudyTask) {
    this.studyTasks.push(studyTask);
  }

  async findById(userId: string, id: string): Promise<StudyTask | null> {
    return this.studyTasks.find((t) => t.id === id && t.userId === userId) ?? null;
  }

  async create(userId: string, input: StudyTaskWriteInput): Promise<StudyTask> {
    const studyTask = makeStudyTask({
      id: `task-${this.studyTasks.length + 1}`,
      userId,
      ...input,
      lessonId: input.lessonId ?? null,
      estimatedMinutes: input.estimatedMinutes ?? null,
      actualMinutes: input.actualMinutes ?? null,
    });
    this.studyTasks.push(studyTask);
    return studyTask;
  }

  async update(
    userId: string,
    id: string,
    input: Partial<StudyTaskWriteInput>,
  ): Promise<StudyTask> {
    const studyTask = await this.findById(userId, id);
    if (!studyTask) {
      throw new NotFoundError("Study task not found");
    }
    Object.assign(studyTask, input);
    return studyTask;
  }

  async delete(userId: string, id: string): Promise<void> {
    const index = this.studyTasks.findIndex((t) => t.id === id && t.userId === userId);
    if (index === -1) {
      throw new NotFoundError("Study task not found");
    }
    this.studyTasks.splice(index, 1);
  }

  async findMany(
    userId: string,
    filters: StudyTaskFilters,
    pagination: { skip: number; take: number },
  ): Promise<FindManyResult<StudyTask>> {
    let items = this.studyTasks.filter((t) => t.userId === userId);
    if (filters.status) items = items.filter((t) => t.status === filters.status);
    if (filters.type) items = items.filter((t) => t.type === filters.type);
    if (filters.dateFrom) items = items.filter((t) => t.date >= filters.dateFrom!);
    if (filters.dateTo) items = items.filter((t) => t.date <= filters.dateTo!);
    const total = items.length;
    return { items: items.slice(pagination.skip, pagination.skip + pagination.take), total };
  }
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

  async update(): Promise<Lesson> {
    throw new Error("not used in these tests");
  }

  async delete(): Promise<void> {
    throw new Error("not used in these tests");
  }

  async findMany(
    userId: string,
    _filters: LessonFilters,
    _pagination: { skip: number; take: number },
  ): Promise<FindManyResult<Lesson>> {
    const items = this.lessons.filter((l) => l.userId === userId);
    return { items, total: items.length };
  }

  async markWatched(): Promise<Lesson> {
    throw new Error("not used in these tests");
  }
}

describe("StudyTaskService", () => {
  let studyTaskRepository: FakeStudyTaskRepository;
  let lessonRepository: FakeLessonRepository;
  let service: StudyTaskService;

  beforeEach(() => {
    studyTaskRepository = new FakeStudyTaskRepository();
    lessonRepository = new FakeLessonRepository();
    service = new StudyTaskService(studyTaskRepository, lessonRepository);
  });

  describe("create", () => {
    it("creates a study task without a lessonId", async () => {
      const studyTask = await service.create("user-1", {
        title: "Revisar HSK1",
        type: "revisão",
        date: new Date(),
        status: "PENDING",
      });

      expect(studyTask.userId).toBe("user-1");
      expect(studyTask.lessonId).toBeNull();
    });

    it("creates a study task linked to a lesson owned by the same user", async () => {
      lessonRepository.seed(makeLesson({ id: "lesson-1", userId: "user-1" }));

      const studyTask = await service.create("user-1", {
        title: "Revisar aula",
        type: "estudo",
        date: new Date(),
        status: "PENDING",
        lessonId: "lesson-1",
      });

      expect(studyTask.lessonId).toBe("lesson-1");
    });

    it("throws ValidationError when lessonId references a lesson owned by another user", async () => {
      lessonRepository.seed(makeLesson({ id: "lesson-1", userId: "other-user" }));

      await expect(
        service.create("user-1", {
          title: "Revisar aula",
          type: "estudo",
          date: new Date(),
          status: "PENDING",
          lessonId: "lesson-1",
        }),
      ).rejects.toThrow(ValidationError);
    });

    it("throws ValidationError when lessonId doesn't exist at all", async () => {
      await expect(
        service.create("user-1", {
          title: "Revisar aula",
          type: "estudo",
          date: new Date(),
          status: "PENDING",
          lessonId: "missing-lesson",
        }),
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("update", () => {
    it("updates only the provided fields, leaving others untouched", async () => {
      studyTaskRepository.seed(
        makeStudyTask({ id: "task-1", userId: "user-1", title: "Original", status: "PENDING" }),
      );

      const updated = await service.update("user-1", "task-1", { status: "DONE" });

      expect(updated.status).toBe("DONE");
      expect(updated.title).toBe("Original");
    });

    it("clears lessonId when explicitly set to null", async () => {
      studyTaskRepository.seed(
        makeStudyTask({ id: "task-1", userId: "user-1", lessonId: "lesson-1" }),
      );

      const updated = await service.update("user-1", "task-1", { lessonId: null });

      expect(updated.lessonId).toBeNull();
    });

    it("throws ValidationError when updating to a lessonId owned by another user", async () => {
      studyTaskRepository.seed(makeStudyTask({ id: "task-1", userId: "user-1" }));
      lessonRepository.seed(makeLesson({ id: "lesson-1", userId: "other-user" }));

      await expect(service.update("user-1", "task-1", { lessonId: "lesson-1" })).rejects.toThrow(
        ValidationError,
      );
    });

    it("throws NotFoundError for a study task belonging to a different user", async () => {
      studyTaskRepository.seed(makeStudyTask({ id: "task-1", userId: "other-user" }));

      await expect(service.update("user-1", "task-1", { title: "x" })).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe("getById / delete", () => {
    it("throws NotFoundError for a study task belonging to a different user", async () => {
      studyTaskRepository.seed(makeStudyTask({ id: "task-1", userId: "other-user" }));

      await expect(service.getById("user-1", "task-1")).rejects.toThrow(NotFoundError);
      await expect(service.delete("user-1", "task-1")).rejects.not.toBeUndefined();
    });
  });

  describe("list", () => {
    beforeEach(() => {
      studyTaskRepository.seed(
        makeStudyTask({
          id: "task-1",
          userId: "user-1",
          status: "PENDING",
          type: "estudo",
          date: new Date("2024-01-01T00:00:00.000Z"),
        }),
      );
      studyTaskRepository.seed(
        makeStudyTask({
          id: "task-2",
          userId: "user-1",
          status: "DONE",
          type: "revisão",
          date: new Date("2024-06-01T00:00:00.000Z"),
        }),
      );
      studyTaskRepository.seed(makeStudyTask({ id: "task-3", userId: "other-user" }));
    });

    it("only returns study tasks belonging to the user", async () => {
      const { items, total } = await service.list(
        "user-1",
        {},
        { page: 1, pageSize: 20, skip: 0, take: 20 },
      );

      expect(total).toBe(2);
      expect(items.every((t) => t.userId === "user-1")).toBe(true);
    });

    it("filters by status", async () => {
      const { items } = await service.list(
        "user-1",
        { status: "DONE" },
        { page: 1, pageSize: 20, skip: 0, take: 20 },
      );

      expect(items).toHaveLength(1);
      expect(items[0].id).toBe("task-2");
    });

    it("filters by type", async () => {
      const { items } = await service.list(
        "user-1",
        { type: "estudo" },
        { page: 1, pageSize: 20, skip: 0, take: 20 },
      );

      expect(items).toHaveLength(1);
      expect(items[0].id).toBe("task-1");
    });

    it("filters by date range", async () => {
      const { items } = await service.list(
        "user-1",
        { dateFrom: new Date("2024-03-01T00:00:00.000Z") },
        { page: 1, pageSize: 20, skip: 0, take: 20 },
      );

      expect(items).toHaveLength(1);
      expect(items[0].id).toBe("task-2");
    });
  });
});
