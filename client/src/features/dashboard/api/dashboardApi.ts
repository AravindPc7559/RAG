import { baseService } from "@/services/baseService";
import { env } from "@/config/env";

export interface UploadedDocumentSummary {
  documentId: string;
  fileName: string;
  chunkCount: number;
}

interface UploadDocumentResponse {
  message: string;
  document: UploadedDocumentSummary;
}

export const dashboardAPI = {
  async uploadDocument(document: File) {
    const formData = new FormData();
    formData.append("document", document);

    const response = await baseService.post<UploadDocumentResponse>(
      "/document/upload_document",
      formData,
      {
        timeout: env.documentApiTimeoutMs,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );

    return response.data;
  },
};
