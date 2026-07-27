import { AppError } from "../../shared/errors/AppError.js";
import { hashPassword } from "../../shared/security/passwordHasher.js";
import { toUserView } from "./user.mapper.js";
import type { UserRepository } from "./user.repository.js";
import type {
  CreateUserInput,
  ListUsersFilters,
  UpdateUserInput,
} from "./user.types.js";

export class UserService {
  public constructor(private readonly repository: UserRepository) {}

  public async list(filters: ListUsersFilters) {
    const users = await this.repository.list(filters);
    return users.map(toUserView);
  }

  public async getById(id: string) {
    const user = await this.repository.findById(id);

    if (!user) {
      throw AppError.notFound("User");
    }

    return toUserView(user);
  }

  public async create(input: CreateUserInput) {
    await this.ensureEmailIsAvailable(input.email);
    const passwordHash = await hashPassword(input.password);
    const user = await this.repository.create({
      name: input.name,
      email: input.email,
      passwordHash,
      role: input.role,
      status: "active",
    });
    return toUserView(user);
  }

  public async update(id: string, input: UpdateUserInput) {
    if (input.email) {
      await this.ensureEmailIsAvailable(input.email, id);
    }

    const user = await this.repository.update(id, input);

    if (!user) {
      throw AppError.notFound("User");
    }

    return toUserView(user);
  }

  public async delete(id: string, currentUserId: string) {
    if (id === currentUserId) {
      throw AppError.badRequest("You cannot delete your own account.");
    }

    const deleted = await this.repository.delete(id);

    if (!deleted) {
      throw AppError.notFound("User");
    }
  }

  private async ensureEmailIsAvailable(email: string, excludedId?: string) {
    const existing = await this.repository.findByEmail(email);

    if (existing && existing.id !== excludedId) {
      throw AppError.conflict("A user with this email already exists.", {
        email,
      });
    }
  }
}
