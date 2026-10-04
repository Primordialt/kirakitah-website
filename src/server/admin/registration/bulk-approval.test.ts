import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  bulkApprovalPermissionForQueue,
  executeBulkApproval,
  previewBulkApproval,
} from "@/server/admin/registration/bulk-approval";
import { roleHasPermission } from "@/server/admin/authorization/permissions";
import { IdentityReviewConflictError } from "@/server/admin/registration/transitions";

vi.mock("@/server/db", () => ({
  getDb: vi.fn(),
}));

vi.mock("@/server/admin/registration/service", () => ({
  submitIdentityReview: vi.fn(),
}));

vi.mock("@/server/registration/social-follow", () => ({
  submitSocialFollowReview: vi.fn(),
}));

vi.mock("@/server/admin/audit/record", () => ({
  recordAdminAuditEvent: vi.fn(),
}));

import { getDb } from "@/server/db";
import { submitIdentityReview } from "@/server/admin/registration/service";
import { recordAdminAuditEvent } from "@/server/admin/audit/record";

describe("bulk approval RBAC", () => {
  it("maps identity queue to identity:review", () => {
    expect(bulkApprovalPermissionForQueue("identity_pending")).toBe("identity:review");
    expect(roleHasPermission("REVIEWER", "identity:review")).toBe(true);
    expect(roleHasPermission("SUPPORT", "identity:review")).toBe(false);
  });

  it("maps social queue to social:review", () => {
    expect(bulkApprovalPermissionForQueue("social_pending")).toBe("social:review");
    expect(roleHasPermission("SUPPORT", "social:review")).toBe(false);
  });
});

describe("executeBulkApproval", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("skips identity records that no longer transition", async () => {
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([
        { referenceId: "KG-001" },
        { referenceId: "KG-002" },
      ]),
    };
    vi.mocked(getDb).mockReturnValue(mockDb as never);
    vi.mocked(submitIdentityReview)
      .mockResolvedValueOnce({ identityStatus: "verified" })
      .mockRejectedValueOnce(new IdentityReviewConflictError());

    const result = await executeBulkApproval({
      queue: "identity_pending",
      eventId: "kg926",
      actorId: "admin-1",
      actorRole: "SUPER_ADMIN",
    });

    expect(result.approved).toBe(1);
    expect(result.skipped).toBe(1);
    expect(result.failed).toBe(0);
    expect(recordAdminAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "REGISTRATION_BULK_APPROVAL" }),
    );
  });

  it("returns zero targeted when preview finds none", async () => {
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([]),
    };
    vi.mocked(getDb).mockReturnValue(mockDb as never);

    const preview = await previewBulkApproval({
      queue: "identity_pending",
      eventId: "kg926",
    });
    expect(preview.targeted).toBe(0);
  });
});
