import type { RequestHandler } from "express";

import { AppError } from "../../shared/errors/AppError.js";
import type { KnowledgeService } from "./knowledge.service.js";

function readParam(
  value: string | string[] | undefined,
): string | undefined {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  return undefined;
}

export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  public listKnowledgeBases: RequestHandler = async (request, response) => {
    const userId = request.user?.id;
    if (!userId) {
      throw AppError.unauthorized();
    }

    const knowledgeBases =
      await this.knowledgeService.listKnowledgeBases(userId);

    response.status(200).json({
      message: "Knowledge bases fetched successfully",
      knowledgeBases,
    });
  };

  public getKnowledgeBase: RequestHandler = async (request, response) => {
    const userId = request.user?.id;
    if (!userId) {
      throw AppError.unauthorized();
    }

    const owner = readParam(request.params.owner);
    const repo = readParam(request.params.repo);
    if (!owner || !repo) {
      throw AppError.badRequest("Repository owner and name are required.");
    }

    const knowledgeBase = await this.knowledgeService.getKnowledgeBase(
      userId,
      owner,
      repo,
    );

    response.status(200).json({
      message: "Knowledge base fetched successfully",
      knowledgeBase,
    });
  };

  public importRepository: RequestHandler = async (request, response) => {
    const userId = request.user?.id;
    if (!userId) {
      throw AppError.unauthorized();
    }

    const owner = readParam(request.params.owner);
    const repo = readParam(request.params.repo);
    if (!owner || !repo) {
      throw AppError.badRequest("Repository owner and name are required.");
    }

    const knowledgeBase = await this.knowledgeService.importRepository(
      userId,
      owner,
      repo,
    );

    response.status(201).json({
      message: "Repository imported successfully",
      knowledgeBase,
    });
  };

  public syncRepository: RequestHandler = async (request, response) => {
    const userId = request.user?.id;
    if (!userId) {
      throw AppError.unauthorized();
    }

    const owner = readParam(request.params.owner);
    const repo = readParam(request.params.repo);
    if (!owner || !repo) {
      throw AppError.badRequest("Repository owner and name are required.");
    }

    const knowledgeBase = await this.knowledgeService.syncRepository(
      userId,
      owner,
      repo,
    );

    response.status(200).json({
      message: "Repository synced successfully",
      knowledgeBase,
    });
  };
}
