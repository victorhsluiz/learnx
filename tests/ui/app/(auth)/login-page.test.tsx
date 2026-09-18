import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MantineProvider } from "@mantine/core";
import LoginPage from "@/app/(auth)/login/page";

const pushMock = vi.fn();
const mutateMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/queries/auth", () => ({
  useLogin: () => ({
    mutate: mutateMock,
    isPending: false,
    isError: false,
    error: null,
  }),
}));

function renderLoginPage() {
  return render(
    <MantineProvider>
      <LoginPage />
    </MantineProvider>,
  );
}

describe("LoginPage", () => {
  beforeEach(() => {
    pushMock.mockClear();
    mutateMock.mockClear();
  });

  it("renders the email and password fields", () => {
    renderLoginPage();

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/senha/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /entrar/i })).toBeInTheDocument();
  });

  it("shows validation errors and does not submit for an invalid email", async () => {
    const user = userEvent.setup();
    renderLoginPage();

    await user.type(screen.getByLabelText(/email/i), "not-an-email");
    await user.type(screen.getByLabelText(/senha/i), "whatever");
    await user.click(screen.getByRole("button", { name: /entrar/i }));

    await waitFor(() => {
      expect(screen.getByText(/email inválido/i)).toBeInTheDocument();
    });
    expect(mutateMock).not.toHaveBeenCalled();
  });

  it("calls the login mutation with the entered credentials on valid submit", async () => {
    const user = userEvent.setup();
    renderLoginPage();

    await user.type(screen.getByLabelText(/email/i), "demo@learnx.dev");
    await user.type(screen.getByLabelText(/senha/i), "senha12345");
    await user.click(screen.getByRole("button", { name: /entrar/i }));

    await waitFor(() => {
      expect(mutateMock).toHaveBeenCalledWith(
        { email: "demo@learnx.dev", password: "senha12345" },
        expect.objectContaining({ onSuccess: expect.any(Function) }),
      );
    });
  });

  it("navigates to /dashboard on successful login", async () => {
    const user = userEvent.setup();
    renderLoginPage();

    await user.type(screen.getByLabelText(/email/i), "demo@learnx.dev");
    await user.type(screen.getByLabelText(/senha/i), "senha12345");
    await user.click(screen.getByRole("button", { name: /entrar/i }));

    await waitFor(() => expect(mutateMock).toHaveBeenCalled());
    const onSuccess = mutateMock.mock.calls[0][1].onSuccess;
    onSuccess();

    expect(pushMock).toHaveBeenCalledWith("/dashboard");
  });
});
