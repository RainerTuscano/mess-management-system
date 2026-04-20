export default function StatusPill({ children, tone = "neutral" }) {
  const tones = {
    neutral: "border-brand-ink/10 bg-white text-brand-ink/70",
    success: "border-brand-teal/20 bg-brand-mist text-brand-teal",
    warning: "border-brand-gold/20 bg-brand-sand text-brand-gold",
    danger: "border-brand-coral/20 bg-brand-coral/10 text-brand-coral"
  };

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${tones[tone]}`}>
      {children}
    </span>
  );
}
