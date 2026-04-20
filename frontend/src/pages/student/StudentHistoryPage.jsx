import { useEffect, useState } from "react";
import { apiRequest } from "../../lib/api.js";
import LoadingBlock from "../../components/LoadingBlock.jsx";
import EmptyState from "../../components/EmptyState.jsx";
import SectionCard from "../../components/SectionCard.jsx";
import StatCard from "../../components/StatCard.jsx";
import StatusPill from "../../components/StatusPill.jsx";

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function formatDateLabel(dateInput) {
  return new Date(dateInput).toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function formatTransactionDate(dateInput) {
  return new Date(dateInput).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function groupByDate(entries) {
  return entries.reduce((groups, entry) => {
    const dateKey = new Date(entry.mealDate).toISOString().slice(0, 10);
    groups[dateKey] = groups[dateKey] || [];
    groups[dateKey].push(entry);
    return groups;
  }, {});
}

export default function StudentHistoryPage() {
  const [history, setHistory] = useState([]);
  const [pointsBalance, setPointsBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hoveredStars, setHoveredStars] = useState({});
  const [submittingRatings, setSubmittingRatings] = useState({});
  const [ratingErrors, setRatingErrors] = useState({});

  useEffect(() => {
    async function loadPage() {
      setLoading(true);
      setError("");

      try {
        const [historyResponse, pointsResponse] = await Promise.all([
          apiRequest("/student/meal-history"),
          apiRequest("/student/points/history")
        ]);

        setHistory(historyResponse.history);
        setPointsBalance(pointsResponse.pointsBalance);
        setTransactions(pointsResponse.transactions.slice(0, 10));
      } catch (requestError) {
        setError(requestError.message || "Unable to load your history.");
      } finally {
        setLoading(false);
      }
    }

    loadPage();
  }, []);

  async function submitRating(menuEntryId, rating) {
    setSubmittingRatings((current) => ({ ...current, [menuEntryId]: true }));
    setRatingErrors((current) => ({ ...current, [menuEntryId]: "" }));

    try {
      await apiRequest("/student/ratings", {
        method: "POST",
        body: JSON.stringify({ menuEntryId, rating })
      });

      setHistory((current) =>
        current.map((entry) => (entry.id === menuEntryId ? { ...entry, rating } : entry))
      );
    } catch (requestError) {
      setRatingErrors((current) => ({
        ...current,
        [menuEntryId]: requestError.message || "Unable to save rating."
      }));
    } finally {
      setSubmittingRatings((current) => ({ ...current, [menuEntryId]: false }));
      setHoveredStars((current) => ({ ...current, [menuEntryId]: null }));
    }
  }

  if (loading) {
    return <LoadingBlock label="Loading meal history and points timeline..." />;
  }

  if (error) {
    return <EmptyState title="History unavailable" description={error} />;
  }

  const today = startOfToday();
  const pastHistory = history
    .filter((entry) => new Date(entry.mealDate) < today)
    .sort((a, b) => new Date(b.mealDate).getTime() - new Date(a.mealDate).getTime());

  const groupedHistory = Object.entries(groupByDate(pastHistory));

  return (
    <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
      <SectionCard title="Meal timeline" eyebrow="History Feed">
        {pastHistory.length ? (
          <div className="space-y-6">
            {groupedHistory.map(([dateKey, entries]) => (
              <section key={dateKey} className="space-y-4">
                <div className="rounded-[1.25rem] bg-brand-ink/5 px-4 py-3">
                  <h3 className="font-display text-xl text-brand-ink">{formatDateLabel(entries[0].mealDate)}</h3>
                </div>

                {entries.map((entry) => {
                  const hoveredStar = hoveredStars[entry.id] ?? null;
                  const isSubmitting = Boolean(submittingRatings[entry.id]);
                  const isRated = Boolean(entry.rating);

                  return (
                    <article key={entry.id} className="rounded-[1.75rem] border border-brand-ink/10 bg-white/70 p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-teal">{entry.mealType}</p>
                          <h4 className="mt-2 font-display text-2xl text-brand-ink">{entry.title}</h4>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {entry.items.map((item, index) => (
                          <span key={`${entry.id}-${item}-${index}`} className="rounded-full bg-brand-ink/5 px-3 py-1.5 text-sm text-brand-ink">
                            {item}
                          </span>
                        ))}
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <StatusPill tone={entry.optedOut ? "success" : "neutral"}>
                          {entry.optedOut ? "Opted out" : "Not opted out"}
                        </StatusPill>
                        <StatusPill tone={entry.attended ? "success" : "neutral"}>
                          {entry.attended ? "Attended" : "Not marked"}
                        </StatusPill>
                      </div>

                      <div className="mt-4">
                        {isRated ? (
                          <div className="flex items-center gap-1">
                            {Array.from({ length: 5 }, (_, index) => (
                              <span
                                key={`${entry.id}-rated-${index + 1}`}
                                className={`text-xl ${index + 1 <= entry.rating ? "text-brand-gold" : "text-brand-ink/20"}`}
                              >
                                {"\u2605"}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <div
                            className="flex items-center gap-1"
                            onMouseLeave={() => setHoveredStars((current) => ({ ...current, [entry.id]: null }))}
                          >
                            {Array.from({ length: 5 }, (_, index) => {
                              const starValue = index + 1;
                              const isHighlighted = starValue <= (hoveredStar ?? 0);

                              return (
                                <button
                                  key={`${entry.id}-star-${starValue}`}
                                  type="button"
                                  disabled={isSubmitting}
                                  onMouseEnter={() => setHoveredStars((current) => ({ ...current, [entry.id]: starValue }))}
                                  onClick={() => submitRating(entry.id, starValue)}
                                  className={`${isHighlighted ? "text-brand-gold" : "text-brand-ink/20"} text-xl transition disabled:cursor-not-allowed disabled:opacity-60`}
                                >
                                  {"\u2605"}
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {ratingErrors[entry.id] ? (
                          <p className="mt-2 text-sm text-brand-coral">{ratingErrors[entry.id]}</p>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </section>
            ))}
          </div>
        ) : (
          <EmptyState title="No meal history yet" description="Your past meals, attendance, and ratings will show up here." />
        )}
      </SectionCard>

      <div className="space-y-6 xl:sticky xl:top-6 xl:self-start">
        <SectionCard title="Points summary" eyebrow="Wallet">
          <p className="text-sm text-brand-ink/60">Current points balance</p>
          <p className="mt-3 font-display text-4xl text-brand-teal">{pointsBalance}</p>
          <p className="mt-3 text-sm leading-6 text-brand-ink/70">
            Points earned from early opt-outs and spent on extras.
          </p>
        </SectionCard>

        <StatCard
          label="Recent Activity"
          value={transactions.length}
          hint="Transactions shown in the latest ledger snapshot."
          tone="gold"
        />

        <SectionCard title="Recent transactions" eyebrow="Points Summary">
          {transactions.length ? (
            <div className="space-y-3">
              {transactions.map((transaction) => (
                <article key={transaction.id} className="rounded-[1.75rem] border border-brand-ink/10 bg-white/70 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-brand-ink">{transaction.description}</p>
                      <p className="mt-1 text-xs text-brand-ink/50">{formatTransactionDate(transaction.createdAt)}</p>
                    </div>
                    <span className={`text-sm font-bold ${transaction.points > 0 ? "text-brand-teal" : "text-brand-coral"}`}>
                      {transaction.points > 0 ? `+${transaction.points}` : transaction.points}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState title="No points movement yet" description="Points earned and spent will appear here once activity starts." />
          )}
        </SectionCard>
      </div>
    </div>
  );
}
