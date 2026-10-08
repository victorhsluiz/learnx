import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import NotesPage from "@/app/(app)/notes/page";
import type { Note } from "@/lib/queries/notes";
import type { Lesson } from "@/lib/queries/lessons";

const useNotesMock = vi.fn();
const useLessonsMock = vi.fn();
const deleteMutateMock = vi.fn();

vi.mock("@/lib/queries/notes", () => ({
  useNotes: (...args: unknown[]) => useNotesMock(...args),
  useDeleteNote: () => ({ mutate: deleteMutateMock, isPending: false }),
  useCreateNote: () => ({ mutate: vi.fn(), isPending: false, isError: false, error: null }),
  useUpdateNote: () => ({ mutate: vi.fn(), isPending: false, isError: false, error: null }),
}));

vi.mock("@/lib/queries/lessons", () => ({
  useLessons: (...args: unknown[]) => useLessonsMock(...args),
}));

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: "note-1",
    title: "Tons do mandarim",
    contentMarkdown: "Os quatro tons básicos são essenciais para a pronúncia correta.",
    lessonId: null,
    tags: ["hsk1"],
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

function renderNotesPage() {
  return render(
    <MantineProvider>
      <NotesPage />
    </MantineProvider>,
  );
}

describe("NotesPage", () => {
  beforeEach(() => {
    useNotesMock.mockReset();
    useLessonsMock.mockReset();
    deleteMutateMock.mockClear();
    useLessonsMock.mockReturnValue({
      isLoading: false,
      isError: false,
      data: { lessons: [makeLesson()], meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 } },
    });
  });

  it("shows a loading state while fetching", () => {
    useNotesMock.mockReturnValue({ isLoading: true, isError: false, data: undefined });

    renderNotesPage();

    expect(screen.getByText(/carregando anotações/i)).toBeInTheDocument();
  });

  it("shows an error state when the query fails", () => {
    useNotesMock.mockReturnValue({ isLoading: false, isError: true, data: undefined });

    renderNotesPage();

    expect(screen.getByRole("alert")).toHaveTextContent(/não foi possível carregar/i);
  });

  it("shows an empty state when there are no notes", () => {
    useNotesMock.mockReturnValue({
      isLoading: false,
      isError: false,
      data: { notes: [], meta: { page: 1, pageSize: 20, total: 0, totalPages: 1 } },
    });

    renderNotesPage();

    expect(screen.getByText(/nenhuma anotação encontrada/i)).toBeInTheDocument();
  });

  it("renders a note row with its title, content excerpt, and tags", () => {
    useNotesMock.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        notes: [makeNote()],
        meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
      },
    });

    renderNotesPage();

    const row = screen.getByRole("row", { name: /tons do mandarim/i });
    expect(within(row).getByText("Tons do mandarim")).toBeInTheDocument();
    expect(within(row).getByText(/os quatro tons básicos/i)).toBeInTheDocument();
    expect(within(row).getByText("hsk1")).toBeInTheDocument();
  });

  it("has an accessible action menu for each note", () => {
    useNotesMock.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        notes: [makeNote()],
        meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
      },
    });

    renderNotesPage();

    expect(
      screen.getByRole("button", { name: /ações para tons do mandarim/i }),
    ).toBeInTheDocument();
  });

  it("renders the search input and lesson filter select with accessible labels", () => {
    useNotesMock.mockReturnValue({ isLoading: true, isError: false, data: undefined });

    renderNotesPage();

    expect(screen.getByLabelText(/buscar anotações por título ou conteúdo/i)).toBeInTheDocument();
    // Mantine's Select renders its options list (with the same
    // aria-label) into a portal even while closed, so scope this to the
    // actual combobox input rather than any element with the label.
    expect(screen.getByRole("combobox", { name: /filtrar por aula/i })).toBeInTheDocument();
  });
});
