import { Router } from "express";
import multer from "multer";

import { env } from "../../config/env.js";
import type { AuthMiddleware } from "../auth/auth.middleware.js";
import { asyncHandler } from "../../shared/utils/asyncHandler.js";
import type { DocumentController } from "./document.controller.js";

const documentUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.DOCUMENT_MAX_FILE_SIZE_MB * 1024 * 1024,
    files: 1,
  },
  fileFilter: (_request, file, callback) => {
    const fileName = file.originalname.toLowerCase();
    const supported =
      file.mimetype === "application/pdf" ||
      file.mimetype.startsWith("text/") ||
      [".txt", ".md", ".csv"].some((extension) =>
        fileName.endsWith(extension),
      );

    if (!supported) {
      callback(
        new Error("Only PDF, TXT, MD, and CSV documents are supported."),
      );
      return;
    }

    callback(null, true);
  },
});

export function createDocumentRoutes(
  controller: DocumentController,
  auth: AuthMiddleware,
) {
  const router = Router();

  router.use(asyncHandler(auth.authenticate));

  router.post(
    "/upload_document",
    documentUpload.single("document"),
    asyncHandler(controller.uploadDocument),
  );

  router.post("/ask_document", asyncHandler(controller.askDocument));

  return router;
}
