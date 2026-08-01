import { z } from "zod";

import {
  connectDatabase,
  disconnectDatabase,
} from "../src/config/database.js";
import { logger } from "../src/config/logger.js";
import { UserModel } from "../src/modules/users/user.model.js";
import { MongoUserRepository } from "../src/modules/users/user.repository.js";
import { hashPassword } from "../src/shared/security/passwordHasher.js";

const inputSchema = z.object({
  ADMIN_NAME: z.string().trim().min(2).max(120),
  ADMIN_EMAIL: z.email().trim().toLowerCase(),
  ADMIN_PASSWORD: z.string().min(12).max(128),
});

async function seedAdmin() {
  const input = inputSchema.parse(process.env);
  await connectDatabase();

  try {
    const repository = new MongoUserRepository();
    const existing = await repository.findByEmail(input.ADMIN_EMAIL);

    if (existing) {
      await UserModel.findByIdAndUpdate(existing.id, {
        role: "admin",
        status: "active",
      }).exec();
      logger.info({ email: input.ADMIN_EMAIL }, "Existing user promoted to admin");
      return;
    }

    const passwordHash = await hashPassword(input.ADMIN_PASSWORD);
    await repository.create({
      name: input.ADMIN_NAME,
      email: input.ADMIN_EMAIL,
      passwordHash,
      role: "admin",
      status: "active",
    });
    logger.info({ email: input.ADMIN_EMAIL }, "Admin user created");
  } finally {
    await disconnectDatabase();
  }
}

seedAdmin().catch((error: unknown) => {
  logger.fatal({ error }, "Admin seed failed");
  process.exitCode = 1;
});
