import { Router } from "express";

import { HealthController } from "./health.controller.js";

export function createHealthRoutes() {
  const controller = new HealthController();
  const router = Router();

  router.get("/live", controller.live);
  router.get("/ready", controller.ready);

  return router;
}
