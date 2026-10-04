import {
  and,
  count,
  desc,
  eq,
  exists,
  gt,
  ilike,
  inArray,
  isNull,
  lt,
  sql,
} from "drizzle-orm";
import { getDb } from "@/server/db";
import {
  chatMessageMentions,
  chatMessageReads,
  chatMessages,
  chatRoomMembers,
  chatRooms,
  participantAccounts,
} from "@/server/db/schema";
import { recordAdminAuditEvent } from "@/server/admin/audit/record";
import type { AdminRole } from "@/server/admin/authorization/permissions";
import { recordParticipantAuditEvent } from "@/server/participant/audit";
import {
  CHAT_MESSAGES_PAGE_SIZE,
  CHAT_SEND_COOLDOWN_MS,
  CHAT_SEND_RATE_LIMIT_PER_MINUTE,
  COMMUNITY_ROOM_SLUG,
} from "@/server/chat/constants";
import { ChatError } from "@/server/chat/errors";
import {
  canParticipantSendMessage,
  parseMentionUsernames,
  validateChatMessageContent,
} from "@/server/chat/validation";

export type ChatMessageView = {
  id: string;
  messageType: "user" | "announcement" | "system";
  content: string;
  createdAt: string;
  editedAt: string | null;
  isDeleted: boolean;
  senderLabel: string;
  senderKind: "participant" | "admin" | "system";
  replyTo: {
    id: string;
    senderLabel: string;
    contentPreview: string;
  } | null;
  mentions: string[];
};

export type ChatRoomStateView = {
  slug: string;
  name: string;
  memberCount: number;
  isLocked: boolean;
  pinnedMessage: ChatMessageView | null;
  canSend: boolean;
  sendBlockedReason: string | null;
};

const sendTimestamps = new Map<string, number[]>();

function rateLimitKey(accountId: string): string {
  return accountId;
}

export function checkSendRateLimit(accountId: string): void {
  const now = Date.now();
  const key = rateLimitKey(accountId);
  const prior = sendTimestamps.get(key) ?? [];
  const recent = prior.filter((ts) => now - ts < 60_000);
  if (recent.length >= CHAT_SEND_RATE_LIMIT_PER_MINUTE) {
    throw new ChatError("Too many messages. Please wait a moment.", "RATE_LIMITED", 429);
  }
  const last = recent[recent.length - 1];
  if (last && now - last < CHAT_SEND_COOLDOWN_MS) {
    throw new ChatError("Please wait before sending another message.", "RATE_LIMITED", 429);
  }
  recent.push(now);
  sendTimestamps.set(key, recent);
}

export async function getCommunityRoom() {
  const db = getDb();
  const [room] = await db
    .select()
    .from(chatRooms)
    .where(eq(chatRooms.slug, COMMUNITY_ROOM_SLUG))
    .limit(1);
  if (!room) {
    throw new ChatError("Chat room is not configured.", "CONFIGURATION_UNAVAILABLE", 503);
  }
  return room;
}

export async function ensureCommunityMembership(participantAccountId: string) {
  const room = await getCommunityRoom();
  const db = getDb();
  const [existing] = await db
    .select()
    .from(chatRoomMembers)
    .where(
      and(
        eq(chatRoomMembers.roomId, room.id),
        eq(chatRoomMembers.participantAccountId, participantAccountId),
      ),
    )
    .limit(1);

  if (existing) return { room, member: existing };

  const [created] = await db
    .insert(chatRoomMembers)
    .values({
      roomId: room.id,
      participantAccountId,
      status: "active",
    })
    .returning();

  return { room, member: created! };
}

function deletedContentPlaceholder(): string {
  return "This message was deleted.";
}

function buildSenderLabel(input: {
  messageType: string;
  username: string | null;
  isAdmin: boolean;
}): { label: string; kind: ChatMessageView["senderKind"] } {
  if (input.messageType === "system") {
    return { label: "System", kind: "system" };
  }
  if (input.isAdmin) {
    return { label: "Admin", kind: "admin" };
  }
  return { label: input.username ? `@${input.username}` : "Participant", kind: "participant" };
}

