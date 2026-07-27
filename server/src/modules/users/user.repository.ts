import type { QueryFilter, UpdateQuery } from "mongoose";

import {
  UserModel,
  type UserDocument,
  type UserEntity,
} from "./user.model.js";
import type {
  ListUsersFilters,
  UpdateUserInput,
  UserRole,
  UserStatus,
} from "./user.types.js";

export interface CreateUserRecord {
  name: string;
  email: string;
  passwordHash: string;
  role?: UserRole;
  status?: UserStatus;
}

export interface UserRepository {
  create(input: CreateUserRecord): Promise<UserDocument>;
  findById(id: string): Promise<UserDocument | null>;
  findByEmail(email: string): Promise<UserDocument | null>;
  findByEmailWithPassword(email: string): Promise<UserDocument | null>;
  list(filters: ListUsersFilters): Promise<UserDocument[]>;
  update(id: string, input: UpdateUserInput): Promise<UserDocument | null>;
  delete(id: string): Promise<boolean>;
}

function escapeRegularExpression(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export class MongoUserRepository implements UserRepository {
  public async create(input: CreateUserRecord) {
    return UserModel.create({
      ...input,
      email: input.email.toLowerCase(),
    });
  }

  public async findById(id: string) {
    return UserModel.findById(id).exec();
  }

  public async findByEmail(email: string) {
    return UserModel.findOne({ email: email.toLowerCase() }).exec();
  }

  public async findByEmailWithPassword(email: string) {
    return UserModel.findOne({ email: email.toLowerCase() })
      .select("+passwordHash")
      .exec();
  }

  public async list(filters: ListUsersFilters) {
    const query: QueryFilter<UserEntity> = {};

    if (filters.role) {
      query.role = filters.role;
    }

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.search) {
      const expression = new RegExp(
        escapeRegularExpression(filters.search),
        "i",
      );
      query.$or = [{ name: expression }, { email: expression }];
    }

    return UserModel.find(query).sort({ createdAt: -1 }).limit(500).exec();
  }

  public async update(id: string, input: UpdateUserInput) {
    const update: UpdateQuery<UserEntity> = {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.email !== undefined
        ? { email: input.email.toLowerCase() }
        : {}),
      ...(input.role !== undefined ? { role: input.role } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
    };

    return UserModel.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    }).exec();
  }

  public async delete(id: string) {
    const result = await UserModel.deleteOne({ _id: id }).exec();
    return result.deletedCount === 1;
  }
}
