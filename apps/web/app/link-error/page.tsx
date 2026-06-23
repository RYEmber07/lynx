import { AlertCircle, Clock, Unlink, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface PageProps {
  // Next.js 15+ searchParams are Promises.
  // The Index Signature accounts for all possible URL query formats:
  // the [key : string] means every key will be a strin
  // ?reason=expired (string) | ?reason=a&reason=b (string[]) | no query (undefined)
  searchParams: Promise<{[key: string]: string | string[] | undefined}>;
}

export default async function LinkErrorPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const reason = resolvedParams.reason as string | undefined;

  let title = "Link Unavailable";
  let message = "The link you are trying to visit is currently unavailable.";
  let Icon = Unlink;

  if (reason === "expired") {
    title = "Link Expired";
    message = "This link has reached its expiration date and is no longer active.";
    Icon = Clock;
  } else if (reason === "inactive") {
    title = "Link Inactive";
    message = "This link has been temporarily disabled by its owner.";
    Icon = AlertCircle;
  } else if (reason === "not_found") {
    title = "Link Not Found";
    message = "We couldn't find a link with that code. It may have been deleted or never existed.";
    Icon = Unlink;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-surface border border-outline p-8 md:p-12 shadow-machined animate-fade-in flex flex-col items-center text-center">
        <div className="w-16 h-16 bg-surface-bright border border-outline flex items-center justify-center mb-6">
          <Icon className="w-8 h-8 text-on-surface-variant" strokeWidth={1.5} />
        </div>
        
        <h1 className="font-mono text-xl md:text-2xl font-bold text-on-background uppercase tracking-widest mb-4">
          {title}
        </h1>
        
        <p className="font-mono text-sm text-on-surface-variant leading-relaxed mb-10">
          {message}
        </p>

        <Link
          href="/"
          className="inline-flex items-center gap-3 font-mono text-xs text-primary uppercase tracking-widest hover:text-primary-container transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Lynx
        </Link>
      </div>
    </div>
  );
}
