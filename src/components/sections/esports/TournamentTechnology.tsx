import { esportsTechnology } from "@/config/esports";
import { SectionShell } from "./SectionShell";

export function TournamentTechnology() {
  return (
    <SectionShell ariaLabelledby="technology-heading">
      <div className="mx-auto max-w-3xl text-center">
        <h2
          id="technology-heading"
          className="text-h2 text-text-primary"
        >
          {esportsTechnology.title}
        </h2>
        <p className="mt-6 text-body-lg text-text-secondary">
          {esportsTechnology.copy}
        </p>
      </div>
    </SectionShell>
  );
}
