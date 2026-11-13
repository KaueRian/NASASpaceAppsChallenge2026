export function App() {
  return (
    <main className="min-h-screen bg-[#12100E] text-[#E8DFC8] flex items-center justify-center p-6">
      <section className="max-w-xl w-full bg-[#E8DFC8] text-[#1A1714] rounded-sm shadow-2xl p-8 border border-[#D49B42]/40">
        <p className="font-mono text-xs tracking-widest uppercase text-[#B9382C] mb-2">
          NASA Space Apps Challenge 2026 · Vilhena, RO
        </p>
        <h1 className="font-serif text-3xl font-bold mb-3">EarthTrend Detective</h1>
        <p className="text-sm text-[#5C544A] leading-relaxed mb-6">
          R0 Foundation shell deployed. Climate trend forensics powered by NASA POWER / MERRA-2
          monthly records (1981–2025), Mann-Kendall significance testing, and Sen&apos;s Slope.
        </p>
        <div className="inline-block border-2 border-[#B9382C] text-[#B9382C] font-mono text-xs font-bold px-3 py-1 -rotate-2">
          FOUNDATION ACTIVE · R0
        </div>
      </section>
    </main>
  );
}
