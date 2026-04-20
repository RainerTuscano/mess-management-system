import { useEffect, useState } from "react";
import { apiRequest } from "../../lib/api.js";
import { useAuth } from "../../context/AuthContext.jsx";
import EmptyState from "../../components/EmptyState.jsx";
import LoadingBlock from "../../components/LoadingBlock.jsx";
import SectionCard from "../../components/SectionCard.jsx";
import StatCard from "../../components/StatCard.jsx";
import StatusPill from "../../components/StatusPill.jsx";

const DEADLINE_COPY = {
  BREAKFAST: "Opt out by 9 PM the night before",
  LUNCH: "Opt out by 9 AM same day",
  SNACKS: "Opt out by 1 PM same day",
  DINNER: "Opt out by 4 PM same day"
};

const ALL_MEAL_TYPES = ["BREAKFAST", "LUNCH", "SNACKS", "DINNER"];

export default function StudentDashboardPage() {
  const { updateUser, user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [actionState, setActionState] = useState({});
  const [showLeavePanel, setShowLeavePanel] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedMealTypes, setSelectedMealTypes] = useState(ALL_MEAL_TYPES);
  const [leaveSubmitting, setLeaveSubmitting] = useState(false);
  const [leaveResult, setLeaveResult] = useState(null);
  const [leaveError, setLeaveError] = useState("");

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    try {
      const response = await apiRequest("/student/dashboard");
      setData(response);
      if (user) {
        updateUser({ ...user, pointsBalance: response.user.pointsBalance });
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleOptOut(mealType) {
    setActionState((current) => ({ ...current, [mealType]: true }));
    setMessage("");

    try {
      const response = await apiRequest("/student/opt-outs", {
        method: "POST",
        body: JSON.stringify({ mealType })
      });
      setMessage(response.optOut.isBeforeDeadline ? "Meal opted out and points credited." : "Meal opted out after deadline with no points.");
      await loadDashboard();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setActionState((current) => ({ ...current, [mealType]: false }));
    }
  }

  async function handleRedeem(extraItemId) {
    setActionState((current) => ({ ...current, [extraItemId]: true }));
    setMessage("");

    try {
      const response = await apiRequest("/student/redemptions", {
        method: "POST",
        body: JSON.stringify({ extraItemId })
      });
      setMessage(`Redemption created: ${response.redemption.redemptionCode}`);
      await loadDashboard();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setActionState((current) => ({ ...current, [extraItemId]: false }));
    }
  }

  function resetLeaveForm() {
    setFromDate("");
    setToDate("");
    setSelectedMealTypes(ALL_MEAL_TYPES);
    setLeaveResult(null);
    setLeaveError("");
    setLeaveSubmitting(false);
  }

  function handleToggleLeavePanel() {
    setShowLeavePanel((current) => {
      if (!current) {
        setSelectedMealTypes(ALL_MEAL_TYPES);
      }
      return !current;
    });
  }

  function handleCancelLeavePanel() {
    resetLeaveForm();
    setShowLeavePanel(false);
  }

  function toggleMealType(mealType) {
    setSelectedMealTypes((current) =>
      current.includes(mealType)
        ? current.filter((value) => value !== mealType)
        : [...current, mealType]
    );
  }

  async function handleBulkOptOut() {
    setLeaveSubmitting(true);
    setLeaveError("");
    setLeaveResult(null);

    try {
      const response = await apiRequest("/student/opt-outs/bulk", {
        method: "POST",
        body: JSON.stringify({
          fromDate,
          toDate,
          mealTypes: selectedMealTypes
        })
      });

      setLeaveResult(response);
      if (user) {
        updateUser({ ...user, pointsBalance: response.newBalance });
      }
      await loadDashboard();
    } catch (error) {
      setLeaveError(error.message);
    } finally {
      setLeaveSubmitting(false);
    }
  }

  if (loading) {
    return <LoadingBlock label="Loading today's menu, points, and extras..." />;
  }

  if (!data) {
    return <EmptyState title="Dashboard unavailable" description={message || "The student dashboard could not be loaded."} />;
  }

  const nextMeal = data.meals.find((meal) => !meal.optOutStatus);
  const optedOutCount = data.meals.filter((meal) => meal.optOutStatus).length;
  const todayDate = new Date().toISOString().slice(0, 10);
  const todayLabel = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });

  return (
    <div className="space-y-6">
      {message ? (
        <div className="rounded-[1.75rem] border border-brand-teal/15 bg-white/80 px-5 py-4 text-sm font-medium text-brand-ink shadow-panel">
          {message}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Points" value={data.user.pointsBalance} hint="Your live balance after opt-outs and redemptions." tone="teal" />
        <StatCard label="Today" value={data.meals.length} hint="Meals currently scheduled in today's menu." tone="gold" />
        <StatCard
          label="Opted Out"
          value={optedOutCount}
          hint={nextMeal ? `Next active meal: ${nextMeal.mealType.toLowerCase()}.` : "All current meals already handled."}
          tone="ink"
        />
      </div>

      <SectionCard
        title="Today's meals"
        eyebrow="Daily Menu"
        action={
          <button
            type="button"
            onClick={handleToggleLeavePanel}
            className="rounded-full border border-brand-ink/10 px-4 py-2.5 text-sm font-semibold text-brand-ink transition hover:border-brand-teal hover:text-brand-teal"
          >
            Plan leave &rarr;
          </button>
        }
      >
        <p className="mt-1 text-sm text-brand-ink/60">{todayLabel}</p>

        {showLeavePanel ? (
          <div className="mb-6 rounded-[1.75rem] border border-brand-teal/20 bg-brand-mist/50 p-6">
            <div>
              <h3 className="font-display text-xl text-brand-ink">Opt out for a date range</h3>
              <p className="mt-2 text-sm leading-6 text-brand-ink/70">
                All meals before their deadline will earn 10 points. Past deadlines are logged but earn no points.
              </p>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-brand-ink">From date</span>
                <input
                  type="date"
                  min={todayDate}
                  value={fromDate}
                  onChange={(event) => {
                    setFromDate(event.target.value);
                    if (toDate && event.target.value && toDate < event.target.value) {
                      setToDate(event.target.value);
                    }
                  }}
                  className="w-full rounded-2xl border border-brand-ink/10 bg-white px-4 py-3 text-base outline-none transition focus:border-brand-teal focus:ring-4 focus:ring-brand-teal/10"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-brand-ink">To date</span>
                <input
                  type="date"
                  min={fromDate || todayDate}
                  value={toDate}
                  onChange={(event) => setToDate(event.target.value)}
                  className="w-full rounded-2xl border border-brand-ink/10 bg-white px-4 py-3 text-base outline-none transition focus:border-brand-teal focus:ring-4 focus:ring-brand-teal/10"
                />
              </label>
            </div>

            <div className="mt-5">
              <p className="mb-3 text-sm font-semibold text-brand-ink">Meal types</p>
              <div className="flex flex-wrap gap-3">
                {ALL_MEAL_TYPES.map((mealType) => {
                  const selected = selectedMealTypes.includes(mealType);

                  return (
                    <button
                      key={mealType}
                      type="button"
                      onClick={() => toggleMealType(mealType)}
                      className={
                        selected
                          ? "rounded-full border border-brand-teal bg-brand-teal px-4 py-2 text-sm font-semibold text-white cursor-pointer"
                          : "rounded-full border border-brand-ink/20 px-4 py-2 text-sm font-semibold text-brand-ink/60 cursor-pointer"
                      }
                    >
                      {mealType}
                    </button>
                  );
                })}
              </div>
            </div>

            {leaveResult ? (
              <div className="mt-4 rounded-2xl border border-brand-teal/20 bg-white px-5 py-4 font-semibold text-brand-teal">
                Done! {leaveResult.optedOut} meals opted out {"\u00b7"} {leaveResult.pointsEarned} points earned {"\u00b7"} New balance: {leaveResult.newBalance} pts
              </div>
            ) : null}

            {leaveError ? (
              <div className="mt-4 rounded-2xl bg-brand-coral/10 px-5 py-3 text-sm text-brand-coral">
                {leaveError}
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleBulkOptOut}
                disabled={!fromDate || !toDate || !selectedMealTypes.length || leaveSubmitting}
                className="rounded-full bg-brand-teal px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-ink disabled:cursor-not-allowed disabled:opacity-50"
              >
                {leaveSubmitting ? "Submitting..." : "Confirm opt-outs"}
              </button>
              <button
                type="button"
                onClick={handleCancelLeavePanel}
                className="rounded-full border border-brand-ink/10 px-4 py-2.5 text-sm font-semibold text-brand-ink transition hover:border-brand-teal hover:text-brand-teal"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-2">
          {data.meals.map((meal) => (
            <article key={meal.id} className="rounded-[1.75rem] border border-brand-ink/10 bg-white/70 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-teal">{meal.mealType}</p>
                  <h3 className="mt-2 font-display text-2xl text-brand-ink">{meal.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-brand-ink/70">{meal.description}</p>
                </div>
                <StatusPill tone={meal.optOutStatus ? (meal.optOutStatus.isBeforeDeadline ? "success" : "warning") : "neutral"}>
                  {meal.optOutStatus
                    ? meal.optOutStatus.isBeforeDeadline
                      ? `Opted out (+${meal.optOutStatus.pointsAwarded})`
                      : "Opted out late"
                    : "Still active"}
                </StatusPill>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {meal.items.map((item) => (
                  <span key={item} className="rounded-full bg-brand-ink/5 px-3 py-2 text-sm text-brand-ink/75">
                    {item}
                  </span>
                ))}
              </div>

              <div className="soft-divider mt-5 pt-4">
                <p className="text-xs uppercase tracking-[0.18em] text-brand-ink/45">{DEADLINE_COPY[meal.mealType]}</p>
                <button
                  type="button"
                  onClick={() => handleOptOut(meal.mealType)}
                  disabled={Boolean(meal.optOutStatus) || actionState[meal.mealType]}
                  className="mt-4 rounded-full bg-brand-teal px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-ink disabled:cursor-not-allowed disabled:bg-brand-ink/20 disabled:text-brand-ink/55"
                >
                  {meal.optOutStatus ? "Already opted out" : actionState[meal.mealType] ? "Submitting..." : "Opt out"}
                </button>
              </div>
            </article>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Extras you can redeem" eyebrow="Points Store">
        {data.extras.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.extras.map((item) => {
              const canRedeem = data.user.pointsBalance >= item.pointsCost;
              return (
                <article key={item.id} className="rounded-[1.75rem] border border-brand-ink/10 bg-white/70 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="font-display text-2xl text-brand-ink">{item.name}</h3>
                      <p className="mt-2 text-sm leading-6 text-brand-ink/70">{item.description || "Redeemable extra configured by admin."}</p>
                    </div>
                    <div className="rounded-full bg-brand-sand px-4 py-3 text-sm font-semibold text-brand-gold">{item.pointsCost} pts</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRedeem(item.id)}
                    disabled={!canRedeem || actionState[item.id]}
                    className="mt-5 rounded-full border border-brand-ink/10 px-4 py-2.5 text-sm font-semibold text-brand-ink transition hover:border-brand-teal hover:bg-brand-teal hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {actionState[item.id] ? "Redeeming..." : canRedeem ? "Redeem item" : "Need more points"}
                  </button>
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyState title="No extras listed yet" description="Admin-configured redeemable items will appear here once they are added." />
        )}
      </SectionCard>
    </div>
  );
}
