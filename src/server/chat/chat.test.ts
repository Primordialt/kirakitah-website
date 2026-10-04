import { describe, expect, it } from "vitest";
import { roleHasPermission } from "@/server/admin/authorization/permissions";
import {
  canParticipantSendMessage,
  parseMentionUsernames,
  validateChatMessageContent,
} from "@/server/chat/validation";
import { checkSendRateLimit } from "@/server/chat/service";
import { ChatError } from "@/server/chat/errors";

describe("chat message validation", () => {
  it("rejects empty messages", () => {
    expect(() => validateChatMessageContent("   ")).toThrow("EMPTY_MESSAGE");
  });

  it("rejects oversized messages", () => {
    expect(() => validateChatMessageContent("a".repeat(2001))).toThrow(
      "MESSAGE_TOO_LONG",
    );
  });

  it("parses mention usernames", () => {
    expect(parseMentionUsernames("Hello @Ace_Player and @bolt")).toEqual([
      "ace_player",
      "bolt",
    ]);
  });
});

describe("chat lock enforcement", () => {
  it("blocks participants when room is locked", () => {
    expect(
      canParticipantSendMessage({ roomLocked: true, memberStatus: "active" }),
    ).toEqual({
      allowed: false,
      reason: "Chat is locked. Only admins can send messages right now.",
    });
  });

  it("blocks muted members", () => {
    expect(
      canParticipantSendMessage({ roomLocked: false, memberStatus: "muted" }),
    ).toMatchObject({ allowed: false });
  });
});

describe("chat RBAC", () => {
  it("grants SUPER_ADMIN full chat permissions", () => {
    expect(roleHasPermission("SUPER_ADMIN", "chat:manage")).toBe(true);
    expect(roleHasPermission("SUPER_ADMIN", "chat:lock")).toBe(true);
    expect(roleHasPermission("SUPER_ADMIN", "chat:announce")).toBe(true);
    expect(roleHasPermission("SUPER_ADMIN", "chat:moderate")).toBe(true);
  });

  it("does not grant chat moderation to REVIEWER", () => {
    expect(roleHasPermission("REVIEWER", "chat:moderate")).toBe(false);
    expect(roleHasPermission("REVIEWER", "chat:lock")).toBe(false);
  });

  it("grants tournament admin announce/moderate/lock", () => {
    expect(roleHasPermission("TOURNAMENT_ADMIN", "chat:announce")).toBe(true);
    expect(roleHasPermission("TOURNAMENT_ADMIN", "chat:moderate")).toBe(true);
    expect(roleHasPermission("TOURNAMENT_ADMIN", "chat:lock")).toBe(true);
    expect(roleHasPermission("TOURNAMENT_ADMIN", "chat:manage")).toBe(false);
  });
});

describe("chat rate limiting", () => {
  it("throws when sending too quickly", () => {
    checkSendRateLimit("account-rate-test-1");
    expect(() => checkSendRateLimit("account-rate-test-1")).toThrow(ChatError);
  });
});

describe("admin chat transcript RBAC", () => {
  it("requires chat:moderate to load admin transcript", () => {
    expect(roleHasPermission("REVIEWER", "chat:moderate")).toBe(false);
    expect(roleHasPermission("SUPPORT", "chat:moderate")).toBe(false);
    expect(roleHasPermission("TOURNAMENT_ADMIN", "chat:moderate")).toBe(true);
  });
});
