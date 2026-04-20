import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

function getCurrentMealPeriod() {
  const hour = new Date().getHours();

  if (hour < 9) {
    return "Breakfast time";
  }

  if (hour < 13) {
    return "Lunch hours";
  }

  if (hour < 16) {
    return "Snacks time";
  }

  if (hour < 21) {
    return "Dinner hours";
  }

  return "Mess closed for today";
}

export default function LoginPage() {
  const { user, login } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const now = new Date();
  const dateLabel = now.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });

  if (user) {
    return <Navigate to={user.role === "ADMIN" ? "/admin" : "/student"} replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const nextUser = await login(identifier.trim().toLowerCase(), password);
      window.location.assign(nextUser.role === "ADMIN" ? "/admin" : "/student");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid w-full gap-8 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="glass-panel rounded-[2rem] border border-white/80 p-8 shadow-panel sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-ink/50">National Institute of Technology Goa</p>
        <h1 className="mt-3 font-display text-4xl leading-tight text-brand-ink">
          Hostel Mess
          <br />
          Management Portal
        </h1>
        <p className="mt-3 text-sm leading-6 text-brand-ink/60">
          Managed by Kuber Health Food and Allied Services Pvt. Ltd.
        </p>

        <hr className="my-6 border-brand-ink/10" />

        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-teal">Today</p>
        <p className="mt-1 text-lg font-semibold text-brand-ink">{dateLabel}</p>
        <p className="mt-1 text-sm text-brand-ink/60">{getCurrentMealPeriod()}</p>

        <hr className="my-6 border-brand-ink/10" />

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl bg-brand-ink/5 p-3">
            <p className="text-xs uppercase tracking-wider text-brand-ink/50">Opt-out deadline</p>
            <p className="mt-1 text-sm font-semibold text-brand-ink">Before each meal</p>
            <p className="mt-0.5 text-xs text-brand-ink/50">Earn 10 pts per meal</p>
          </div>
          <div className="rounded-2xl bg-brand-ink/5 p-3">
            <p className="text-xs uppercase tracking-wider text-brand-ink/50">Mess timings</p>
            <p className="mt-1 text-sm font-semibold text-brand-ink">4 meals daily</p>
            <p className="mt-0.5 text-xs text-brand-ink/50">B {"\u00b7"} L {"\u00b7"} S {"\u00b7"} D</p>
          </div>
          <div className="rounded-2xl bg-brand-ink/5 p-3">
            <p className="text-xs uppercase tracking-wider text-brand-ink/50">Points store</p>
            <p className="mt-1 text-sm font-semibold text-brand-ink">Extras counter</p>
            <p className="mt-0.5 text-xs text-brand-ink/50">Redeem anytime</p>
          </div>
        </div>

        <p className="mt-6 text-xs leading-5 text-brand-ink/40">
          For login credentials or account issues, contact your hostel warden or the mess office.
        </p>
      </section>

      <section className="glass-panel rounded-[2rem] border border-white/80 p-8 shadow-panel sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-teal">Sign In</p>
        <h2 className="mt-3 font-display text-3xl text-brand-ink">One login for students and admins</h2>
        <p className="mt-3 text-sm leading-6 text-brand-ink/70">
          Use a roll number for students or an admin username. The backend decides the role and routes the session.
        </p>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-brand-ink">Roll number or username</span>
            <input
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              className="w-full rounded-2xl border border-brand-ink/10 bg-white px-4 py-3 text-base outline-none transition focus:border-brand-teal focus:ring-4 focus:ring-brand-teal/10"
              placeholder="24cse1036 or admin"
              autoComplete="username"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-brand-ink">Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-2xl border border-brand-ink/10 bg-white px-4 py-3 text-base outline-none transition focus:border-brand-teal focus:ring-4 focus:ring-brand-teal/10"
              placeholder="Enter password"
              autoComplete="current-password"
            />
          </label>

          {error ? <p className="rounded-2xl bg-brand-coral/10 px-4 py-3 text-sm text-brand-coral">{error}</p> : null}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-brand-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-teal disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting ? "Signing in..." : "Continue to dashboard"}
          </button>
        </form>

        <div className="soft-divider mt-8 pt-6 text-sm leading-6 text-brand-ink/65">
          Default seeded credentials are documented in the backend README, with role detection handled entirely on the server.
        </div>
      </section>
    </div>
  );
}