async function projectMessages(
  rows: Array<typeof chatMessages.$inferSelect>,
  usernames: Map<string, string>,
): Promise<ChatMessageView[]> {
  if (rows.length === 0) return [];

  const db = getDb();
  const ids = rows.map((row) => row.id);
  const replyIds = rows
    .map((row) => row.replyToMessageId)
    .filter((id): id is string => Boolean(id));

  const replyRows =
    replyIds.length > 0
      ? await db
          .select()
          .from(chatMessages)
          .where(inArray(chatMessages.id, replyIds))
      : [];

  const replyMap = new Map(replyRows.map((row) => [row.id, row]));

  const mentionRows = await db
    .select({
      messageId: chatMessageMentions.messageId,
      username: participantAccounts.username,
    })
    .from(chatMessageMentions)
    .innerJoin(
      participantAccounts,
      eq(chatMessageMentions.mentionedAccountId, participantAccounts.id),
    )
    .where(inArray(chatMessageMentions.messageId, ids));

  const mentionsByMessage = new Map<string, string[]>();
  for (const row of mentionRows) {
    const list = mentionsByMessage.get(row.messageId) ?? [];
    list.push(`@${row.username}`);
    mentionsByMessage.set(row.messageId, list);
  }

  return rows.map((row) => {
    const isDeleted = Boolean(row.deletedAt);
    const isAdmin = Boolean(row.senderAdminUserId);
    const username = row.senderParticipantAccountId
      ? usernames.get(row.senderParticipantAccountId) ?? null
      : null;
    const sender = buildSenderLabel({
      messageType: row.messageType,
      username,
      isAdmin,
    });

    const replySource = row.replyToMessageId
      ? replyMap.get(row.replyToMessageId)
      : undefined;

    let replyTo: ChatMessageView["replyTo"] = null;
    if (replySource) {
      const replyUsername = replySource.senderParticipantAccountId
        ? usernames.get(replySource.senderParticipantAccountId) ?? null
        : null;
      const replySender = buildSenderLabel({
        messageType: replySource.messageType,
        username: replyUsername,
        isAdmin: Boolean(replySource.senderAdminUserId),
      });
      const preview = replySource.deletedAt
        ? deletedContentPlaceholder()
        : replySource.content.slice(0, 120);
      replyTo = {
        id: replySource.id,
        senderLabel: replySender.label,
        contentPreview: preview,
      };
    }

    return {
      id: row.id,
      messageType: row.messageType,
      content: isDeleted ? deletedContentPlaceholder() : row.content,
      createdAt: row.createdAt,
      editedAt: row.editedAt,
      isDeleted,
      senderLabel: sender.label,
      senderKind: sender.kind,
      replyTo,
      mentions: mentionsByMessage.get(row.id) ?? [],
    };
  });
}

export async function getCommunityRoomState(
  participantAccountId: string,
): Promise<ChatRoomStateView> {
  const { room, member } = await ensureCommunityMembership(participantAccountId);
  const db = getDb();

  const [memberCountRow] = await db
    .select({ value: count() })
    .from(chatRoomMembers)
    .where(eq(chatRoomMembers.roomId, room.id));

  const sendCheck = canParticipantSendMessage({
    roomLocked: room.isLocked,
    memberStatus: member.status,
  });

  let pinnedMessage: ChatMessageView | null = null;
  if (room.pinnedMessageId) {
    const [pinned] = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.id, room.pinnedMessageId))
      .limit(1);
    if (pinned) {
      const [projected] = await projectMessages([pinned], new Map());
      pinnedMessage = projected ?? null;
    }
  }

  return {
    slug: room.slug,
    name: room.name,
    memberCount: Number(memberCountRow?.value ?? 0),
    isLocked: room.isLocked,
    pinnedMessage,
    canSend: sendCheck.allowed,
    sendBlockedReason: sendCheck.reason ?? null,
  };
}

