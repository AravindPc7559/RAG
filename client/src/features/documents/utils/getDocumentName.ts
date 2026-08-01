import type { UserDocumentReference } from "@/features/auth";

export function getDocumentName(
  document: UserDocumentReference,
  index: number,
) {
  if (document.fileName?.trim()) {
    return document.fileName;
  }

  try {
    const pathName = new URL(document.url).pathname;
    const encodedName = pathName.split("/").pop();
    if (encodedName) {
      return decodeURIComponent(encodedName);
    }
  } catch {
    // Fall through to a readable name for legacy records.
  }

  return `Uploaded document ${index + 1}`;
}
