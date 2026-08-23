import { esportsHighlights } from "@/config/esports";
import { PlatformButtons } from "./PlatformButtons";
import { SectionShell } from "./SectionShell";

export function MatchHighlights() {
  return (
    <SectionShell ariaLabelledby="highlights-heading">
      <div className="flex flex-col gap-6 md:max-w-2xl">
        <h2 id="highlights-heading" className="text-h2 text-text-primary">
          {esportsHighlights.title}
        </h2>
        <p className="text-body-lg text-text-secondary">
          {esportsHighlights.copy}
        </p>
        <PlatformButtons platforms={esportsHighlights.platforms} />
      </div>
    </SectionShell>
  );
}
