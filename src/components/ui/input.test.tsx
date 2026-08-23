import { Input } from "@/components/ui/input";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

describe("Input", () => {
  it("renders label", () => {
    render(<Input label="Email" id="email" />);
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });

  it("accepts user input", async () => {
    const user = userEvent.setup();
    render(<Input label="Name" id="name" />);
    const input = screen.getByLabelText("Name");
    await user.type(input, "Kira");
    expect(input).toHaveValue("Kira");
  });

  it("displays error state", () => {
    render(
      <Input label="Email" id="email" error="Invalid email address." />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Invalid email address.",
    );
    expect(screen.getByLabelText("Email")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });
});
