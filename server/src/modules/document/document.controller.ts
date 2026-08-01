import type { RequestHandler } from "express";
import type { DocumentService } from "./document.service.js";

export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  public uploadDocument: RequestHandler = async (request, response) => {
    const documentFile = request.file;
    const userId = request.user?.id;
    if (!documentFile || !userId) {
      response
        .status(400)
        .json({ message: "No document or user id provided" });
      return;
    }

    const document = await this.documentService.uploadDocument(
      documentFile,
      userId,
    );
    if (document) {
      response
        .status(200)
        .json({ message: "Document uploaded successfully", document });
      return;
    }

    response.status(400).json({ message: "Failed to upload document" });
  };
}
