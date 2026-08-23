import { notFound } from "next/navigation";
import { AdminShell, loadAdminSession } from "@/components/admin/AdminShell";
import {
  ApplicationStatusActions,
  IdentityReviewActions,
  RevealIdentityButton,
} from "@/components/admin/ApplicationReviewActions";
import { getAdminApplicationDetail } from "@/server/admin/registration/service";
import { roleHasPermission } from "@/server/admin/authorization/permissions";
import { isRegistrationBackendConfigured } from "@/server/env";

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
  const canStatus = roleHasPermission(session.user.role, "applications:status");

  return (
    <AdminShell session={session}>
      <h1 className="text-h2">{detail.referenceId}</h1>
      <p className="mt-1 text-body text-text-secondary">
        {detail.player.fullName} · {detail.status} · identity{" "}
        {detail.identity.status}
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-surface-elevated p-4">
          <h2 className="text-h3">Player</h2>
          <dl className="mt-3 space-y-2 text-body-sm">
            <div>
              <dt className="text-text-muted">Name</dt>
              <dd>{detail.player.fullName}</dd>
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
            <div>
              <dt className="text-text-muted">Email</dt>
              <dd>{detail.player.email}</dd>
            </div>
            <div>
              <dt className="text-text-muted">Phone</dt>
              <dd>{detail.player.phone}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-xl border border-border bg-surface-elevated p-4">
          <h2 className="text-h3">Gaming</h2>
          <dl className="mt-3 space-y-2 text-body-sm">
            <div>
              <dt className="text-text-muted">Gamer tag</dt>
              <dd>{detail.gaming.gamerTag}</dd>
            </div>
            <div>
              <dt className="text-text-muted">Game</dt>
              <dd>{detail.gaming.game}</dd>
            </div>
            <div>
              <dt className="text-text-muted">Platform</dt>
              <dd>{detail.gaming.platform}</dd>
            </div>
            <div>
              <dt className="text-text-muted">Profile</dt>
              <dd>{detail.gaming.gamingProfile || "—"}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-xl border border-border bg-surface-elevated p-4">
          <h2 className="text-h3">Contact verification</h2>
          <dl className="mt-3 space-y-2 text-body-sm">
            <div>
              <dt className="text-text-muted">Email</dt>
              <dd>
                {detail.contactVerification.emailStatus}
                {detail.contactVerification.emailVerifiedAt
                  ? ` · ${new Date(detail.contactVerification.emailVerifiedAt).toLocaleString()}`
                  : ""}
              </dd>
            </div>
            <div>
              <dt className="text-text-muted">Phone</dt>
              <dd>
                {detail.contactVerification.phoneStatus}
                {detail.contactVerification.phoneVerifiedAt
                  ? ` · ${new Date(detail.contactVerification.phoneVerifiedAt).toLocaleString()}`
                  : ""}
              </dd>
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
              <dd>{detail.identity.status}</dd>
            </div>
            <div>
              <dt className="text-text-muted">Notes</dt>
              <dd className="whitespace-pre-wrap">
                {detail.identity.notes || "—"}
              </dd>
            </div>
          </dl>
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
                <div>
                  <dt className="text-text-muted">Consent at</dt>
                  <dd>{new Date(detail.guardian.consentAt).toLocaleString()}</dd>
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

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {detail.identity.status === "pending_review" ? (
          <IdentityReviewActions
            referenceId={detail.referenceId}
            canReview={canReview}
          />
        ) : (
          <p className="text-body-sm text-text-muted">
            Identity review is complete ({detail.identity.status}).
          </p>
        )}
        <ApplicationStatusActions
          referenceId={detail.referenceId}
          currentStatus={detail.status}
          canChange={canStatus}
        />
      </div>
    </AdminShell>
  );
}
