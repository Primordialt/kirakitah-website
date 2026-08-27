import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell, loadAdminSession } from "@/components/admin/AdminShell";
import {
  ApplicationStatusActions,
  IdentityReviewActions,
  RevealIdentityButton,
} from "@/components/admin/ApplicationReviewActions";
import { SocialFollowReviewActions } from "@/components/admin/SocialFollowReviewActions";
import { TournamentEligibilityPanel } from "@/components/admin/TournamentEligibilityPanel";
import {
  formatApplicationStatusLabel,
  formatAuditEventLabel,
  formatIdentityStatusLabel,
  formatSocialStatusLabel,
} from "@/lib/admin/application-labels";
import {
  getAdminApplicationDetail,
  listAdminAuditEvents,
} from "@/server/admin/registration/service";
import { roleHasPermission } from "@/server/admin/authorization/permissions";
import { isRegistrationBackendConfigured } from "@/server/env";
import { getParticipantForApplicationReference } from "@/server/tournament/participant-lookup";
import { COMPETITION_NAME } from "@/config/competition";

export default async function AdminApplicationDetailPage({
  params,
}: {
  params: Promise<{ referenceId: string }>;
}) {
  const session = await loadAdminSession("applications:view");
  const { referenceId } = await params;

  if (!isRegistrationBackendConfigured()) {
    return (
      <AdminShell session={session}>
        <h1 className="text-h2">Application unavailable</h1>
        <p className="mt-2 text-body text-text-muted">
          Registration database is not configured in this environment.
        </p>
      </AdminShell>
    );
  }

  const detail = await getAdminApplicationDetail(
    referenceId.toUpperCase(),
    session.user.role,
    { actorId: session.user.id },
  );

  if (!detail) {
    notFound();
  }

  const canReveal = roleHasPermission(session.user.role, "identity:reveal");
  const canReview = roleHasPermission(session.user.role, "identity:review");
  const canSocialReview = roleHasPermission(session.user.role, "social:review");
  const canStatus = roleHasPermission(session.user.role, "applications:status");
  const canEvaluate = roleHasPermission(
    session.user.role,
    "tournament:eligibility",
  );
  const canSelect = roleHasPermission(
    session.user.role,
    "tournament:participant_select",
  );
  const canAudit = roleHasPermission(session.user.role, "audit:view");

  const participant = await getParticipantForApplicationReference(
    detail.referenceId,
  );

  const audit = canAudit
    ? await listAdminAuditEvents({
        referenceId: detail.referenceId,
        pageSize: 25,
      })
    : { items: [] };

  const verifiedSocialCount = detail.socialFollow.platforms.filter(
    (platform) => platform.verificationStatus === "verified",
  ).length;
  const socialTotal = detail.socialFollow.platforms.length || 3;

  return (
    <AdminShell session={session}>
      <div className="mb-4">
        <Link
          href="/admin/applications"
          className="text-body-sm text-accent underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
        >
          Back to applications
        </Link>
      </div>

      <header className="space-y-2">
        <p className="text-caption font-semibold uppercase tracking-wide text-text-muted">
          {COMPETITION_NAME}
        </p>
        <h1 className="text-h2 text-text-primary">{detail.referenceId}</h1>
        <p className="text-body text-text-secondary">
          {detail.player.fullName} · eFootball {detail.gaming.gamerTag}
        </p>
      </header>

      <section
        aria-label="Application stage summary"
        className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
      >
        {[
          {
            title: "Application",
            value: formatApplicationStatusLabel(detail.status),
          },
          {
            title: "Identity",
            value: formatIdentityStatusLabel(detail.identity.status),
          },
          {
            title: "Social",
            value: `${verifiedSocialCount} / ${socialTotal} verified · ${formatSocialStatusLabel(detail.socialFollow.status)}`,
          },
          {
            title: "Selection",
            value: participant?.status
              ? participant.status.replace(/_/g, " ")
              : "Not selected",
          },
        ].map((item) => (
          <div
            key={item.title}
            className="rounded-xl border border-border bg-surface p-4"
          >
            <p className="text-caption uppercase tracking-wide text-text-muted">
              {item.title}
            </p>
            <p className="mt-1 text-body font-semibold text-text-primary">
              {item.value}
            </p>
          </div>
        ))}
      </section>

      <section className="mt-8 space-y-4" aria-labelledby="actions-heading">
        <h2 id="actions-heading" className="text-h3 text-text-primary">
          Review actions
        </h2>
        <p className="text-body-sm text-text-secondary">
          Only actions your role is authorized to perform are shown. Server-side
          permission checks remain authoritative.
        </p>
        <div className="grid gap-6 lg:grid-cols-2">
          <ApplicationStatusActions
            referenceId={detail.referenceId}
            currentStatus={detail.status}
            canChange={canStatus}
          />
          {detail.identity.status === "pending_review" ? (
            <IdentityReviewActions
              referenceId={detail.referenceId}
              canReview={canReview}
            />
          ) : (
            <div className="rounded-xl border border-border bg-surface p-4">
              <h3 className="text-h3">Identity review</h3>
              <p className="mt-2 text-body-sm text-text-muted">
                Identity review is complete (
                {formatIdentityStatusLabel(detail.identity.status)}).
              </p>
            </div>
          )}
          <SocialFollowReviewActions
            referenceId={detail.referenceId}
            socialFollowStatus={detail.socialFollow.status}
            attestation={detail.socialFollow.attestation}
            platforms={detail.socialFollow.platforms}
            canReview={canSocialReview}
          />
          <TournamentEligibilityPanel
            referenceId={detail.referenceId}
            canEvaluate={canEvaluate}
            canSelect={canSelect}
            initialParticipantId={participant?.participantId}
            initialParticipantStatus={participant?.status}
            initialSocialFollowStatus={detail.socialFollow.status}
          />
        </div>
      </section>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-surface-elevated p-4">
          <h2 className="text-h3">Applicant</h2>
          <dl className="mt-3 space-y-2 text-body-sm">
            <div>
              <dt className="text-text-muted">Name</dt>
              <dd>{detail.player.fullName}</dd>
            </div>
            <div>
              <dt className="text-text-muted">Email</dt>
              <dd>{detail.player.email}</dd>
            </div>
            <div>
              <dt className="text-text-muted">Phone</dt>
              <dd>{detail.player.phone}</dd>
            </div>
            <div>
              <dt className="text-text-muted">Date of birth</dt>
              <dd>{detail.player.dateOfBirth}</dd>
            </div>
            <div>
              <dt className="text-text-muted">Location</dt>
              <dd>
                {detail.player.city}, {detail.player.country}
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-xl border border-border bg-surface-elevated p-4">
          <h2 className="text-h3">Application</h2>
          <dl className="mt-3 space-y-2 text-body-sm">
            <div>
              <dt className="text-text-muted">Reference</dt>
              <dd>{detail.referenceId}</dd>
            </div>
            <div>
              <dt className="text-text-muted">Submitted</dt>
              <dd>{new Date(detail.createdAt).toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-text-muted">Status</dt>
              <dd>{formatApplicationStatusLabel(detail.status)}</dd>
            </div>
            <div>
              <dt className="text-text-muted">eFootball</dt>
              <dd>{detail.gaming.gamerTag}</dd>
            </div>
            <div>
              <dt className="text-text-muted">Platform</dt>
              <dd>{detail.gaming.platform}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-xl border border-border bg-surface-elevated p-4">
          <h2 className="text-h3">Identity</h2>
          <dl className="mt-3 space-y-2 text-body-sm">
            <div>
              <dt className="text-text-muted">Type</dt>
              <dd>{detail.identity.identificationType}</dd>
            </div>
            <div>
              <dt className="text-text-muted">Number</dt>
              <dd className="font-mono">
                {detail.identity.identificationNumberMasked}
              </dd>
              {canReveal ? (
                <RevealIdentityButton referenceId={detail.referenceId} />
              ) : null}
            </div>
            <div>
              <dt className="text-text-muted">Status</dt>
              <dd>{formatIdentityStatusLabel(detail.identity.status)}</dd>
            </div>
            <div>
              <dt className="text-text-muted">Reviewer notes</dt>
              <dd className="whitespace-pre-wrap">
                {detail.identity.notes || "—"}
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-body-sm text-text-muted">
            Identity verification is manual. Notes here are for admin use and
            are not shown on participant status cards.
          </p>
        </section>

        {detail.guardian !== undefined ? (
          <section className="rounded-xl border border-border bg-surface-elevated p-4">
            <h2 className="text-h3">Guardian</h2>
            {detail.guardian ? (
              <dl className="mt-3 space-y-2 text-body-sm">
                <div>
                  <dt className="text-text-muted">Name</dt>
                  <dd>{detail.guardian.fullName}</dd>
                </div>
                <div>
                  <dt className="text-text-muted">Relationship</dt>
                  <dd>{detail.guardian.relationship}</dd>
                </div>
                <div>
                  <dt className="text-text-muted">Email</dt>
                  <dd>{detail.guardian.email}</dd>
                </div>
                <div>
                  <dt className="text-text-muted">Phone</dt>
                  <dd>{detail.guardian.phone}</dd>
                </div>
              </dl>
            ) : (
              <p className="mt-3 text-body-sm text-text-muted">
                No guardian record for this application.
              </p>
            )}
          </section>
        ) : null}

        {detail.photo ? (
          <section className="rounded-xl border border-border bg-surface-elevated p-4">
            <h2 className="text-h3">Player photo</h2>
            {detail.photo.available ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={detail.photo.accessPath}
                alt={`Player photo for ${detail.referenceId}`}
                className="mt-3 max-h-80 rounded-lg border border-border object-contain"
              />
            ) : (
              <p className="mt-3 text-body-sm text-text-muted">Photo unavailable.</p>
            )}
          </section>
        ) : null}

        <section className="rounded-xl border border-border bg-surface-elevated p-4">
          <h2 className="text-h3">Consents</h2>
          <ul className="mt-3 space-y-1 text-body-sm">
            <li>Rules: {detail.consents.rules ? "yes" : "no"}</li>
            <li>Terms: {detail.consents.terms ? "yes" : "no"}</li>
            <li>Privacy: {detail.consents.privacy ? "yes" : "no"}</li>
            <li>Code of conduct: {detail.consents.codeOfConduct ? "yes" : "no"}</li>
            <li>Media: {detail.consents.mediaConsent ? "yes" : "no"}</li>
            <li>
              Accepted: {new Date(detail.consents.acceptedAt).toLocaleString()}
            </li>
          </ul>
        </section>
      </div>

      {canAudit ? (
        <section className="mt-10" aria-labelledby="history-heading">
          <h2 id="history-heading" className="text-h3 text-text-primary">
            Application history
          </h2>
          {audit.items.length === 0 ? (
            <p className="mt-3 text-body-sm text-text-muted">
              No audit events recorded for this application yet.
            </p>
          ) : (
            <ol className="mt-4 space-y-3">
              {audit.items.map((event) => (
                <li
                  key={event.id}
                  className="border-t border-border pt-3 first:border-0 first:pt-0"
                >
                  <p className="text-body-sm font-medium text-text-primary">
                    {formatAuditEventLabel(event.eventType)}
                  </p>
                  <p className="text-body-sm text-text-muted">
                    {new Date(event.createdAt).toLocaleString()}
                    {event.actorRole ? ` · ${event.actorRole}` : ""}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </section>
      ) : null}
    </AdminShell>
  );
}
