import { describe, expect, it } from "vitest";
import {
  MAX_IDENTITY_FILE_SIZE_BYTES,
  formatFileSize,
  toIdentityDocumentMetadata,
  validateIdentityFile,
} from "@/lib/identity-upload";

describe("identity-upload", () => {
  it("uses a 15 KB maximum player photo size", () => {
    expect(MAX_IDENTITY_FILE_SIZE_BYTES).toBe(15 * 1024);
  });

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

  it("accepts 14 KB and exactly 15 KB photos", () => {
    const almost = new File(["x".repeat(14 * 1024)], "ok.jpg", {
      type: "image/jpeg",
    });
    const exact = new File(["x".repeat(15 * 1024)], "exact.jpg", {
      type: "image/jpeg",
    });

    expect(
      validateIdentityFile(almost, {
        label: "Player photo",
        acceptedTypes: ["image/jpeg"],
      }),
    ).toBeUndefined();
    expect(
      validateIdentityFile(exact, {
        label: "Player photo",
        acceptedTypes: ["image/jpeg"],
      }),
    ).toBeUndefined();
  });

  it("rejects 15 KB + 1 byte and larger photos", () => {
    const overByOne = new File(["x".repeat(15 * 1024 + 1)], "over.jpg", {
      type: "image/jpeg",
    });
    const twentyKb = new File(["x".repeat(20 * 1024)], "20kb.jpg", {
      type: "image/jpeg",
    });

    const message = `Player photo must be ${formatFileSize(MAX_IDENTITY_FILE_SIZE_BYTES)} or smaller`;

    expect(
      validateIdentityFile(overByOne, {
        label: "Player photo",
        acceptedTypes: ["image/jpeg"],
      }),
    ).toBe(message);
    expect(
      validateIdentityFile(twentyKb, {
        label: "Player photo",
        acceptedTypes: ["image/jpeg"],
      }),
    ).toBe(message);
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
