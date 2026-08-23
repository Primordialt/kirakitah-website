import { put } from "@vercel/blob";
import {
  MAX_IDENTITY_FILE_SIZE_BYTES,
  PLAYER_PHOTO_ACCEPTED_TYPES,
  formatAcceptedTypes,
  formatFileSize,
  isAcceptedFileType,
  type IdentityDocumentMetadata,
} from "@/lib/identity-upload";
import { serverEnv } from "@/server/env";

export function validatePlayerPhotoFile(file: File): string | undefined {
  if (!file || file.size === 0) {
    return "Player photo is required";
  }

  if (!isAcceptedFileType(file, PLAYER_PHOTO_ACCEPTED_TYPES)) {
    return `Player photo must be ${formatAcceptedTypes(PLAYER_PHOTO_ACCEPTED_TYPES)}`;
  }

  if (file.size > MAX_IDENTITY_FILE_SIZE_BYTES) {
    return `Player photo must be ${formatFileSize(MAX_IDENTITY_FILE_SIZE_BYTES)} or smaller`;
  }

  return undefined;
}

export async function storePlayerPhoto(
  applicationId: string,
  file: File,
): Promise<{ blobKey: string; meta: IdentityDocumentMetadata }> {
  const token = serverEnv.blobReadWriteToken;
  if (!token) {
    throw new Error("BLOB_READ_WRITE_TOKEN is not configured");
  }

  const extension = file.name.includes(".")
    ? file.name.split(".").pop()?.toLowerCase()
    : "jpg";
  const pathname = `registrations/${applicationId}/player-photo.${extension ?? "jpg"}`;

  const blob = await put(pathname, file, {
    access: "private",
    token,
    addRandomSuffix: false,
    contentType: file.type,
  });

  return {
    blobKey: blob.pathname,
    meta: {
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
    },
  };
}