export async function listCommunityMessages(input: {
  participantAccountId: string;
  cursor?: string | null;
  limit?: number;
}): Promise<{ messages: ChatMessageView[]; nextCursor: string | null }> {
  await ensureCommunityMembership(input.participantAccountId);
  const room = await getCommunityRoom();
  const db = getDb();
  const limit = Math.min(input.limit ?? CHAT_MESSAGES_PAGE_SIZE, 80);

  const conditions = [eq(chatMessages.roomId, room.id)];
  if (input.cursor) {
    const [cursorRow] = await db
      .select({ createdAt: chatMessages.createdAt })
      .from(chatMessages)
      .where(eq(chatMessages.id, input.cursor))
      .limit(1);
    if (cursorRow) {
      conditions.push(lt(chatMessages.createdAt, cursorRow.createdAt));
    }
  }

  const rows = await db
    .select()
    .from(chatMessages)
    .where(and(...conditions))
    .orderBy(desc(chatMessages.createdAt))
    .limit(limit + 1);

  const page = rows.slice(0, limit);
  const nextCursor = rows.length > limit ? page[page.length - 1]?.id ?? null : null;

  const accountIds = page
    .map((row) => row.senderParticipantAccountId)
    .filter((id): id is string => Boolean(id));

  const usernameRows =
    accountIds.length > 0
      ? await db
          .select({ id: participantAccounts.id, username: participantAccounts.username })
          .from(participantAccounts)
          .where(inArray(participantAccounts.id, accountIds))
      : [];

  const usernames = new Map(usernameRows.map((row) => [row.id, row.username]));

  const messages = await projectMessages(page.reverse(), usernames);
  return { messages, nextCursor };
}

export type AdminCommunityMessageFilters = {
  search?: string;
  messageType?: "user" | "announcement" | "system";
  mentionsOnly?: boolean;
  pinnedOnly?: boolean;
  username?: string;
};

export async function getCommunityRoomStateForAdmin(): Promise<ChatRoomStateView> {
  const room = await getCommunityRoom();
  const db = getDb();

  const [memberCountRow] = await db
    .select({ value: count() })
    .from(chatRoomMembers)
    .where(eq(chatRoomMembers.roomId, room.id));

  let pinnedMessage: ChatMessageView | null = null;
  if (room.pinnedMessageId) {
    const [pinned] = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.id, room.pinnedMessageId))
      .limit(1);
    if (pinned) {
      const [projected] = await projectMessages([pinned], new Map());
      pinnedMessage = projected ?? null;
    }
  }

  return {
    slug: room.slug,
    name: room.name,
    memberCount: Number(memberCountRow?.value ?? 0),
    isLocked: room.isLocked,
    pinnedMessage,
    canSend: false,
    sendBlockedReason: null,
  };
}

export async function listCommunityMessagesForAdmin(input: {
  cursor?: string | null;
  limit?: number;
  filters?: AdminCommunityMessageFilters;
}): Promise<{ messages: ChatMessageView[]; nextCursor: string | null }> {
  const room = await getCommunityRoom();
  const db = getDb();
  const limit = Math.min(input.limit ?? CHAT_MESSAGES_PAGE_SIZE, 80);
  const filters = input.filters ?? {};

  const conditions = [eq(chatMessages.roomId, room.id)];

  if (input.cursor) {
    const [cursorRow] = await db
      .select({ createdAt: chatMessages.createdAt })
      .from(chatMessages)
      .where(eq(chatMessages.id, input.cursor))
      .limit(1);
    if (cursorRow) {
      conditions.push(lt(chatMessages.createdAt, cursorRow.createdAt));
    }
  }

  if (filters.messageType) {
    conditions.push(eq(chatMessages.messageType, filters.messageType));
  }

  if (filters.search?.trim()) {
    const term = `%${filters.search.trim()}%`;
    conditions.push(ilike(chatMessages.content, term));
  }

  if (filters.pinnedOnly) {
    if (!room.pinnedMessageId) {
      return { messages: [], nextCursor: null };
    }
    conditions.push(eq(chatMessages.id, room.pinnedMessageId));
  }

  if (filters.mentionsOnly) {
    conditions.push(
      exists(
        db
          .select({ id: chatMessageMentions.id })
          .from(chatMessageMentions)
          .where(eq(chatMessageMentions.messageId, chatMessages.id)),
      ),
    );
  }

  if (filters.username?.trim()) {
    const normalized = filters.username.trim().replace(/^@/, "").toLowerCase();
    conditions.push(
      exists(
        db
          .select({ id: participantAccounts.id })
          .from(participantAccounts)
          .where(
            and(
              eq(participantAccounts.id, chatMessages.senderParticipantAccountId),
              ilike(participantAccounts.usernameNormalized, normalized),
            ),
          ),
      ),
    );
  }

  const rows = await db
    .select()
    .from(chatMessages)
    .where(and(...conditions))
    .orderBy(desc(chatMessages.createdAt))
    .limit(limit + 1);

  const page = rows.slice(0, limit);
  const nextCursor = rows.length > limit ? page[page.length - 1]?.id ?? null : null;

  const accountIds = page
    .map((row) => row.senderParticipantAccountId)
    .filter((id): id is string => Boolean(id));

  const usernameRows =
    accountIds.length > 0
      ? await db
          .select({ id: participantAccounts.id, username: participantAccounts.username })
          .from(participantAccounts)
          .where(inArray(participantAccounts.id, accountIds))
      : [];

  const usernames = new Map(usernameRows.map((row) => [row.id, row.username]));
  const messages = await projectMessages(page.reverse(), usernames);
  return { messages, nextCursor };
}

