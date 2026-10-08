import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import VocabularyPage from "@/app/(app)/vocabulary/page";
import type { Word } from "@/lib/queries/vocabulary";
import type { Lesson } from "@/lib/queries/lessons";

const useWordsMock = vi.fn();
const useLessonsMock = vi.fn();
const deleteMutateMock = vi.fn();

vi.mock("@/lib/queries/vocabulary", () => ({
  useWords: (...args: unknown[]) => useWordsMock(...args),
  useDeleteWord: () => ({ mutate: deleteMutateMock, isPending: false }),
  useCreateWord: () => ({ mutate: vi.fn(), isPending: false, isError: false, error: null }),
  useUpdateWord: () => ({ mutate: vi.fn(), isPending: false, isError: false, error: null }),
}));

vi.mock("@/lib/queries/lessons", () => ({
  useLessons: (...args: unknown[]) => useLessonsMock(...args),
}));

function makeWord(overrides: Partial<Word> = {}): Word {
  return {
    id: "word-1",
    hanzi: "你好",
    pinyin: "nǐ hǎo",
    translation: "olá",
    notes: null,
    learnedAt: new Date().toISOString(),
    lessonId: null,
    tags: ["hsk1"],
    partOfSpeech: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeLesson(overrides: Partial<Lesson> = {}): Lesson {
  return {
    id: "lesson-1",
    title: "Aula 1",
    type: "RECORDED",
    status: "PENDING",
    sourceUrl: null,
    scheduledAt: null,
    watchedAt: null,
    durationMinutes: null,
    tags: [],
    position: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function renderVocabularyPage() {
  return render(
    <MantineProvider>
      <VocabularyPage />
    </MantineProvider>,
  );
}

describe("VocabularyPage", () => {
  beforeEach(() => {
    useWordsMock.mockReset();
    useLessonsMock.mockReset();
    deleteMutateMock.mockClear();
    useLessonsMock.mockReturnValue({
      isLoading: false,
      isError: false,
      data: { lessons: [makeLesson()], meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 } },
    });
  });

  it("shows a loading state while fetching", () => {
    useWordsMock.mockReturnValue({ isLoading: true, isError: false, data: undefined });

    renderVocabularyPage();

    expect(screen.getByText(/carregando palavras/i)).toBeInTheDocument();
  });

  it("shows an error state when the query fails", () => {
    useWordsMock.mockReturnValue({ isLoading: false, isError: true, data: undefined });

    renderVocabularyPage();

    expect(screen.getByRole("alert")).toHaveTextContent(/não foi possível carregar/i);
  });

  it("shows an empty state when there are no words", () => {
    useWordsMock.mockReturnValue({
      isLoading: false,
      isError: false,
      data: { words: [], meta: { page: 1, pageSize: 20, total: 0, totalPages: 1 } },
    });

    renderVocabularyPage();

    expect(screen.getByText(/nenhuma palavra encontrada/i)).toBeInTheDocument();
  });

  it("renders a word row with its hanzi, pinyin, translation, and tags", () => {
    useWordsMock.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        words: [makeWord()],
        meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
      },
    });

    renderVocabularyPage();

    const row = screen.getByRole("row", { name: /你好/i });
    expect(within(row).getByText("你好")).toBeInTheDocument();
    expect(within(row).getByText("nǐ hǎo")).toBeInTheDocument();
    expect(within(row).getByText("olá")).toBeInTheDocument();
    expect(within(row).getByText("hsk1")).toBeInTheDocument();
  });

  it("has an accessible action menu for each word", () => {
    useWordsMock.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        words: [makeWord()],
        meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
      },
    });

    renderVocabularyPage();

    expect(screen.getByRole("button", { name: /ações para 你好/i })).toBeInTheDocument();
  });

  it("renders the search input and tag/lesson/date-range filters with accessible labels", () => {
    useWordsMock.mockReturnValue({ isLoading: true, isError: false, data: undefined });

    renderVocabularyPage();

    expect(
      screen.getByLabelText(/buscar palavras por hanzi, pinyin ou tradução/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/filtrar por tag/i)).toBeInTheDocument();
    // Mantine's Select renders its options list (with the same
    // aria-label) into a portal even while closed, so scope this to the
    // actual combobox input rather than any element with the label.
    expect(screen.getByRole("combobox", { name: /filtrar por aula/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/aprendida a partir de/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/aprendida até/i)).toBeInTheDocument();
  });
});
