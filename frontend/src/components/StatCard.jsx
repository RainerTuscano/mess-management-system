export default function StatCard({ label, value, hint, tone = "teal" }) {
  const toneClasses = {
    teal: "bg-brand-mist text-brand-teal",
    gold: "bg-brand-sand text-brand-gold",
    coral: "bg-brand-coral/10 text-brand-coral",
    ink: "bg-brand-ink/10 text-brand-ink"
  };

  return (
    <div className="metric-card">
      <div className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${toneClasses[tone]}`}>
        {label}
      </div>
      <p className="mt-5 font-display text-4xl text-brand-ink">{value}</p>
      <p className="mt-2 text-sm leading-6 text-brand-ink/70">{hint}</p>
    </div>
  );
}
