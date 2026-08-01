import { Types } from "mongoose";

import {
  UserModel,
  type UserDocument,
} from "../../src/modules/users/user.model.js";
import type {
  CreateUserRecord,
  UserRepository,
} from "../../src/modules/users/user.repository.js";

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
}
