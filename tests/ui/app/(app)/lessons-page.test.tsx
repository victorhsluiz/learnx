import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import LessonsPage from "@/app/(app)/lessons/page";
import type { Lesson } from "@/lib/queries/lessons";

const useLessonsMock = vi.fn();
const deleteMutateMock = vi.fn();
const markWatchedMutateMock = vi.fn();

vi.mock("@/lib/queries/lessons", () => ({
  useLessons: (...args: unknown[]) => useLessonsMock(...args),
  useDeleteLesson: () => ({ mutate: deleteMutateMock, isPending: false }),
  useMarkLessonWatched: () => ({ mutate: markWatchedMutateMock, isPending: false }),
  useCreateLesson: () => ({ mutate: vi.fn(), isPending: false, isError: false, error: null }),
  useUpdateLesson: () => ({ mutate: vi.fn(), isPending: false, isError: false, error: null }),
}));

function makeLesson(overrides: Partial<Lesson> = {}): Lesson {
  return {
    id: "lesson-1",
    title: "Aula 1 - Tons",
    type: "RECORDED",
    status: "PENDING",
    sourceUrl: null,
    scheduledAt: null,
    watchedAt: null,
    durationMinutes: null,
    tags: ["hsk1"],
    position: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function renderLessonsPage() {
  return render(
    <MantineProvider>
      <LessonsPage />
    </MantineProvider>,
  );
}

describe("LessonsPage", () => {
  beforeEach(() => {
    useLessonsMock.mockReset();
    deleteMutateMock.mockClear();
    markWatchedMutateMock.mockClear();
  });

  it("shows a loading state while fetching", () => {
    useLessonsMock.mockReturnValue({ isLoading: true, isError: false, data: undefined });

    renderLessonsPage();

    expect(screen.getByText(/carregando aulas/i)).toBeInTheDocument();
  });

  it("shows an error state when the query fails", () => {
    useLessonsMock.mockReturnValue({ isLoading: false, isError: true, data: undefined });

    renderLessonsPage();

    expect(screen.getByRole("alert")).toHaveTextContent(/não foi possível carregar/i);
  });

  it("shows an empty state when there are no lessons", () => {
    useLessonsMock.mockReturnValue({
      isLoading: false,
      isError: false,
      data: { lessons: [], meta: { page: 1, pageSize: 20, total: 0, totalPages: 1 } },
    });

    renderLessonsPage();

    expect(screen.getByText(/nenhuma aula encontrada/i)).toBeInTheDocument();
  });

  it("renders a lesson row with its title, type, status, and tags", () => {
    useLessonsMock.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        lessons: [makeLesson()],
        meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
      },
    });

    renderLessonsPage();

    const row = screen.getByRole("row", { name: /aula 1 - tons/i });
    expect(within(row).getByText("Aula 1 - Tons")).toBeInTheDocument();
    expect(within(row).getByText("Gravada")).toBeInTheDocument();
    expect(within(row).getByText("Pendente")).toBeInTheDocument();
    expect(within(row).getByText("hsk1")).toBeInTheDocument();
  });

  it("has an accessible action menu for each lesson", () => {
    useLessonsMock.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        lessons: [makeLesson()],
        meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
      },
    });

    renderLessonsPage();

    expect(screen.getByRole("button", { name: /ações para aula 1 - tons/i })).toBeInTheDocument();
  });

  it("renders the search input and filter selects with accessible labels", () => {
    useLessonsMock.mockReturnValue({ isLoading: true, isError: false, data: undefined });

    renderLessonsPage();

    expect(screen.getByLabelText(/buscar aulas por título/i)).toBeInTheDocument();
    // Mantine's Select renders its options list (with the same
    // aria-label) into a portal even while closed, so scope this to the
    // actual combobox input rather than any element with the label.
    expect(screen.getByRole("combobox", { name: /filtrar por status/i })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /filtrar por tipo/i })).toBeInTheDocument();
  });
});
