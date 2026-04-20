import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

function navClasses({ isActive }) {
  return [
    "rounded-full px-4 py-2 text-sm font-semibold transition",
    isActive ? "bg-brand-ink text-white" : "text-brand-ink/70 hover:bg-white/70 hover:text-brand-ink"
  ].join(" ");
}

export default function AppShell({ title, subtitle, links, children }) {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-hero-grid bg-hero-grid">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="glass-panel mb-6 rounded-[2rem] border border-white/70 px-5 py-5 shadow-panel">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <span className="label-chip">NIT Goa Mess</span>
              <div>
                <h1 className="font-display text-3xl text-brand-ink sm:text-4xl">{title}</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-brand-ink/75">{subtitle}</p>
              </div>
            </div>

            <div className="glass-panel rounded-[1.75rem] border border-brand-ink/10 px-4 py-4">
              <p className="text-sm font-semibold text-brand-ink">
                {user?.studentProfile?.fullName || user?.username || user?.rollNumber}
              </p>
              <p className="mt-1 text-xs uppercase tracking-[0.2em] text-brand-ink/50">{user?.role}</p>
              <button
                type="button"
                onClick={logout}
                className="mt-3 rounded-full border border-brand-coral/20 bg-brand-coral/10 px-4 py-2 text-sm font-semibold text-brand-coral transition hover:bg-brand-coral hover:text-white"
              >
                Log out
              </button>
            </div>
          </div>

          <nav className="mt-5 flex flex-wrap gap-2">
            {links.map((link) => (
              <NavLink key={link.to} to={link.to} end={link.end} className={navClasses}>
                {link.label}
              </NavLink>
            ))}
          </nav>
        </header>

        <main className="animate-rise">{children}</main>
      </div>
    </div>
  );
}
