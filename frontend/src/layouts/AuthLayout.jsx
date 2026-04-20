import { Outlet } from "react-router-dom";

export default function AuthLayout() {
  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-8 sm:px-6 lg:px-8">
      <div className="absolute inset-0 bg-hero-grid bg-hero-grid opacity-80" />
      <div className="absolute left-[-4rem] top-16 h-48 w-48 rounded-full bg-brand-teal/20 blur-3xl" />
      <div className="absolute bottom-0 right-[-3rem] h-72 w-72 rounded-full bg-brand-gold/20 blur-3xl" />
      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center">
        <Outlet />
      </div>
    </div>
  );
}
