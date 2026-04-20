import { useEffect, useRef, useState } from "react";
import { apiRequest } from "../../lib/api.js";
import LoadingBlock from "../../components/LoadingBlock.jsx";
import EmptyState from "../../components/EmptyState.jsx";
import SectionCard from "../../components/SectionCard.jsx";

function formatLastUpdated(date) {
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

function formatTimeSince(dateInput) {
  const seconds = Math.max(1, Math.floor((Date.now() - new Date(dateInput).getTime()) / 1000));

  if (seconds < 60) {
    return `${seconds} second${seconds === 1 ? "" : "s"} ago`;
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }

  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export default function AdminRedemptionsPage() {
  const [redemptions, setRedemptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [fulfillingIds, setFulfillingIds] = useState({});
  const fulfillingIdsRef = useRef({});

  useEffect(() => {
    fulfillingIdsRef.current = fulfillingIds;
  }, [fulfillingIds]);

  useEffect(() => {
    let active = true;

    async function loadRedemptions(showLoading = false) {
      if (showLoading) {
        setLoading(true);
      }

      try {
        const response = await apiRequest("/admin/redemptions/active");
        if (!active) {
          return;
        }

        setRedemptions(response.redemptions.filter((redemption) => !fulfillingIdsRef.current[redemption.id]));
        setLastUpdated(new Date());
        setMessage("");
      } catch (error) {
        if (!active) {
          return;
        }

        setMessage(error.message || "Unable to load active tokens.");
      } finally {
        if (active && showLoading) {
          setLoading(false);
        }
      }
    }

    loadRedemptions(true);
    const intervalId = window.setInterval(() => {
      loadRedemptions(false);
    }, 30000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, []);

  async function handleFulfill(id) {
    setMessage("");
    setFulfillingIds((current) => ({ ...current, [id]: true }));

    try {
      await apiRequest(`/admin/redemptions/${id}/fulfill`, {
        method: "PATCH"
      });

      window.setTimeout(() => {
        setRedemptions((current) => current.filter((redemption) => redemption.id !== id));
        setFulfillingIds((current) => {
          const next = { ...current };
          delete next[id];
          return next;
        });
        setLastUpdated(new Date());
      }, 250);
    } catch (error) {
      setFulfillingIds((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      setMessage(error.message || "Unable to fulfill this token right now.");
    }
  }

  if (loading) {
    return <LoadingBlock label="Loading active redemption tokens..." />;
  }

  return (
    <SectionCard
      title="Active redemption tokens"
      eyebrow="Counter Desk"
      action={
        <p className="text-sm text-brand-ink/60">
          Last updated {lastUpdated ? formatLastUpdated(lastUpdated) : "--:--:--"}
        </p>
      }
    >
      <div className="space-y-5">
        {message ? (
          <div className="rounded-[1.75rem] border border-brand-coral/20 bg-brand-coral/10 px-5 py-4 text-sm font-semibold text-brand-coral">
            {message}
          </div>
        ) : null}

        {!redemptions.length ? (
          <EmptyState title="No active tokens" description="All redemptions have been fulfilled." />
        ) : (
          <div className="grid gap-4">
            {redemptions.map((redemption) => {
              const isFulfilling = Boolean(fulfillingIds[redemption.id]);

              return (
                <article
                  key={redemption.id}
                  className={`rounded-[1.75rem] border border-brand-ink/10 bg-white/70 p-5 transition-opacity duration-300 ${
                    isFulfilling ? "opacity-0" : "opacity-100"
                  }`}
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-teal">Student</p>
                        <h3 className="mt-2 text-xl font-semibold text-brand-ink">
                          {redemption.user.studentProfile?.fullName || "Student"}
                          <span className="text-brand-ink/55"> {" - "} {redemption.user.rollNumber}</span>
                        </h3>
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-gold">Redeemable</p>
                        <p className="mt-2 font-display text-3xl text-brand-ink">{redemption.extraItem.name}</p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-teal">Token code</p>
                        <div className="mt-2 rounded-2xl bg-brand-mist px-6 py-4">
                          <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-400 animate-pulse mr-2" />
                          <span className="font-mono text-3xl font-bold tracking-widest text-brand-ink">
                            {redemption.redemptionCode}
                          </span>
                        </div>
                      </div>

                      <p className="text-sm font-medium text-brand-ink/65">
                        Redeemed {formatTimeSince(redemption.redeemedAt)}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleFulfill(redemption.id)}
                      disabled={isFulfilling}
                      className="rounded-full bg-brand-teal px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-ink disabled:opacity-50"
                    >
                      {isFulfilling ? "Fulfilling..." : "Mark as fulfilled"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </SectionCard>
  );
}
