/**
 * Base contract every module's repository interface extends.
 *
 * Every domain entity in this app is scoped to a single user (see the
 * SOLID/architecture notes in docs/architecture.md), so `userId` is part
 * of the base contract rather than repeated ad-hoc in every method
 * signature across modules.
 */
export interface Repository<Entity, CreateInput, UpdateInput> {
  findById(userId: string, id: string): Promise<Entity | null>;
  create(userId: string, input: CreateInput): Promise<Entity>;
  update(userId: string, id: string, input: UpdateInput): Promise<Entity>;
  delete(userId: string, id: string): Promise<void>;
}
