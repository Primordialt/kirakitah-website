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

  it("converts files to metadata without content", () => {
    const file = new File(["id-content"], "passport.pdf", {
      type: "application/pdf",
    });

    expect(toIdentityDocumentMetadata(file)).toEqual({
      fileName: "passport.pdf",
      fileSize: file.size,
      mimeType: "application/pdf",
    });
  });

  it("formats file sizes for validation messages", () => {
    expect(formatFileSize(5 * 1024 * 1024)).toBe("5.0 MB");
  });
});
