"use client";

import { type ReactNode, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import LoadingScreen from "@/components/ui/LoadingScreen";

function getInitials(name?: string | null, email?: string | null): string {
  if (name) return name.substring(0, 2).toUpperCase();
  if (email) return email.substring(0, 2).toUpperCase();
  return "U";
}

function NavLink({ href, label, isActive }: { href: string; label: string; isActive: boolean }) {
  return (
    <li className="h-full">
      <Link
        href={href}
        className={`h-full flex items-center px-6 border-b-2 transition-colors ${
          isActive
            ? "border-primary text-on-background"
            : "border-transparent hover:text-on-background"
        }`}
      >
        {label}
      </Link>
    </li>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const auth = useAuth();

  // Redirect unauthenticated users - prevents any flash of Navbar/Footer
  useEffect(() => {
    if (!auth.isLoading && !auth.user && !auth.error) {
      router.replace("/login");
    }
  }, [auth.isLoading, auth.user, auth.error, router]);

  // Still resolving session
  if (auth.isLoading) {
    return <LoadingScreen />;
  }

  // No confirmed user - either show error or keep showing loading screen while redirect fires
  if (!auth.user) {
    if (auth.error) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
          <div className="max-w-md w-full border border-error/30 bg-error/10 p-8 flex flex-col items-center text-center gap-4">
            <div className="w-8 h-8 flex items-center justify-center bg-error/20 mb-2">
              <span className="w-3 h-3 bg-error shrink-0" />
            </div>
            <h2 className="font-display font-bold text-2xl text-error">Connection Failed</h2>
            <p className="font-mono text-[11px] uppercase tracking-widest text-on-surface-variant leading-relaxed">
              {auth.error}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 font-mono text-[10px] uppercase tracking-widest border border-error/30 px-8 py-3 text-error hover:bg-error/20 active:scale-[0.98] transition-all"
            >
              Retry Connection
            </button>
          </div>
        </div>
      );
    }
    // Redirect useEffect is in flight - keep showing loading screen
    return <LoadingScreen />;
  }

  // auth.user is now guaranteed non-null for the rest of this component
  return (
    <div className="min-h-screen flex flex-col bg-background text-on-background">

      {/* ── Navbar ── */}
      <header className="border-b border-outline bg-surface sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto flex items-center h-16 border-l border-r border-outline">
          <div className="w-64 border-r border-outline h-full flex items-center px-6 shrink-0">
            <Link href="/" className="font-display text-2xl font-bold tracking-tighter">
              LYNX<span className="text-primary">.</span>
            </Link>
          </div>

          <nav className="hidden md:flex h-full border-r border-outline px-0 items-center">
            <ul className="flex h-full font-mono text-[10px] uppercase tracking-widest text-on-surface-variant">
              <NavLink 
                href="/dashboard" 
                label="Links" 
                isActive={pathname === "/dashboard"} 
              />
              <NavLink 
                href="/dashboard/analytics" 
                label="Analytics" 
                isActive={pathname.startsWith("/dashboard/analytics")} 
              />
            </ul>
          </nav>

          <div className="grow h-full flex items-center justify-end px-6 gap-6">
            <span className="hidden sm:flex font-mono text-[10px] text-on-surface-variant tracking-widest uppercase truncate max-w-xs">
              {auth.user.name || auth.user.email}
            </span>
            <div className="w-8 h-8 flex items-center justify-center text-[10px] font-bold font-mono bg-surface-bright border border-outline text-on-background shrink-0">
              {getInitials(auth.user.name, auth.user.email)}
            </div>
            <button
              onClick={() => auth.logout()}
              className="font-mono text-[10px] uppercase tracking-widest text-on-surface-variant hover:text-error transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* ── Page Content ── */}
      <main className="grow w-full max-w-[1400px] mx-auto border-l border-r border-outline flex flex-col bg-background">
        {children}
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-outline bg-surface mt-auto">
        <div className="max-w-[1400px] mx-auto border-l border-r border-outline flex justify-between items-center px-10 py-6">
          <div className="font-mono text-[10px] uppercase tracking-widest text-on-surface-variant">
            Lynx © 2026
          </div>
          <ul className="flex gap-8 font-mono text-[10px] uppercase tracking-widest text-on-surface-variant">
            {["Privacy", "Terms", "API Docs"].map((l) => (
              <li key={l} className="hover:text-primary cursor-pointer transition-colors">{l}</li>
            ))}
          </ul>
        </div>
      </footer>
    </div>
  );
}
