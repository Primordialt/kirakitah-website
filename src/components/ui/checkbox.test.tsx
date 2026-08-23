import { Checkbox } from "@/components/ui/checkbox";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

describe("Checkbox", () => {
  it("associates label with input", () => {
    render(<Checkbox label="Accept terms" id="terms" />);
    expect(screen.getByLabelText("Accept terms")).toBeInTheDocument();
  });

  it("toggles checked state on interaction", async () => {
    const user = userEvent.setup();
    render(<Checkbox label="Subscribe" id="subscribe" />);
    const checkbox = screen.getByLabelText("Subscribe");
    expect(checkbox).not.toBeChecked();
    await user.click(checkbox);
    expect(checkbox).toBeChecked();
  });

  it("supports default checked state", () => {
    render(<Checkbox label="Checked" id="checked" defaultChecked />);
    expect(screen.getByLabelText("Checked")).toBeChecked();
  });
});
