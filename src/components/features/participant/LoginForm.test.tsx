import { LoginForm } from "@/components/features/participant/LoginForm";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams("next=/wallet"),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("LoginForm Auth0 entry", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("offers Auth0 sign in and sign up when enabled", () => {
    vi.stubEnv("NEXT_PUBLIC_AUTH0_ENABLED", "true");
    render(<LoginForm />);

    expect(screen.getByRole("link", { name: "Continue with Google" })).toHaveAttribute(
      "href",
      "/auth/login?connection=google-oauth2&returnTo=%2Flogin%2Fcontinue%3Fnext%3D%252Fwallet",
    );
    expect(screen.getByRole("link", { name: "Continue with Apple" })).toHaveAttribute(
      "href",
      "/auth/login?connection=apple&returnTo=%2Flogin%2Fcontinue%3Fnext%3D%252Fwallet",
    );
    expect(screen.getByRole("button", { name: "LOGIN" })).toBeInTheDocument();
  });

  it("keeps password login when Auth0 is not enabled", () => {
    vi.stubEnv("NEXT_PUBLIC_AUTH0_ENABLED", "false");
    render(<LoginForm />);

    expect(screen.queryByRole("link", { name: "Continue with Google" })).toBeNull();
    expect(screen.getByRole("button", { name: "LOGIN" })).toBeInTheDocument();
  });
});
