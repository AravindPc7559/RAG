import { baseService } from "@/services/baseService";

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
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );

    return response.data;
  },
};
