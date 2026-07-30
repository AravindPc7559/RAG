import { randomUUID } from "node:crypto";

import cloudinaryPackage, {
  type UploadApiResponse,
} from "cloudinary";

import { env } from "../../config/env.js";
import { AppError } from "../errors/AppError.js";

const cloudinary = cloudinaryPackage.v2;

export interface CloudinaryDocument {
  publicId: string;
  secureUrl: string;
  resourceType: string;
  bytes: number;
}

export function uploadDocumentToCloudinary(
  file: Express.Multer.File,
  userId: string,
): Promise<CloudinaryDocument> {
  configureCloudinary();

  if (!file.buffer.length) {
    throw AppError.badRequest("The uploaded document is empty.");
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: "raw",
        type: "authenticated",
        folder: `rag/documents/${userId}`,
        public_id: randomUUID(),
        overwrite: false,
      },
      (error, result) => {
        if (error) {
          reject(
            AppError.serviceUnavailable(
              "Unable to store the document in Cloudinary.",
              error,
            ),
          );
          return;
        }

        if (!result) {
          reject(
            AppError.serviceUnavailable(
              "Cloudinary did not return an upload result.",
            ),
          );
          return;
        }

        resolve(mapCloudinaryDocument(result));
      },
    );

    uploadStream.end(file.buffer);
  });
}

export async function deleteDocumentFromCloudinary(
  publicId: string,
): Promise<void> {
  configureCloudinary();

  const result: unknown = await cloudinary.uploader.destroy(publicId, {
    resource_type: "raw",
    type: "authenticated",
    invalidate: true,
  });
  const deletionResult = readDeletionResult(result);

  if (!deletionResult || !["ok", "not found"].includes(deletionResult)) {
    throw AppError.serviceUnavailable(
      "Unable to remove the document from Cloudinary.",
      result,
    );
  }
}

function configureCloudinary() {
  if (
    !env.CLOUDINARY_CLOUD_NAME ||
    !env.CLOUDINARY_API_KEY ||
    !env.CLOUDINARY_API_SECRET
  ) {
    throw AppError.serviceUnavailable(
      "Cloudinary credentials are required for document storage. Add them to server/.env.",
    );
  }

  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

function mapCloudinaryDocument(
  result: UploadApiResponse,
): CloudinaryDocument {
  return {
    publicId: result.public_id,
    secureUrl: result.secure_url,
    resourceType: result.resource_type,
    bytes: result.bytes,
  };
}

function readDeletionResult(result: unknown): string | undefined {
  if (
    typeof result === "object" &&
    result !== null &&
    "result" in result &&
    typeof result.result === "string"
  ) {
    return result.result;
  }

  return undefined;
}
