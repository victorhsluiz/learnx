import { describe, expect, it, beforeEach } from "vitest";
import { NoteService } from "@/modules/notes/note.service";
import { NotFoundError, ValidationError } from "@/core/errors";
import type {
  FindManyResult,
  NoteFilters,
  NoteRepository,
  NoteWriteInput,
} from "@/modules/notes/note.repository.interface";
import type {
  LessonFilters,
  LessonRepository,
  LessonWriteInput,
} from "@/modules/lessons/lesson.repository.interface";
import type { Lesson, Note } from "@/generated/prisma/client";

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: "note-1",
    userId: "user-1",
    lessonId: null,
    title: "Nota",
    contentMarkdown: "conteudo",
    tags: [],
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

class FakeNoteRepository implements NoteRepository {
  private notes: Note[] = [];

  seed(note: Note) {
    this.notes.push(note);
  }

  async findById(userId: string, id: string): Promise<Note | null> {
    return this.notes.find((n) => n.id === id && n.userId === userId) ?? null;
  }

  async create(userId: string, input: NoteWriteInput): Promise<Note> {
    const note = makeNote({
      id: `note-${this.notes.length + 1}`,
      userId,
      ...input,
      lessonId: input.lessonId ?? null,
    });
    this.notes.push(note);
    return note;
  }

  async update(userId: string, id: string, input: Partial<NoteWriteInput>): Promise<Note> {
    const note = await this.findById(userId, id);
    if (!note) {
      throw new NotFoundError("Note not found");
    }
    Object.assign(note, input);
    return note;
  }

  async delete(userId: string, id: string): Promise<void> {
    const index = this.notes.findIndex((n) => n.id === id && n.userId === userId);
    if (index === -1) {
      throw new NotFoundError("Note not found");
    }
    this.notes.splice(index, 1);
  }

  async findMany(
    userId: string,
    filters: NoteFilters,
    pagination: { skip: number; take: number },
  ): Promise<FindManyResult<Note>> {
    let items = this.notes.filter((n) => n.userId === userId);
    if (filters.lessonId) items = items.filter((n) => n.lessonId === filters.lessonId);
    if (filters.tag) items = items.filter((n) => n.tags.includes(filters.tag!));
    if (filters.q) {
      const q = filters.q.toLowerCase();
      items = items.filter(
        (n) => n.title.toLowerCase().includes(q) || n.contentMarkdown.toLowerCase().includes(q),
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

  async countByStatus(): Promise<number> {
    throw new Error("not used in these tests");
  }
}

describe("NoteService", () => {
  let noteRepository: FakeNoteRepository;
  let lessonRepository: FakeLessonRepository;
  let service: NoteService;

  beforeEach(() => {
    noteRepository = new FakeNoteRepository();
    lessonRepository = new FakeLessonRepository();
    service = new NoteService(noteRepository, lessonRepository);
  });

  describe("create", () => {
    it("creates a note without a lessonId", async () => {
      const note = await service.create("user-1", {
        title: "Nota livre",
        contentMarkdown: "conteudo",
        tags: ["gramatica"],
      });

      expect(note.userId).toBe("user-1");
      expect(note.lessonId).toBeNull();
    });

    it("creates a note linked to a lesson owned by the same user", async () => {
      lessonRepository.seed(makeLesson({ id: "lesson-1", userId: "user-1" }));

      const note = await service.create("user-1", {
        title: "Nota da aula",
        contentMarkdown: "conteudo",
        lessonId: "lesson-1",
        tags: [],
      });

      expect(note.lessonId).toBe("lesson-1");
    });

    it("throws ValidationError when lessonId references a lesson owned by another user", async () => {
      lessonRepository.seed(makeLesson({ id: "lesson-1", userId: "other-user" }));

      await expect(
        service.create("user-1", {
          title: "Nota maliciosa",
          contentMarkdown: "x",
          lessonId: "lesson-1",
          tags: [],
        }),
      ).rejects.toThrow(ValidationError);
    });

    it("throws ValidationError when lessonId doesn't exist at all", async () => {
      await expect(
        service.create("user-1", {
          title: "Nota",
          contentMarkdown: "x",
          lessonId: "missing-lesson",
          tags: [],
        }),
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("update", () => {
    it("updates only the provided fields", async () => {
      noteRepository.seed(makeNote({ id: "note-1", userId: "user-1", tags: ["a"] }));

      const updated = await service.update("user-1", "note-1", { title: "Renamed" });

      expect(updated.title).toBe("Renamed");
      expect(updated.tags).toEqual(["a"]);
    });

    it("clears lessonId when explicitly set to null", async () => {
      noteRepository.seed(makeNote({ id: "note-1", userId: "user-1", lessonId: "lesson-1" }));

      const updated = await service.update("user-1", "note-1", { lessonId: null });

      expect(updated.lessonId).toBeNull();
    });

    it("throws ValidationError when updating to a lessonId owned by another user", async () => {
      noteRepository.seed(makeNote({ id: "note-1", userId: "user-1" }));
      lessonRepository.seed(makeLesson({ id: "lesson-1", userId: "other-user" }));

      await expect(service.update("user-1", "note-1", { lessonId: "lesson-1" })).rejects.toThrow(
        ValidationError,
      );
    });

    it("throws NotFoundError for a note belonging to a different user", async () => {
      noteRepository.seed(makeNote({ id: "note-1", userId: "other-user" }));

      await expect(service.update("user-1", "note-1", { title: "Renamed" })).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  describe("getById / delete", () => {
    it("throws NotFoundError for a note belonging to a different user", async () => {
      noteRepository.seed(makeNote({ id: "note-1", userId: "other-user" }));

      await expect(service.getById("user-1", "note-1")).rejects.toThrow(NotFoundError);
      await expect(service.delete("user-1", "note-1")).rejects.not.toBeUndefined();
    });
  });

  describe("list", () => {
    beforeEach(() => {
      noteRepository.seed(
        makeNote({ id: "note-1", userId: "user-1", title: "Tons", lessonId: "lesson-1" }),
      );
      noteRepository.seed(
        makeNote({ id: "note-2", userId: "user-1", title: "Gramática", tags: ["hsk1"] }),
      );
      noteRepository.seed(makeNote({ id: "note-3", userId: "other-user" }));
    });

    it("only returns notes belonging to the user", async () => {
      const { items, total } = await service.list(
        "user-1",
        {},
        { page: 1, pageSize: 20, skip: 0, take: 20 },
      );

      expect(total).toBe(2);
      expect(items.every((n) => n.userId === "user-1")).toBe(true);
    });

    it("filters by lessonId", async () => {
      const { items } = await service.list(
        "user-1",
        { lessonId: "lesson-1" },
        { page: 1, pageSize: 20, skip: 0, take: 20 },
      );

      expect(items).toHaveLength(1);
      expect(items[0].id).toBe("note-1");
    });

    it("filters by tag", async () => {
      const { items } = await service.list(
        "user-1",
        { tag: "hsk1" },
        { page: 1, pageSize: 20, skip: 0, take: 20 },
      );

      expect(items).toHaveLength(1);
      expect(items[0].id).toBe("note-2");
    });
  });
});
