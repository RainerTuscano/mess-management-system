import { useEffect, useState } from "react";
import { apiRequest } from "../../lib/api.js";
import EmptyState from "../../components/EmptyState.jsx";
import LoadingBlock from "../../components/LoadingBlock.jsx";
import SectionCard from "../../components/SectionCard.jsx";
import StatusPill from "../../components/StatusPill.jsx";

const MEAL_TYPES = ["BREAKFAST", "LUNCH", "SNACKS", "DINNER"];
const MEAL_LABELS = {
  BREAKFAST: "Breakfast",
  LUNCH: "Lunch",
  SNACKS: "Snacks",
  DINNER: "Dinner"
};

function getWeekStart(dateInput) {
  const d = new Date(dateInput);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(dateInput, days) {
  const d = new Date(dateInput);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDateKey(dateInput) {
  const d = new Date(dateInput);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getEntryKey(mealDate, mealType) {
  return `${formatDateKey(mealDate)}-${mealType}`;
}

function formatMealTitle(mealType) {
  return `${MEAL_LABELS[mealType]} Menu`;
}

function createDefaultEntry(mealDate, mealType) {
  return {
    mealDate: new Date(mealDate).toISOString(),
    mealType,
    title: formatMealTitle(mealType),
    description: "",
    items: ["TBD"]
  };
}

function createDefaultWeekEntries(weekStart) {
  const entries = {};

  for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
    const mealDate = addDays(weekStart, dayIndex);
    for (const mealType of MEAL_TYPES) {
      const entry = createDefaultEntry(mealDate, mealType);
      entries[getEntryKey(entry.mealDate, mealType)] = entry;
    }
  }

  return entries;
}

function normalizeWeekEntries(entries, weekStart) {
  const defaults = createDefaultWeekEntries(weekStart);

  for (const entry of entries) {
    defaults[getEntryKey(entry.mealDate, entry.mealType)] = {
      id: entry.id,
      mealDate: entry.mealDate,
      mealType: entry.mealType,
      title: entry.title,
      description: entry.description || "",
      items: Array.isArray(entry.items) && entry.items.length > 0 ? entry.items : ["TBD"]
    };
  }

  return defaults;
}

function buildWeekPayload(entriesByKey, weekStart) {
  const payload = [];

  for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
    const mealDate = addDays(weekStart, dayIndex);
    for (const mealType of MEAL_TYPES) {
      const entry = entriesByKey[getEntryKey(mealDate, mealType)] || createDefaultEntry(mealDate, mealType);
      payload.push({
        mealDate: new Date(entry.mealDate).toISOString(),
        mealType: entry.mealType,
        title: entry.title,
        description: entry.description,
        items: entry.items
      });
    }
  }

  return payload;
}

function parseItems(value) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatWeekRange(weekStart) {
  const weekEnd = addDays(weekStart, 6);
  const startLabel = weekStart.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric"
  });
  const endLabel = weekEnd.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });

  return `${startLabel} - ${endLabel}`;
}

