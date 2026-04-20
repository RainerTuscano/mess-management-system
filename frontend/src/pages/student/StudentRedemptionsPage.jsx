import { useEffect, useState } from "react";
import { apiRequest } from "../../lib/api.js";
import LoadingBlock from "../../components/LoadingBlock.jsx";
import EmptyState from "../../components/EmptyState.jsx";
import SectionCard from "../../components/SectionCard.jsx";
import StatusPill from "../../components/StatusPill.jsx";

function formatDateTime(dateInput) {
  const date = new Date(dateInput);
  const datePart = date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
  const timePart = date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit"
  });

  return `${datePart} at ${timePart}`;
}

function isExpiringSoon(dateInput) {
  const expiresAt = new Date(dateInput).getTime();
  const now = Date.now();
  return expiresAt > now && expiresAt - now <= 2 * 60 * 60 * 1000;
}

export default function StudentRedemptionsPage() {
  const [redemptions, setRedemptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadRedemptions() {
      setLoading(true);
      setError("");

      try {
        const response = await apiRequest("/student/redemptions");
        setRedemptions(response.redemptions);
      } catch (requestError) {
        setError(requestError.message || "Unable to load redemption history.");
      } finally {
        setLoading(false);
      }
    }

    loadRedemptions();
  }, []);

  if (loading) {
    return <LoadingBlock label="Loading redemption records..." />;
  }

  if (error) {
    return <EmptyState title="Redemptions unavailable" description={error} />;
  }

  const activeRedemptions = redemptions.filter((redemption) => redemption.status === "ACTIVE");
  const pastRedemptions = redemptions.filter((redemption) => redemption.status === "FULFILLED");

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <SectionCard title="Show at counter" eyebrow="Active Tokens">
        {activeRedemptions.length ? (
          <div className="space-y-4">
            {activeRedemptions.map((redemption) => (
              <article
                key={redemption.id}
                className="rounded-[1.75rem] border border-brand-ink/10 border-l-4 border-l-brand-teal bg-white/70 p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display text-2xl text-brand-ink">{redemption.extraItem.name}</h3>
                    <p className="mt-2 text-sm text-brand-ink/70">
                      Redeemed {formatDateTime(redemption.redeemedAt)}
                    </p>
                  </div>
                  <div className="rounded-full bg-brand-sand px-4 py-2 text-sm font-semibold text-brand-gold">
                    {redemption.pointsSpent} pts
                  </div>
                </div>

                <div className="mt-3 rounded-2xl bg-brand-mist px-5 py-4">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-400 animate-pulse mr-2 mb-0.5" />
                  <span className="font-mono text-2xl font-bold tracking-widest text-brand-ink">
                    {redemption.redemptionCode}
                  </span>
                </div>

                <p className={`mt-3 text-sm ${isExpiringSoon(redemption.expiresAt) ? "text-brand-coral" : "text-brand-ink/60"}`}>
                  Expires {formatDateTime(redemption.expiresAt)}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No active tokens"
            description="Redeem extras from the dashboard and your tokens will appear here."
          />
        )}
      </SectionCard>

      <SectionCard title="Past redemptions" eyebrow="History">
        {pastRedemptions.length ? (
          <div className="space-y-4">
            {pastRedemptions.map((redemption) => (
              <article key={redemption.id} className="rounded-[1.75rem] border border-brand-ink/10 bg-white/70 p-5 opacity-60">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display text-2xl text-brand-ink">{redemption.extraItem.name}</h3>
                    <p className="mt-2 rounded-2xl bg-brand-ink/5 px-5 py-4 font-mono text-xl font-bold tracking-widest text-brand-ink/60">
                      {redemption.redemptionCode}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill tone="neutral">Fulfilled</StatusPill>
                    <div className="rounded-full bg-brand-ink/5 px-4 py-2 text-sm font-semibold text-brand-ink/70">
                      {redemption.pointsSpent} pts
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="text-sm text-brand-ink/50">No past redemptions yet.</p>
        )}
      </SectionCard>
    </div>
  );
}
