export default function LoadingBlock({ label = "Loading..." }) {
  return (
    <div className="rounded-[1.75rem] border border-white/70 bg-white/70 px-5 py-10 text-center text-sm font-semibold text-brand-ink/65 shadow-panel">
      {label}
    </div>
  );
}
