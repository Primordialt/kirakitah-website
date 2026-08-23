import { esportsWatch } from "@/config/esports";
import { PlatformButtons } from "./PlatformButtons";
import { SectionShell } from "./SectionShell";

export function WatchAction() {
  return (
    <SectionShell
      className="bg-surface/50"
      ariaLabelledby="watch-heading"
    >
      <div className="flex flex-col gap-6 md:max-w-2xl">
        <h2 id="watch-heading" className="text-h2 text-text-primary">
          {esportsWatch.title}
        </h2>
        <p className="text-body-lg text-text-secondary">{esportsWatch.copy}</p>
        <PlatformButtons platforms={esportsWatch.platforms} />
      </div>
    </SectionShell>
  );
}
