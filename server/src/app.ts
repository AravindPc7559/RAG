import { randomUUID } from "node:crypto";

import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { rateLimit } from "express-rate-limit";
import helmet from "helmet";
import { pinoHttp } from "pino-http";

import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import type { KnowledgeWorker } from "./modules/knowledge/knowledge.worker.js";
import type { ReviewWorker } from "./modules/review/review.worker.js";
import { createApiRouter, type ApiDependencies } from "./routes/index.js";
import { errorHandler } from "./shared/middleware/errorHandler.js";
import { notFoundHandler } from "./shared/middleware/notFoundHandler.js";
import { AppError } from "./shared/errors/AppError.js";
import { sendResponse } from "./shared/utils/sendResponse.js";

const githubWebhookPath = `${env.API_PREFIX}/review/webhooks/github`;

export function createApp(dependencies: ApiDependencies = {}): {
  app: express.Express;
  knowledgeWorker: KnowledgeWorker;
  reviewWorker: ReviewWorker;
} {
  const app = express();
  const api = createApiRouter(dependencies);

  if (env.TRUST_PROXY) {
    app.set("trust proxy", 1);
  }

  app.disable("x-powered-by");
  app.use(
    pinoHttp({
      logger,
      genReqId(request, response) {
        const header = request.headers["x-request-id"];
        const requestId =
          typeof header === "string" && header.trim() ? header : randomUUID();
        response.setHeader("x-request-id", requestId);
        return requestId;
      },
    }),
  );
  app.use(helmet());
  app.use(
    cors({
      credentials: true,
      origin(origin, callback) {
        if (!origin || env.CORS_ORIGINS.includes(origin)) {
          callback(null, true);
          return;
        }

        callback(AppError.forbidden("The request origin is not allowed."));
      },
    }),
  );
  app.use(
    rateLimit({
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      limit: env.RATE_LIMIT_MAX,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      skip: (request) =>
        request.path.startsWith(`${env.API_PREFIX}/health`) ||
        request.path === githubWebhookPath,
    }),
  );
  app.use(
    githubWebhookPath,
    express.raw({ type: "application/json", limit: "1mb" }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: false, limit: "1mb" }));
  app.use(cookieParser());

  app.get("/", (_request, response) =>
    sendResponse(response, 200, {
      service: "sourcesense-server",
      apiPrefix: env.API_PREFIX,
    }),
  );
  app.use(env.API_PREFIX, api.router);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return {
    app,
    knowledgeWorker: api.knowledgeWorker,
    reviewWorker: api.reviewWorker,
  };
}
