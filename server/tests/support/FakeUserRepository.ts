import { Types } from "mongoose";

import {
  UserModel,
  type UserDocument,
} from "../../src/modules/users/user.model.js";
import type {
  CreateUserRecord,
  UserRepository,
} from "../../src/modules/users/user.repository.js";
import type {
  ListUsersFilters,
  UpdateUserInput,
} from "../../src/modules/users/user.types.js";

export class FakeUserRepository implements UserRepository {
  private readonly users = new Map<string, UserDocument>();

  public create(input: CreateUserRecord) {
    const timestamp = new Date();
    const user = UserModel.hydrate({
      _id: new Types.ObjectId(),
      name: input.name,
      email: input.email.toLowerCase(),
      passwordHash: input.passwordHash,
      role: input.role ?? "member",
      status: input.status ?? "active",
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    this.users.set(user.id, user);
    return Promise.resolve(user);
  }

  public findById(id: string) {
    return Promise.resolve(this.users.get(id) ?? null);
  }

  public findByEmail(email: string) {
    const normalizedEmail = email.toLowerCase();
    return Promise.resolve(
      [...this.users.values()].find(
        (user) => user.email === normalizedEmail,
      ) ?? null,
    );
  }

  public findByEmailWithPassword(email: string) {
    return this.findByEmail(email);
  }

  public list(filters: ListUsersFilters) {
    const search = filters.search?.toLowerCase();
    return Promise.resolve(
      [...this.users.values()].filter((user) => {
        const matchesSearch = search
          ? user.name.toLowerCase().includes(search) ||
            user.email.toLowerCase().includes(search)
          : true;
        const matchesRole = filters.role ? user.role === filters.role : true;
        const matchesStatus = filters.status
          ? user.status === filters.status
          : true;
        return matchesSearch && matchesRole && matchesStatus;
      }),
    );
  }

  public async update(id: string, input: UpdateUserInput) {
    const user = await this.findById(id);

    if (!user) {
      return null;
    }

    user.set({
      ...input,
      ...(input.email ? { email: input.email.toLowerCase() } : {}),
      updatedAt: new Date(),
    });
    return user;
  }

  public delete(id: string) {
    return Promise.resolve(this.users.delete(id));
  }
}