export async function getUnreadCount(participantAccountId: string): Promise<number> {
  const { room } = await ensureCommunityMembership(participantAccountId);
  const db = getDb();

  const [readRow] = await db
    .select()
    .from(chatMessageReads)
    .where(
      and(
        eq(chatMessageReads.roomId, room.id),
        eq(chatMessageReads.participantAccountId, participantAccountId),
      ),
    )
    .limit(1);

  const conditions = [eq(chatMessages.roomId, room.id), isNull(chatMessages.deletedAt)];

  if (readRow?.lastReadAt) {
    conditions.push(gt(chatMessages.createdAt, readRow.lastReadAt));
  }

  const [row] = await db
    .select({ value: count() })
    .from(chatMessages)
    .where(and(...conditions));

  return Number(row?.value ?? 0);
}

export async function markCommunityRead(input: {
  participantAccountId: string;
  lastReadMessageId: string;
}): Promise<void> {
  const { room } = await ensureCommunityMembership(input.participantAccountId);
  const db = getDb();

  const [message] = await db
    .select()
    .from(chatMessages)
    .where(
      and(
        eq(chatMessages.id, input.lastReadMessageId),
        eq(chatMessages.roomId, room.id),
      ),
    )
    .limit(1);

  if (!message) {
    throw new ChatError("Message not found.", "NOT_FOUND", 404);
  }

  const now = new Date().toISOString();
  await db
    .insert(chatMessageReads)
    .values({
      roomId: room.id,
      participantAccountId: input.participantAccountId,
      lastReadMessageId: message.id,
      lastReadAt: message.createdAt,
    })
    .onConflictDoUpdate({
      target: [chatMessageReads.roomId, chatMessageReads.participantAccountId],
      set: {
        lastReadMessageId: message.id,
        lastReadAt: message.createdAt,
      },
    });
}

async function resolveMentionAccounts(usernames: string[]) {
  if (usernames.length === 0) return [];
  const db = getDb();
  return db
    .select({ id: participantAccounts.id, username: participantAccounts.username })
    .from(participantAccounts)
    .where(
      inArray(
        participantAccounts.usernameNormalized,
        usernames.map((name) => name.toLowerCase()),
      ),
    );
}

async function notifyChatEvent(input: {
  accountId: string;
  eventType: "CHAT_MENTION" | "CHAT_REPLY" | "CHAT_ANNOUNCEMENT";
  messageId: string;
  roomSlug: string;
}) {
  await recordParticipantAuditEvent({
    accountId: input.accountId,
    eventType: input.eventType,
    metadata: {
      messageId: input.messageId,
      roomSlug: input.roomSlug,
      href: `/chatbox?message=${input.messageId}`,
    },
  });
}

