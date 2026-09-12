"use client";

import { Fragment, useState } from "react";
import { MatchParticipantDisplay } from "@/components/admin/MatchParticipantDisplay";
import { MatchResultActions } from "@/components/admin/MatchResultActions";
import { ScheduleStatusBadge } from "@/components/admin/MatchSchedulePanel";
import { EditMatchModal } from "@/components/admin/EditMatchModal";
import type { AdminMatchProjection } from "@/server/tournament/competition/admin-match-projection";

type EditableParticipant = {
  participantId: string;
  publicCode: string | null;
  gamerTag: string | null;
  username: string | null;
  verified: boolean;
  podNumber: number | null;
  positionNumber: number | null;
};

export function AdminMatchBoard({
  tournamentId,
  matches,
  roster,
  canEdit,
  canRecord,
  canCorrect,
  canForfeit,
  canDispute,
}: {
  tournamentId: string;
  matches: AdminMatchProjection[];
  roster: EditableParticipant[];
  canEdit: boolean;
  canRecord: boolean;
  canCorrect: boolean;
  canForfeit: boolean;
  canDispute: boolean;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingMatch, setEditingMatch] = useState<AdminMatchProjection | null>(
    null,
  );

  if (matches.length === 0) {
    return (
      <p className="mt-6 rounded-xl border border-border px-4 py-6 text-body-sm text-text-muted">
        No matches match the current filters.
      </p>
    );
  }

  return (
    <>
      <div className="mt-6 space-y-4 lg:hidden">
        {matches.map((match) => (
          <article
            key={match.matchId}
            className="rounded-xl border border-border bg-surface-elevated p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-mono text-xs text-text-muted">
                  Match {match.matchShortId}
                </p>
                <p className="text-body-sm font-semibold">{match.phaseName}</p>
                <p className="text-caption text-text-muted">
                  {match.roundLabel}
                  {match.podNumber != null ? ` · Pod ${match.podNumber}` : ""}
                </p>
              </div>
              <span className="rounded border border-border px-2 py-0.5 text-caption uppercase">
                {match.status}
              </span>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <MatchParticipantDisplay slot={match.slotA} sideLabel="Player A" />
              <MatchParticipantDisplay slot={match.slotB} sideLabel="Player B" />
            </div>

            <div className="mt-3 text-body-sm">
              <p>{match.scheduledDateDisplay}</p>
              <p className="text-text-secondary">{match.scheduledTimeDisplay}</p>
              <p className="text-caption text-text-muted">{match.timezoneLabel}</p>
              <ScheduleStatusBadge status={match.schedulingStatus} />
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className="text-accent underline"
                onClick={() =>
                  setExpandedId(expandedId === match.matchId ? null : match.matchId)
                }
                aria-expanded={expandedId === match.matchId}
              >
                {expandedId === match.matchId ? "Hide details" : "Match details"}
              </button>
              {canEdit && match.editable ? (
                <button
                  type="button"
                  className="text-accent underline"
                  onClick={() => setEditingMatch(match)}
                  aria-label={`Edit match ${match.matchShortId}`}
                >
                  Edit match
                </button>
              ) : null}
            </div>

            {expandedId === match.matchId ? (
              <div className="mt-3 border-t border-border pt-3">
                <MatchResultActions
                  tournamentId={tournamentId}
                  matchId={match.matchId}
                  status={match.status}
                  participantAId={match.slotA.participantId}
                  participantBId={match.slotB.participantId}
                  slotALabel={match.slotA.label}
                  slotBLabel={match.slotB.label}
                  participantsReady={match.participantsReady}
                  canRecord={canRecord}
                  canCorrect={canCorrect}
                  canForfeit={canForfeit}
                  canDispute={canDispute}
                />
              </div>
            ) : null}
          </article>
        ))}
      </div>

      <div className="mt-6 hidden overflow-x-auto rounded-xl border border-border lg:block">
        <table className="min-w-full text-left text-body-sm">
          <thead className="bg-surface-elevated text-text-muted">
            <tr>
              <th className="px-3 py-2 font-medium">Match</th>
              <th className="px-3 py-2 font-medium">Phase / Round</th>
              <th className="px-3 py-2 font-medium">Player A</th>
              <th className="px-3 py-2 font-medium">Player B</th>
              <th className="px-3 py-2 font-medium">Schedule</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {matches.map((match) => (
              <Fragment key={match.matchId}>
                <tr className="border-t border-border align-top">
                  <td className="px-3 py-3 font-mono text-xs">
                    {match.matchShortId}
                    {match.matchNumber != null ? (
                      <span className="mt-1 block text-caption text-text-muted">
                        #{match.matchNumber}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-3">
                    <p>{match.phaseName}</p>
                    <p className="text-caption text-text-muted">
                      {match.roundLabel}
                      {match.podNumber != null ? ` · Pod ${match.podNumber}` : ""}
                    </p>
                  </td>
                  <td className="px-3 py-3">
                    <MatchParticipantDisplay slot={match.slotA} sideLabel="A" />
                  </td>
                  <td className="px-3 py-3">
                    <MatchParticipantDisplay slot={match.slotB} sideLabel="B" />
                  </td>
                  <td className="px-3 py-3">
                    <p>{match.scheduledDateDisplay}</p>
                    <p className="text-text-secondary">{match.scheduledTimeDisplay}</p>
                    <p className="text-caption text-text-muted">{match.timezoneLabel}</p>
                  </td>
                  <td className="px-3 py-3">
                    <p>{match.status}</p>
                    <ScheduleStatusBadge status={match.schedulingStatus} />
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        className="text-left text-accent underline"
                        onClick={() =>
                          setExpandedId(
                            expandedId === match.matchId ? null : match.matchId,
                          )
                        }
                        aria-expanded={expandedId === match.matchId}
                      >
                        Details
                      </button>
                      {canEdit && match.editable ? (
                        <button
                          type="button"
                          className="text-left text-accent underline"
                          onClick={() => setEditingMatch(match)}
                          aria-label={`Edit match ${match.matchShortId}`}
                        >
                          Edit match
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
                {expandedId === match.matchId ? (
                  <tr className="border-t border-border bg-surface">
                    <td colSpan={7} className="px-3 py-4">
                      <p className="text-body-sm font-semibold">Match details</p>
                      <div className="mt-2 grid gap-4 md:grid-cols-3">
                        <div>
                          <p className="text-caption text-text-muted">Match ID</p>
                          <p className="font-mono text-xs">{match.matchId}</p>
                        </div>
                        <div>
                          <p className="text-caption text-text-muted">Phase</p>
                          <p>{match.phaseName}</p>
                        </div>
                        <div>
                          <p className="text-caption text-text-muted">Round</p>
                          <p>{match.roundLabel}</p>
                        </div>
                      </div>
                      <div className="mt-4">
                        <MatchResultActions
                          tournamentId={tournamentId}
                          matchId={match.matchId}
                          status={match.status}
                          participantAId={match.slotA.participantId}
                          participantBId={match.slotB.participantId}
                          slotALabel={match.slotA.label}
                          slotBLabel={match.slotB.label}
                          participantsReady={match.participantsReady}
                          canRecord={canRecord}
                          canCorrect={canCorrect}
                          canForfeit={canForfeit}
                          canDispute={canDispute}
                        />
                      </div>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {editingMatch ? (
        <EditMatchModal
          tournamentId={tournamentId}
          match={editingMatch}
          roster={roster}
          open={Boolean(editingMatch)}
          onClose={() => setEditingMatch(null)}
        />
      ) : null}
    </>
  );
}
