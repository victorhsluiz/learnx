import type { User } from "@/generated/prisma/client";

/** Public shape of a user returned by the API — never includes passwordHash. */
export interface UserResponse {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export function toUserResponse(user: User): UserResponse {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt.toISOString(),
  };
}
