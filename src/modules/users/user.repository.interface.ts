import type { User } from "@/generated/prisma/client";

export interface CreateUserInput {
  email: string;
  passwordHash: string;
  name: string;
}

/**
 * Contract for user persistence. Notably does *not* extend the base
 * Repository<Entity, CreateInput, UpdateInput> from core/database — users
 * aren't scoped to a userId (they *are* the user), so the shared
 * user-scoped contract doesn't apply here.
 */
export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(input: CreateUserInput): Promise<User>;
}
