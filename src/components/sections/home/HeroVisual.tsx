export function HeroVisual() {
  return (
    <div
      className="hero-visual pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
    >
      <div className="hero-grid absolute inset-0 opacity-40" />
      <div className="absolute top-1/4 -right-16 size-64 rounded-full bg-brand-primary/20 blur-3xl md:size-96" />
      <div className="absolute bottom-0 left-1/4 size-48 rounded-full bg-accent-secondary/10 blur-3xl md:size-72" />
      <div className="hero-orb hero-orb-1 absolute top-[18%] left-[12%] size-3 rounded-full bg-accent/60" />
      <div className="hero-orb hero-orb-2 absolute top-[42%] right-[18%] size-2 rounded-full bg-accent-secondary/50" />
      <div className="hero-orb hero-orb-3 absolute bottom-[28%] left-[38%] size-2.5 rounded-full bg-brand-primary/70" />
      <div className="hero-shape absolute top-[20%] right-[8%] hidden h-32 w-32 rotate-12 border border-border-interactive/40 md:block" />
      <div className="hero-shape absolute bottom-[22%] left-[6%] hidden h-24 w-24 -rotate-6 border border-brand-primary/30 md:block" />
      <div className="hero-trail absolute top-1/2 left-0 h-px w-full bg-gradient-to-r from-transparent via-brand-primary/40 to-transparent" />
    </div>
  );
}
