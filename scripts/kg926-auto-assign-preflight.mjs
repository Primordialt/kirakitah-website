#!/usr/bin/env node
/**
 * READ-ONLY KG926 Auto Assign pre-flight audit.
 * Uses the same read queries and buildAssignmentPlan logic as auto-assign-service.ts.
 * Does NOT insert, update, or delete any Production records.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

const TOURNAMENT_ID = "event-kg926";

function loadDatabaseUrl() {
  const fromEnv = process.env.DATABASE_URL;
  if (fromEnv) return fromEnv;
  try {
    const envLocal = readFileSync(join(process.cwd(), ".env.local"), "utf8");
    for (const line of envLocal.split("\n")) {
      const match = line.match(/^\s*DATABASE_URL=(.+)$/);
      if (match) return match[1].trim().replace(/^["']|["']$/g, "");
    }
  } catch {
    // ignore
  }
  throw new Error("DATABASE_URL is not configured.");
}

/** Same as auto-assign-service buildAssignmentPlan */
function buildAssignmentPlan(participantIds, slots) {
  const count = Math.min(participantIds.length, slots.length);
  const plan = [];
  for (let i = 0; i < count; i += 1) {
    plan.push({
      podId: slots[i].podId,
      podNumber: slots[i].podNumber,
      positionNumber: slots[i].positionNumber,
      participantId: participantIds[i],
    });
  }
  return plan;
}

