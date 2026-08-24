import { getDataSource, isMockRegistrationAllowed } from "@/config/data-source";
import { afterEach, describe, expect, it } from "vitest";

const originalDataSource = process.env.NEXT_PUBLIC_DATA_SOURCE;
const originalVercelEnv = process.env.VERCEL_ENV;

afterEach(() => {
  if (originalDataSource === undefined) {
    delete process.env.NEXT_PUBLIC_DATA_SOURCE;
  } else {
    process.env.NEXT_PUBLIC_DATA_SOURCE = originalDataSource;
  }

  if (originalVercelEnv === undefined) {
    delete process.env.VERCEL_ENV;
  } else {
    process.env.VERCEL_ENV = originalVercelEnv;
  }
});

describe("data-source production fail-closed", () => {
  it("forces api on Vercel Production even when mock is configured", () => {
    process.env.VERCEL_ENV = "production";
    process.env.NEXT_PUBLIC_DATA_SOURCE = "mock";
    expect(getDataSource()).toBe("api");
    expect(isMockRegistrationAllowed()).toBe(false);
  });

  it("allows mock outside Vercel Production", () => {
    delete process.env.VERCEL_ENV;
    process.env.NEXT_PUBLIC_DATA_SOURCE = "mock";
    expect(getDataSource()).toBe("mock");
    expect(isMockRegistrationAllowed()).toBe(true);
  });
});
