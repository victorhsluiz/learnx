import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, ApiError } from "@/lib/api-client";

/**
 * Mirrors modules/auth/auth.mapper.ts's UserResponse shape. The frontend
 * intentionally doesn't import backend module types directly — it only
 * knows the public API's response shape, same as any other API consumer
 * would.
 */
export interface SessionUser {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

const SESSION_QUERY_KEY = ["session"] as const;

/**
 * Resolves the current session by calling GET /auth/me. A 401 is treated
 * as "not logged in" (no error is thrown to the caller) rather than a
 * query failure — components branch on `data` being present, not on
 * `isError`.
 */
export function useSession() {
  return useQuery({
    queryKey: SESSION_QUERY_KEY,
    queryFn: async (): Promise<SessionUser | null> => {
      try {
        const { user } = await apiClient.get<{ user: SessionUser }>("/auth/me");
        return user;
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          return null;
        }
        throw error;
      }
    },
    retry: false,
  });
}

interface Credentials {
  email: string;
  password: string;
}

interface RegisterInput extends Credentials {
  name: string;
}

function useSetSessionOnSuccess() {
  const queryClient = useQueryClient();
  return (user: SessionUser) => {
    queryClient.setQueryData(SESSION_QUERY_KEY, user);
  };
}

export function useLogin() {
  const setSession = useSetSessionOnSuccess();

  return useMutation({
    mutationFn: (input: Credentials) =>
      apiClient.post<{ user: SessionUser }>("/auth/login", input, { retryOn401: false }),
    onSuccess: ({ user }) => setSession(user),
  });
}

export function useRegister() {
  const setSession = useSetSessionOnSuccess();

  return useMutation({
    mutationFn: (input: RegisterInput) =>
      apiClient.post<{ user: SessionUser }>("/auth/register", input, { retryOn401: false }),
    onSuccess: ({ user }) => setSession(user),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiClient.post<void>("/auth/logout", undefined, { retryOn401: false }),
    onSuccess: () => {
      queryClient.setQueryData(SESSION_QUERY_KEY, null);
    },
  });
}
