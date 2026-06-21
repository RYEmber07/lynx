import Link from "next/link";
import { cookies } from "next/headers";
import { Activity } from "lucide-react";

export default async function HomePage() {
  const cookieStore = await cookies();
  const isLoggedIn = cookieStore.has("logged_in");

  return (
    <div className="min-h-screen flex flex-col bg-background text-on-background">
      {/* ── Navbar ── */}
      <header className="border-b border-outline bg-surface sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto flex items-center h-16">
          <div className="w-64 border-r border-outline h-full flex items-center px-6">
            <Link
              href="/"
              className="font-display text-2xl font-bold tracking-tighter">
              LYNX<span className="text-primary">.</span>
            </Link>
          </div>
          <div className="grow h-full flex items-center justify-end px-6 gap-6">
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                className="font-mono text-[11px] uppercase tracking-widest bg-primary text-on-primary font-bold px-6 py-2 hover:bg-primary-container transition-colors">
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="font-mono text-xs uppercase tracking-widest text-on-surface-variant hover:text-white transition-colors">
                  Login
                </Link>
                <Link
                  href="/register"
                  className="font-mono text-[11px] uppercase tracking-widest bg-primary text-on-primary font-bold px-6 py-2 hover:bg-primary-container transition-colors">
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Main Grid ── */}
      <main className="grow w-full max-w-[1400px] mx-auto border-l border-r border-outline flex flex-col bg-background">
        {/* Status bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 border-b border-outline">
          {[
            {label: "Service", value: "Online"},
            {label: "Latency", value: "—"},
            {label: "Routing", value: "Active"},
            {label: "Edge Nodes", value: "—"},
          ].map((item, i) => (
            <div
              key={i}
              className="px-6 py-3 font-mono text-[10px] uppercase text-on-surface-variant border-r last:border-r-0 border-outline flex items-center gap-3">
              <span className="w-1.5 h-1.5 rounded-none bg-primary animate-pulse-slow shrink-0"></span>
              {item.label}: {item.value}
            </div>
          ))}
        </div>

        {/* Hero Area */}
        <section className="grid grid-cols-1 lg:grid-cols-12 min-h-[70vh]">
          {/* Left panel */}
          <div className="lg:col-span-8 p-10 md:p-20 border-b lg:border-b-0 lg:border-r border-outline flex flex-col justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(229,169,58,0.08)_0%,transparent_60%)] opacity-50 pointer-events-none"></div>
            <div className="relative z-10">
              <div className="font-mono text-xs text-primary mb-8 flex items-center gap-4 uppercase tracking-[0.2em]">
                <span className="h-px w-12 bg-primary/50"></span>
                Fast, trackable short links
              </div>
              <h1 className="font-display font-bold text-5xl md:text-7xl leading-[1.05] tracking-tight mb-8">
                The Internet&apos;s <br />
                Fastest Links.
              </h1>
              <p className="font-body text-lg text-on-surface-variant max-w-xl mb-14 leading-relaxed">
                Transform long URLs into clean, short links. Track every click
                with real-time analytics. Built for teams that care about their
                infrastructure.
              </p>

              {/* Input Block */}
              <div className="bg-surface border border-outline shadow-machined rounded-none p-2 flex flex-col sm:flex-row gap-2 max-w-2xl">
                <div className="grow flex items-center bg-surface-bright px-5 h-14 border border-outline focus-within:shadow-glow focus-within:border-primary transition-colors">
                  <span className="font-mono text-primary mr-4">{">"}</span>
                  <input
                    className="w-full bg-transparent border-none outline-none font-mono text-sm text-on-background placeholder-on-surface-variant/40"
                    placeholder="Paste your long URL here..."
                  />
                </div>
                <Link
                  href={isLoggedIn ? "/dashboard" : "/register"}
                  className="h-14 px-10 bg-primary text-on-primary font-bold font-mono text-xs uppercase tracking-widest flex items-center justify-center hover:bg-primary-container transition-colors shrink-0">
                  Shorten
                </Link>
              </div>
              <p className="font-mono text-[10px] text-on-surface-variant mt-3 uppercase tracking-widest">
                Free to use. No credit card required.
              </p>
            </div>
          </div>

          {/* Right panel — Metrics (stubs) */}
          <div className="lg:col-span-4 bg-surface flex flex-col">
            <div className="p-6 border-b border-outline flex items-center gap-3">
              <Activity className="w-4 h-4 text-primary" strokeWidth={2} />
              <h3 className="font-mono text-[10px] uppercase tracking-widest text-on-surface-variant">
                Platform Stats
              </h3>
            </div>

            <div className="grow p-8 md:p-12 flex flex-col gap-10 justify-center">
              <div className="space-y-3">
                <div className="font-mono text-[10px] text-on-surface-variant uppercase tracking-widest">
                  Average Redirect Time
                </div>
                <div className="font-display text-5xl text-primary font-bold tracking-tighter">
                  —
                  <span className="text-xl text-on-surface-variant ml-1">
                    ms
                  </span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="font-mono text-[10px] text-on-surface-variant uppercase tracking-widest">
                  Uptime
                </div>
                <div className="font-display text-5xl text-on-background font-bold tracking-tighter">
                  —
                  <span className="text-xl text-on-surface-variant ml-1">
                    %
                  </span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="font-mono text-[10px] text-on-surface-variant uppercase tracking-widest">
                  Links Created
                </div>
                <div className="font-display text-5xl text-on-background font-bold tracking-tighter">
                  —
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-outline mt-auto">
              <p className="font-mono text-[10px] text-on-surface-variant uppercase tracking-widest">
                Stats visible after launch.
              </p>
            </div>
          </div>
        </section>

        {/* ── Feature Grid ── */}
        <section className="grid grid-cols-1 md:grid-cols-3 border-t border-outline bg-surface">
          {[
            {
              title: "Short Links",
              desc: "Create clean, memorable short links in seconds. Optionally set a custom alias so your brand stays front and center.",
            },
            {
              title: "Link Protection",
              desc: "Password-protect any link. Set an expiration date. You stay in control of who accesses your content and for how long.",
            },
            {
              title: "Click Analytics",
              desc: "See exactly how many times your link was clicked, when, and from where. Real-time tracking with no setup required.",
            },
          ].map((f, i) => (
            <div
              key={i}
              className="p-10 md:p-14 border-b md:border-b-0 md:border-r last:border-r-0 border-outline flex flex-col hover:bg-surface-bright transition-colors group">
              <div className="font-mono text-[10px] text-primary mb-10 uppercase tracking-widest opacity-80">
                0{i + 1}
              </div>
              <h3 className="font-display text-2xl font-bold mb-5">
                {f.title}
              </h3>
              <p className="font-body text-sm text-on-surface-variant leading-relaxed grow">
                {f.desc}
              </p>
            </div>
          ))}
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-outline bg-surface mt-auto">
        <div className="max-w-[1400px] mx-auto border-l border-r border-outline flex flex-col md:flex-row justify-between items-center px-10 py-8 gap-6 md:gap-0">
          <div className="font-display font-bold tracking-widest text-lg">
            LYNX<span className="text-primary">.</span>
          </div>
          <div className="flex flex-wrap justify-center gap-6 md:gap-10 font-mono text-[10px] uppercase tracking-widest text-on-surface-variant">
            <span className="hover:text-primary cursor-pointer transition-colors">
              Status
            </span>
            <span className="hover:text-primary cursor-pointer transition-colors">
              API Docs
            </span>
            <span>&copy; 2026 Lynx Technologies</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