export async function sendParticipantMessage(input: {
  participantAccountId: string;
  content: string;
  replyToMessageId?: string | null;
}): Promise<ChatMessageView> {
  checkSendRateLimit(input.participantAccountId);
  const normalized = validateChatMessageContent(input.content);

  const { room, member } = await ensureCommunityMembership(input.participantAccountId);
  const sendCheck = canParticipantSendMessage({
    roomLocked: room.isLocked,
    memberStatus: member.status,
  });
  if (!sendCheck.allowed) {
    throw new ChatError(sendCheck.reason ?? "Cannot send.", "FORBIDDEN", 403);
  }

  const db = getDb();
  if (input.replyToMessageId) {
    const [replyTarget] = await db
      .select({ id: chatMessages.id })
      .from(chatMessages)
      .where(
        and(
          eq(chatMessages.id, input.replyToMessageId),
          eq(chatMessages.roomId, room.id),
        ),
      )
      .limit(1);
    if (!replyTarget) {
      throw new ChatError("Reply target not found.", "VALIDATION_ERROR", 400);
    }
  }

  const [account] = await db
    .select({ username: participantAccounts.username })
    .from(participantAccounts)
    .where(eq(participantAccounts.id, input.participantAccountId))
    .limit(1);

  const [inserted] = await db
    .insert(chatMessages)
    .values({
      roomId: room.id,
      senderParticipantAccountId: input.participantAccountId,
      content: normalized,
      messageType: "user",
      replyToMessageId: input.replyToMessageId ?? null,
    })
    .returning();

  const mentionUsernames = parseMentionUsernames(normalized);
  const mentioned = await resolveMentionAccounts(mentionUsernames);

  if (mentioned.length > 0) {
    await db.insert(chatMessageMentions).values(
      mentioned.map((row) => ({
        messageId: inserted!.id,
        mentionedAccountId: row.id,
      })),
    );

    for (const row of mentioned) {
      if (row.id === input.participantAccountId) continue;
      await notifyChatEvent({
        accountId: row.id,
        eventType: "CHAT_MENTION",
        messageId: inserted!.id,
        roomSlug: room.slug,
      });
    }
  }

  if (input.replyToMessageId) {
    const [parent] = await db
      .select({ senderParticipantAccountId: chatMessages.senderParticipantAccountId })
      .from(chatMessages)
      .where(eq(chatMessages.id, input.replyToMessageId))
      .limit(1);
    const parentAccountId = parent?.senderParticipantAccountId;
    if (parentAccountId && parentAccountId !== input.participantAccountId) {
      await notifyChatEvent({
        accountId: parentAccountId,
        eventType: "CHAT_REPLY",
        messageId: inserted!.id,
        roomSlug: room.slug,
      });
    }
  }

  const usernames = new Map([[input.participantAccountId, account?.username ?? ""]]);
  const [view] = await projectMessages([inserted!], usernames);
  return view!;
}

export async function searchMentionCandidates(query: string, limit = 8) {
  const trimmed = query.trim().toLowerCase();
  if (trimmed.length < 1) return [];

  const db = getDb();
  const rows = await db
    .select({
      username: participantAccounts.username,
    })
    .from(participantAccounts)
    .where(
      and(
        eq(participantAccounts.active, true),
        ilike(participantAccounts.usernameNormalized, `${trimmed}%`),
      ),
    )
    .limit(limit);

  return rows.map((row) => ({ username: row.username }));
}

export async function setCommunityLock(input: {
  locked: boolean;
  adminUserId: string;
  adminRole: AdminRole;
  requestId?: string;
}): Promise<void> {
  const room = await getCommunityRoom();
  const db = getDb();
  await db
    .update(chatRooms)
    .set({ isLocked: input.locked, updatedAt: new Date().toISOString() })
    .where(eq(chatRooms.id, room.id));

  await recordAdminAuditEvent({
    eventType: input.locked ? "CHAT_LOCKED" : "CHAT_UNLOCKED",
    actorId: input.adminUserId,
    actorRole: input.adminRole,
    requestId: input.requestId,
    metadata: { roomSlug: room.slug },
  });
}

export async function postAdminAnnouncement(input: {
  adminUserId: string;
  adminRole: AdminRole;
  content: string;
  requestId?: string;
}): Promise<ChatMessageView> {
  const normalized = validateChatMessageContent(input.content);
  const room = await getCommunityRoom();
  const db = getDb();

  const [inserted] = await db
    .insert(chatMessages)
    .values({
      roomId: room.id,
      senderAdminUserId: input.adminUserId,
      content: normalized,
      messageType: "announcement",
    })
    .returning();

  await recordAdminAuditEvent({
    eventType: "CHAT_ANNOUNCEMENT_CREATED",
    actorId: input.adminUserId,
    actorRole: input.adminRole,
    requestId: input.requestId,
    metadata: { roomSlug: room.slug, messageId: inserted!.id },
  });

  const mentionUsernames = parseMentionUsernames(normalized);
  const mentioned = await resolveMentionAccounts(mentionUsernames);
  if (mentioned.length > 0) {
    await db.insert(chatMessageMentions).values(
      mentioned.map((row) => ({
        messageId: inserted!.id,
        mentionedAccountId: row.id,
      })),
    );
  }

  for (const row of mentioned) {
    await notifyChatEvent({
      accountId: row.id,
      eventType: "CHAT_ANNOUNCEMENT",
      messageId: inserted!.id,
      roomSlug: room.slug,
    });
  }

  const [view] = await projectMessages([inserted!], new Map());
  return view!;
}

