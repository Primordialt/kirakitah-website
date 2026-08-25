import { beforeYouApplyCopy } from "@/config/eligibility-requirements";

export function BeforeYouApply() {
  const { title, lead, requirements, participationNote, qualificationNote } =
    beforeYouApplyCopy;

  return (
    <aside
      className="mb-8 rounded-2xl border-2 border-brand-primary bg-surface-elevated p-5 md:p-6"
      aria-labelledby="before-you-apply-heading"
    >
      <h2
        id="before-you-apply-heading"
        className="text-h4 text-text-primary"
      >
        {title}
      </h2>
      <p className="mt-3 text-body-sm text-text-secondary">{lead}</p>
      <ul className="mt-4 list-disc space-y-2 pl-5 text-body-sm text-text-primary">
        {requirements.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p className="mt-4 text-body-sm text-text-secondary">
        {participationNote}
      </p>
      <p className="mt-3 text-body-sm font-medium text-text-primary">
        {qualificationNote}
      </p>
    </aside>
  );
}
