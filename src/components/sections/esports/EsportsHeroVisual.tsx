export function EsportsHeroVisual() {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
    >
      <div className="hero-grid absolute inset-0 opacity-50" />
      <div className="absolute top-0 right-0 size-[28rem] rounded-full bg-brand-primary/25 blur-3xl" />
      <div className="absolute bottom-0 left-0 size-64 rounded-full bg-accent/10 blur-3xl md:size-80" />

      {/* Bracket-inspired geometry */}
      <div className="absolute top-[15%] right-[5%] hidden h-40 w-48 border border-brand-primary/30 md:block">
        <div className="absolute top-1/2 left-0 h-px w-full bg-brand-primary/40" />
        <div className="absolute top-1/4 left-1/2 h-1/2 w-px bg-brand-primary/40" />
      </div>
      <div className="absolute bottom-[18%] left-[4%] hidden h-32 w-40 border border-border-interactive/40 md:block">
        <div className="absolute top-1/3 left-0 h-px w-full bg-border-interactive/50" />
        <div className="absolute top-1/3 left-1/2 h-2/3 w-px bg-border-interactive/50" />
      </div>

      {/* Abstract football-inspired arc */}
      <div className="absolute top-[35%] left-[55%] size-24 rounded-full border border-accent/20 md:size-32" />
      <div className="absolute top-[38%] left-[58%] size-16 rounded-full border border-brand-primary/30 md:size-20" />

      <div className="hero-trail absolute top-1/2 left-0 h-px w-full bg-gradient-to-r from-transparent via-brand-primary/50 to-transparent" />
      <div className="hero-orb hero-orb-1 absolute top-[22%] left-[18%] size-2.5 rounded-full bg-accent/70" />
      <div className="hero-orb hero-orb-2 absolute top-[55%] right-[22%] size-2 rounded-full bg-brand-primary/80" />
    </div>
  );
}
