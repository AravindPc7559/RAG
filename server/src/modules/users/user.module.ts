import {
  MongoUserRepository,
  type UserRepository,
} from "./user.repository.js";

export function createUserModule(
  repository: UserRepository = new MongoUserRepository(),
) {
  return {
    repository,
  };
}
