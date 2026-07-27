import { UserController } from "./user.controller.js";
import {
  MongoUserRepository,
  type UserRepository,
} from "./user.repository.js";
import { UserService } from "./user.service.js";

export function createUserModule(
  repository: UserRepository = new MongoUserRepository(),
) {
  const service = new UserService(repository);
  const controller = new UserController(service);

  return {
    repository,
    service,
    controller,
  };
}
