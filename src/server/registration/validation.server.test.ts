import { TOURNAMENT_EVENT_ID } from "@/config/competition";
import { parseRegistrationFormData } from "@/server/registration/validation";
import { describe, expect, it } from "vitest";

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
  formData.append(
    "playerPhoto",
    new File(["photo"], "player.jpg", { type: "image/jpeg" }),
  );
  return formData;
}

describe("parseRegistrationFormData", () => {
  it("parses a valid registration payload", () => {
    const parsed = parseRegistrationFormData(buildValidFormData());

    expect(parsed.email).toBe("player@example.com");
    expect(parsed.identificationType).toBe("nin");
    expect(parsed.identificationNumber).toBe("12345678901");
    expect(parsed.playerPhoto.name).toBe("player.jpg");
  });

  it("rejects participants under 10", () => {
    const formData = buildValidFormData();
    formData.set("dateOfBirth", "2020-01-01");

    expect(() => parseRegistrationFormData(formData)).toThrow();
  });

  it("requires guardian details for minors", () => {
    const formData = buildValidFormData();
    formData.set("dateOfBirth", "2012-01-01");

    expect(() => parseRegistrationFormData(formData)).toThrow();
  });
});
