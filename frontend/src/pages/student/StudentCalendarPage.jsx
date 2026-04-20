import { useEffect, useState } from "react";
import { apiRequest } from "../../lib/api.js";
import LoadingBlock from "../../components/LoadingBlock.jsx";
import EmptyState from "../../components/EmptyState.jsx";
import StatusPill from "../../components/StatusPill.jsx";

const MEAL_TYPES = ["BREAKFAST", "LUNCH", "SNACKS", "DINNER"];
const MEAL_SHORT = {
  BREAKFAST: "B",
  LUNCH: "L",
  SNACKS: "S",
  DINNER: "D"
};

function startOfDay(dateInput) {
  const date = new Date(dateInput);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(dateInput, days) {
  const date = new Date(dateInput);
  date.setDate(date.getDate() + days);
  return date;
}

function formatDateKey(dateInput) {
  const date = new Date(dateInput);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getMealKey(dateInput, mealType) {
  return `${formatDateKey(dateInput)}-${mealType}`;
}

function formatFullDate(dateInput) {
  return new Date(dateInput).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

function buildMealMap(history, dashboardMeals) {
  const map = {};

  for (const entry of history) {
    map[getMealKey(entry.mealDate, entry.mealType)] = {
      ...entry,
      pointsAwarded: entry.optedOut ? 10 : null,
      source: "history"
    };
  }

  for (const meal of dashboardMeals) {
    map[getMealKey(meal.mealDate, meal.mealType)] = {
      ...meal,
      optedOut: Boolean(meal.optOutStatus),
      pointsAwarded: meal.optOutStatus?.pointsAwarded ?? null,
      source: "dashboard"
    };
  }

  return map;
}

function getMealStatusTone(meal) {
  if (!meal?.optedOut) {
    return "neutral";
  }

  return meal.pointsAwarded > 0 ? "success" : "warning";
}

function getMealStatusLabel(meal) {
  if (!meal?.optedOut) {
    return "Not opted out";
  }

  return meal.pointsAwarded > 0 ? `Opted out (+${meal.pointsAwarded} pts)` : "Opted out late";
}

function getDotClass(meal) {
  if (!meal) {
    return "bg-transparent";
  }

  if (meal.optedOut) {
    return meal.pointsAwarded > 0 ? "bg-brand-teal" : "bg-brand-gold";
  }

  return "bg-brand-ink/15";
}

function getMonthGrid(monthDate) {
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const gridStart = addDays(firstDay, -startOffset);

  return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
}

export default function StudentCalendarPage() {
  const [mealMap, setMealMap] = useState({});
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDayKey, setSelectedDayKey] = useState("");
  const [actionState, setActionState] = useState({});
  const [error, setError] = useState("");
  const [monthDate, setMonthDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  useEffect(() => {
    loadCalendarData();
  }, []);

  async function loadCalendarData() {
    setLoading(true);
    setError("");

    const [historyResult, dashboardResult] = await Promise.allSettled([
      apiRequest("/student/meal-history"),
      apiRequest("/student/dashboard")
    ]);

    const history = historyResult.status === "fulfilled" ? historyResult.value.history : [];
    const dashboard = dashboardResult.status === "fulfilled" ? dashboardResult.value : null;

    if (historyResult.status === "rejected" && dashboardResult.status === "rejected") {
      setError(historyResult.reason?.message || dashboardResult.reason?.message || "Unable to load the calendar.");
      setLoading(false);
      return;
    }

    setDashboardData(dashboard);
    setMealMap(buildMealMap(history, dashboard?.meals || []));
    setLoading(false);
  }

  async function refreshDashboardData() {
    const response = await apiRequest("/student/dashboard");
    setDashboardData(response);
    setMealMap((current) => buildMealMap(
      Object.values(current).filter((entry) => entry.source === "history"),
      response.meals
    ));
  }

  async function handleOptOut(mealType) {
    setActionState((current) => ({ ...current, [mealType]: true }));

    try {
      await apiRequest("/student/opt-outs", {
        method: "POST",
        body: JSON.stringify({ mealType })
      });
      await refreshDashboardData();
    } catch (requestError) {
      setError(requestError.message || "Unable to opt out right now.");
    } finally {
      setActionState((current) => ({ ...current, [mealType]: false }));
    }
  }

  if (loading) {
    return <LoadingBlock label="Loading calendar..." />;
  }

  if (error && !dashboardData && !Object.keys(mealMap).length) {
    return <EmptyState title="Calendar unavailable" description={error} />;
  }

  const today = startOfDay(new Date());
  const todayKey = formatDateKey(today);
  const monthGrid = getMonthGrid(monthDate);
  const selectedDate = selectedDayKey ? startOfDay(selectedDayKey) : null;
  const selectedMeals = selectedDate
    ? MEAL_TYPES.map((mealType) => mealMap[getMealKey(selectedDate, mealType)]).filter(Boolean)
    : [];
  const isSelectedToday = selectedDate && formatDateKey(selectedDate) === todayKey;
  const monthLabel = monthDate.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric"
  });

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-[1.75rem] border border-brand-coral/20 bg-brand-coral/10 px-5 py-4 text-sm text-brand-coral">
          {error}
        </div>
      ) : null}

      <div className="rounded-[1.75rem] border border-brand-ink/10 bg-white/70 p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <h2 className="font-display text-3xl text-brand-ink">{monthLabel}</h2>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setMonthDate((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
              className="rounded-full border border-brand-ink/10 px-4 py-2.5 text-sm font-semibold text-brand-ink transition hover:border-brand-teal hover:text-brand-teal"
            >
              &larr; Prev
            </button>
            <button
              type="button"
              onClick={() => setMonthDate((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
              className="rounded-full border border-brand-ink/10 px-4 py-2.5 text-sm font-semibold text-brand-ink transition hover:border-brand-teal hover:text-brand-teal"
            >
              Next &rarr;
            </button>
            <button
              type="button"
              onClick={() => setMonthDate(new Date(today.getFullYear(), today.getMonth(), 1))}
              className="rounded-full bg-brand-teal px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-ink"
            >
              Today
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-[0.18em] text-brand-ink/45">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((weekday) => (
            <div key={weekday} className="py-2">{weekday}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {monthGrid.map((date) => {
            const dayKey = formatDateKey(date);
            const isCurrentMonth = date.getMonth() === monthDate.getMonth();
            const isToday = dayKey === todayKey;
            const isSelected = dayKey === selectedDayKey;

            if (!isCurrentMonth) {
              return (
                <div key={dayKey} className="min-h-32 rounded-[1.5rem] border border-brand-ink/5 bg-white/30 p-3 text-brand-ink/20">
                  <span className="text-sm font-semibold">{date.getDate()}</span>
                </div>
              );
            }

            return (
              <button
                key={dayKey}
                type="button"
                onClick={() => setSelectedDayKey((current) => (current === dayKey ? "" : dayKey))}
                className={`min-h-32 rounded-[1.5rem] border p-3 text-left transition ${
                  isSelected
                    ? "border-brand-teal bg-brand-mist/60"
                    : "border-brand-ink/10 bg-white/70 hover:border-brand-teal/40"
                }`}
              >
                {isToday ? (
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand-teal text-sm font-bold text-white">
                    {date.getDate()}
                  </span>
                ) : (
                  <span className={`text-sm ${isSelected ? "font-bold text-brand-ink" : "font-semibold text-brand-ink/80"}`}>
                    {date.getDate()}
                  </span>
                )}

                <div className="mt-12 grid w-fit grid-cols-2 gap-1">
                  {MEAL_TYPES.map((mealType) => (
                    <span
                      key={`${dayKey}-${mealType}`}
                      title={MEAL_SHORT[mealType]}
                      className={`h-2 w-2 rounded-sm ${getDotClass(mealMap[getMealKey(date, mealType)])}`}
                    />
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        {selectedDate ? (
          <div className="animate-rise mt-4 rounded-[1.75rem] border border-brand-ink/10 bg-white/90 p-6">
            <h3 className="font-display text-2xl text-brand-ink">{formatFullDate(selectedDate)}</h3>

            {!selectedMeals.length ? (
              <p className="mt-4 text-sm text-brand-ink/60">Menu not yet available for this day.</p>
            ) : (
              <div className="mt-5 space-y-4">
                {MEAL_TYPES.map((mealType) => {
                  const meal = mealMap[getMealKey(selectedDate, mealType)];

                  if (!meal) {
                    return null;
                  }

                  return (
                    <article key={`${selectedDayKey}-${mealType}`} className="rounded-[1.75rem] border border-brand-ink/10 bg-white/70 p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-teal">{meal.mealType}</p>
                          <h4 className="mt-2 font-display text-2xl text-brand-ink">{meal.title}</h4>
                        </div>
                        <StatusPill tone={getMealStatusTone(meal)}>
                          {getMealStatusLabel(meal)}
                        </StatusPill>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {(meal.items || []).map((item, index) => (
                          <span key={`${meal.id}-${item}-${index}`} className="rounded-full bg-brand-ink/5 px-3 py-1.5 text-sm text-brand-ink">
                            {item}
                          </span>
                        ))}
                      </div>

                      {isSelectedToday ? (
                        <button
                          type="button"
                          onClick={() => handleOptOut(meal.mealType)}
                          disabled={Boolean(meal.optOutStatus || meal.optedOut) || actionState[meal.mealType]}
                          className="mt-5 rounded-full bg-brand-teal px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-ink disabled:cursor-not-allowed disabled:bg-brand-ink/20 disabled:text-brand-ink/55"
                        >
                          {meal.optOutStatus || meal.optedOut ? "Already opted out" : actionState[meal.mealType] ? "Submitting..." : "Opt out"}
                        </button>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
