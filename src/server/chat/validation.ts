import {
  CHAT_MAX_MESSAGE_LENGTH,
  MENTION_USERNAME_PATTERN,
} from "@/server/chat/constants";

export function normalizeChatMessageContent(raw: string): string {
  return raw.replace(/\r\n/g, "\n").trim();
}

export function validateChatMessageContent(content: string): string {
  const normalized = normalizeChatMessageContent(content);
  if (!normalized) {
    throw new Error("EMPTY_MESSAGE");
  }
  if (normalized.length > CHAT_MAX_MESSAGE_LENGTH) {
    throw new Error("MESSAGE_TOO_LONG");
  }
  return normalized;
}

export function parseMentionUsernames(content: string): string[] {
  const found = new Set<string>();
  for (const match of content.matchAll(MENTION_USERNAME_PATTERN)) {
    const username = match[1]?.toLowerCase();
    if (username) found.add(username);
  }
  return [...found];
}

export type ChatMemberStatus = "active" | "muted" | "restricted";

export function canParticipantSendMessage(input: {
  roomLocked: boolean;
  memberStatus: ChatMemberStatus;
}): { allowed: boolean; reason?: string } {
  if (input.memberStatus === "muted") {
    return {
      allowed: false,
      reason: "You are muted and cannot send messages in the Chatbox.",
    };
  }
  if (input.memberStatus === "restricted") {
    return {
      allowed: false,
      reason: "Your access to send messages has been restricted.",
    };
  }
  if (input.roomLocked) {
    return {
      allowed: false,
      reason: "Chat is locked. Only admins can send messages right now.",
    };
  }
  return { allowed: true };
}

export function canAdminSendWhenLocked(isAdmin: boolean): boolean {
  return isAdmin;
}
