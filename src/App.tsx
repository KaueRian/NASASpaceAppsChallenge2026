export function App() {
  return (
    <main className="min-h-screen bg-bg text-text flex items-center justify-center p-6">
      <section className="max-w-xl w-full bg-surface text-text rounded-sm p-10 border border-border">
        <p className="font-mono text-xs tracking-widest uppercase text-text-muted mb-3">
          NASA Space Apps Challenge 2026 · Vilhena, RO
        </p>
        <h1 className="font-display text-4xl mb-4">EarthTrend Detective</h1>
        <p className="font-sans text-sm text-text-muted leading-relaxed mb-8">
          R0 Foundation shell deployed. Climate trend forensics powered by NASA POWER / MERRA-2
          monthly records (1981–2025), Mann-Kendall significance testing, and Sen&apos;s Slope.
        </p>
        <div className="border-t border-border pt-4">
          <span className="font-mono text-xs uppercase tracking-wide text-accent">
            Foundation active · R0
          </span>
        </div>
      </section>
    </main>
  );
}