export async function postAdminMessageWhileLocked(input: {
  adminUserId: string;
  content: string;
  messageType?: "user" | "announcement";
}): Promise<ChatMessageView> {
  const normalized = validateChatMessageContent(input.content);
  const room = await getCommunityRoom();
  const db = getDb();

  const [inserted] = await db
    .insert(chatMessages)
    .values({
      roomId: room.id,
      senderAdminUserId: input.adminUserId,
      content: normalized,
      messageType: input.messageType ?? "user",
    })
    .returning();

  const [view] = await projectMessages([inserted!], new Map());
  return view!;
}

export async function softDeleteMessage(input: {
  messageId: string;
  adminUserId: string;
  adminRole: AdminRole;
  requestId?: string;
}): Promise<void> {
  const room = await getCommunityRoom();
  const db = getDb();
  const now = new Date().toISOString();

  const [updated] = await db
    .update(chatMessages)
    .set({
      deletedAt: now,
      deletedByAdminUserId: input.adminUserId,
      updatedAt: now,
    })
    .where(and(eq(chatMessages.id, input.messageId), eq(chatMessages.roomId, room.id)))
    .returning({ id: chatMessages.id });

  if (!updated) {
    throw new ChatError("Message not found.", "NOT_FOUND", 404);
  }

  await recordAdminAuditEvent({
    eventType: "CHAT_MESSAGE_DELETED",
    actorId: input.adminUserId,
    actorRole: input.adminRole,
    requestId: input.requestId,
    metadata: { roomSlug: room.slug, messageId: input.messageId },
  });
}

export async function setPinnedMessage(input: {
  messageId: string | null;
  adminUserId: string;
  adminRole: AdminRole;
  requestId?: string;
}): Promise<void> {
  const room = await getCommunityRoom();
  const db = getDb();

  if (input.messageId) {
    const [message] = await db
      .select({ id: chatMessages.id })
      .from(chatMessages)
      .where(and(eq(chatMessages.id, input.messageId), eq(chatMessages.roomId, room.id)))
      .limit(1);
    if (!message) {
      throw new ChatError("Message not found.", "NOT_FOUND", 404);
    }
  }

  await db
    .update(chatRooms)
    .set({
      pinnedMessageId: input.messageId,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(chatRooms.id, room.id));

  await recordAdminAuditEvent({
    eventType: input.messageId ? "CHAT_MESSAGE_PINNED" : "CHAT_MESSAGE_UNPINNED",
    actorId: input.adminUserId,
    actorRole: input.adminRole,
    requestId: input.requestId,
    metadata: {
      roomSlug: room.slug,
      messageId: input.messageId,
    },
  });
}

export async function restrictMember(input: {
  participantAccountId: string;
  status: "active" | "muted" | "restricted";
  reason?: string | null;
  adminUserId: string;
  adminRole: AdminRole;
  requestId?: string;
}): Promise<void> {
  const room = await getCommunityRoom();
  const db = getDb();
  const now = new Date().toISOString();

  await db
    .insert(chatRoomMembers)
    .values({
      roomId: room.id,
      participantAccountId: input.participantAccountId,
      status: input.status,
      statusReason: input.reason ?? null,
    })
    .onConflictDoUpdate({
      target: [chatRoomMembers.roomId, chatRoomMembers.participantAccountId],
      set: {
        status: input.status,
        statusReason: input.reason ?? null,
        updatedAt: now,
      },
    });

  await recordAdminAuditEvent({
    eventType:
      input.status === "active" ? "CHAT_MEMBER_UNRESTRICTED" : "CHAT_MEMBER_RESTRICTED",
    actorId: input.adminUserId,
    actorRole: input.adminRole,
    requestId: input.requestId,
    metadata: {
      roomSlug: room.slug,
      participantAccountId: input.participantAccountId,
      status: input.status,
    },
  });
}

export async function lookupParticipantByUsername(username: string) {
  const db = getDb();
  const [row] = await db
    .select({ id: participantAccounts.id, username: participantAccounts.username })
    .from(participantAccounts)
    .where(eq(participantAccounts.usernameNormalized, username.trim().toLowerCase()))
    .limit(1);
  return row ?? null;
}
