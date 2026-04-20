export default function SectionCard({ title, eyebrow, action, children }) {
  return (
    <section className="metric-card">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-teal">{eyebrow}</p> : null}
          <h2 className="mt-1 font-display text-2xl text-brand-ink">{title}</h2>
        </div>
        {action}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}
