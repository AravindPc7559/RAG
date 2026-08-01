import {
  UserModel,
  type UserDocument,
} from "./user.model.js";
import type { UserRole, UserStatus } from "./user.types.js";

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
}
