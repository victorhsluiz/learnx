import { describe, expect, it, beforeEach } from "vitest";
import { WordService } from "@/modules/vocabulary/word.service";
import { NotFoundError, ValidationError } from "@/core/errors";
import type {
  FindManyResult,
  WordFilters,
  WordRepository,
  WordWriteInput,
} from "@/modules/vocabulary/word.repository.interface";
import type {
  LessonFilters,
  LessonRepository,
  LessonWriteInput,
} from "@/modules/lessons/lesson.repository.interface";
import type { Lesson, Word } from "@/generated/prisma/client";

function makeWord(overrides: Partial<Word> = {}): Word {
  return {
    id: "word-1",
    userId: "user-1",
    lessonId: null,
    hanzi: "你好",
    pinyin: "nǐ hǎo",
    translation: "hello",
    notes: null,
    learnedAt: new Date(),
    tags: [],
    partOfSpeech: null,
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

class FakeWordRepository implements WordRepository {
  private words: Word[] = [];

  seed(word: Word) {
    this.words.push(word);
  }

  async findById(userId: string, id: string): Promise<Word | null> {
    return this.words.find((w) => w.id === id && w.userId === userId) ?? null;
  }

  async create(userId: string, input: WordWriteInput): Promise<Word> {
    const word = makeWord({
      id: `word-${this.words.length + 1}`,
      userId,
      ...input,
      lessonId: input.lessonId ?? null,
      learnedAt: input.learnedAt ?? new Date(),
    });
    this.words.push(word);
    return word;
  }

  async update(userId: string, id: string, input: Partial<WordWriteInput>): Promise<Word> {
    const word = await this.findById(userId, id);
    if (!word) {
      throw new NotFoundError("Word not found");
    }
    Object.assign(word, input);
    return word;
  }

  async delete(userId: string, id: string): Promise<void> {
    const index = this.words.findIndex((w) => w.id === id && w.userId === userId);
    if (index === -1) {
      throw new NotFoundError("Word not found");
    }
    this.words.splice(index, 1);
  }

  async findMany(
    userId: string,
    filters: WordFilters,
    pagination: { skip: number; take: number },
  ): Promise<FindManyResult<Word>> {
    let items = this.words.filter((w) => w.userId === userId);
    if (filters.lessonId) items = items.filter((w) => w.lessonId === filters.lessonId);
    if (filters.tag) items = items.filter((w) => w.tags.includes(filters.tag!));
    if (filters.q) {
      const q = filters.q.toLowerCase();
      items = items.filter(
        (w) =>
          w.hanzi.toLowerCase().includes(q) ||
          w.pinyin.toLowerCase().includes(q) ||
          w.translation.toLowerCase().includes(q),
      );
    }
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

describe("WordService", () => {
  let wordRepository: FakeWordRepository;
  let lessonRepository: FakeLessonRepository;
  let service: WordService;

  beforeEach(() => {
    wordRepository = new FakeWordRepository();
    lessonRepository = new FakeLessonRepository();
    service = new WordService(wordRepository, lessonRepository);
  });

  describe("create", () => {
    it("creates a word without a lessonId", async () => {
      const word = await service.create("user-1", {
        hanzi: "你好",
        pinyin: "nǐ hǎo",
        translation: "hello",
        learnedAt: new Date(),
        tags: [],
      });

      expect(word.userId).toBe("user-1");
      expect(word.lessonId).toBeNull();
    });

    it("creates a word linked to a lesson owned by the same user", async () => {
      lessonRepository.seed(makeLesson({ id: "lesson-1", userId: "user-1" }));

      const word = await service.create("user-1", {
        hanzi: "谢谢",
        pinyin: "xiè xiè",
        translation: "thank you",
        learnedAt: new Date(),
        lessonId: "lesson-1",
        tags: [],
      });

      expect(word.lessonId).toBe("lesson-1");
    });

    it("throws ValidationError when lessonId references a lesson owned by another user", async () => {
      lessonRepository.seed(makeLesson({ id: "lesson-1", userId: "other-user" }));

      await expect(
        service.create("user-1", {
          hanzi: "再见",
          pinyin: "zài jiàn",
          translation: "goodbye",
          learnedAt: new Date(),
          lessonId: "lesson-1",
          tags: [],
        }),
      ).rejects.toThrow(ValidationError);
    });

    it("throws ValidationError when lessonId doesn't exist at all", async () => {
      await expect(
        service.create("user-1", {
          hanzi: "再见",
          pinyin: "zài jiàn",
          translation: "goodbye",
          learnedAt: new Date(),
          lessonId: "missing-lesson",
          tags: [],
        }),
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("update", () => {
    it("updates only the provided fields", async () => {
      wordRepository.seed(makeWord({ id: "word-1", userId: "user-1", tags: ["a"] }));

      const updated = await service.update("user-1", "word-1", { translation: "updated" });

      expect(updated.translation).toBe("updated");
      expect(updated.tags).toEqual(["a"]);
    });

    it("clears lessonId when explicitly set to null", async () => {
      wordRepository.seed(makeWord({ id: "word-1", userId: "user-1", lessonId: "lesson-1" }));

      const updated = await service.update("user-1", "word-1", { lessonId: null });

      expect(updated.lessonId).toBeNull();
    });

    it("throws ValidationError when updating to a lessonId owned by another user", async () => {
      wordRepository.seed(makeWord({ id: "word-1", userId: "user-1" }));
      lessonRepository.seed(makeLesson({ id: "lesson-1", userId: "other-user" }));

      await expect(service.update("user-1", "word-1", { lessonId: "lesson-1" })).rejects.toThrow(
        ValidationError,
      );
    });

    it("throws NotFoundError for a word belonging to a different user", async () => {
      wordRepository.seed(makeWord({ id: "word-1", userId: "other-user" }));

      await expect(service.update("user-1", "word-1", { translation: "x" })).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe("getById / delete", () => {
    it("throws NotFoundError for a word belonging to a different user", async () => {
      wordRepository.seed(makeWord({ id: "word-1", userId: "other-user" }));

      await expect(service.getById("user-1", "word-1")).rejects.toThrow(NotFoundError);
      await expect(service.delete("user-1", "word-1")).rejects.not.toBeUndefined();
    });
  });

  describe("list", () => {
    beforeEach(() => {
      wordRepository.seed(
        makeWord({ id: "word-1", userId: "user-1", hanzi: "你好", lessonId: "lesson-1" }),
      );
      wordRepository.seed(
        makeWord({ id: "word-2", userId: "user-1", hanzi: "谢谢", tags: ["hsk1"] }),
      );
      wordRepository.seed(makeWord({ id: "word-3", userId: "other-user" }));
    });

    it("only returns words belonging to the user", async () => {
      const { items, total } = await service.list(
        "user-1",
        {},
        { page: 1, pageSize: 20, skip: 0, take: 20 },
      );

      expect(total).toBe(2);
      expect(items.every((w) => w.userId === "user-1")).toBe(true);
    });

    it("filters by lessonId", async () => {
      const { items } = await service.list(
        "user-1",
        { lessonId: "lesson-1" },
        { page: 1, pageSize: 20, skip: 0, take: 20 },
      );

      expect(items).toHaveLength(1);
      expect(items[0].id).toBe("word-1");
    });

    it("filters by tag", async () => {
      const { items } = await service.list(
        "user-1",
        { tag: "hsk1" },
        { page: 1, pageSize: 20, skip: 0, take: 20 },
      );

      expect(items).toHaveLength(1);
      expect(items[0].id).toBe("word-2");
    });
  });
});
