import { afterEach, describe, expect, it, vi } from "vitest";
import { ResendEmailDeliveryProvider } from "@/server/verification/email/resend";

describe("ResendEmailDeliveryProvider", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("sends successfully when Resend returns 2xx", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    vi.stubEnv("EMAIL_FROM", "KIRAKITAH <no-reply@kirakitah.com>");
    vi.stubEnv("NODE_ENV", "test");

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: "email_test" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = new ResendEmailDeliveryProvider();
    const result = await provider.sendVerificationEmail({
      email: "player@example.com",
      referenceId: "KG926-2026-TEST01",
      code: "123456",
      expiresInMinutes: 15,
      recipientFirstName: "Ada",
    });

    expect(result.status).toBe("sent");
    expect(result.provider).toBe("resend");
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.method).toBe("POST");
    expect(String(init.headers && (init.headers as Record<string, string>).Authorization)).toContain(
      "Bearer re_test_key",
    );
    const body = JSON.parse(String(init.body)) as {
      from: string;
      to: string[];
      subject: string;
      text: string;
    };
    expect(body.from).toBe("KIRAKITAH <no-reply@kirakitah.com>");
    expect(body.to).toEqual(["player@example.com"]);
    expect(body.subject).toContain("Verify Your Email");
    expect(body.text).toContain("123456");
    expect(body.text).toContain("Hi Ada,");
    expect(body.text).not.toMatch(/NIN|passport|guardian/i);
  });

  it("returns unavailable on provider rejection", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    vi.stubEnv("NODE_ENV", "test");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 422,
        json: async () => ({ message: "invalid" }),
      }),
    );

    const result = await new ResendEmailDeliveryProvider().sendVerificationEmail({
      email: "player@example.com",
      referenceId: "KG926-2026-TEST01",
      code: "654321",
      expiresInMinutes: 15,
    });

    expect(result.status).toBe("unavailable");
    expect(JSON.stringify(result)).not.toContain("654321");
  });

  it("returns unavailable on network failure", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    vi.stubEnv("NODE_ENV", "test");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network down")),
    );

    const result = await new ResendEmailDeliveryProvider().sendVerificationEmail({
      email: "player@example.com",
      referenceId: "KG926-2026-TEST01",
      code: "111222",
      expiresInMinutes: 15,
    });

    expect(result.status).toBe("unavailable");
    expect(result.message).toContain("unavailable");
  });

  it("fails closed without RESEND_API_KEY", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("NODE_ENV", "test");

    const result = await new ResendEmailDeliveryProvider().sendVerificationEmail({
      email: "player@example.com",
      referenceId: "KG926-2026-TEST01",
      code: "999888",
      expiresInMinutes: 15,
    });

    expect(result.status).toBe("unavailable");
    expect(JSON.stringify(result)).not.toContain("999888");
  });

  it("sends lifecycle email without logging content", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    vi.stubEnv("EMAIL_FROM", "KIRAKITAH <no-reply@kirakitah.com>");
    vi.stubEnv("NODE_ENV", "test");

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: "email_lifecycle" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await new ResendEmailDeliveryProvider().sendLifecycleEmail({
      email: "player@example.com",
      subject: "KIRAKITAH GAMING 926 — Application received",
      text: "Your application has been received.",
      html: "<p>Your application has been received.</p>",
    });

    expect(result.status).toBe("sent");
    const body = JSON.parse(String(fetchMock.mock.calls[0][1].body)) as {
      subject: string;
      to: string[];
    };
    expect(body.to).toEqual(["player@example.com"]);
    expect(body.subject).toContain("Application received");
  });
});
