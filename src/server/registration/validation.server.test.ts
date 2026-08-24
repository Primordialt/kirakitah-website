/** @vitest-environment node */
import { TOURNAMENT_EVENT_ID } from "@/config/competition";
import { parseRegistrationFormData } from "@/server/registration/validation";
import { describe, expect, it } from "vitest";

/** Minimal JPEG (SOI + APP0 stub + EOI) so magic-byte validation accepts the fixture. */
function jpegFixture(name = "player.jpg"): File {
  const bytes = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
    0xff, 0xd9,
  ]);
  return new File([bytes], name, { type: "image/jpeg" });
}

function buildValidFormData(): FormData {
  const formData = new FormData();
  formData.append("fullName", "Test Player");
  formData.append("dateOfBirth", "1995-01-01");
  formData.append("country", "NG");
  formData.append("city", "Lagos");
  formData.append("email", "player@example.com");
  formData.append("phone", "08012345678");
  formData.append("identificationType", "nin");
  formData.append("identificationNumber", "12345678901");
  formData.append("gamerTag", "TestGamer");
  formData.append("game", "eFootball Mobile");
  formData.append("platform", "android");
  formData.append("timezone", "Africa/Lagos");
  formData.append("availability", JSON.stringify(["flexible"]));
  formData.append(
    "consents",
    JSON.stringify({
      rules: true,
      terms: true,
      privacy: true,
      codeOfConduct: true,
      mediaConsent: true,
    }),
  );
  formData.append("eventId", TOURNAMENT_EVENT_ID);
  formData.append("playerPhoto", jpegFixture());
  return formData;
}

describe("parseRegistrationFormData", () => {
  it("parses a valid registration payload", async () => {
    const parsed = await parseRegistrationFormData(buildValidFormData());

    expect(parsed.email).toBe("player@example.com");
    expect(parsed.identificationType).toBe("nin");
    expect(parsed.identificationNumber).toBe("12345678901");
    expect(parsed.playerPhoto.name).toBe("player.jpg");
  });

  it("rejects participants under 10", async () => {
    const formData = buildValidFormData();
    formData.set("dateOfBirth", "2020-01-01");

    await expect(parseRegistrationFormData(formData)).rejects.toThrow();
  });

  it("requires guardian details for minors", async () => {
    const formData = buildValidFormData();
    formData.set("dateOfBirth", "2012-01-01");

    await expect(parseRegistrationFormData(formData)).rejects.toThrow();
  });

  it("rejects non-image bytes renamed as jpeg", async () => {
    const formData = buildValidFormData();
    formData.set(
      "playerPhoto",
      new File(["not-an-image"], "fake.jpg", { type: "image/jpeg" }),
    );

    await expect(parseRegistrationFormData(formData)).rejects.toThrow();
  });

  it("rejects invalid phone numbers", async () => {
    const formData = buildValidFormData();
    formData.set("phone", "123");

    await expect(parseRegistrationFormData(formData)).rejects.toThrow();
  });
});
