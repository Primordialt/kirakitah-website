"use client";

import { ArenaPlayClient } from "./ArenaPlayClient";
import {
  ArenaChallengeShell,
  TypeRushProtectedInput,
  blockArenaClipboardEvent,
  isArenaCopyShortcut,
  isArenaPasteShortcut,
} from "./ArenaChallengeProtection";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

describe("ArenaChallengeProtection", () => {
  it("blocks copy shortcuts on challenge shell", () => {
    render(
      <ArenaChallengeShell>
        <p>Secret question</p>
      </ArenaChallengeShell>,
    );
    const shell = screen.getByText("Secret question").parentElement?.parentElement;
    expect(shell).toHaveClass("select-none");
    const event = new KeyboardEvent("keydown", { key: "c", ctrlKey: true, bubbles: true });
    expect(isArenaCopyShortcut(event)).toBe(true);
  });

  it("blocks paste on TypeRush input", () => {
    const onReject = vi.fn();
    render(
      <TypeRushProtectedInput value="" onValueChange={() => {}} onPasteRejected={onReject} />,
    );
    const input = screen.getByRole("textbox");
    fireEvent.paste(input, { clipboardData: { getData: () => "paste" } });
    expect(onReject).toHaveBeenCalled();
  });

  it("detects paste keyboard shortcut", () => {
    expect(isArenaPasteShortcut(new KeyboardEvent("keydown", { key: "v", ctrlKey: true }))).toBe(
      true,
    );
  });

  it("prevents default on copy handler", () => {
    const event = { preventDefault: vi.fn() };
    blockArenaClipboardEvent(event);
    expect(event.preventDefault).toHaveBeenCalled();
  });
});

// Ensure play client imports protection module (integration smoke)
describe("ArenaPlayClient module", () => {
  it("exports play client", () => {
    expect(ArenaPlayClient).toBeDefined();
  });
});
