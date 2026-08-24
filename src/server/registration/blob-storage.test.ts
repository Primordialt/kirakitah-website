/** @vitest-environment node */
import {
  detectPlayerPhotoMimeFromBytes,
  validatePlayerPhotoMagicBytes,
} from "@/server/registration/blob-storage";
import { describe, expect, it } from "vitest";

describe("player photo magic bytes", () => {
  it("detects jpeg from leading bytes", async () => {
    const file = new File(
      [Uint8Array.from([0xff, 0xd8, 0xff, 0xd9])],
      "shot.jpg",
      { type: "image/jpeg" },
    );
    expect(await detectPlayerPhotoMimeFromBytes(file)).toBe("image/jpeg");
    expect(await validatePlayerPhotoMagicBytes(file)).toBeUndefined();
  });

  it("rejects non-image content", async () => {
    const file = new File(["hello"], "shot.jpg", { type: "image/jpeg" });
    expect(await detectPlayerPhotoMimeFromBytes(file)).toBeNull();
    expect(await validatePlayerPhotoMagicBytes(file)).toMatch(/valid JPEG/i);
  });
});
