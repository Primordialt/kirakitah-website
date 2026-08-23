import { esportsIntro } from "@/config/esports";
import { SectionShell } from "./SectionShell";

export function TournamentIntro() {
  return (
    <SectionShell
      className="bg-surface/50"
      ariaLabelledby="esports-intro-heading"
    >
      <div className="mx-auto max-w-3xl text-center">
        <h2
          id="esports-intro-heading"
          className="sr-only"
        >
          About KIRAKITAH Gaming
        </h2>
        <p className="text-body-lg text-text-primary">{esportsIntro.lead}</p>
        <p className="mt-6 text-body text-text-secondary">{esportsIntro.detail}</p>
      </div>
    </SectionShell>
  );
}
