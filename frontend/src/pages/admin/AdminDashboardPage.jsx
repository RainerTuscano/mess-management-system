import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { apiRequest } from "../../lib/api.js";
import EmptyState from "../../components/EmptyState.jsx";
import LoadingBlock from "../../components/LoadingBlock.jsx";
import SectionCard from "../../components/SectionCard.jsx";
import StatCard from "../../components/StatCard.jsx";

export default function AdminDashboardPage() {
  const [dashboard, setDashboard] = useState(null);
  const [analytics, setAnalytics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadPage() {
      setLoading(true);
      try {
        const [dashboardResponse, analyticsResponse] = await Promise.all([
          apiRequest("/admin/dashboard"),
          apiRequest("/admin/analytics/attendance")
        ]);
        setDashboard(dashboardResponse);
        setAnalytics(analyticsResponse.data);
      } catch (requestError) {
        setError(requestError.message);
      } finally {
        setLoading(false);
      }
    }

    loadPage();
  }, []);

  if (loading) {
    return <LoadingBlock label="Loading headcount, redemptions, and trends..." />;
  }

  if (!dashboard) {
    return <EmptyState title="Dashboard unavailable" description={error || "The admin dashboard could not be loaded."} />;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Students" value={dashboard.totalStudents} hint="Active students included in mess planning." tone="teal" />
        <StatCard label="Active Tokens" value={dashboard.activeRedemptions} hint="Redemptions still waiting to be fulfilled at the counter." tone="coral" />
        <StatCard label="Meals Today" value={dashboard.headcount.length} hint="Live meal windows available in today's schedule." tone="gold" />
      </div>

      <SectionCard title="Today's headcount" eyebrow="Operations Snapshot">
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
          {dashboard.headcount.map((meal) => (
            <article key={meal.mealType} className="rounded-[1.75rem] border border-brand-ink/10 bg-white/70 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-teal">{meal.mealType}</p>
              <h3 className="mt-3 font-display text-3xl text-brand-ink">{meal.eating}</h3>
              <p className="mt-1 text-sm text-brand-ink/70">Expected to eat</p>
              <div className="mt-5 space-y-2 text-sm text-brand-ink/70">
                <p>Opted out: {meal.optedOut}</p>
                <p>Attendance marked: {meal.attended}</p>
                <p>Deadline: {new Date(meal.deadlineAt).toLocaleString()}</p>
              </div>
            </article>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Attendance trend" eyebrow="Last 7 Days">
        {analytics.length ? (
          <div className="h-[360px] w-full">
            <ResponsiveContainer>
              <BarChart data={analytics}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d7ddd8" />
                <XAxis
                  dataKey="mealType"
                  tickFormatter={(value, index) => `${analytics[index]?.mealType?.slice(0, 3)} ${new Date(analytics[index]?.date).getDate()}`}
                  stroke="#5d6573"
                />
                <YAxis stroke="#5d6573" />
                <Tooltip />
                <Bar dataKey="attended" fill="#0f766e" radius={[8, 8, 0, 0]} />
                <Bar dataKey="optedOut" fill="#c48a1b" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyState title="No analytics yet" description="Attendance and opt-out trends will render here when meal activity begins." />
        )}
      </SectionCard>
    </div>
  );
}
