import mongoose from "mongoose";

import { env } from "./env.js";
import { logger } from "./logger.js";

export async function connectDatabase() {
  mongoose.set("strictQuery", true);

  await mongoose.connect(env.MONGODB_URI, {
    autoIndex: env.NODE_ENV !== "production",
    maxPoolSize: 20,
    minPoolSize: 2,
    serverSelectionTimeoutMS: 10_000,
  });

  logger.info({ database: mongoose.connection.name }, "MongoDB connected");
}

export async function disconnectDatabase() {
  if (
    mongoose.connection.readyState !== mongoose.ConnectionStates.disconnected
  ) {
    await mongoose.disconnect();
    logger.info("MongoDB disconnected");
  }
}

export function databaseIsReady() {
  return mongoose.connection.readyState === mongoose.ConnectionStates.connected;
}
