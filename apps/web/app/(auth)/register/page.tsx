"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isAxiosError } from "axios";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/lib/auth";

export default function RegisterPage() {
  const router = useRouter();
  const auth = useAuth();
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await auth.register(email, password, name || undefined);
      router.replace("/dashboard");
    } catch (err) {
      if (isAxiosError(err)) {
        const data = err.response?.data as { error?: string } | undefined;
        setError(data?.error ?? "Registration failed.");
      } else {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
      <div className="w-full max-w-md animate-fade-in">
        
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center">
          <Link href="/" className="font-display text-4xl font-bold tracking-widest text-on-background mb-3">
            LYNX<span className="text-primary">.</span>
          </Link>
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-on-surface-variant flex items-center gap-3">
            <span className="w-8 h-px bg-outline"></span>
            Create your account
            <span className="w-8 h-px bg-outline"></span>
          </div>
        </div>

        <div className="bg-surface border border-outline shadow-machined rounded-none p-8 md:p-10">
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
            
            {/* Name */}
            <div className="flex flex-col gap-2">
              <label htmlFor="name" className="font-mono text-[10px] uppercase tracking-widest text-on-surface-variant flex items-center justify-between">
                <span>Name</span>
                <span className="text-outline">optional</span>
              </label>
              <input
                id="name"
                type="text"
                disabled={isSubmitting}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full h-12 bg-surface-bright border border-outline text-on-background font-mono text-sm px-4 focus:border-primary focus:outline-none transition-colors placeholder-on-surface-variant/40 disabled:opacity-50"
              />
            </div>

            {/* Email */}
            <div className="flex flex-col gap-2">
              <label htmlFor="email" className="font-mono text-[10px] uppercase tracking-widest text-on-surface-variant">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                disabled={isSubmitting}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full h-12 bg-surface-bright border border-outline text-on-background font-mono text-sm px-4 focus:border-primary focus:outline-none transition-colors placeholder-on-surface-variant/40 disabled:opacity-50"
              />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-2">
              <label htmlFor="password" className="font-mono text-[10px] uppercase tracking-widest text-on-surface-variant">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  disabled={isSubmitting}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full h-12 bg-surface-bright border border-outline text-on-background font-mono text-sm pl-4 pr-12 focus:border-primary focus:outline-none transition-colors placeholder-on-surface-variant/40 disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-0 top-0 h-12 w-12 flex items-center justify-center text-on-surface-variant hover:text-on-background transition-colors"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" strokeWidth={2} />
                  ) : (
                    <Eye className="w-4 h-4" strokeWidth={2} />
                  )}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 bg-error/10 border border-error/20 text-error font-mono text-[10px] uppercase tracking-widest flex items-center gap-3">
                <span className="w-1.5 h-1.5 bg-error shrink-0"></span>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 mt-2 bg-primary text-on-primary font-bold font-mono text-xs uppercase tracking-widest hover:bg-primary-container active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-3">
                  <span className="w-3 h-3 border border-t-on-primary animate-spin rounded-none"></span>
                  Creating account...
                </span>
              ) : (
                "Create Account"
              )}
            </button>
          </form>
        </div>

        <div className="mt-8 flex justify-between items-center font-mono text-[10px] uppercase tracking-widest">
          <Link href="/" className="text-on-surface-variant hover:text-on-background transition-colors">
            ← Back
          </Link>
          <Link href="/login" className="text-primary hover:text-white transition-colors">
            Sign in instead →
          </Link>
        </div>
      </div>
    </div>
  );
}
