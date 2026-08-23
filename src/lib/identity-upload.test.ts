import {
  formatFileSize,
  toIdentityDocumentMetadata,
  validateIdentityFile,
} from "@/lib/identity-upload";
import { describe, expect, it } from "vitest";

describe("identity-upload", () => {
  it("validates required files and accepted types", () => {
    const file = new File(["photo"], "player.jpg", { type: "image/jpeg" });

    expect(
      validateIdentityFile(undefined, {
        label: "Player photo",
        acceptedTypes: ["image/jpeg"],
      }),
    ).toBe("Player photo is required");

    expect(
      validateIdentityFile(file, {
        label: "Player photo",
        acceptedTypes: ["image/jpeg"],
      }),
    ).toBeUndefined();
  });

  it("rejects oversize files", () => {
    const largeContent = "x".repeat(6 * 1024 * 1024);
    const file = new File([largeContent], "large.jpg", { type: "image/jpeg" });

    expect(
      validateIdentityFile(file, {
        label: "Player photo",
        acceptedTypes: ["image/jpeg"],
        maxSizeBytes: 5 * 1024 * 1024,
      }),
    ).toBe(`Player photo must be ${formatFileSize(5 * 1024 * 1024)} or smaller`);
  });

  it("maps file metadata without content", () => {
    const file = new File(["photo-content"], "player.jpg", { type: "image/jpeg" });

    expect(toIdentityDocumentMetadata(file)).toEqual({
      fileName: "player.jpg",
      fileSize: file.size,
      mimeType: "image/jpeg",
    });
  });
});
