import { del, put } from "@vercel/blob";
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

/**
 * Verify image magic bytes match an allowed type.
 * Does not trust browser MIME / file extension alone.
 */
async function readLeadingBytes(file: Blob, max: number): Promise<Uint8Array> {
  const candidate = file as Blob & {
    bytes?: () => Promise<Uint8Array>;
    arrayBuffer?: () => Promise<ArrayBuffer>;
  };

  if (typeof candidate.bytes === "function") {
    const all = await candidate.bytes();
    if (all.byteLength > 0) {
      return all.slice(0, max);
    }
  }

  if (typeof candidate.arrayBuffer === "function") {
    try {
      const all = new Uint8Array(await candidate.arrayBuffer());
      if (all.byteLength > 0) {
        return all.slice(0, max);
      }
    } catch {
      // Fall through to Response wrapping.
    }
  }

  const wrapped = new Uint8Array(await new Response(file).arrayBuffer());
  return wrapped.slice(0, max);
}

export async function detectPlayerPhotoMimeFromBytes(
  file: File,
): Promise<(typeof PLAYER_PHOTO_ACCEPTED_TYPES)[number] | null> {
  const header = await readLeadingBytes(file, 12);

  if (header.length >= 3 && header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) {
    return "image/jpeg";
  }

  if (
    header.length >= 8 &&
    header[0] === 0x89 &&
    header[1] === 0x50 &&
    header[2] === 0x4e &&
    header[3] === 0x47 &&
    header[4] === 0x0d &&
    header[5] === 0x0a &&
    header[6] === 0x1a &&
    header[7] === 0x0a
  ) {
    return "image/png";
  }

  // RIFF....WEBP
  if (
    header.length >= 12 &&
    header[0] === 0x52 &&
    header[1] === 0x49 &&
    header[2] === 0x46 &&
    header[3] === 0x46 &&
    header[8] === 0x57 &&
    header[9] === 0x45 &&
    header[10] === 0x42 &&
    header[11] === 0x50
  ) {
    return "image/webp";
  }

  return null;
}

export async function validatePlayerPhotoMagicBytes(
  file: File,
): Promise<string | undefined> {
  const detected = await detectPlayerPhotoMimeFromBytes(file);
  if (!detected) {
    return "Player photo must be a valid JPEG, PNG, or WebP image";
  }

  // Declared MIME must match magic when the browser supplied a type.
  if (file.type && file.type !== detected) {
    return "Player photo content does not match the declared file type";
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

  const magicError = await validatePlayerPhotoMagicBytes(file);
  if (magicError) {
    throw new Error(magicError);
  }

  const detectedMime =
    (await detectPlayerPhotoMimeFromBytes(file)) ?? file.type ?? "image/jpeg";

  const extension =
    detectedMime === "image/png"
      ? "png"
      : detectedMime === "image/webp"
        ? "webp"
        : "jpg";
  const pathname = `registrations/${applicationId}/player-photo.${extension}`;

  const blob = await put(pathname, file, {
    access: "private",
    token,
    addRandomSuffix: false,
    contentType: detectedMime,
  });

  return {
    blobKey: blob.pathname,
    meta: {
      fileName: file.name,
      fileSize: file.size,
      mimeType: detectedMime,
    },
  };
}

/**
 * Best-effort cleanup when registration persistence fails after upload.
 * Never throws — orphan cleanup must not mask the original failure.
 */
export async function deletePlayerPhoto(blobKey: string): Promise<void> {
  const token = serverEnv.blobReadWriteToken;
  if (!token || !blobKey) {
    return;
  }

  try {
    await del(blobKey, { token });
  } catch {
    // Intentionally swallowed; operators can reconcile orphans via Blob dashboard.
  }
}
