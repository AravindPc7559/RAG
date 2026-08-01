import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

import { env } from "../../config/env.js";
import { AppError } from "../errors/AppError.js";

const ENCRYPTION_PREFIX = "v1";
const ALGORITHM = "aes-256-gcm";

function getEncryptionKey() {
  const secret = env.TOKEN_ENCRYPTION_KEY ?? env.JWT_SECRET;
  return createHash("sha256").update(secret).digest();
}

export function encryptSecret(plainText: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(plainText, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    ENCRYPTION_PREFIX,
    iv.toString("base64url"),
    authTag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

export function decryptSecret(payload: string): string {
  const [version, ivPart, authTagPart, cipherPart] = payload.split(".");

  if (
    version !== ENCRYPTION_PREFIX ||
    !ivPart ||
    !authTagPart ||
    !cipherPart
  ) {
    throw AppError.serviceUnavailable(
      "Stored GitHub credentials are invalid. Please reconnect GitHub.",
    );
  }

  try {
    const decipher = createDecipheriv(
      ALGORITHM,
      getEncryptionKey(),
      Buffer.from(ivPart, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(authTagPart, "base64url"));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(cipherPart, "base64url")),
      decipher.final(),
    ]);
    return decrypted.toString("utf8");
  } catch {
    throw AppError.serviceUnavailable(
      "Unable to decrypt GitHub credentials. Please reconnect GitHub.",
    );
  }
}
