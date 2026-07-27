import type { RequestHandler } from "express";

import { databaseIsReady } from "../../config/database.js";
import { sendResponse } from "../../shared/utils/sendResponse.js";

export class HealthController {
  public live: RequestHandler = (_request, response) =>
    sendResponse(response, 200, {
      status: "ok",
      uptimeSeconds: process.uptime(),
      timestamp: new Date().toISOString(),
    });

  public ready: RequestHandler = (_request, response) => {
    const ready = databaseIsReady();
    return sendResponse(
      response,
      ready ? 200 : 503,
      {
        status: ready ? "ready" : "not_ready",
        database: ready ? "connected" : "disconnected",
        timestamp: new Date().toISOString(),
      },
    );
  };
}
