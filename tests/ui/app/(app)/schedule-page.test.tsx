import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MantineProvider } from "@mantine/core";
import SchedulePage from "@/app/(app)/schedule/page";
import type { StudyTask } from "@/lib/queries/study-tasks";
import type { Lesson } from "@/lib/queries/lessons";

const useStudyTasksMock = vi.fn();
const useLessonsMock = vi.fn();
const deleteMutateMock = vi.fn();
const markStatusMutateMock = vi.fn();

vi.mock("@/lib/queries/study-tasks", () => ({
  useStudyTasks: (...args: unknown[]) => useStudyTasksMock(...args),
  useDeleteStudyTask: () => ({ mutate: deleteMutateMock, isPending: false }),
  useMarkStudyTaskStatus: () => ({ mutate: markStatusMutateMock, isPending: false }),
  useCreateStudyTask: () => ({ mutate: vi.fn(), isPending: false, isError: false, error: null }),
  useUpdateStudyTask: () => ({ mutate: vi.fn(), isPending: false, isError: false, error: null }),
}));

vi.mock("@/lib/queries/lessons", () => ({
  useLessons: (...args: unknown[]) => useLessonsMock(...args),
}));

function makeStudyTask(overrides: Partial<StudyTask> = {}): StudyTask {
  return {
    id: "task-1",
    title: "Revisar HSK1",
    type: "revisão",
    date: new Date("2024-05-01T00:00:00.000Z").toISOString(),
    status: "PENDING",
    estimatedMinutes: 30,
    actualMinutes: null,
    lessonId: null,
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

function renderSchedulePage() {
  return render(
    <MantineProvider>
      <SchedulePage />
    </MantineProvider>,
  );
}

describe("SchedulePage", () => {
  beforeEach(() => {
    useStudyTasksMock.mockReset();
    useLessonsMock.mockReset();
    deleteMutateMock.mockClear();
    markStatusMutateMock.mockClear();
    useLessonsMock.mockReturnValue({
      isLoading: false,
      isError: false,
      data: { lessons: [makeLesson()], meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 } },
    });
  });

  it("shows a loading state while fetching", () => {
    useStudyTasksMock.mockReturnValue({ isLoading: true, isError: false, data: undefined });

    renderSchedulePage();

    expect(screen.getByText(/carregando tarefas/i)).toBeInTheDocument();
  });

  it("shows an error state when the query fails", () => {
    useStudyTasksMock.mockReturnValue({ isLoading: false, isError: true, data: undefined });

    renderSchedulePage();

    expect(screen.getByRole("alert")).toHaveTextContent(/não foi possível carregar/i);
  });

  it("shows an empty state when there are no tasks", () => {
    useStudyTasksMock.mockReturnValue({
      isLoading: false,
      isError: false,
      data: { studyTasks: [], meta: { page: 1, pageSize: 20, total: 0, totalPages: 1 } },
    });

    renderSchedulePage();

    expect(screen.getByText(/nenhuma tarefa encontrada/i)).toBeInTheDocument();
  });

  it("renders a task row with its title, type, status, and date", () => {
    useStudyTasksMock.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        studyTasks: [makeStudyTask()],
        meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
      },
    });

    renderSchedulePage();

    const row = screen.getByRole("row", { name: /revisar hsk1/i });
    expect(within(row).getByText("Revisar HSK1")).toBeInTheDocument();
    expect(within(row).getByText("revisão")).toBeInTheDocument();
    expect(within(row).getByText("Pendente")).toBeInTheDocument();
  });

  it("has an accessible action menu for each task", () => {
    useStudyTasksMock.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        studyTasks: [makeStudyTask()],
        meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
      },
    });

    renderSchedulePage();

    expect(screen.getByRole("button", { name: /ações para revisar hsk1/i })).toBeInTheDocument();
  });

  it("renders the status filter and type/date-range filters with accessible labels", () => {
    useStudyTasksMock.mockReturnValue({ isLoading: true, isError: false, data: undefined });

    renderSchedulePage();

    // Mantine's Select renders its options list (with the same
    // aria-label) into a portal even while closed, so scope this to the
    // actual combobox input rather than any element with the label.
    expect(screen.getByRole("combobox", { name: /filtrar por status/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/filtrar por tipo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/data a partir de/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/data até/i)).toBeInTheDocument();
  });

  it("calls useMarkStudyTaskStatus's mutate with { id, status: DONE } when 'Marcar feito' is clicked", async () => {
    const userEventInstance = userEvent.setup();
    useStudyTasksMock.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        studyTasks: [makeStudyTask()],
        meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
      },
    });

    renderSchedulePage();

    await userEventInstance.click(screen.getByRole("button", { name: /ações para revisar hsk1/i }));
    await userEventInstance.click(await screen.findByRole("menuitem", { name: /marcar feito/i }));

    expect(markStatusMutateMock).toHaveBeenCalledWith({ id: "task-1", status: "DONE" });
  });
});
