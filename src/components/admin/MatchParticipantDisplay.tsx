import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import type { AdminMatchSlotProjection } from "@/server/tournament/competition/admin-match-slot";

export function MatchParticipantDisplay({
  slot,
  sideLabel,
}: {
  slot: AdminMatchSlotProjection;
  sideLabel: string;
}) {
  const isParticipant = slot.kind === "participant" && slot.participantId;

  return (
    <div className="space-y-0.5">
      <p className="text-caption uppercase tracking-wide text-text-muted">{sideLabel}</p>
      {isParticipant ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            {slot.username ? (
              <span className="font-medium text-text-primary">@{slot.username}</span>
            ) : null}
            {slot.publicCode ? (
              <span className="font-mono text-xs text-text-secondary">{slot.publicCode}</span>
            ) : null}
            <VerifiedBadge verified={slot.verified} size="sm" />
          </div>
          {slot.gamerTag ? (
            <p className="text-body-sm text-text-secondary">
              GamerTag: {slot.gamerTag}
            </p>
          ) : null}
          {slot.podNumber != null ? (
            <p className="text-caption text-text-muted">
              Pod {slot.podNumber}
              {slot.positionNumber != null ? ` · Position ${slot.positionNumber}` : ""}
            </p>
          ) : null}
        </>
      ) : (
        <p className="text-body-sm text-text-secondary">{slot.label}</p>
      )}
    </div>
  );
}
