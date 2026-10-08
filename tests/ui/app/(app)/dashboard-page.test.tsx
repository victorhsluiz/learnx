import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import DashboardPage from "@/app/(app)/dashboard/page";
import type { DashboardSummary } from "@/lib/queries/dashboard";

const useDashboardSummaryMock = vi.fn();
const useSessionMock = vi.fn();

vi.mock("@/lib/queries/dashboard", () => ({
  useDashboardSummary: (...args: unknown[]) => useDashboardSummaryMock(...args),
}));

vi.mock("@/lib/queries/auth", () => ({
  useSession: (...args: unknown[]) => useSessionMock(...args),
}));

function makeSummary(overrides: Partial<DashboardSummary> = {}): DashboardSummary {
  return {
    words: { total: 42, last7Days: 5 },
    lessons: { completed: 10, pending: 3 },
    scheduleTasks: { dueToday: 2, dueThisWeek: 7 },
    ...overrides,
  };
}

function renderDashboardPage() {
  return render(
    <MantineProvider>
      <DashboardPage />
    </MantineProvider>,
  );
}

describe("DashboardPage", () => {
  beforeEach(() => {
    useDashboardSummaryMock.mockReset();
    useSessionMock.mockReset();
    useSessionMock.mockReturnValue({
      data: { id: "user-1", email: "a@a.com", name: "Ana", createdAt: new Date().toISOString() },
    });
  });

  it("shows a loading state while fetching the summary", () => {
    useDashboardSummaryMock.mockReturnValue({ isLoading: true, isError: false, data: undefined });

    renderDashboardPage();

    expect(screen.getByText(/carregando resumo/i)).toBeInTheDocument();
  });

  it("shows an error state when the summary query fails", () => {
    useDashboardSummaryMock.mockReturnValue({ isLoading: false, isError: true, data: undefined });

    renderDashboardPage();

    expect(screen.getByRole("alert")).toHaveTextContent(/não foi possível carregar/i);
  });

  it("renders the words, lessons, and schedule stat values when the summary loads", () => {
    useDashboardSummaryMock.mockReturnValue({
      isLoading: false,
      isError: false,
      data: makeSummary(),
    });

    renderDashboardPage();

    expect(screen.getByText("Palavras aprendidas")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("Últimos 7 dias")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();

    expect(screen.getByText("Aulas concluídas")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("Aulas pendentes")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();

    expect(screen.getByText("Tarefas para hoje")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("Tarefas na semana")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
  });
});
