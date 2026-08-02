import OpenAI from "openai";

import { env } from "../../config/env.js";
import { AppError } from "../../shared/errors/AppError.js";
import { REVIEW_LLM_MODEL } from "./review.constants.js";
import {
  buildReviewSystemPrompt,
  buildReviewUserPrompt,
} from "./review.prompts.js";
import type {
  GenerateReviewCommentsInput,
  LlmComment,
} from "./review.types.js";
import { parseLlmCommentsJson } from "./review.utils.js";

export class ReviewLlmClient {
  private openAIClient: OpenAI | null = null;

  public async generateComments(
    input: GenerateReviewCommentsInput,
  ): Promise<LlmComment[]> {
    const openAI = this.getClient();
    const response = await openAI.responses.create({
      model: REVIEW_LLM_MODEL,
      input: [
        {
          role: "system",
          content: buildReviewSystemPrompt(),
        },
        {
          role: "user",
          content: buildReviewUserPrompt(input),
        },
      ],
    });

    return parseLlmCommentsJson(response.output_text?.trim() ?? "[]");
  }

  private getClient() {
    if (!env.OPENAI_API_KEY) {
      throw AppError.serviceUnavailable(
        "OPENAI_API_KEY is required for pull request review. Add it to server/.env.",
      );
    }

    this.openAIClient ??= new OpenAI({ apiKey: env.OPENAI_API_KEY });
    return this.openAIClient;
  }
}
