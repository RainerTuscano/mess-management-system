export default function EmptyState({ title, description }) {
  return (
    <div className="rounded-[1.75rem] border border-dashed border-brand-ink/15 bg-white/60 px-5 py-10 text-center">
      <h3 className="font-display text-2xl text-brand-ink">{title}</h3>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-brand-ink/70">{description}</p>
    </div>
  );
}
