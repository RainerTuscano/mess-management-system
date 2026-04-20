import { useEffect, useState } from "react";
import { apiRequest } from "../../lib/api.js";
import EmptyState from "../../components/EmptyState.jsx";
import LoadingBlock from "../../components/LoadingBlock.jsx";
import SectionCard from "../../components/SectionCard.jsx";
import StatusPill from "../../components/StatusPill.jsx";

export default function AdminExtrasPage() {
  const [extras, setExtras] = useState([]);
  const [form, setForm] = useState({ name: "", description: "", pointsCost: 20 });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadExtras();
  }, []);

  async function loadExtras() {
    setLoading(true);
    try {
      const response = await apiRequest("/admin/extras");
      setExtras(response.extras);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");

    try {
      await apiRequest("/admin/extras", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          pointsCost: Number(form.pointsCost)
        })
      });
      setForm({ name: "", description: "", pointsCost: 20 });
      setMessage("Extra item added.");
      await loadExtras();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleExtra(extra) {
    setMessage("");
    try {
      await apiRequest(`/admin/extras/${extra.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !extra.isActive })
      });
      await loadExtras();
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
      <SectionCard title="Add redeemable extra" eyebrow="Catalog Control">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-brand-ink">Item name</span>
            <input
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              className="w-full rounded-2xl border border-brand-ink/10 bg-white px-4 py-3 outline-none focus:border-brand-teal focus:ring-4 focus:ring-brand-teal/10"
              placeholder="Fruit bowl"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-brand-ink">Description</span>
            <textarea
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              className="min-h-28 w-full rounded-2xl border border-brand-ink/10 bg-white px-4 py-3 outline-none focus:border-brand-teal focus:ring-4 focus:ring-brand-teal/10"
              placeholder="Quick description for students"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-brand-ink">Points cost</span>
            <input
              type="number"
              min="1"
              value={form.pointsCost}
              onChange={(event) => setForm((current) => ({ ...current, pointsCost: event.target.value }))}
              className="w-full rounded-2xl border border-brand-ink/10 bg-white px-4 py-3 outline-none focus:border-brand-teal focus:ring-4 focus:ring-brand-teal/10"
            />
          </label>

          {message ? <p className="rounded-2xl bg-brand-mist px-4 py-3 text-sm text-brand-teal">{message}</p> : null}

          <button
            type="submit"
            disabled={submitting}
            className="rounded-full bg-brand-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-teal disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting ? "Saving..." : "Add extra"}
          </button>
        </form>
      </SectionCard>

      <SectionCard title="Current extras catalog" eyebrow="Redeemables">
        {loading ? (
          <LoadingBlock label="Loading extras catalog..." />
        ) : extras.length ? (
          <div className="space-y-4">
            {extras.map((extra) => (
              <article key={extra.id} className="rounded-[1.75rem] border border-brand-ink/10 bg-white/70 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-2xl text-brand-ink">{extra.name}</h3>
                      <StatusPill tone={extra.isActive ? "success" : "danger"}>{extra.isActive ? "Active" : "Inactive"}</StatusPill>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-brand-ink/70">{extra.description || "No description provided."}</p>
                  </div>
                  <div className="rounded-full bg-brand-sand px-4 py-2 text-sm font-semibold text-brand-gold">{extra.pointsCost} pts</div>
                </div>
                <button
                  type="button"
                  onClick={() => toggleExtra(extra)}
                  className="mt-5 rounded-full border border-brand-ink/10 px-4 py-2.5 text-sm font-semibold text-brand-ink transition hover:border-brand-coral hover:bg-brand-coral hover:text-white"
                >
                  {extra.isActive ? "Deactivate" : "Activate"}
                </button>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState title="No extras configured" description="Add the first redeemable item and it will appear here for admin control." />
        )}
      </SectionCard>
    </div>
  );
}