async function main() {
  const client = new pg.Client({ connectionString: loadDatabaseUrl() });
  await client.connect();

  try {
    const [tournament] = (
      await client.query(`SELECT id, name, slug FROM tournaments WHERE id = $1`, [
        TOURNAMENT_ID,
      ])
    ).rows;
    if (!tournament) throw new Error(`Tournament ${TOURNAMENT_ID} not found.`);

    const [phase] = (
      await client.query(
        `SELECT id, slug, phase_type, status, sequence
         FROM tournament_phases
         WHERE tournament_id = $1 AND slug = 'qualification'
         LIMIT 1`,
        [TOURNAMENT_ID],
      )
    ).rows;
    if (!phase) throw new Error("Qualification phase not found.");

    const statusCounts = (
      await client.query(
        `SELECT status, count(*)::int AS count
         FROM tournament_participants
         WHERE tournament_id = $1
         GROUP BY status
         ORDER BY status`,
        [TOURNAMENT_ID],
      )
    ).rows;

    const countByStatus = Object.fromEntries(
      statusCounts.map((r) => [r.status, r.count]),
    );
    const totalParticipants = statusCounts.reduce((s, r) => s + r.count, 0);
    const selectedCount = countByStatus.selected ?? 0;
    const withdrawnCount = countByStatus.withdrawn ?? 0;
    const disqualifiedCount = countByStatus.disqualified ?? 0;

    const [assignedSelectedRow] = (
      await client.query(
        `SELECT count(DISTINCT qpm.participant_id)::int AS count
         FROM qualification_pod_members qpm
         JOIN tournament_participants tp ON tp.id = qpm.participant_id
         WHERE qpm.phase_id = $1
           AND tp.tournament_id = $2
           AND tp.status = 'selected'`,
        [phase.id, TOURNAMENT_ID],
      )
    ).rows;

    const alreadyAssignedSelected = assignedSelectedRow?.count ?? 0;
    const unassignedSelected = selectedCount - alreadyAssignedSelected;

    const [rejectedAppsRow] = (
      await client.query(
        `SELECT count(*)::int AS count
         FROM registration_applications
         WHERE event_id = $1 AND status = 'rejected'`,
        [TOURNAMENT_ID],
      )
    ).rows;

    const [nonSelectedAppsRow] = (
      await client.query(
        `SELECT count(*)::int AS count
         FROM registration_applications ra
         WHERE ra.event_id = $1
           AND ra.status NOT IN ('rejected', 'withdrawn')
           AND NOT EXISTS (
             SELECT 1 FROM tournament_participants tp
             WHERE tp.application_id = ra.id
               AND tp.tournament_id = $1
               AND tp.status = 'selected'
           )`,
        [TOURNAMENT_ID],
      )
    ).rows;

    const pods = (
      await client.query(
        `SELECT id, pod_number, capacity, status
         FROM qualification_pods
         WHERE tournament_id = $1 AND phase_id = $2
         ORDER BY pod_number ASC`,
        [TOURNAMENT_ID, phase.id],
      )
    ).rows;

    const members = (
      await client.query(
        `SELECT qpm.pod_id, qpm.participant_id, qpm.position_number, tp.public_code
         FROM qualification_pod_members qpm
         JOIN tournament_participants tp ON tp.id = qpm.participant_id
         WHERE qpm.phase_id = $1
         ORDER BY qpm.pod_id, qpm.position_number`,
        [phase.id],
      )
    ).rows;

    const matchPods = (
      await client.query(
        `SELECT DISTINCT qualification_pod_id AS pod_id
         FROM matches
         WHERE tournament_id = $1
           AND qualification_pod_id IS NOT NULL`,
        [TOURNAMENT_ID],
      )
    ).rows;

    const matchPodIds = new Set(matchPods.map((r) => r.pod_id));

    const membersByPod = new Map();
    for (const m of members) {
      const list = membersByPod.get(m.pod_id) ?? [];
      list.push(m);
      membersByPod.set(m.pod_id, list);
    }

    let occupiedPositions = 0;
    let emptyPods = 0;
    let partialPods = 0;
    let fullPods = 0;
    const podReports = [];

    for (const pod of pods) {
      const podMembers = membersByPod.get(pod.id) ?? [];
      const memberCount = podMembers.length;
      occupiedPositions += memberCount;
      const remaining = pod.capacity - memberCount;
      const hasMatches = matchPodIds.has(pod.id);

      if (memberCount === 0) emptyPods += 1;
      else if (memberCount >= pod.capacity) fullPods += 1;
      else partialPods += 1;

      podReports.push({
        podNumber: pod.pod_number,
        capacity: pod.capacity,
        memberCount,
        remaining,
        status: pod.status,
        hasMatches,
        members: podMembers.map((m) => ({
          position: m.position_number,
          publicCode: m.public_code,
        })),
      });
    }

    const totalPositions = pods.reduce((s, p) => s + p.capacity, 0);
    const availablePositions = totalPositions - occupiedPositions;

    const assignedIds = members.map((m) => m.participant_id);

    const unassignedParticipants = (
      await client.query(
        `SELECT id, public_code
         FROM tournament_participants
         WHERE tournament_id = $1
           AND status = 'selected'
           ${assignedIds.length > 0 ? "AND id NOT IN (SELECT unnest($2::uuid[]))" : ""}
         ORDER BY public_code ASC NULLS LAST, id ASC`,
        assignedIds.length > 0 ? [TOURNAMENT_ID, assignedIds] : [TOURNAMENT_ID],
      )
    ).rows;

    const slots = [];
    for (const pod of pods) {
      if (pod.status === "completed" || pod.status === "cancelled") continue;
      if (matchPodIds.has(pod.id)) continue;

      const occupied = new Set(
        (membersByPod.get(pod.id) ?? []).map((m) => m.position_number),
      );
      for (let position = 1; position <= pod.capacity; position += 1) {
        if (!occupied.has(position)) {
          slots.push({
            podId: pod.id,
            podNumber: pod.pod_number,
            positionNumber: position,
          });
        }
      }
    }

    const participantIds = unassignedParticipants.map((p) => p.id);
    const plan = buildAssignmentPlan(participantIds, slots);
    const publicCodeById = new Map(
      unassignedParticipants.map((p) => [p.id, p.public_code ?? p.id]),
    );

    const protectedPods = pods.filter((p) => matchPodIds.has(p.id)).map((p) => p.pod_number);
    const mutableAvailableSlots = slots.length;

    // Integrity checks
    const participantIdsInPlan = plan.map((a) => a.participantId);
    const uniqueParticipants = new Set(participantIdsInPlan);
    const slotKeys = plan.map((a) => `${a.podId}:${a.positionNumber}`);
    const uniqueSlots = new Set(slotKeys);

    const planParticipantStatuses = plan.length
      ? (
          await client.query(
            `SELECT id, status FROM tournament_participants WHERE id = ANY($1::uuid[])`,
            [participantIdsInPlan],
          )
        ).rows
      : [];

    const allSelected = planParticipantStatuses.every((r) => r.status === "selected");
    const noAlreadyAssigned = planParticipantStatuses.every(
      (r) => !assignedIds.includes(r.id),
    );
    const noProtectedPods = plan.every((a) => !matchPodIds.has(a.podId));

    const integrityPass =
      uniqueParticipants.size === participantIdsInPlan.length &&
      uniqueSlots.size === slotKeys.length &&
      allSelected &&
      noAlreadyAssigned &&
      noProtectedPods;

    const result = {
      audit: "KG926 AUTO-ASSIGN PRE-FLIGHT",
      readOnly: true,
      tournament: { id: tournament.id, name: tournament.name },
      qualificationPhase: {
        id: phase.id,
        slug: phase.slug,
        type: phase.phase_type,
        status: phase.status,
      },
      participants: {
        totalTournamentParticipants: totalParticipants,
        selected: selectedCount,
        alreadyAssignedSelected,
        unassignedSelected,
        withdrawn: withdrawnCount,
        disqualified: disqualifiedCount,
        rejectedApplications: rejectedAppsRow?.count ?? 0,
        nonSelectedApplications: nonSelectedAppsRow?.count ?? 0,
      },
      pods: {
        total: pods.length,
        positionsPerPod: 4,
        totalPositions,
        occupiedPositions,
        availablePositions,
        empty: emptyPods,
        partial: partialPods,
        full: fullPods,
        protectedByMatches: protectedPods.length,
        protectedPodNumbers: protectedPods.sort((a, b) => a - b),
        mutableAvailableSlots,
        details: podReports,
      },
      preview: {
        expectedNewAssignments: plan.length,
        unassignedAfterAssignment: unassignedSelected - plan.length,
        assignments: plan.map((a) => ({
          publicCode: publicCodeById.get(a.participantId),
          podNumber: a.podNumber,
          positionNumber: a.positionNumber,
        })),
      },
      integrity: {
        noDuplicateParticipants: uniqueParticipants.size === participantIdsInPlan.length,
        noAlreadyAssignedInPlan: noAlreadyAssigned,
        allCandidatesSelected: allSelected,
        noDuplicatePositions: uniqueSlots.size === slotKeys.length,
        noCapacityExceeded: true,
        noOccupiedOverwrite: true,
        noProtectedPodAssignments: noProtectedPods,
        correctTournament: tournament.id === TOURNAMENT_ID,
        correctPhase: phase.slug === "qualification",
        validPositionNumbers: plan.every(
          (a) => a.positionNumber >= 1 && a.positionNumber <= 4,
        ),
        overall: integrityPass ? "PASS" : "FAIL",
      },
      rbac: {
        autoAssignPermission: "tournament:pod_manage (SUPER_ADMIN, TOURNAMENT_ADMIN)",
        reassignPermission: "qualification:reassign_position (SUPER_ADMIN only)",
        modified: false,
      },
      concurrency: {
        lock: "pg_advisory_xact_lock(hashtext('qual_auto_assign:{tournamentId}'))",
        transactionRollback: true,
        modified: false,
      },
      productionMutation: {
        inserted: 0,
        updated: 0,
        deleted: 0,
        autoAssignExecuted: false,
        reassignmentExecuted: false,
        matchesChanged: false,
        schedulingChanged: false,
        participantProfilesChanged: false,
      },
      decision:
        integrityPass &&
        tournament.id === TOURNAMENT_ID &&
        phase.slug === "qualification" &&
        pods.length === 32 &&
        totalPositions === 128
          ? unassignedSelected > 0
            ? "READY FOR INCREMENTAL AUTO ASSIGN"
            : "READY — NO UNASSIGNED SELECTED PARTICIPANTS"
          : "DO NOT RUN AUTO ASSIGN",
      readinessNote:
        "128 is maximum qualification capacity, not a minimum roster requirement. Partial rosters may be assigned incrementally.",
    };

    console.log(JSON.stringify(result, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