export default function AdminMenuPage() {
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [week, setWeek] = useState(null);
  const [entriesByKey, setEntriesByKey] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingKey, setEditingKey] = useState("");
  const [formState, setFormState] = useState({ title: "", description: "", itemsText: "" });
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveNotice, setSaveNotice] = useState(null);
  const [showSaveNotice, setShowSaveNotice] = useState(false);

  const weekStart = getWeekStart(selectedDate);
  const weekStartIso = weekStart.toISOString();

  useEffect(() => {
    let cancelled = false;

    async function loadWeek() {
      setLoading(true);
      setError("");
      setWeek(null);
      setEntriesByKey({});
      setEditingKey("");
      setFormError("");

      try {
        const response = await apiRequest(`/admin/menus/week?date=${encodeURIComponent(weekStartIso)}`);
        if (cancelled) {
          return;
        }

        setWeek(response.week);
        setEntriesByKey(response.week ? normalizeWeekEntries(response.week.entries, weekStart) : {});
      } catch (requestError) {
        if (cancelled) {
          return;
        }

        setError(requestError.message || "Unable to load the weekly menu.");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadWeek();

    return () => {
      cancelled = true;
    };
  }, [weekStartIso]);

  useEffect(() => {
    if (!saveNotice) {
      return undefined;
    }

    setShowSaveNotice(true);
    const fadeTimer = window.setTimeout(() => {
      setShowSaveNotice(false);
    }, 2400);
    const clearTimer = window.setTimeout(() => {
      setSaveNotice(null);
    }, 3000);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(clearTimer);
    };
  }, [saveNotice]);

  function openEditor(entryKey) {
    const entry = entriesByKey[entryKey];
    if (!entry) {
      return;
    }

    setEditingKey(entryKey);
    setFormError("");
    setFormState({
      title: entry.title,
      description: entry.description || "",
      itemsText: entry.items.join("\n")
    });
  }

  function closeEditor() {
    if (saving) {
      return;
    }

    setEditingKey("");
    setFormError("");
    setFormState({ title: "", description: "", itemsText: "" });
  }

  function handleCreateWeek() {
    const freshEntries = createDefaultWeekEntries(weekStart);
    setWeek({
      id: null,
      weekStart: weekStartIso,
      entries: buildWeekPayload(freshEntries, weekStart)
    });
    setEntriesByKey(freshEntries);
    setError("");
  }

  async function handleSave(entryKey) {
    const title = formState.title.trim();
    const description = formState.description.trim();
    const items = parseItems(formState.itemsText);

    if (title.length < 3) {
      setFormError("Title must be at least 3 characters.");
      return;
    }

    if (items.length < 1) {
      setFormError("Add at least one menu item, one per line.");
      return;
    }

    const existingEntry = entriesByKey[entryKey];
    if (!existingEntry) {
      setFormError("This meal could not be found.");
      return;
    }

    const updatedEntry = {
      ...existingEntry,
      title,
      description,
      items
    };

    const nextEntriesByKey = {
      ...entriesByKey,
      [entryKey]: updatedEntry
    };

    setSaving(true);
    setFormError("");
    setEntriesByKey(nextEntriesByKey);

    try {
      const response = await apiRequest("/admin/menus/week", {
        method: "POST",
        body: JSON.stringify({
          weekStart: weekStartIso,
          entries: buildWeekPayload(nextEntriesByKey, weekStart)
        })
      });

      const normalizedEntries = normalizeWeekEntries(response.week.entries, weekStart);
      setWeek(response.week);
      setEntriesByKey(normalizedEntries);
      setEditingKey("");
      setFormState({ title: "", description: "", itemsText: "" });
      setSaveNotice({
        tone: "success",
        message: "Weekly menu saved successfully."
      });
    } catch (requestError) {
      setEntriesByKey((currentEntries) => ({
        ...currentEntries,
        [entryKey]: existingEntry
      }));
      setFormError(requestError.message || "Unable to save this meal right now.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <LoadingBlock label="Loading weekly menu..." />;
  }

  const action = (
    <div className="flex flex-wrap items-center justify-end gap-3">
      <button
        type="button"
        onClick={() => setSelectedDate((current) => addDays(current, -7))}
        className="rounded-full border border-brand-ink/10 px-4 py-2.5 text-sm font-semibold text-brand-ink transition hover:border-brand-teal hover:bg-brand-teal hover:text-white"
      >
        &larr; Previous week
      </button>
      <button
        type="button"
        onClick={() => setSelectedDate((current) => addDays(current, 7))}
        className="rounded-full border border-brand-ink/10 px-4 py-2.5 text-sm font-semibold text-brand-ink transition hover:border-brand-teal hover:bg-brand-teal hover:text-white"
      >
        Next week &rarr;
      </button>
    </div>
  );

  const daySections = Array.from({ length: 7 }, (_, dayIndex) => {
    const dayDate = addDays(weekStart, dayIndex);
    const dayEntries = MEAL_TYPES.map((mealType) => {
      const entryKey = getEntryKey(dayDate, mealType);
      return {
        entryKey,
        entry: entriesByKey[entryKey] || createDefaultEntry(dayDate, mealType)
      };
    });

    return {
      dayKey: formatDateKey(dayDate),
      dayLabel: dayDate.toLocaleDateString(undefined, {
        weekday: "long",
        month: "short",
        day: "numeric"
      }),
      entries: dayEntries
    };
  });

  return (
    <SectionCard
      title="Weekly menu planner"
      eyebrow="Menu Control"
      action={action}
    >
      <div className="space-y-5">
        <div className="flex flex-col gap-3 rounded-[1.75rem] border border-brand-ink/10 bg-white/70 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-teal">Displayed Week</p>
            <h3 className="mt-2 font-display text-2xl text-brand-ink">{formatWeekRange(weekStart)}</h3>
          </div>
          <StatusPill tone={week ? "success" : "warning"}>
            {week ? "Week menu loaded" : "No menu yet for this week"}
          </StatusPill>
        </div>

        {saveNotice ? (
          <div
            className={`rounded-[1.75rem] border px-5 py-4 text-sm font-semibold transition-opacity duration-500 ${
              saveNotice.tone === "success"
                ? "border-brand-teal/20 bg-brand-mist text-brand-teal"
                : "border-brand-coral/20 bg-brand-coral/10 text-brand-coral"
            } ${showSaveNotice ? "opacity-100" : "opacity-0"}`}
          >
            {saveNotice.message}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-[1.75rem] border border-brand-coral/20 bg-brand-coral/10 px-5 py-4 text-sm font-semibold text-brand-coral">
            {error}
          </div>
        ) : null}

        {!week && !error ? (
          <div className="space-y-4">
            <EmptyState
              title="No weekly menu yet"
              description="This week has not been created yet. Start with a full seven-day scaffold and then edit each meal inline."
            />
            <div className="flex justify-center">
              <button
                type="button"
                onClick={handleCreateWeek}
                className="rounded-full bg-brand-teal px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-ink"
              >
                Create this week&apos;s menu
              </button>
            </div>
          </div>
        ) : week ? (
          daySections.map((day) => (
            <article key={day.dayKey} className="rounded-[1.75rem] border border-brand-ink/10 bg-white/70 p-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-display text-2xl text-brand-ink">{day.dayLabel}</h3>
                <StatusPill tone="neutral">4 meals</StatusPill>
              </div>

              <div className="mt-4 grid gap-4 xl:grid-cols-2">
                {day.entries.map(({ entryKey, entry }) => {
                  const isEditing = editingKey === entryKey;

                  return (
                    <div key={entryKey} className="space-y-3">
                      <div className="rounded-[1.75rem] border border-brand-ink/10 bg-white/70 p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-teal">
                              {MEAL_LABELS[entry.mealType]}
                            </p>
                            <h4 className="mt-2 font-display text-xl text-brand-ink">{entry.title}</h4>
                          </div>
                          <button
                            type="button"
                            onClick={() => openEditor(entryKey)}
                            className="rounded-full border border-brand-ink/10 px-4 py-2.5 text-sm font-semibold text-brand-ink transition hover:border-brand-teal hover:bg-brand-teal hover:text-white"
                          >
                            Edit
                          </button>
                        </div>

                        <p className="mt-3 min-h-6 text-sm leading-6 text-brand-ink/70">
                          {entry.description || "No description added yet."}
                        </p>

                        <div className="mt-4 flex flex-wrap gap-2">
                          {entry.items.map((item, index) => (
                            <span
                              key={`${entryKey}-${item}-${index}`}
                              className="rounded-full bg-brand-sand px-3 py-1.5 text-sm font-medium text-brand-ink"
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>

                      {isEditing ? (
                        <div className="rounded-[1.75rem] border border-brand-teal/20 bg-brand-mist/60 p-5">
                          <div className="space-y-4">
                            <div>
                              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-brand-teal">
                                Title
                              </label>
                              <input
                                type="text"
                                value={formState.title}
                                onChange={(event) => setFormState((current) => ({ ...current, title: event.target.value }))}
                                className="w-full rounded-[1.25rem] border border-brand-ink/10 bg-white px-4 py-3 text-sm text-brand-ink outline-none transition focus:border-brand-teal"
                                placeholder="Breakfast Menu"
                              />
                            </div>

                            <div>
                              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-brand-teal">
                                Description
                              </label>
                              <textarea
                                value={formState.description}
                                onChange={(event) => setFormState((current) => ({ ...current, description: event.target.value }))}
                                className="min-h-24 w-full rounded-[1.25rem] border border-brand-ink/10 bg-white px-4 py-3 text-sm text-brand-ink outline-none transition focus:border-brand-teal"
                                placeholder="Optional note for this meal"
                              />
                            </div>

                            <div>
                              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-brand-teal">
                                Items
                              </label>
                              <textarea
                                value={formState.itemsText}
                                onChange={(event) => setFormState((current) => ({ ...current, itemsText: event.target.value }))}
                                className="min-h-32 w-full rounded-[1.25rem] border border-brand-ink/10 bg-white px-4 py-3 text-sm text-brand-ink outline-none transition focus:border-brand-teal"
                                placeholder={"Idli\nSambar\nChutney"}
                              />
                              <p className="mt-2 text-xs text-brand-ink/60">Enter one item per line.</p>
                            </div>

                            {formError ? (
                              <div className="rounded-[1.25rem] border border-brand-coral/20 bg-brand-coral/10 px-4 py-3 text-sm font-medium text-brand-coral">
                                {formError}
                              </div>
                            ) : null}

                            <div className="flex flex-wrap gap-3">
                              <button
                                type="button"
                                onClick={() => handleSave(entryKey)}
                                disabled={saving}
                                className="rounded-full bg-brand-teal px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-ink disabled:cursor-not-allowed disabled:opacity-70"
                              >
                                {saving ? "Saving..." : "Save"}
                              </button>
                              <button
                                type="button"
                                onClick={closeEditor}
                                disabled={saving}
                                className="rounded-full border border-brand-ink/10 px-4 py-2.5 text-sm font-semibold text-brand-ink transition hover:border-brand-teal hover:bg-brand-teal hover:text-white disabled:cursor-not-allowed disabled:opacity-70"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </article>
          ))
        ) : (
          <EmptyState
            title="Weekly menu unavailable"
            description="The menu for this week could not be loaded right now. Please try again in a moment."
          />
        )}
      </div>
    </SectionCard>
  );
}
