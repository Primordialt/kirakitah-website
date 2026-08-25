export const MAX_IDENTITY_FILE_SIZE_BYTES = 15 * 1024;

export const PLAYER_PHOTO_ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type PlayerPhotoMimeType = (typeof PLAYER_PHOTO_ACCEPTED_TYPES)[number];

export interface IdentityDocumentMetadata {
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export function formatAcceptedTypes(types: readonly string[]): string {
  const labels = types.map((type) => {
    if (type === "image/jpeg") return "JPEG";
    if (type === "image/png") return "PNG";
    if (type === "image/webp") return "WebP";
    return type;
  });

  return labels.join(", ");
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function isAcceptedFileType(
  file: File,
  acceptedTypes: readonly string[],
): boolean {
  return acceptedTypes.includes(file.type);
}

export function validateIdentityFile(
  file: File | undefined | null,
  options: {
    label: string;
    acceptedTypes: readonly string[];
    maxSizeBytes?: number;
  },
): string | undefined {
  const { label, acceptedTypes, maxSizeBytes = MAX_IDENTITY_FILE_SIZE_BYTES } =
    options;

  if (!file || !(file instanceof File) || file.size === 0) {
    return `${label} is required`;
  }

  if (!isAcceptedFileType(file, acceptedTypes)) {
    return `${label} must be ${formatAcceptedTypes(acceptedTypes)}`;
  }

  if (file.size > maxSizeBytes) {
    return `${label} must be ${formatFileSize(maxSizeBytes)} or smaller`;
  }

  return undefined;
}

export function toIdentityDocumentMetadata(file: File): IdentityDocumentMetadata {
  return {
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type,
  };
}
