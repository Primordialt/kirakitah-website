import { RegisterEmailForm } from "@/components/features/participant/RegisterEmailForm";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const params = vi.hoisted(() => ({ value: new URLSearchParams() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => params.value,
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

describe("RegisterEmailForm Auth0 entry", () => {
  beforeEach(() => {
    params.value = new URLSearchParams();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("offers Google, Apple, and email before showing the email field", () => {
    vi.stubEnv("NEXT_PUBLIC_AUTH0_ENABLED", "true");
    render(<RegisterEmailForm />);

    expect(screen.getByRole("link", { name: "Continue with Google" })).toHaveAttribute(
      "href",
      "/auth/login?connection=google-oauth2&returnTo=%2Flogin%2Fcontinue",
    );
    expect(screen.getByRole("link", { name: "Continue with Apple" })).toHaveAttribute(
      "href",
      "/auth/login?connection=apple&returnTo=%2Flogin%2Fcontinue",
    );
    expect(screen.getByRole("button", { name: "Continue with Email" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(screen.queryByLabelText(/^email/i)).toBeNull();
    expect(screen.queryByRole("button", { name: "CONTINUE" })).toBeNull();
  });

  it("shows the email field after Continue with Email is chosen", () => {
    vi.stubEnv("NEXT_PUBLIC_AUTH0_ENABLED", "true");
    render(<RegisterEmailForm />);

    fireEvent.click(screen.getByRole("button", { name: "Continue with Email" }));

    expect(screen.getByRole("button", { name: "Continue with Email" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getByLabelText(/^email/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "CONTINUE" })).toBeInTheDocument();
  });

  it("keeps the email field when Auth0 is not enabled", () => {
    vi.stubEnv("NEXT_PUBLIC_AUTH0_ENABLED", "false");
    render(<RegisterEmailForm />);

    expect(screen.queryByRole("link", { name: "Continue with Google" })).toBeNull();
    expect(screen.getByLabelText(/^email/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "CONTINUE" })).toBeInTheDocument();
  });
});
